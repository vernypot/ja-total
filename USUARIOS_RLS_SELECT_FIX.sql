-- Patch: fix "Error loading users" (RLS recursion on SELECT)
-- Run in Supabase SQL Editor if you already applied an earlier USUARIOS_RLS_FIX.sql

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

DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
CREATE POLICY usuarios_select ON public.usuarios
  FOR SELECT TO authenticated
  USING (id = public.get_user_id() OR public.is_usuarios_admin());

DROP POLICY IF EXISTS usuario_iglesia_select ON public.usuario_iglesia;
CREATE POLICY usuario_iglesia_select ON public.usuario_iglesia
  FOR SELECT TO authenticated
  USING (usuario_id = public.get_user_id() OR public.is_usuarios_admin());

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
