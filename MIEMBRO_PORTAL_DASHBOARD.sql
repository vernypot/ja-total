-- =============================================================================
-- Member portal dashboard: read-only news, events, calendar, extended profile
-- Run in Supabase SQL Editor after MIEMBRO_PORTAL_PCRYPTO_FIX.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.member_portal_get_profile(p_session_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    'nombre_opcional', m.nombre_opcional,
    'apellido_opcional', m.apellido_opcional,
    'fecha_nacimiento', m.fecha_nacimiento,
    'genero', m.genero,
    'documento', m.documento,
    'telefono', m.telefono,
    'celular', m.celular,
    'ciudad', m.ciudad,
    'direccion', m.direccion,
    'foto_url', m.foto_url,
    'estado', m.estado,
    'clubes', coalesce((
      SELECT json_agg(
        json_build_object(
          'id', c.id,
          'nombre', c.nombre,
          'iglesia_id', i.id,
          'iglesia_nombre', i.nombre,
          'timezone', i.timezone
        )
        ORDER BY i.nombre, c.nombre
      )
      FROM public.miembro_club mc
      JOIN public.clubes c ON c.id = mc.club_id
      JOIN public.iglesias i ON i.id = c.iglesia_id
      WHERE mc.miembro_id = m.id
        AND c.estado = 'activo'
    ), '[]'::json),
    'iglesias', coalesce((
      SELECT json_agg(church ORDER BY church->>'nombre')
      FROM (
        SELECT json_build_object(
          'id', i.id,
          'nombre', i.nombre,
          'timezone', i.timezone
        ) AS church
        FROM public.miembro_club mc
        JOIN public.clubes c ON c.id = mc.club_id
        JOIN public.iglesias i ON i.id = c.iglesia_id
        WHERE mc.miembro_id = m.id
          AND c.estado = 'activo'
        GROUP BY i.id, i.nombre, i.timezone
      ) churches
    ), '[]'::json)
  )
  INTO v_profile
  FROM public.miembros m
  WHERE m.id = v_miembro_id;

  RETURN v_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_fetch_noticias(
  p_session_token TEXT,
  p_placements TEXT[] DEFAULT '{dashboard}',
  p_limit INT DEFAULT 20
)
RETURNS SETOF public.noticias
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  RETURN QUERY
  SELECT n.*
  FROM public.noticias n
  WHERE n.estado = 'activo'
    AND n.publicado_en <= CURRENT_DATE
    AND (n.expira_en IS NULL OR n.expira_en >= CURRENT_DATE)
    AND n.placements && coalesce(p_placements, ARRAY['dashboard']::TEXT[])
    AND (
      n.audience = 'general'
      OR (
        n.audience = 'church'
        AND n.iglesia_id IN (
          SELECT DISTINCT c.iglesia_id
          FROM public.miembro_club mc
          JOIN public.clubes c ON c.id = mc.club_id
          WHERE mc.miembro_id = v_miembro_id
            AND c.estado = 'activo'
        )
      )
      OR (
        n.audience = 'club'
        AND n.club_id IN (
          SELECT mc.club_id
          FROM public.miembro_club mc
          JOIN public.clubes c ON c.id = mc.club_id
          WHERE mc.miembro_id = v_miembro_id
            AND c.estado = 'activo'
        )
      )
    )
  ORDER BY n.publicado_en DESC, n.created_at DESC
  LIMIT GREATEST(1, LEAST(coalesce(p_limit, 20), 50));
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
      AND e.estado = 'activo'

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
    WHERE e.estado = 'activo'
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

CREATE OR REPLACE FUNCTION public.member_portal_fetch_events(p_session_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  RETURN public.miembro_event_listing_json(v_miembro_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_fetch_calendar_events(
  p_session_token TEXT,
  p_club_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_result JSON;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.miembro_club mc
    JOIN public.clubes c ON c.id = mc.club_id
    WHERE mc.miembro_id = v_miembro_id
      AND mc.club_id = p_club_id
      AND c.estado = 'activo'
  ) THEN
    RAISE EXCEPTION 'club access denied';
  END IF;

  SELECT coalesce(json_agg(row_data ORDER BY row_data->>'fecha', row_data->>'hora'), '[]'::json)
  INTO v_result
  FROM (
    SELECT json_build_object(
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
      END
    ) AS row_data,
    e.fecha,
    e.hora
    FROM public.eventos e
    JOIN public.clubes c ON c.id = e.club_id
    LEFT JOIN public.iglesias i ON i.id = c.iglesia_id
    LEFT JOIN public.tipos_evento te ON te.id = e.tipo_evento_id
    WHERE e.club_id = p_club_id
      AND e.estado = 'activo'
      AND e.fecha >= p_start_date
      AND e.fecha <= p_end_date
  ) rows;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_portal_fetch_noticias(TEXT, TEXT[], INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.miembro_event_listing_json(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_portal_fetch_events(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_fetch_calendar_events(TEXT, UUID, DATE, DATE) TO authenticated, anon;
