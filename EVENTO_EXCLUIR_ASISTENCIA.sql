-- =============================================================================
-- Exclude events from the attendance registry (admin-only toggle).
-- Run in Supabase SQL Editor after EVENTO_ASISTENCIA_GRUPO.sql
-- =============================================================================

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS excluir_registro_asistencia BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.eventos.excluir_registro_asistencia IS
  'When true, the event is hidden from member attendance stats and QR check-in is blocked.';

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
      AND NOT coalesce(e.excluir_registro_asistencia, false)
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

  IF coalesce(v_evento.excluir_registro_asistencia, false) THEN
    RAISE EXCEPTION 'event is excluded from attendance registry';
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

CREATE OR REPLACE FUNCTION public.miembro_event_listing_json(p_miembro_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT coalesce(json_agg(row_data ORDER BY sort_fecha DESC, sort_hora DESC NULLS LAST), '[]'::json)
  INTO v_result
  FROM (
    SELECT
      json_build_object(
        'id', em.id,
        'evento_id', em.evento_id,
        'miembro_id', em.miembro_id,
        'confirmacion_estado', em.confirmacion_estado,
        'confirmado_at', em.confirmado_at,
        'evento_asistencia', coalesce((
          SELECT json_agg(json_build_object(
            'id', ea.id,
            'estado', ea.estado,
            'updated_at', ea.updated_at,
            'checked_in_at', ea.checked_in_at
          ))
          FROM public.evento_asistencia ea
          WHERE ea.evento_miembro_id = em.id
        ), '[]'::json),
        'eventos', json_build_object(
          'id', e.id,
          'club_id', e.club_id,
          'nombre', e.nombre,
          'fecha', e.fecha,
          'hora', e.hora,
          'lugar', e.lugar,
          'descripcion', e.descripcion,
          'estado', e.estado,
          'requiere_confirmacion', e.requiere_confirmacion,
          'tipo_evento_id', e.tipo_evento_id,
          'excluir_registro_asistencia', e.excluir_registro_asistencia,
          'clubes', json_build_object(
            'id', c.id,
            'nombre', c.nombre,
            'iglesia_id', c.iglesia_id,
            'iglesias', json_build_object('id', i.id, 'timezone', i.timezone)
          ),
          'tipos_evento', CASE
            WHEN te.id IS NOT NULL THEN json_build_object('id', te.id, 'nombre', te.nombre)
            ELSE NULL
          END,
          'evento_asistencia', coalesce((
            SELECT json_agg(json_build_object(
              'id', ea.id,
              'estado', ea.estado,
              'updated_at', ea.updated_at,
              'checked_in_at', ea.checked_in_at
            ))
            FROM public.evento_asistencia ea
            WHERE ea.evento_miembro_id = em.id
          ), '[]'::json)
        )
      ) AS row_data,
      e.fecha AS sort_fecha,
      e.hora AS sort_hora
    FROM public.evento_miembro em
    JOIN public.eventos e ON e.id = em.evento_id
    JOIN public.clubes c ON c.id = e.club_id
    LEFT JOIN public.iglesias i ON i.id = c.iglesia_id
    LEFT JOIN public.tipos_evento te ON te.id = e.tipo_evento_id
    WHERE em.miembro_id = p_miembro_id
      AND e.estado IN ('activo', 'finalizado')
      AND NOT coalesce(e.excluir_registro_asistencia, false)

    UNION ALL

    SELECT
      json_build_object(
        'id', NULL,
        'evento_id', e.id,
        'miembro_id', p_miembro_id,
        'confirmacion_estado', 'pendiente',
        'confirmado_at', NULL,
        'evento_asistencia', '[]'::json,
        'eventos', json_build_object(
          'id', e.id,
          'club_id', e.club_id,
          'nombre', e.nombre,
          'fecha', e.fecha,
          'hora', e.hora,
          'lugar', e.lugar,
          'descripcion', e.descripcion,
          'estado', e.estado,
          'requiere_confirmacion', e.requiere_confirmacion,
          'tipo_evento_id', e.tipo_evento_id,
          'excluir_registro_asistencia', e.excluir_registro_asistencia,
          'clubes', json_build_object(
            'id', c.id,
            'nombre', c.nombre,
            'iglesia_id', c.iglesia_id,
            'iglesias', json_build_object('id', i.id, 'timezone', i.timezone)
          ),
          'tipos_evento', CASE
            WHEN te.id IS NOT NULL THEN json_build_object('id', te.id, 'nombre', te.nombre)
            ELSE NULL
          END,
          'evento_asistencia', '[]'::json
        )
      ) AS row_data,
      e.fecha AS sort_fecha,
      e.hora AS sort_hora
    FROM public.eventos e
    JOIN public.clubes c ON c.id = e.club_id AND c.estado = 'activo'
    JOIN public.miembro_club mc ON mc.club_id = e.club_id AND mc.miembro_id = p_miembro_id
    JOIN public.miembros m ON m.id = mc.miembro_id AND coalesce(m.estado, 'activo') = 'activo'
    LEFT JOIN public.iglesias i ON i.id = c.iglesia_id
    LEFT JOIN public.tipos_evento te ON te.id = e.tipo_evento_id
    WHERE e.estado IN ('activo', 'finalizado')
      AND NOT coalesce(e.excluir_registro_asistencia, false)
      AND coalesce(e.requiere_confirmacion, true) = false
      AND NOT EXISTS (
        SELECT 1
        FROM public.evento_miembro em2
        WHERE em2.evento_id = e.id
          AND em2.miembro_id = p_miembro_id
      )
  ) combined;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_checkin_evento(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_evento_checkin_to_grupo(UUID, UUID, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.miembro_event_listing_json(UUID) TO authenticated;
