-- =============================================================================
-- Allow logged-in members to confirm or decline future events they can access.
-- Supports assigned invites (evento_miembro) and general club events (by evento_id).
-- Run in Supabase SQL Editor after MIEMBRO_PORTAL_DASHBOARD.sql
-- =============================================================================

DROP FUNCTION IF EXISTS public.member_portal_set_evento_confirmacion(TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.event_open_for_member_confirmation(
  p_fecha DATE,
  p_hora TIME,
  p_timezone TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_timezone TEXT := coalesce(nullif(trim(p_timezone), ''), 'America/Bogota');
  v_today DATE;
BEGIN
  IF p_fecha IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_hora IS NULL THEN
    v_today := (now() AT TIME ZONE v_timezone)::date;
    RETURN p_fecha >= v_today;
  END IF;

  RETURN now() < ((p_fecha + p_hora) AT TIME ZONE v_timezone);
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_set_evento_confirmacion(
  p_session_token TEXT,
  p_confirmacion_estado TEXT,
  p_evento_miembro_id UUID DEFAULT NULL,
  p_evento_id UUID DEFAULT NULL
)
RETURNS public.evento_miembro
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_evento_miembro public.evento_miembro;
  v_evento public.eventos;
  v_timezone TEXT;
  v_target_evento_id UUID;
  result public.evento_miembro;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  IF p_confirmacion_estado NOT IN ('pendiente', 'confirmado', 'rechazado') THEN
    RAISE EXCEPTION 'invalid confirmation status';
  END IF;

  IF p_evento_miembro_id IS NULL AND p_evento_id IS NULL THEN
    RAISE EXCEPTION 'event reference required';
  END IF;

  IF p_evento_miembro_id IS NOT NULL THEN
    SELECT em.* INTO v_evento_miembro
    FROM public.evento_miembro em
    WHERE em.id = p_evento_miembro_id;

    IF v_evento_miembro.id IS NULL THEN
      RAISE EXCEPTION 'event member assignment not found';
    END IF;

    IF v_evento_miembro.miembro_id <> v_miembro_id THEN
      RAISE EXCEPTION 'permission denied';
    END IF;

    v_target_evento_id := v_evento_miembro.evento_id;
  ELSE
    v_target_evento_id := p_evento_id;
  END IF;

  SELECT e.* INTO v_evento
  FROM public.eventos e
  WHERE e.id = v_target_evento_id;

  IF v_evento.id IS NULL OR v_evento.estado <> 'activo' THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  IF p_evento_miembro_id IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.miembro_club mc
      JOIN public.miembros m ON m.id = mc.miembro_id
      JOIN public.clubes c ON c.id = mc.club_id
      WHERE mc.club_id = v_evento.club_id
        AND mc.miembro_id = v_miembro_id
        AND coalesce(m.estado, 'activo') = 'activo'
        AND c.estado = 'activo'
    ) THEN
      RAISE EXCEPTION 'permission denied';
    END IF;
  END IF;

  SELECT coalesce(nullif(trim(i.timezone), ''), 'America/Bogota')
  INTO v_timezone
  FROM public.clubes c
  LEFT JOIN public.iglesias i ON i.id = c.iglesia_id
  WHERE c.id = v_evento.club_id;

  IF NOT public.event_open_for_member_confirmation(v_evento.fecha, v_evento.hora, v_timezone) THEN
    RAISE EXCEPTION 'event already started';
  END IF;

  IF p_evento_miembro_id IS NOT NULL THEN
    UPDATE public.evento_miembro
    SET
      confirmacion_estado = p_confirmacion_estado,
      confirmado_at = CASE
        WHEN p_confirmacion_estado = 'pendiente' THEN NULL
        ELSE now()
      END
    WHERE id = p_evento_miembro_id
    RETURNING * INTO result;
  ELSE
    INSERT INTO public.evento_miembro (
      evento_id,
      miembro_id,
      confirmacion_estado,
      confirmado_at
    )
    VALUES (
      v_target_evento_id,
      v_miembro_id,
      p_confirmacion_estado,
      CASE WHEN p_confirmacion_estado = 'pendiente' THEN NULL ELSE now() END
    )
    ON CONFLICT (evento_id, miembro_id) DO UPDATE SET
      confirmacion_estado = EXCLUDED.confirmacion_estado,
      confirmado_at = EXCLUDED.confirmado_at
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.event_open_for_member_confirmation(DATE, TIME, TEXT)
  TO authenticated, anon;

GRANT EXECUTE ON FUNCTION public.member_portal_set_evento_confirmacion(TEXT, TEXT, UUID, UUID)
  TO authenticated, anon;
