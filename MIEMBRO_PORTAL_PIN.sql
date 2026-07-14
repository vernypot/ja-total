-- =============================================================================
-- Member portal: QR token + 4-digit PIN login
-- Run in Supabase Dashboard → SQL Editor after MIEMBRO_CARNET_SCHEMA.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.miembro_profile_tokens
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_pin_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;

COMMENT ON COLUMN public.miembro_profile_tokens.pin_hash IS
  'Bcrypt hash of the member 4-digit portal PIN.';

CREATE TABLE IF NOT EXISTS public.miembro_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- session_token is UNIQUE (implicit btree index). Do not use now() in a partial
-- index predicate — PostgreSQL requires IMMUTABLE functions there.
CREATE INDEX IF NOT EXISTS idx_miembro_portal_sessions_miembro
  ON public.miembro_portal_sessions(miembro_id);

ALTER TABLE public.miembro_portal_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_portal_sessions_deny_all ON public.miembro_portal_sessions;
CREATE POLICY miembro_portal_sessions_deny_all ON public.miembro_portal_sessions
  FOR ALL TO authenticated, anon
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.is_valid_member_portal_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_pin ~ '^\d{4}$';
$$;

CREATE OR REPLACE FUNCTION public.admin_get_miembro_portal_pin_status(p_miembro_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_has_pin BOOLEAN;
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_get_miembro_portal_pin_status';
  END IF;

  SELECT (pin_hash IS NOT NULL) INTO v_has_pin
  FROM public.miembro_profile_tokens
  WHERE miembro_id = p_miembro_id
    AND activo = true
  LIMIT 1;

  RETURN coalesce(v_has_pin, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_miembro_portal_pin(
  p_miembro_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_set_miembro_portal_pin';
  END IF;

  IF NOT public.is_valid_member_portal_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  PERFORM public.get_or_create_miembro_profile_token(p_miembro_id);

  UPDATE public.miembro_profile_tokens
  SET
    pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
    pin_set_at = now(),
    portal_activated_at = NULL,
    failed_pin_attempts = 0,
    pin_locked_until = NULL,
    updated_at = now()
  WHERE miembro_id = p_miembro_id
    AND activo = true;

  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.member_portal_resolve_token(TEXT);

CREATE OR REPLACE FUNCTION public.member_portal_resolve_token(p_token TEXT)
RETURNS TABLE (
  miembro_id UUID,
  nombre TEXT,
  apellido1 TEXT,
  apellido2 TEXT,
  has_pin BOOLEAN,
  needs_pin BOOLEAN,
  portal_activated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.nombre,
    m.apellido1,
    m.apellido2,
    (t.pin_hash IS NOT NULL) AS has_pin,
    (t.pin_hash IS NOT NULL AND t.portal_activated_at IS NULL) AS needs_pin,
    (t.portal_activated_at IS NOT NULL) AS portal_activated
  FROM public.miembro_profile_tokens t
  JOIN public.miembros m ON m.id = t.miembro_id
  WHERE t.token = p_token
    AND t.activo = true
    AND m.estado = 'activo';
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_login(
  p_token TEXT,
  p_pin TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row RECORD;
  v_session_token TEXT;
  v_expires_at TIMESTAMPTZ := now() + INTERVAL '24 hours';
BEGIN
  IF NOT public.is_valid_member_portal_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  SELECT
    t.miembro_id,
    t.pin_hash,
    t.portal_activated_at,
    t.failed_pin_attempts,
    t.pin_locked_until,
    m.nombre,
    m.apellido1,
    m.apellido2
  INTO v_row
  FROM public.miembro_profile_tokens t
  JOIN public.miembros m ON m.id = t.miembro_id
  WHERE t.token = p_token
    AND t.activo = true
    AND m.estado = 'activo'
  LIMIT 1;

  IF v_row.miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive member token';
  END IF;

  IF v_row.pin_hash IS NULL THEN
    RAISE EXCEPTION 'portal PIN is not configured for this member';
  END IF;

  IF v_row.portal_activated_at IS NOT NULL THEN
    RAISE EXCEPTION 'PIN is only required on first login. Scan your carnet QR to sign in.';
  END IF;

  IF v_row.pin_locked_until IS NOT NULL AND v_row.pin_locked_until > now() THEN
    RAISE EXCEPTION 'too many failed attempts. Try again later.';
  END IF;

  IF v_row.pin_hash <> extensions.crypt(p_pin, v_row.pin_hash) THEN
    UPDATE public.miembro_profile_tokens
    SET
      failed_pin_attempts = failed_pin_attempts + 1,
      pin_locked_until = CASE
        WHEN failed_pin_attempts + 1 >= 5 THEN now() + INTERVAL '15 minutes'
        ELSE pin_locked_until
      END,
      updated_at = now()
    WHERE miembro_id = v_row.miembro_id;

    RAISE EXCEPTION 'invalid PIN';
  END IF;

  UPDATE public.miembro_profile_tokens
  SET
    failed_pin_attempts = 0,
    pin_locked_until = NULL,
    portal_activated_at = now(),
    updated_at = now()
  WHERE miembro_id = v_row.miembro_id;

  INSERT INTO public.miembro_portal_sessions (miembro_id, expires_at)
  VALUES (v_row.miembro_id, v_expires_at)
  RETURNING session_token INTO v_session_token;

  RETURN json_build_object(
    'session_token', v_session_token,
    'miembro_id', v_row.miembro_id,
    'nombre', v_row.nombre,
    'apellido1', v_row.apellido1,
    'apellido2', v_row.apellido2,
    'expires_at', v_expires_at
  );
END;
$$;

DROP FUNCTION IF EXISTS public.member_portal_login_qr(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.member_portal_login_qr(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_miembro_id UUID;
  v_nombre TEXT;
  v_apellido1 TEXT;
  v_apellido2 TEXT;
  v_session_token TEXT;
  v_expires_at TIMESTAMPTZ := now() + INTERVAL '24 hours';
BEGIN
  SELECT
    m.id,
    m.nombre,
    m.apellido1,
    m.apellido2
  INTO v_miembro_id, v_nombre, v_apellido1, v_apellido2
  FROM public.miembro_profile_tokens t
  JOIN public.miembros m ON m.id = t.miembro_id
  WHERE t.token = p_token
    AND t.activo = true
    AND m.estado = 'activo'
    AND t.pin_hash IS NOT NULL
    AND t.portal_activated_at IS NOT NULL
  LIMIT 1;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'first login requires PIN';
  END IF;

  INSERT INTO public.miembro_portal_sessions (miembro_id, expires_at)
  VALUES (v_miembro_id, v_expires_at)
  RETURNING session_token INTO v_session_token;

  RETURN json_build_object(
    'session_token', v_session_token,
    'miembro_id', v_miembro_id,
    'nombre', v_nombre,
    'apellido1', v_apellido1,
    'apellido2', v_apellido2,
    'expires_at', v_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_verify_session(p_session_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_miembro_id UUID;
BEGIN
  SELECT s.miembro_id INTO v_miembro_id
  FROM public.miembro_portal_sessions s
  JOIN public.miembros m ON m.id = s.miembro_id
  WHERE s.session_token = p_session_token
    AND s.expires_at > now()
    AND m.estado = 'activo'
  LIMIT 1;

  RETURN v_miembro_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_get_profile(p_session_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_miembro_id UUID;
  v_profile JSON;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  SELECT json_build_object(
    'id', m.id,
    'nombre', m.nombre,
    'apellido1', m.apellido1,
    'apellido2', m.apellido2,
    'fecha_nacimiento', m.fecha_nacimiento,
    'genero', m.genero,
    'documento', m.documento,
    'telefono', m.telefono,
    'celular', m.celular,
    'ciudad', m.ciudad,
    'direccion', m.direccion,
    'foto_url', m.foto_url,
    'clubes', coalesce((
      SELECT json_agg(json_build_object('id', c.id, 'nombre', c.nombre) ORDER BY c.nombre)
      FROM public.miembro_club mc
      JOIN public.clubes c ON c.id = mc.club_id
      WHERE mc.miembro_id = m.id
        AND c.estado = 'activo'
    ), '[]'::json)
  )
  INTO v_profile
  FROM public.miembros m
  WHERE m.id = v_miembro_id;

  RETURN v_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_logout(p_session_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  DELETE FROM public.miembro_portal_sessions
  WHERE session_token = p_session_token;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_valid_member_portal_pin(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_miembro_portal_pin_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_miembro_portal_pin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_portal_resolve_token(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_login(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_login_qr(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_verify_session(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_get_profile(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_logout(TEXT) TO authenticated, anon;
