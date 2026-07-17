-- =============================================================================
-- Member meeting stats: include ended (finalizado) events, exclude cancelled.
-- Run in Supabase SQL Editor after EVENTO_ESTADO_FINALIZADO.sql
-- =============================================================================

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
          'estado', e.estado,
          'requiere_confirmacion', e.requiere_confirmacion,
          'tipo_evento_id', e.tipo_evento_id,
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
          'estado', e.estado,
          'requiere_confirmacion', e.requiere_confirmacion,
          'tipo_evento_id', e.tipo_evento_id,
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

GRANT EXECUTE ON FUNCTION public.miembro_event_listing_json(UUID) TO authenticated;
