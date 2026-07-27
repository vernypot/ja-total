-- =============================================================================
-- Staff app sessions + member portal login/usage stats for admins
-- Run in Supabase SQL Editor after USUARIOS_RLS_FIX.sql and MIEMBRO_PORTAL_PIN.sql
-- =============================================================================

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMENT ON COLUMN public.usuarios.last_login_at IS
  'Last staff dashboard login (updated when an app session starts).';

CREATE TABLE IF NOT EXISTS public.usuario_app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuario_app_sessions_usuario
  ON public.usuario_app_sessions(usuario_id);

CREATE INDEX IF NOT EXISTS idx_usuario_app_sessions_started
  ON public.usuario_app_sessions(started_at DESC);

ALTER TABLE public.usuario_app_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuario_app_sessions_deny_all ON public.usuario_app_sessions;
CREATE POLICY usuario_app_sessions_deny_all ON public.usuario_app_sessions
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

ALTER TABLE public.miembro_portal_sessions
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.miembro_portal_login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.miembro_portal_sessions(id) ON DELETE SET NULL,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auth_method TEXT NOT NULL DEFAULT 'pin'
);

CREATE INDEX IF NOT EXISTS idx_miembro_portal_login_events_miembro
  ON public.miembro_portal_login_events(miembro_id, logged_in_at DESC);

CREATE TABLE IF NOT EXISTS public.miembro_portal_card_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scan_context TEXT NOT NULL DEFAULT 'portal_login'
);

CREATE INDEX IF NOT EXISTS idx_miembro_portal_card_scans_miembro
  ON public.miembro_portal_card_scans(miembro_id, scanned_at DESC);

ALTER TABLE public.miembro_portal_login_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_portal_login_events_deny_all ON public.miembro_portal_login_events;
CREATE POLICY miembro_portal_login_events_deny_all ON public.miembro_portal_login_events
  FOR ALL TO authenticated, anon
  USING (false)
  WITH CHECK (false);

ALTER TABLE public.miembro_portal_card_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_portal_card_scans_deny_all ON public.miembro_portal_card_scans;
CREATE POLICY miembro_portal_card_scans_deny_all ON public.miembro_portal_card_scans
  FOR ALL TO authenticated, anon
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.usuario_session_duration_seconds(
  p_started_at TIMESTAMPTZ,
  p_last_seen_at TIMESTAMPTZ,
  p_ended_at TIMESTAMPTZ
)
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(0, EXTRACT(EPOCH FROM (coalesce(p_ended_at, p_last_seen_at) - p_started_at))::BIGINT);
$$;

