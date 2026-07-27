-- =============================================================================
-- Event activity start vs scan start + 3-minute on-time window for QR check-in
-- Run in Supabase Dashboard → SQL Editor after IGLESIA_TIMEZONE.sql
-- =============================================================================

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS actividad_inicio_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escaneo_inicio_at TIMESTAMPTZ;

COMMENT ON COLUMN public.eventos.actividad_inicio_at IS
  'When the activity actually started (manual entry or leader CTA). On-time attendance is within 3 minutes after this instant.';

COMMENT ON COLUMN public.eventos.escaneo_inicio_at IS
  'When QR attendance scanning was opened for this event.';

CREATE OR REPLACE FUNCTION public.evento_activity_start_at(p_evento_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    e.actividad_inicio_at,
    (e.fecha + coalesce(e.hora, '00:00'::TIME))
      AT TIME ZONE coalesce(public.iglesia_timezone_for_evento(e.id), 'America/Bogota')
  )
  FROM public.eventos e
  WHERE e.id = p_evento_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_evento_actividad_inicio(
  p_evento_id UUID,
  p_actividad_inicio_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.eventos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.eventos;
BEGIN
  IF NOT public.user_can_manage_evento(p_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_set_evento_actividad_inicio';
  END IF;

  UPDATE public.eventos
  SET
    actividad_inicio_at = coalesce(p_actividad_inicio_at, now()),
    updated_at = now()
  WHERE id = p_evento_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_start_evento_escaneo(p_evento_id UUID)
RETURNS public.eventos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.eventos;
BEGIN
  IF NOT public.user_can_manage_evento(p_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_start_evento_escaneo';
  END IF;

  UPDATE public.eventos
  SET
    escaneo_inicio_at = coalesce(escaneo_inicio_at, now()),
    updated_at = now()
  WHERE id = p_evento_id
    AND coalesce(estado, 'activo') = 'activo'
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'event not found or not open for scanning';
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_checkin_evento(
  p_evento_id UUID,
  p_token TEXT
)
RETURNS public.evento_asistencia
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_evento_miembro_id UUID;
  v_evento RECORD;
  v_now TIMESTAMPTZ := now();
  v_activity_start TIMESTAMPTZ;
  v_estado TEXT;
  v_requires_confirmation BOOLEAN;
  v_existing public.evento_asistencia;
  result public.evento_asistencia;
BEGIN
  IF NOT public.user_can_manage_evento(p_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_checkin_evento';
  END IF;

  SELECT * INTO v_evento
  FROM public.eventos
  WHERE id = p_evento_id;

  IF v_evento.id IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  IF coalesce(v_evento.estado, 'activo') <> 'activo' THEN
    RAISE EXCEPTION 'event is not open for check-in';
  END IF;

  SELECT miembro_id INTO v_miembro_id
  FROM public.resolve_miembro_from_token(p_token)
  LIMIT 1;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive member token';
  END IF;

  SELECT em.id INTO v_evento_miembro_id
  FROM public.evento_miembro em
  WHERE em.evento_id = p_evento_id
    AND em.miembro_id = v_miembro_id;

  IF v_evento_miembro_id IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.miembro_club mc
      JOIN public.miembros m ON m.id = mc.miembro_id
      WHERE mc.miembro_id = v_miembro_id
        AND mc.club_id = v_evento.club_id
        AND m.estado = 'activo'
    ) THEN
      RAISE EXCEPTION 'member is not in this event club';
    END IF;

    v_requires_confirmation := coalesce(v_evento.requiere_confirmacion, true);

    INSERT INTO public.evento_miembro (
      evento_id,
      miembro_id,
      confirmacion_estado,
      confirmado_at
    )
    VALUES (
      p_evento_id,
      v_miembro_id,
      CASE WHEN v_requires_confirmation THEN 'pendiente' ELSE 'confirmado' END,
      CASE WHEN v_requires_confirmation THEN NULL ELSE v_now END
    )
    ON CONFLICT (evento_id, miembro_id) DO NOTHING
    RETURNING id INTO v_evento_miembro_id;

    IF v_evento_miembro_id IS NULL THEN
      SELECT em.id INTO v_evento_miembro_id
      FROM public.evento_miembro em
      WHERE em.evento_id = p_evento_id
        AND em.miembro_id = v_miembro_id;
    END IF;
  END IF;

  IF v_evento_miembro_id IS NULL THEN
    RAISE EXCEPTION 'member is not assigned to this event';
  END IF;

  SELECT * INTO v_existing
  FROM public.evento_asistencia
  WHERE evento_miembro_id = v_evento_miembro_id;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.checked_in_at IS NOT NULL
       OR v_existing.estado IN ('a_tiempo', 'tarde') THEN
      RETURN v_existing;
    END IF;
  END IF;

  v_activity_start := public.evento_activity_start_at(p_evento_id);

  IF v_now <= v_activity_start + INTERVAL '3 minutes' THEN
    v_estado := 'a_tiempo';
  ELSE
    v_estado := 'tarde';
  END IF;

  IF v_existing.id IS NOT NULL THEN
    UPDATE public.evento_asistencia
    SET
      estado = v_estado,
      checked_in_at = v_now,
      updated_at = v_now
    WHERE id = v_existing.id
    RETURNING * INTO result;

    RETURN result;
  END IF;

  INSERT INTO public.evento_asistencia (evento_miembro_id, estado, checked_in_at)
  VALUES (v_evento_miembro_id, v_estado, v_now)
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.evento_activity_start_at(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_evento_actividad_inicio(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_start_evento_escaneo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_checkin_evento(UUID, TEXT) TO authenticated;
