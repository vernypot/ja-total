-- =============================================================================
-- Member portal: complete Supabase patch (safe to re-run)
-- Fixes:
--   - gen_salt(unknown) does not exist  → use extensions.crypt / extensions.gen_salt
--   - cannot change return type of member_portal_resolve_token → DROP first
-- Run this single file in Supabase SQL Editor
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.miembro_profile_tokens
  ADD COLUMN IF NOT EXISTS portal_activated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.clear_miembro_portal_sessions(p_miembro_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.miembro_portal_sessions WHERE miembro_id = p_miembro_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_miembro_portal_status(p_miembro_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status JSON;
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_get_miembro_portal_status';
  END IF;

  SELECT json_build_object(
    'has_pin', (t.pin_hash IS NOT NULL),
    'portal_activated', (t.portal_activated_at IS NOT NULL)
  )
  INTO v_status
  FROM public.miembro_profile_tokens t
  WHERE t.miembro_id = p_miembro_id
    AND t.activo = true
  LIMIT 1;

  RETURN coalesce(v_status, json_build_object('has_pin', false, 'portal_activated', false));
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
  PERFORM public.clear_miembro_portal_sessions(p_miembro_id);

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
SET search_path = public
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
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.clear_miembro_portal_sessions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_miembro_portal_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_miembro_portal_pin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_portal_resolve_token(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_login(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_login_qr(TEXT) TO authenticated, anon;