CREATE OR REPLACE FUNCTION public.resolve_current_usuario_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  v_id := public.get_user_id();

  IF v_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = v_id) THEN
    RETURN v_id;
  END IF;

  SELECT u.id INTO v_id
  FROM public.usuarios u
  WHERE lower(u.email) = public.get_user_email()
  LIMIT 1;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_stale_usuario_app_sessions(
  p_usuario_id UUID,
  p_stale_after INTERVAL DEFAULT INTERVAL '30 minutes'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.usuario_app_sessions s
  SET ended_at = s.last_seen_at
  WHERE s.usuario_id = p_usuario_id
    AND s.ended_at IS NULL
    AND s.last_seen_at < now() - p_stale_after;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_usuario_app_session_start(
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_session_id UUID;
BEGIN
  v_usuario_id := public.resolve_current_usuario_id();
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'authenticated user profile not found';
  END IF;

  PERFORM public.close_stale_usuario_app_sessions(v_usuario_id);

  INSERT INTO public.usuario_app_sessions (usuario_id, user_agent)
  VALUES (v_usuario_id, nullif(trim(p_user_agent), ''))
  RETURNING id INTO v_session_id;

  UPDATE public.usuarios
  SET
    last_login_at = now(),
    updated_at = now()
  WHERE id = v_usuario_id;

  RETURN v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_usuario_app_heartbeat(
  p_session_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  v_usuario_id := public.resolve_current_usuario_id();
  IF v_usuario_id IS NULL THEN
    RETURN false;
  END IF;

  PERFORM public.close_stale_usuario_app_sessions(v_usuario_id);

  UPDATE public.usuario_app_sessions s
  SET last_seen_at = now()
  WHERE s.id = p_session_id
    AND s.usuario_id = v_usuario_id
    AND s.ended_at IS NULL;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_usuario_app_session_end(
  p_session_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  v_usuario_id := public.resolve_current_usuario_id();
  IF v_usuario_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.usuario_app_sessions s
  SET
    ended_at = now(),
    last_seen_at = now()
  WHERE s.id = p_session_id
    AND s.usuario_id = v_usuario_id
    AND s.ended_at IS NULL;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_can_view_usuario_usage(p_usuario_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_usuarios_superadmin()
    OR (
      public.is_usuarios_admin()
      AND EXISTS (
        SELECT 1
        FROM public.usuario_iglesia ui_viewer
        JOIN public.usuario_iglesia ui_target
          ON ui_target.iglesia_id = ui_viewer.iglesia_id
        WHERE ui_viewer.usuario_id = public.resolve_current_usuario_id()
          AND ui_target.usuario_id = p_usuario_id
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.admin_list_usuario_usage_stats(
  p_days INT DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INT := GREATEST(1, LEAST(coalesce(p_days, 30), 365));
  v_since TIMESTAMPTZ := now() - make_interval(days => v_days);
  v_result JSON;
BEGIN
  IF NOT public.is_usuarios_admin() THEN
    RAISE EXCEPTION 'permission denied for admin_list_usuario_usage_stats';
  END IF;

  SELECT coalesce(json_agg(row_data ORDER BY sort_last_login DESC NULLS LAST, sort_nombre ASC), '[]'::json)
  INTO v_result
  FROM (
    SELECT
      json_build_object(
        'usuario_id', u.id,
        'email', u.email,
        'nombre', u.nombre,
        'apellido1', u.apellido1,
        'apellido2', u.apellido2,
        'rol', u.rol,
        'estado', u.estado,
        'iglesia_nombre', (
          SELECT string_agg(DISTINCT i.nombre, ', ' ORDER BY i.nombre)
          FROM public.usuario_iglesia ui
          JOIN public.iglesias i ON i.id = ui.iglesia_id
          WHERE ui.usuario_id = u.id
        ),
        'last_login_at', u.last_login_at,
        'login_count', (
          SELECT count(*)::INT
          FROM public.usuario_app_sessions s
          WHERE s.usuario_id = u.id
            AND s.started_at >= v_since
        ),
        'total_usage_seconds', (
          SELECT coalesce(sum(
            public.usuario_session_duration_seconds(s.started_at, s.last_seen_at, s.ended_at)
          ), 0)::BIGINT
          FROM public.usuario_app_sessions s
          WHERE s.usuario_id = u.id
            AND s.started_at >= v_since
        ),
        'last_seen_at', (
          SELECT max(s.last_seen_at)
          FROM public.usuario_app_sessions s
          WHERE s.usuario_id = u.id
            AND s.started_at >= v_since
        ),
        'active_now', EXISTS (
          SELECT 1
          FROM public.usuario_app_sessions s
          WHERE s.usuario_id = u.id
            AND s.ended_at IS NULL
            AND s.last_seen_at >= now() - INTERVAL '5 minutes'
        )
      ) AS row_data,
      u.last_login_at AS sort_last_login,
      coalesce(u.nombre, u.email) AS sort_nombre
    FROM public.usuarios u
    WHERE public.admin_can_view_usuario_usage(u.id)
  ) scoped;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_miembro_portal_usage_stats(
  p_days INT DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INT := GREATEST(1, LEAST(coalesce(p_days, 30), 365));
  v_since TIMESTAMPTZ := now() - make_interval(days => v_days);
  v_result JSON;
BEGIN
  IF NOT public.is_usuarios_admin() THEN
    RAISE EXCEPTION 'permission denied for admin_list_miembro_portal_usage_stats';
  END IF;

  SELECT coalesce(json_agg(row_data ORDER BY sort_last_login DESC NULLS LAST, sort_nombre ASC), '[]'::json)
  INTO v_result
  FROM (
    SELECT
      json_build_object(
        'miembro_id', m.id,
        'nombre', m.nombre,
        'apellido1', m.apellido1,
        'apellido2', m.apellido2,
        'estado', m.estado,
        'club_nombre', (
          SELECT string_agg(DISTINCT c.nombre, ', ' ORDER BY c.nombre)
          FROM public.miembro_club mc
          JOIN public.clubes c ON c.id = mc.club_id
          WHERE mc.miembro_id = m.id
        ),
        'last_login_at', (
          SELECT max(e.logged_in_at)
          FROM public.miembro_portal_login_events e
          WHERE e.miembro_id = m.id
        ),
        'login_count', (
          SELECT count(*)::INT
          FROM public.miembro_portal_login_events e
          WHERE e.miembro_id = m.id
            AND e.logged_in_at >= v_since
        ),
        'qr_login_count', (
          SELECT count(*)::INT
          FROM public.miembro_portal_login_events e
          WHERE e.miembro_id = m.id
            AND e.logged_in_at >= v_since
            AND e.auth_method = 'qr'
        ),
        'pin_login_count', (
          SELECT count(*)::INT
          FROM public.miembro_portal_login_events e
          WHERE e.miembro_id = m.id
            AND e.logged_in_at >= v_since
            AND e.auth_method = 'pin'
        ),
        'card_scan_count', (
          SELECT count(*)::INT
          FROM public.miembro_portal_card_scans cs
          WHERE cs.miembro_id = m.id
            AND cs.scanned_at >= v_since
        ),
        'last_card_scan_at', (
          SELECT max(cs.scanned_at)
          FROM public.miembro_portal_card_scans cs
          WHERE cs.miembro_id = m.id
        ),
        'total_usage_seconds', (
          SELECT coalesce(sum(
            public.usuario_session_duration_seconds(
              s.created_at,
              coalesce(s.last_seen_at, s.created_at),
              coalesce(s.ended_at, CASE WHEN s.expires_at <= now() THEN s.expires_at ELSE NULL END)
            )
          ), 0)::BIGINT
          FROM public.miembro_portal_sessions s
          WHERE s.miembro_id = m.id
            AND s.created_at >= v_since
        ),
        'last_seen_at', (
          SELECT max(coalesce(s.last_seen_at, s.created_at))
          FROM public.miembro_portal_sessions s
          WHERE s.miembro_id = m.id
            AND s.created_at >= v_since
        ),
        'active_now', EXISTS (
          SELECT 1
          FROM public.miembro_portal_sessions s
          WHERE s.miembro_id = m.id
            AND s.ended_at IS NULL
            AND s.expires_at > now()
            AND coalesce(s.last_seen_at, s.created_at) >= now() - INTERVAL '15 minutes'
        )
      ) AS row_data,
      (
        SELECT max(e.logged_in_at)
        FROM public.miembro_portal_login_events e
        WHERE e.miembro_id = m.id
      ) AS sort_last_login,
      coalesce(m.nombre, m.apellido1, m.apellido2, m.id::TEXT) AS sort_nombre
    FROM public.miembros m
    WHERE (
      EXISTS (
        SELECT 1
        FROM public.miembro_portal_login_events e
        WHERE e.miembro_id = m.id
      )
      OR EXISTS (
        SELECT 1
        FROM public.miembro_portal_card_scans cs
        WHERE cs.miembro_id = m.id
      )
    )
    AND (
      public.is_usuarios_superadmin()
      OR EXISTS (
        SELECT 1
        FROM public.miembro_club mc
        JOIN public.clubes c ON c.id = mc.club_id
        JOIN public.usuario_iglesia ui ON ui.iglesia_id = c.iglesia_id
        WHERE mc.miembro_id = m.id
          AND ui.usuario_id = public.resolve_current_usuario_id()
      )
    )
  ) scoped;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_create_session(
  p_miembro_id UUID,
  p_auth_method TEXT DEFAULT 'pin'
)
RETURNS TABLE (
  session_token TEXT,
  expires_at TIMESTAMPTZ,
  session_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session_id UUID;
  v_session_token TEXT;
  v_expires_at TIMESTAMPTZ := now() + INTERVAL '24 hours';
BEGIN
  INSERT INTO public.miembro_portal_sessions AS mps (miembro_id, expires_at, last_seen_at)
  VALUES (p_miembro_id, v_expires_at, now())
  RETURNING mps.id, mps.session_token, mps.expires_at
  INTO v_session_id, v_session_token, v_expires_at;

  INSERT INTO public.miembro_portal_login_events (miembro_id, session_id, auth_method)
  VALUES (p_miembro_id, v_session_id, coalesce(nullif(trim(p_auth_method), ''), 'pin'));

  RETURN QUERY SELECT v_session_token, v_expires_at, v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_miembro_portal_card_scan(
  p_miembro_id UUID,
  p_scan_context TEXT DEFAULT 'portal_login'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_miembro_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.miembro_portal_card_scans (miembro_id, scan_context)
  VALUES (p_miembro_id, coalesce(nullif(trim(p_scan_context), ''), 'portal_login'));
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
  needs_pin_setup BOOLEAN,
  needs_pin BOOLEAN,
  portal_activated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_miembro_id UUID;
BEGIN
  SELECT m.id INTO v_miembro_id
  FROM public.miembro_profile_tokens t
  JOIN public.miembros m ON m.id = t.miembro_id
  WHERE t.token = p_token
    AND t.activo = true
    AND m.estado = 'activo'
  LIMIT 1;

  IF v_miembro_id IS NOT NULL THEN
    PERFORM public.record_miembro_portal_card_scan(v_miembro_id, 'portal_login');
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.nombre,
    m.apellido1,
    m.apellido2,
    (t.pin_hash IS NOT NULL) AS has_pin,
    (t.pin_hash IS NULL) AS needs_pin_setup,
    true AS needs_pin,
    (t.portal_activated_at IS NOT NULL) AS portal_activated
  FROM public.miembro_profile_tokens t
  JOIN public.miembros m ON m.id = t.miembro_id
  WHERE t.token = p_token
    AND t.activo = true
    AND m.estado = 'activo';
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
  UPDATE public.miembro_portal_sessions s
  SET last_seen_at = now()
  FROM public.miembros m
  WHERE s.session_token = p_session_token
    AND s.expires_at > now()
    AND s.ended_at IS NULL
    AND m.id = s.miembro_id
    AND m.estado = 'activo'
  RETURNING s.miembro_id INTO v_miembro_id;

  RETURN v_miembro_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_logout(p_session_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.miembro_portal_sessions
  SET
    ended_at = now(),
    last_seen_at = now()
  WHERE session_token = p_session_token
    AND ended_at IS NULL;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_current_usuario_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_usuario_app_session_start(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_usuario_app_heartbeat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_usuario_app_session_end(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_usuario_usage_stats(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_miembro_portal_usage_stats(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_portal_create_session(UUID, TEXT) TO authenticated, anon;

-- Patch portal login RPCs to record login events via member_portal_create_session.
-- Supports PIN-always flow (first setup + returning PIN) and QR-only returning login.
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
  v_expires_at TIMESTAMPTZ;
  v_pin_setup BOOLEAN := false;
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

  IF v_row.pin_locked_until IS NOT NULL AND v_row.pin_locked_until > now() THEN
    RAISE EXCEPTION 'too many failed attempts. Try again later.';
  END IF;

  IF v_row.pin_hash IS NULL THEN
    v_pin_setup := true;
    UPDATE public.miembro_profile_tokens
    SET
      pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
      pin_set_at = now(),
      portal_activated_at = now(),
      failed_pin_attempts = 0,
      pin_locked_until = NULL,
      updated_at = now()
    WHERE miembro_id = v_row.miembro_id;
  ELSE
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
  END IF;

  SELECT s.session_token, s.expires_at
  INTO v_session_token, v_expires_at
  FROM public.member_portal_create_session(v_row.miembro_id, 'pin') s;

  RETURN json_build_object(
    'session_token', v_session_token,
    'miembro_id', v_row.miembro_id,
    'nombre', v_row.nombre,
    'apellido1', v_row.apellido1,
    'apellido2', v_row.apellido2,
    'expires_at', v_expires_at,
    'pin_setup', v_pin_setup
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
  v_expires_at TIMESTAMPTZ;
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

  PERFORM public.record_miembro_portal_card_scan(v_miembro_id, 'portal_login');

  SELECT s.session_token, s.expires_at
  INTO v_session_token, v_expires_at
  FROM public.member_portal_create_session(v_miembro_id, 'qr') s;

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

GRANT EXECUTE ON FUNCTION public.record_miembro_portal_card_scan(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_resolve_token(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_login(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_login_qr(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_verify_session(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_logout(TEXT) TO authenticated, anon;
