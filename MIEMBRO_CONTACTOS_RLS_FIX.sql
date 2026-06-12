-- =============================================================================
-- Fix RLS for miembro_contactos (member emergency contacts)
-- Run in Supabase Dashboard → SQL Editor
--
-- If writes still fail after this script:
--   1) Run USUARIOS_RLS_FIX.sql and GRANT_SUPERADMIN.sql
--   2) Log out and back in
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers (safe to re-run; same as USUARIOS_RLS_FIX.sql)
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

CREATE OR REPLACE FUNCTION public.user_can_access_miembro(p_miembro_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_usuarios_superadmin()
    OR public.is_usuarios_admin()
    OR EXISTS (
      SELECT 1
      FROM public.miembro_club mc
      JOIN public.clubes c ON c.id = mc.club_id
      JOIN public.usuario_iglesia ui ON ui.iglesia_id = c.iglesia_id
      WHERE mc.miembro_id = p_miembro_id
        AND ui.usuario_id = public.get_user_id()
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_miembro(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC fallbacks (bypass RLS safely for superadmin writes)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_save_miembro_contacto(
  p_miembro_id UUID,
  p_nombre TEXT,
  p_telefono TEXT,
  p_relacion TEXT DEFAULT NULL,
  p_contacto_id UUID DEFAULT NULL
)
RETURNS public.miembro_contactos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_contactos;
BEGIN
  IF NOT public.is_usuarios_superadmin() THEN
    RAISE EXCEPTION 'permission denied for admin_save_miembro_contacto';
  END IF;

  IF p_contacto_id IS NULL THEN
    INSERT INTO public.miembro_contactos (miembro_id, nombre, telefono, relacion, estado)
    VALUES (
      p_miembro_id,
      trim(p_nombre),
      trim(p_telefono),
      nullif(trim(coalesce(p_relacion, '')), ''),
      'activo'
    )
    RETURNING * INTO result;
  ELSE
    UPDATE public.miembro_contactos
    SET
      nombre = trim(p_nombre),
      telefono = trim(p_telefono),
      relacion = nullif(trim(coalesce(p_relacion, '')), '')
    WHERE id = p_contacto_id
      AND miembro_id = p_miembro_id
    RETURNING * INTO result;
  END IF;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'contact not found';
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_miembro_contacto_estado(
  p_contacto_id UUID,
  p_estado TEXT
)
RETURNS public.miembro_contactos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_contactos;
BEGIN
  IF NOT public.is_usuarios_superadmin() THEN
    RAISE EXCEPTION 'permission denied for admin_set_miembro_contacto_estado';
  END IF;

  UPDATE public.miembro_contactos
  SET estado = p_estado
  WHERE id = p_contacto_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'contact not found';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_miembro_contacto(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_miembro_contacto_estado(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS miembro_contactos_select ON public.miembro_contactos;
DROP POLICY IF EXISTS miembro_contactos_insert ON public.miembro_contactos;
DROP POLICY IF EXISTS miembro_contactos_update ON public.miembro_contactos;
DROP POLICY IF EXISTS miembro_contactos_delete ON public.miembro_contactos;

ALTER TABLE public.miembro_contactos ENABLE ROW LEVEL SECURITY;

CREATE POLICY miembro_contactos_select ON public.miembro_contactos
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_miembro(miembro_id));

CREATE POLICY miembro_contactos_insert ON public.miembro_contactos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_usuarios_superadmin());

CREATE POLICY miembro_contactos_update ON public.miembro_contactos
  FOR UPDATE
  TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());

CREATE POLICY miembro_contactos_delete ON public.miembro_contactos
  FOR DELETE
  TO authenticated
  USING (public.is_usuarios_superadmin());

-- Bootstrap superadmin row (keep in sync with GRANT_SUPERADMIN.sql)
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
