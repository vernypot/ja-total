-- =============================================================================
-- Member portal: device trust (QR-only after first PIN), admin reset PIN / QR
-- Run in Supabase Dashboard → SQL Editor after MIEMBRO_PORTAL_PIN.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.miembro_portal_device_trust (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  trust_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_miembro_portal_device_trust_miembro
  ON public.miembro_portal_device_trust(miembro_id);

CREATE INDEX IF NOT EXISTS idx_miembro_portal_device_trust_token
  ON public.miembro_portal_device_trust(trust_token);

ALTER TABLE public.miembro_portal_device_trust ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_portal_device_trust_deny_all ON public.miembro_portal_device_trust;
CREATE POLICY miembro_portal_device_trust_deny_all ON public.miembro_portal_device_trust
  FOR ALL TO authenticated, anon
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.clear_miembro_portal_access(p_miembro_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.miembro_portal_sessions WHERE miembro_id = p_miembro_id;
  DELETE FROM public.miembro_portal_device_trust WHERE miembro_id = p_miembro_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_miembro_portal_pin(p_miembro_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_reset_miembro_portal_pin';
  END IF;

  UPDATE public.miembro_profile_tokens
  SET
    pin_hash = NULL,
    pin_set_at = NULL,
    failed_pin_attempts = 0,
    pin_locked_until = NULL,
    updated_at = now()
  WHERE miembro_id = p_miembro_id
    AND activo = true;

  PERFORM public.clear_miembro_portal_access(p_miembro_id);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_regenerate_miembro_profile_token(p_miembro_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_regenerate_miembro_profile_token';
  END IF;

  PERFORM public.clear_miembro_portal_access(p_miembro_id);

  v_token := encode(gen_random_bytes(16), 'hex');

  INSERT INTO public.miembro_profile_tokens (miembro_id, token)
  VALUES (p_miembro_id, v_token)
  ON CONFLICT (miembro_id) DO UPDATE SET
    token = EXCLUDED.token,
    activo = true,
    updated_at = now()
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_miembro_portal_pin(
  p_miembro_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_set_miembro_portal_pin';
  END IF;

  IF NOT public.is_valid_member_portal_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  PERFORM public.get_or_create_miembro_profile_token(p_miembro_id);
  PERFORM public.clear_miembro_portal_access(p_miembro_id);

  UPDATE public.miembro_profile_tokens
  SET
    pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
    pin_set_at = now(),
    failed_pin_attempts = 0,
    pin_locked_until = NULL,
    updated_at = now()
  WHERE miembro_id = p_miembro_id
    AND activo = true;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_login(
  p_token TEXT,
  p_pin TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_session_token TEXT;
  v_trust_token TEXT;
  v_expires_at TIMESTAMPTZ := now() + INTERVAL '24 hours';
  v_trust_expires_at TIMESTAMPTZ := now() + INTERVAL '365 days';
BEGIN
  IF NOT public.is_valid_member_portal_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  SELECT
    t.miembro_id,
    t.pin_hash,
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
    updated_at = now()
  WHERE miembro_id = v_row.miembro_id;

  INSERT INTO public.miembro_portal_sessions (miembro_id, expires_at)
  VALUES (v_row.miembro_id, v_expires_at)
  RETURNING session_token INTO v_session_token;

  INSERT INTO public.miembro_portal_device_trust (miembro_id, trust_token, expires_at)
  VALUES (v_row.miembro_id, encode(gen_random_bytes(32), 'hex'), v_trust_expires_at)
  RETURNING trust_token INTO v_trust_token;

  RETURN json_build_object(
    'session_token', v_session_token,
    'miembro_id', v_row.miembro_id,
    'nombre', v_row.nombre,
    'apellido1', v_row.apellido1,
    'apellido2', v_row.apellido2,
    'expires_at', v_expires_at,
    'device_trust_token', v_trust_token,
    'device_trust_expires_at', v_trust_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_login_qr(
  p_token TEXT,
  p_device_trust_token TEXT
)
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
  LIMIT 1;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive member token';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.miembro_portal_device_trust d
    WHERE d.trust_token = p_device_trust_token
      AND d.miembro_id = v_miembro_id
      AND d.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'device trust required. Enter your PIN on first login.';
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

GRANT EXECUTE ON FUNCTION public.clear_miembro_portal_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_miembro_portal_pin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_regenerate_miembro_profile_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_portal_login_qr(TEXT, TEXT) TO authenticated, anon;
