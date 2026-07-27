-- =============================================================================
-- Merge same-date eventos for shared attendance tracking
-- Run in Supabase Dashboard → SQL Editor after EVENTO_ACTIVITY_TIMES.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.evento_asistencia_grupo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  nombre TEXT,
  actividad_inicio_at TIMESTAMPTZ,
  escaneo_inicio_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.evento_asistencia_grupo IS
  'Links same-day club eventos so one QR check-in records attendance on all merged events.';

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS asistencia_grupo_id UUID
    REFERENCES public.evento_asistencia_grupo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_asistencia_grupo_id
  ON public.eventos(asistencia_grupo_id)
  WHERE asistencia_grupo_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.evento_asistencia_grupo_ids(p_evento_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(array_agg(e.id ORDER BY e.hora NULLS LAST, e.nombre), ARRAY[]::UUID[])
  FROM public.eventos src
  JOIN public.eventos e ON e.asistencia_grupo_id = src.asistencia_grupo_id
  WHERE src.id = p_evento_id
    AND src.asistencia_grupo_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.evento_activity_start_at(p_evento_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    g.actividad_inicio_at,
    e.actividad_inicio_at,
    (e.fecha + coalesce(e.hora, '00:00'::TIME))
      AT TIME ZONE coalesce(public.iglesia_timezone_for_evento(e.id), 'America/Bogota')
  )
  FROM public.eventos e
  LEFT JOIN public.evento_asistencia_grupo g ON g.id = e.asistencia_grupo_id
  WHERE e.id = p_evento_id;
$$;

CREATE OR REPLACE FUNCTION public.sync_evento_checkin_to_grupo(
  p_source_evento_id UUID,
  p_miembro_id UUID,
  p_estado TEXT,
  p_checked_in_at TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source public.eventos;
  v_target public.eventos;
  v_evento_miembro_id UUID;
  v_requires_confirmation BOOLEAN;
  v_existing public.evento_asistencia;
BEGIN
  SELECT * INTO v_source
  FROM public.eventos
  WHERE id = p_source_evento_id;

  IF v_source.asistencia_grupo_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_target IN
    SELECT e.*
    FROM public.eventos e
    WHERE e.asistencia_grupo_id = v_source.asistencia_grupo_id
      AND e.id <> p_source_evento_id
      AND coalesce(e.estado, 'activo') = 'activo'
  LOOP
    SELECT em.id INTO v_evento_miembro_id
    FROM public.evento_miembro em
    WHERE em.evento_id = v_target.id
      AND em.miembro_id = p_miembro_id;

    IF v_evento_miembro_id IS NULL THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.miembro_club mc
        JOIN public.miembros m ON m.id = mc.miembro_id
        WHERE mc.miembro_id = p_miembro_id
          AND mc.club_id = v_target.club_id
          AND m.estado = 'activo'
      ) THEN
        CONTINUE;
      END IF;

      v_requires_confirmation := coalesce(v_target.requiere_confirmacion, true);

      INSERT INTO public.evento_miembro (
        evento_id,
        miembro_id,
        confirmacion_estado,
        confirmado_at
      )
      VALUES (
        v_target.id,
        p_miembro_id,
        CASE WHEN v_requires_confirmation THEN 'pendiente' ELSE 'confirmado' END,
        CASE WHEN v_requires_confirmation THEN NULL ELSE p_checked_in_at END
      )
      ON CONFLICT (evento_id, miembro_id) DO NOTHING
      RETURNING id INTO v_evento_miembro_id;

      IF v_evento_miembro_id IS NULL THEN
        SELECT em.id INTO v_evento_miembro_id
        FROM public.evento_miembro em
        WHERE em.evento_id = v_target.id
          AND em.miembro_id = p_miembro_id;
      END IF;
    END IF;

    IF v_evento_miembro_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_existing
    FROM public.evento_asistencia
    WHERE evento_miembro_id = v_evento_miembro_id;

    IF v_existing.id IS NOT NULL
       AND (v_existing.checked_in_at IS NOT NULL OR v_existing.estado IN ('a_tiempo', 'tarde')) THEN
      CONTINUE;
    END IF;

    IF v_existing.id IS NOT NULL THEN
      UPDATE public.evento_asistencia
      SET
        estado = p_estado,
        checked_in_at = p_checked_in_at,
        updated_at = p_checked_in_at
      WHERE id = v_existing.id;
    ELSE
      INSERT INTO public.evento_asistencia (evento_miembro_id, estado, checked_in_at)
      VALUES (v_evento_miembro_id, p_estado, p_checked_in_at);
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_evento_asistencia_grupo(
  p_evento_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids UUID[];
  v_club_id UUID;
  v_fecha DATE;
  v_grupo_id UUID;
  v_existing_grupo UUID;
  v_evento_id UUID;
BEGIN
  v_ids := (
    SELECT coalesce(array_agg(DISTINCT id), ARRAY[]::UUID[])
    FROM unnest(coalesce(p_evento_ids, ARRAY[]::UUID[])) AS id
  );

  IF coalesce(array_length(v_ids, 1), 0) < 2 THEN
    RAISE EXCEPTION 'select at least two events to merge';
  END IF;

  SELECT e.club_id, e.fecha
  INTO v_club_id, v_fecha
  FROM public.eventos e
  WHERE e.id = v_ids[1];

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.eventos e
    WHERE e.id = ANY(v_ids)
      AND (e.club_id <> v_club_id OR e.fecha <> v_fecha)
  ) THEN
    RAISE EXCEPTION 'merged events must share the same club and date';
  END IF;

  FOREACH v_evento_id IN ARRAY v_ids LOOP
    IF NOT public.user_can_manage_evento(v_evento_id) THEN
      RAISE EXCEPTION 'permission denied for admin_create_evento_asistencia_grupo';
    END IF;
  END LOOP;

  SELECT DISTINCT e.asistencia_grupo_id
  INTO v_existing_grupo
  FROM public.eventos e
  WHERE e.id = ANY(v_ids)
    AND e.asistencia_grupo_id IS NOT NULL
  LIMIT 1;

  IF EXISTS (
    SELECT 1
    FROM public.eventos e
    WHERE e.id = ANY(v_ids)
      AND e.asistencia_grupo_id IS NOT NULL
      AND e.asistencia_grupo_id IS DISTINCT FROM v_existing_grupo
  ) THEN
    RAISE EXCEPTION 'selected events belong to different attendance groups';
  END IF;

  IF v_existing_grupo IS NOT NULL THEN
    v_grupo_id := v_existing_grupo;
    UPDATE public.evento_asistencia_grupo
    SET updated_at = now()
    WHERE id = v_grupo_id;
  ELSE
    INSERT INTO public.evento_asistencia_grupo (club_id, fecha)
    VALUES (v_club_id, v_fecha)
    RETURNING id INTO v_grupo_id;
  END IF;

  UPDATE public.eventos
  SET
    asistencia_grupo_id = v_grupo_id,
    updated_at = now()
  WHERE id = ANY(v_ids);

  RETURN v_grupo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dissolve_evento_asistencia_grupo(
  p_evento_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grupo_id UUID;
  v_remaining INTEGER;
BEGIN
  IF NOT public.user_can_manage_evento(p_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_dissolve_evento_asistencia_grupo';
  END IF;

  SELECT asistencia_grupo_id INTO v_grupo_id
  FROM public.eventos
  WHERE id = p_evento_id;

  IF v_grupo_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.eventos
  SET
    asistencia_grupo_id = NULL,
    updated_at = now()
  WHERE id = p_evento_id;

  SELECT count(*) INTO v_remaining
  FROM public.eventos
  WHERE asistencia_grupo_id = v_grupo_id;

  IF coalesce(v_remaining, 0) <= 1 THEN
    UPDATE public.eventos
    SET
      asistencia_grupo_id = NULL,
      updated_at = now()
    WHERE asistencia_grupo_id = v_grupo_id;

    DELETE FROM public.evento_asistencia_grupo
    WHERE id = v_grupo_id;
  END IF;
END;
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
  v_grupo_id UUID;
  v_at TIMESTAMPTZ := coalesce(p_actividad_inicio_at, now());
  result public.eventos;
BEGIN
  IF NOT public.user_can_manage_evento(p_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_set_evento_actividad_inicio';
  END IF;

  SELECT asistencia_grupo_id INTO v_grupo_id
  FROM public.eventos
  WHERE id = p_evento_id;

  IF v_grupo_id IS NOT NULL THEN
    UPDATE public.evento_asistencia_grupo
    SET
      actividad_inicio_at = v_at,
      updated_at = now()
    WHERE id = v_grupo_id;

    UPDATE public.eventos
    SET
      actividad_inicio_at = v_at,
      updated_at = now()
    WHERE asistencia_grupo_id = v_grupo_id;
  ELSE
    UPDATE public.eventos
    SET
      actividad_inicio_at = v_at,
      updated_at = now()
    WHERE id = p_evento_id;
  END IF;

  SELECT * INTO result
  FROM public.eventos
  WHERE id = p_evento_id;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_start_evento_escaneo(
  p_evento_id UUID
)
RETURNS public.eventos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grupo_id UUID;
  v_now TIMESTAMPTZ := now();
  result public.eventos;
BEGIN
  IF NOT public.user_can_manage_evento(p_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_start_evento_escaneo';
  END IF;

  SELECT asistencia_grupo_id INTO v_grupo_id
  FROM public.eventos
  WHERE id = p_evento_id;

  IF v_grupo_id IS NOT NULL THEN
    UPDATE public.evento_asistencia_grupo
    SET
      escaneo_inicio_at = coalesce(escaneo_inicio_at, v_now),
      updated_at = v_now
    WHERE id = v_grupo_id;

    UPDATE public.eventos
    SET
      escaneo_inicio_at = coalesce(escaneo_inicio_at, v_now),
      updated_at = v_now
    WHERE asistencia_grupo_id = v_grupo_id
      AND coalesce(estado, 'activo') = 'activo';
  ELSE
    UPDATE public.eventos
    SET
      escaneo_inicio_at = coalesce(escaneo_inicio_at, v_now),
      updated_at = v_now
    WHERE id = p_evento_id
      AND coalesce(estado, 'activo') = 'activo';
  END IF;

  SELECT * INTO result
  FROM public.eventos
  WHERE id = p_evento_id;

  IF result.id IS NULL OR coalesce(result.estado, 'activo') <> 'activo' THEN
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
  ELSE
    INSERT INTO public.evento_asistencia (evento_miembro_id, estado, checked_in_at)
    VALUES (v_evento_miembro_id, v_estado, v_now)
    RETURNING * INTO result;
  END IF;

  PERFORM public.sync_evento_checkin_to_grupo(
    p_evento_id,
    v_miembro_id,
    v_estado,
    v_now
  );

  RETURN result;
END;
$$;

GRANT SELECT ON public.evento_asistencia_grupo TO authenticated;
GRANT EXECUTE ON FUNCTION public.evento_asistencia_grupo_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_evento_checkin_to_grupo(UUID, UUID, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_evento_asistencia_grupo(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dissolve_evento_asistencia_grupo(UUID) TO authenticated;
