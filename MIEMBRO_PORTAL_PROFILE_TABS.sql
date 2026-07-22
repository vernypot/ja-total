-- =============================================================================
-- Member portal profile tabs: read-only medical, contacts, specialties, cargos,
-- classes, carnet data for authenticated portal sessions.
-- Run in Supabase SQL Editor after MIEMBRO_PORTAL_DASHBOARD.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.member_portal_fetch_tab(
  p_session_token TEXT,
  p_tab TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_tab TEXT := lower(trim(coalesce(p_tab, '')));
  v_result JSON;
  v_class_link_col TEXT;
  v_has_completion_cols BOOLEAN;
  v_has_estado_progreso BOOLEAN;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  CASE v_tab
    WHEN 'medical' THEN
      SELECT json_build_object(
        'data', (
          SELECT row_to_json(dm)
          FROM public.miembro_datos_medicos dm
          WHERE dm.miembro_id = v_miembro_id
          LIMIT 1
        ),
        'member', (
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
            'foto_url', m.foto_url
          )
          FROM public.miembros m
          WHERE m.id = v_miembro_id
        ),
        'contacts', coalesce((
          SELECT json_agg(row_to_json(c) ORDER BY c.nombre)
          FROM (
            SELECT id, miembro_id, nombre, telefono, relacion, 'activo'::text AS estado
            FROM public.miembro_contactos
            WHERE miembro_id = v_miembro_id
          ) c
        ), '[]'::json),
        'clubs', coalesce((
          SELECT json_agg(club_row ORDER BY club_row->>'nombre')
          FROM (
            SELECT json_build_object(
              'id', c.id,
              'nombre', c.nombre,
              'logo_url', c.logo_url,
              'tipos_club', CASE
                WHEN tc.id IS NOT NULL THEN json_build_object(
                  'id', tc.id,
                  'nombre', tc.nombre,
                  'logo_url', tc.logo_url
                )
                ELSE NULL
              END
            ) AS club_row
            FROM public.miembro_club mc
            JOIN public.clubes c ON c.id = mc.club_id
            LEFT JOIN public.tipos_club tc ON tc.id = c.tipo_id
            WHERE mc.miembro_id = v_miembro_id
              AND c.estado = 'activo'
          ) clubs
        ), '[]'::json)
      )
      INTO v_result;

    WHEN 'contacts' THEN
      SELECT coalesce(json_agg(row_to_json(c) ORDER BY c.nombre), '[]'::json)
      INTO v_result
      FROM (
        SELECT id, miembro_id, nombre, telefono, relacion, 'activo'::text AS estado
        FROM public.miembro_contactos
        WHERE miembro_id = v_miembro_id
      ) c;

    WHEN 'specialties' THEN
      SELECT json_build_object(
        'assigned', coalesce((
          SELECT json_agg(row_data ORDER BY row_data->'especialidades'->>'nombre')
          FROM (
            SELECT json_build_object(
              'id', me.id,
              'miembro_id', me.miembro_id,
              'especialidad_id', me.especialidad_id,
              'especialidades', json_build_object(
                'id', e.id,
                'nombre', e.nombre,
                'club_tipo', e.club_tipo
              )
            ) AS row_data
            FROM public.miembro_especialidad me
            JOIN public.especialidades e ON e.id = me.especialidad_id
            WHERE me.miembro_id = v_miembro_id
          ) rows
        ), '[]'::json),
        'requisitos', coalesce((
          SELECT json_agg(json_build_object(
            'id', er.id,
            'especialidad_id', er.especialidad_id,
            'descripcion', er.descripcion,
            'estado', 'activo'
          ))
          FROM public.especialidad_requisitos er
          WHERE er.especialidad_id IN (
            SELECT me.especialidad_id
            FROM public.miembro_especialidad me
            WHERE me.miembro_id = v_miembro_id
          )
        ), '[]'::json),
        'memberTipos', coalesce((
          SELECT json_agg(tipo_row ORDER BY tipo_row->>'nombre')
          FROM (
            SELECT DISTINCT ON (tc.id)
              json_build_object('id', tc.id, 'nombre', tc.nombre) AS tipo_row
            FROM public.miembro_club mc
            JOIN public.clubes c ON c.id = mc.club_id
            JOIN public.tipos_club tc ON tc.id = c.tipo_id
            WHERE mc.miembro_id = v_miembro_id
              AND c.estado = 'activo'
          ) tipos
        ), '[]'::json)
      )
      INTO v_result;

    WHEN 'cargos' THEN
      SELECT json_build_object(
        'assignments', coalesce((
          SELECT json_agg(row_data ORDER BY (row_data->>'en_curso')::boolean DESC, row_data->>'fecha_inicio' DESC NULLS LAST)
          FROM (
            SELECT json_build_object(
              'id', mc.id,
              'miembro_id', mc.miembro_id,
              'cargo_id', mc.cargo_id,
              'club_id', mc.club_id,
              'fecha_inicio', mc.fecha_inicio,
              'fecha_fin', mc.fecha_fin,
              'en_curso', mc.en_curso,
              'notas', mc.notas,
              'estado', coalesce(mc.estado, 'activo'),
              'cargos', json_build_object(
                'id', cg.id,
                'nombre', cg.nombre,
                'parent_id', cg.parent_id,
                'tipo_id', cg.tipo_id
              ),
              'clubes', json_build_object('id', cl.id, 'nombre', cl.nombre)
            ) AS row_data
            FROM public.miembro_cargos mc
            JOIN public.cargos cg ON cg.id = mc.cargo_id
            LEFT JOIN public.clubes cl ON cl.id = mc.club_id
            WHERE mc.miembro_id = v_miembro_id
          ) rows
        ), '[]'::json),
        'catalog', coalesce((
          SELECT json_agg(json_build_object(
            'id', cg.id,
            'nombre', cg.nombre,
            'parent_id', cg.parent_id,
            'tipo_id', cg.tipo_id,
            'estado', coalesce(cg.estado, 'activo')
          ) ORDER BY cg.nombre)
          FROM public.cargos cg
          WHERE coalesce(cg.estado, 'activo') = 'activo'
        ), '[]'::json)
      )
      INTO v_result;

    WHEN 'classes' THEN
      SELECT CASE
        WHEN EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'miembro_clase_progresiva'
            AND column_name = 'clase_progresiva_id'
        ) THEN 'clase_progresiva_id'
        ELSE 'clase_id'
      END
      INTO v_class_link_col;

      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'miembro_clase_progresiva'
          AND column_name = 'completado'
      )
      INTO v_has_completion_cols;

      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'miembro_clase_progresiva'
          AND column_name = 'estado_progreso'
      )
      INTO v_has_estado_progreso;

      EXECUTE format($sql$
        SELECT json_build_object(
          'assigned', coalesce((
            SELECT json_agg(row_data ORDER BY row_data->'clases_progresivas'->>'nombre')
            FROM (
              SELECT json_build_object(
                'id', mcp.id,
                'miembro_id', mcp.miembro_id,
                'clase_progresiva_id', mcp.%1$I,
                'estado', 'activo',
                'completado', %2$s,
                'fecha_completado', %3$s,
                'tiene_investidura', %4$s,
                'investidura_fecha', %5$s,
                'investidura_lugar', %6$s,
                'investidura_validado_por_nombre', %7$s,
                'estado_progreso', %8$s,
                'clases_progresivas', json_build_object(
                  'id', cp.id,
                  'nombre', cp.nombre,
                  'tipo_id', cp.tipo_id,
                  'club_tipo', cp.club_tipo,
                  'estado', 'activo',
                  'tipos_club', CASE
                    WHEN tc.id IS NOT NULL THEN json_build_object('nombre', tc.nombre)
                    ELSE NULL
                  END
                )
              ) AS row_data
              FROM public.miembro_clase_progresiva mcp
              JOIN public.clases_progresivas cp ON cp.id = mcp.%1$I
              LEFT JOIN public.tipos_club tc ON tc.id = cp.tipo_id
              WHERE mcp.miembro_id = %9$L
            ) rows
          ), '[]'::json),
          'requisitos', coalesce((
            SELECT json_agg(json_build_object(
              'id', cr.id,
              'clase_id', cr.clase_id,
              'seccion_id', cr.seccion_id,
              'numero', cr.numero,
              'orden', cr.orden,
              'descripcion', cr.descripcion,
              'texto_opcional', cr.texto_opcional,
              'sesiones_esperadas', cr.sesiones_esperadas,
              'clase_requisito_secciones', CASE
                WHEN crs.id IS NOT NULL THEN json_build_object(
                  'id', crs.id,
                  'parte', crs.parte,
                  'numero_romano', crs.numero_romano,
                  'nombre', crs.nombre,
                  'orden', crs.orden
                )
                ELSE NULL
              END
            ))
            FROM public.clase_requisitos cr
            LEFT JOIN public.clase_requisito_secciones crs ON crs.id = cr.seccion_id
            WHERE cr.clase_id IN (
              SELECT mcp.%1$I
              FROM public.miembro_clase_progresiva mcp
              WHERE mcp.miembro_id = %9$L
            )
          ), '[]'::json),
          'secciones', coalesce((
            SELECT json_agg(json_build_object(
              'id', crs.id,
              'clase_id', crs.clase_id,
              'parte', crs.parte,
              'numero_romano', crs.numero_romano,
              'nombre', crs.nombre,
              'orden', crs.orden
            ) ORDER BY crs.clase_id, crs.orden, crs.parte)
            FROM public.clase_requisito_secciones crs
            WHERE crs.clase_id IN (
              SELECT mcp.%1$I
              FROM public.miembro_clase_progresiva mcp
              WHERE mcp.miembro_id = %9$L
            )
          ), '[]'::json),
          'solicitudes', CASE
            WHEN EXISTS (
              SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = 'miembro_clase_aprobacion_solicitud'
            ) THEN coalesce((
              SELECT json_agg(json_build_object(
                'id', s.id,
                'miembro_clase_progresiva_id', s.miembro_clase_progresiva_id,
                'clase_requisito_id', s.clase_requisito_id,
                'tipo', s.tipo,
                'estado', s.estado,
                'comentario_miembro', s.comentario_miembro,
                'comentario_lider', s.comentario_lider,
                'solicitado_at', s.solicitado_at,
                'revisado_at', s.revisado_at
              ) ORDER BY s.solicitado_at DESC)
              FROM public.miembro_clase_aprobacion_solicitud s
              WHERE s.miembro_id = %9$L
            ), '[]'::json)
            ELSE '[]'::json
          END,
          'completions', coalesce((
            SELECT json_agg(json_build_object(
              'id', mcr.id,
              'miembro_clase_progresiva_id', mcr.miembro_clase_progresiva_id,
              'clase_requisito_id', mcr.clase_requisito_id,
              'completado', coalesce(mcr.completado, false),
              'fecha_completado', mcr.fecha_completado,
              'validado_por_usuario_id', mcr.validado_por_usuario_id,
              'validado_por_nombre', mcr.validado_por_nombre,
              'comentarios', mcr.comentarios,
              'texto_reemplazo', mcr.texto_reemplazo,
              'usar_texto_alternativo', coalesce(mcr.usar_texto_alternativo, false)
            ))
            FROM public.miembro_clase_requisito mcr
            WHERE mcr.miembro_clase_progresiva_id IN (
              SELECT mcp.id
              FROM public.miembro_clase_progresiva mcp
              WHERE mcp.miembro_id = %9$L
            )
          ), '[]'::json),
          'memberTipos', coalesce((
            SELECT json_agg(tipo_row ORDER BY tipo_row->>'nombre')
            FROM (
              SELECT DISTINCT ON (tc.id)
                json_build_object('id', tc.id, 'nombre', tc.nombre) AS tipo_row
              FROM public.miembro_club mc
              JOIN public.clubes c ON c.id = mc.club_id
              JOIN public.tipos_club tc ON tc.id = c.tipo_id
              WHERE mc.miembro_id = %9$L
                AND c.estado = 'activo'
            ) tipos
          ), '[]'::json),
          'historial', CASE
            WHEN EXISTS (
              SELECT 1
              FROM information_schema.tables
              WHERE table_schema = 'public'
                AND table_name = 'miembro_clase_historial'
            ) THEN coalesce((
              SELECT json_agg(row_data ORDER BY row_data->>'nombre')
              FROM (
                SELECT json_build_object(
                  'id', h.id,
                  'miembro_id', h.miembro_id,
                  'nombre', h.nombre,
                  'clase_progresiva_id', h.clase_progresiva_id,
                  'club_id', h.club_id,
                  'club_nombre', h.club_nombre,
                  'estado_progreso', h.estado_progreso,
                  'fecha_completado', h.fecha_completado,
                  'tiene_investidura', coalesce(h.tiene_investidura, false),
                  'investidura_fecha', h.investidura_fecha,
                  'investidura_lugar', h.investidura_lugar,
                  'investidura_validado_por_nombre', h.investidura_validado_por_nombre,
                  'notas', h.notas,
                  'clubes', CASE
                    WHEN c.id IS NOT NULL THEN json_build_object(
                      'id', c.id,
                      'nombre', c.nombre,
                      'tipos_club', CASE
                        WHEN tc.id IS NOT NULL THEN json_build_object('nombre', tc.nombre)
                        ELSE NULL
                      END
                    )
                    ELSE NULL
                  END
                ) AS row_data
                FROM public.miembro_clase_historial h
                LEFT JOIN public.clubes c ON c.id = h.club_id
                LEFT JOIN public.tipos_club tc ON tc.id = c.tipo_id
                WHERE h.miembro_id = %9$L
              ) historial_rows
            ), '[]'::json)
            ELSE '[]'::json
          END
        )
      $sql$,
        v_class_link_col,
        CASE WHEN v_has_completion_cols THEN 'coalesce(mcp.completado, false)' ELSE 'false' END,
        CASE WHEN v_has_completion_cols THEN 'mcp.fecha_completado' ELSE 'NULL' END,
        CASE WHEN v_has_completion_cols THEN 'coalesce(mcp.tiene_investidura, false)' ELSE 'false' END,
        CASE WHEN v_has_completion_cols THEN 'mcp.investidura_fecha' ELSE 'NULL' END,
        CASE WHEN v_has_completion_cols THEN 'mcp.investidura_lugar' ELSE 'NULL' END,
        CASE WHEN v_has_completion_cols THEN 'mcp.investidura_validado_por_nombre' ELSE 'NULL' END,
        CASE
          WHEN v_has_estado_progreso THEN 'coalesce(mcp.estado_progreso, ''sin_iniciar'')'
          WHEN v_has_completion_cols THEN
            'CASE WHEN coalesce(mcp.tiene_investidura, false) THEN ''investida'' WHEN coalesce(mcp.completado, false) THEN ''completada'' ELSE ''sin_iniciar'' END'
          ELSE '''sin_iniciar'''
        END,
        v_miembro_id
      )
      INTO v_result;

    WHEN 'distinciones' THEN
      IF to_regclass('public.miembro_distincion') IS NULL THEN
        v_result := json_build_object('assigned', '[]'::json);
      ELSE
        SELECT json_build_object(
          'assigned', coalesce((
            SELECT json_agg(row_data ORDER BY row_data->>'fecha_otorgada' DESC NULLS LAST)
            FROM (
              SELECT json_build_object(
                'id', md.id,
                'miembro_id', md.miembro_id,
                'distincion_id', md.distincion_id,
                'club_id', md.club_id,
                'fecha_otorgada', md.fecha_otorgada,
                'notas', md.notas,
                'estado', md.estado,
                'distinciones', json_build_object(
                  'id', d.id,
                  'nombre', d.nombre,
                  'descripcion', d.descripcion,
                  'orden', d.orden,
                  'estado', d.estado
                ),
                'clubes', CASE
                  WHEN cl.id IS NOT NULL THEN json_build_object('id', cl.id, 'nombre', cl.nombre)
                  ELSE NULL
                END
              ) AS row_data
              FROM public.miembro_distincion md
              JOIN public.distinciones d ON d.id = md.distincion_id
              LEFT JOIN public.clubes cl ON cl.id = md.club_id
              WHERE md.miembro_id = v_miembro_id
            ) rows
          ), '[]'::json)
        )
        INTO v_result;
      END IF;

    WHEN 'carnet' THEN
      SELECT json_build_object(
        'member', (
          SELECT json_build_object(
            'id', m.id,
            'nombre', m.nombre,
            'apellido1', m.apellido1,
            'apellido2', m.apellido2,
            'nombre_opcional', m.nombre_opcional,
            'apellido_opcional', m.apellido_opcional,
            'fecha_nacimiento', m.fecha_nacimiento,
            'foto_url', m.foto_url
          )
          FROM public.miembros m
          WHERE m.id = v_miembro_id
        ),
        'medical', (
          SELECT row_to_json(dm)
          FROM public.miembro_datos_medicos dm
          WHERE dm.miembro_id = v_miembro_id
          LIMIT 1
        ),
        'clubs', coalesce((
          SELECT json_agg(club_row ORDER BY club_row->>'nombre')
          FROM (
            SELECT json_build_object(
              'id', c.id,
              'nombre', c.nombre,
              'logo_url', c.logo_url,
              'tipos_club', CASE
                WHEN tc.id IS NOT NULL THEN json_build_object(
                  'id', tc.id,
                  'nombre', tc.nombre,
                  'logo_url', tc.logo_url
                )
                ELSE NULL
              END
            ) AS club_row
            FROM public.miembro_club mc
            JOIN public.clubes c ON c.id = mc.club_id
            LEFT JOIN public.tipos_club tc ON tc.id = c.tipo_id
            WHERE mc.miembro_id = v_miembro_id
              AND c.estado = 'activo'
          ) clubs
        ), '[]'::json),
        'token', (
          SELECT t.token
          FROM public.miembro_profile_tokens t
          WHERE t.miembro_id = v_miembro_id
            AND t.activo = true
          LIMIT 1
        )
      )
      INTO v_result;

    ELSE
      RAISE EXCEPTION 'unknown profile tab: %', p_tab;
  END CASE;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_portal_fetch_tab(TEXT, TEXT) TO authenticated, anon;
