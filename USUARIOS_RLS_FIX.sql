-- =============================================================================
-- Fix RLS for usuarios + usuario_iglesia (User Management CRUD)
-- Run in Supabase Dashboard → SQL Editor
--
-- Problem: INSERT on usuarios fails with
--   "new row violates row-level security policy for table usuarios"
-- Cause: RLS enabled but no INSERT/DELETE policies (or role check reads JWT only).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER avoids policy recursion on usuarios)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(COALESCE(
    auth.jwt() ->> 'email',
    auth.jwt() -> 'user_metadata' ->> 'email'
  ));
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  db_role TEXT;
  jwt_role TEXT;
  email TEXT;
BEGIN
  email := public.get_user_email();

  -- App bootstrap superadmins (keep in sync with frontend/src/utils/permissions.js)
  IF email IN ('walkerpottinger@gmail.com') THEN
    RETURN 'superadmin';
  END IF;

  jwt_role := COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (auth.jwt() -> 'app_metadata' ->> 'role')
  );

  IF jwt_role IN ('superadmin', 'admin') THEN
    RETURN jwt_role;
  END IF;

  SELECT u.rol INTO db_role
  FROM public.usuarios u
  WHERE u.id = auth.uid();

  RETURN COALESCE(db_role, jwt_role, 'user');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_usuarios_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() IN ('superadmin', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_usuarios_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() = 'superadmin';
$$;

GRANT EXECUTE ON FUNCTION public.get_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_usuarios_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_usuarios_superadmin() TO authenticated;

-- ---------------------------------------------------------------------------
-- Drop legacy / conflicting policies on usuarios
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS usuarios_select_own ON public.usuarios;
DROP POLICY IF EXISTS usuarios_select_church_members ON public.usuarios;
DROP POLICY IF EXISTS usuarios_select_admin ON public.usuarios;
DROP POLICY IF EXISTS usuarios_update_own ON public.usuarios;
DROP POLICY IF EXISTS usuarios_update_admin ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete_policy" ON public.usuarios;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- SELECT: own row or admin/superadmin (no usuario_iglesia join — avoids RLS recursion)
CREATE POLICY usuarios_select ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (
    id = public.get_user_id()
    OR public.is_usuarios_admin()
  );

-- INSERT: superadmin only (User Management page)
CREATE POLICY usuarios_insert ON public.usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_usuarios_superadmin());

-- UPDATE: own profile or admin/superadmin
CREATE POLICY usuarios_update ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (
    id = public.get_user_id()
    OR public.is_usuarios_admin()
  )
  WITH CHECK (
    id = public.get_user_id()
    OR public.is_usuarios_admin()
  );

-- DELETE: superadmin only
CREATE POLICY usuarios_delete ON public.usuarios
  FOR DELETE
  TO authenticated
  USING (public.is_usuarios_superadmin());

-- ---------------------------------------------------------------------------
-- usuario_iglesia (church assignment when creating users)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS usuario_iglesia_select ON public.usuario_iglesia;
DROP POLICY IF EXISTS usuario_iglesia_insert ON public.usuario_iglesia;
DROP POLICY IF EXISTS usuario_iglesia_update ON public.usuario_iglesia;
DROP POLICY IF EXISTS usuario_iglesia_delete ON public.usuario_iglesia;

ALTER TABLE public.usuario_iglesia ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuario_iglesia_select ON public.usuario_iglesia
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = public.get_user_id()
    OR public.is_usuarios_admin()
  );

CREATE POLICY usuario_iglesia_insert ON public.usuario_iglesia
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_usuarios_superadmin());

CREATE POLICY usuario_iglesia_update ON public.usuario_iglesia
  FOR UPDATE
  TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());

CREATE POLICY usuario_iglesia_delete ON public.usuario_iglesia
  FOR DELETE
  TO authenticated
  USING (public.is_usuarios_superadmin());

-- ---------------------------------------------------------------------------
-- Ensure bootstrap superadmin row exists (for DB-backed role checks)
-- ---------------------------------------------------------------------------

INSERT INTO public.usuarios (id, email, nombre, rol, estado, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'nombre', split_part(u.email, '@', 1)),
  'superadmin',
  'activo',
  now()
FROM auth.users u
WHERE lower(u.email) = lower('walkerpottinger@gmail.com')
ON CONFLICT (email) DO UPDATE SET
  id = EXCLUDED.id,
  rol = 'superadmin',
  estado = 'activo',
  updated_at = now();

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'superadmin')
WHERE lower(email) = lower('walkerpottinger@gmail.com');

-- RPC fallback for User Management list (bypasses RLS safely for superadmin)
CREATE OR REPLACE FUNCTION public.admin_list_usuarios()
RETURNS SETOF public.usuarios
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.*
  FROM public.usuarios u
  WHERE public.is_usuarios_superadmin()
  ORDER BY u.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_usuarios() TO authenticated;
