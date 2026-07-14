-- =============================================================================
-- Member portal: enforce PIN only on first login (patch)
-- Run if first-login / QR-only behavior is not working after prior migrations
-- =============================================================================

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

GRANT EXECUTE ON FUNCTION public.member_portal_resolve_token(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_login_qr(TEXT) TO authenticated, anon;
