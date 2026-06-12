-- Grant superadmin to walkerpottinger@gmail.com
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
--
-- Requires: usuarios.id must match auth.users.id for RLS policies to work.

-- 1) Sync auth user metadata (used as fallback in the app)
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'superadmin')
WHERE lower(email) = lower('walkerpottinger@gmail.com');

-- 2) Upsert application user profile linked to auth id
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

-- 3) Verify
SELECT u.id, u.email, u.rol, u.estado
FROM public.usuarios u
WHERE lower(u.email) = lower('walkerpottinger@gmail.com');
