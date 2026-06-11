-- ============================================
-- USUARIOS TABLE CREATION & SCHEMA UPDATE
-- ============================================
-- This script creates the usuarios table and 
-- updates existing tables for consistency.
-- 
-- Tables involved:
-- - usuarios (new)
-- - usuario_iglesia (new - junction table)
-- - iglesias (existing - will add admin_usuario_id)
-- - miembros (existing - will add usuario_id if needed)
-- ============================================

-- ============================================
-- STEP 1: Create usuarios table
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  apellido1 VARCHAR(255),
  apellido2 VARCHAR(255),
  rol VARCHAR(50) NOT NULL DEFAULT 'user', 
  -- Roles: superadmin, admin, coordinator, member, user
  estado VARCHAR(50) NOT NULL DEFAULT 'activo',
  -- Estados: activo, inactivo, suspendido
  foto TEXT,
  -- Profile photo URL
  telefono VARCHAR(20),
  direccion TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================================
-- STEP 2: Create junction table for many-to-many
-- ============================================
CREATE TABLE IF NOT EXISTS usuario_iglesia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  iglesia_id UUID NOT NULL,
  rol_iglesia VARCHAR(50) DEFAULT 'member',
  -- Roles specific to church: member, coordinator, admin
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(usuario_id, iglesia_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (iglesia_id) REFERENCES iglesias(id) ON DELETE CASCADE
);

-- ============================================
-- STEP 3: Update iglesias table (if needed)
-- ============================================
-- Add admin_usuario_id column to track church administrators
-- This is optional but useful for direct admin assignment
ALTER TABLE iglesias 
ADD COLUMN IF NOT EXISTS admin_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE iglesias
ADD COLUMN IF NOT EXISTS created_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

-- ============================================
-- STEP 4: Update miembros table (if needed)
-- ============================================
-- Link miembros to usuarios (optional - if you want system users to also be members)
ALTER TABLE miembros 
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

-- ============================================
-- STEP 5: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuario_iglesia_usuario_id ON usuario_iglesia(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_iglesia_iglesia_id ON usuario_iglesia(iglesia_id);
CREATE INDEX IF NOT EXISTS idx_usuario_iglesia_rol ON usuario_iglesia(rol_iglesia);
CREATE INDEX IF NOT EXISTS idx_iglesias_admin ON iglesias(admin_usuario_id);
CREATE INDEX IF NOT EXISTS idx_miembros_usuario ON miembros(usuario_id);

-- ============================================
-- STEP 6: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_iglesia ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own profile
CREATE POLICY IF NOT EXISTS usuarios_select_own
ON usuarios FOR SELECT
USING (auth.uid() = id);

-- RLS Policy: Users can view other users in their churches
CREATE POLICY IF NOT EXISTS usuarios_select_church_members
ON usuarios FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuario_iglesia ui1
    JOIN usuario_iglesia ui2 ON ui1.iglesia_id = ui2.iglesia_id
    WHERE ui1.usuario_id = auth.uid()
    AND ui2.usuario_id = usuarios.id
  )
);

-- RLS Policy: Admins can view all users
CREATE POLICY IF NOT EXISTS usuarios_select_admin
ON usuarios FOR SELECT
USING (
  (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'superadmin'
  OR (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin'
);

-- RLS Policy: Users can update their own profile
CREATE POLICY IF NOT EXISTS usuarios_update_own
ON usuarios FOR UPDATE
USING (auth.uid() = id);

-- RLS Policy: Admins can update any user
CREATE POLICY IF NOT EXISTS usuarios_update_admin
ON usuarios FOR UPDATE
USING (
  (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'superadmin'
  OR (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin'
);

-- RLS Policy: usuario_iglesia visibility
CREATE POLICY IF NOT EXISTS usuario_iglesia_select
ON usuario_iglesia FOR SELECT
USING (
  usuario_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM usuario_iglesia ui
    WHERE ui.usuario_id = auth.uid()
    AND ui.iglesia_id = usuario_iglesia.iglesia_id
  )
  OR (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('superadmin', 'admin')
);

-- ============================================
-- STEP 7: Create useful views
-- ============================================

-- View: Get all users with their churches
CREATE OR REPLACE VIEW v_usuarios_con_iglesias AS
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.apellido1,
  u.apellido2,
  u.rol,
  u.estado,
  i.id AS iglesia_id,
  i.nombre AS iglesia_nombre,
  ui.rol_iglesia,
  ui.created_at AS asignado_en
FROM usuarios u
LEFT JOIN usuario_iglesia ui ON u.id = ui.usuario_id
LEFT JOIN iglesias i ON ui.iglesia_id = i.id
ORDER BY u.email, i.nombre;

-- View: Get church administrators
CREATE OR REPLACE VIEW v_administradores_iglesia AS
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.apellido1,
  i.id AS iglesia_id,
  i.nombre AS iglesia_nombre,
  ui.rol_iglesia,
  u.created_at
FROM usuarios u
JOIN usuario_iglesia ui ON u.id = ui.usuario_id
JOIN iglesias i ON ui.iglesia_id = i.id
WHERE ui.rol_iglesia = 'admin'
ORDER BY i.nombre, u.nombre;

-- ============================================
-- STEP 8: Create sample data (optional)
-- ============================================
-- Uncomment to insert test data:

-- INSERT INTO usuarios (email, nombre, apellido1, rol, estado)
-- VALUES 
--   ('admin@system.com', 'System', 'Admin', 'superadmin', 'activo'),
--   ('user1@church.com', 'John', 'Doe', 'user', 'activo');

-- INSERT INTO usuario_iglesia (usuario_id, iglesia_id, rol_iglesia)
-- VALUES 
--   ((SELECT id FROM usuarios WHERE email = 'admin@system.com'), 
--    (SELECT id FROM iglesias LIMIT 1), 
--    'admin');

-- ============================================
-- STEP 9: Grant permissions to authenticated users
-- ============================================
GRANT SELECT ON v_usuarios_con_iglesias TO authenticated;
GRANT SELECT ON v_administradores_iglesia TO authenticated;

-- ============================================
-- END OF SCHEMA UPDATE
-- ============================================
-- 
-- COMMON QUERIES:
--
-- 1. Get all churches for a specific user:
--    SELECT i.* FROM iglesias i
--    JOIN usuario_iglesia ui ON i.id = ui.iglesia_id
--    WHERE ui.usuario_id = 'user-uuid';
--
-- 2. Get all users in a specific church:
--    SELECT u.* FROM usuarios u
--    JOIN usuario_iglesia ui ON u.id = ui.usuario_id
--    WHERE ui.iglesia_id = 'iglesia-uuid';
--
-- 3. Add a user to a church:
--    INSERT INTO usuario_iglesia (usuario_id, iglesia_id, rol_iglesia)
--    VALUES ('user-uuid', 'iglesia-uuid', 'member');
--
-- 4. Get user's role in a specific church:
--    SELECT rol_iglesia FROM usuario_iglesia
--    WHERE usuario_id = 'user-uuid'
--    AND iglesia_id = 'iglesia-uuid';
--
-- 5. Change a user's role in a church:
--    UPDATE usuario_iglesia
--    SET rol_iglesia = 'coordinator'
--    WHERE usuario_id = 'user-uuid'
--    AND iglesia_id = 'iglesia-uuid';
--
-- ============================================
