-- =============================================================================
-- Usuario Avanzado (advanced) — event meeting & card-scan operations
-- Run in Supabase Dashboard → SQL Editor after USUARIOS_RLS_FIX.sql / EVENTOS_SCHEMA.sql
--
-- Grants church-assigned advanced users permission to:
--   • initialize / end events (start & close meetings)
--   • open QR card scanning and check members in
--   • record attendance / confirmation during an active session
-- Does NOT grant full event CRUD (create/edit/cancel) — still admin-only.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_usuarios_advanced()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() = 'advanced';
$$;

CREATE OR REPLACE FUNCTION public.user_can_operate_event_club(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_usuarios_superadmin()
    OR public.user_can_manage_club(p_club_id)
    OR (
      public.is_usuarios_advanced()
      AND EXISTS (
        SELECT 1
        FROM public.clubes c
        JOIN public.usuario_iglesia ui ON ui.iglesia_id = c.iglesia_id
        WHERE c.id = p_club_id
          AND ui.usuario_id = public.get_user_id()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_operate_evento(p_evento_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.eventos e
    WHERE e.id = p_evento_id
      AND public.user_can_operate_event_club(e.club_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_usuarios_advanced() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_operate_event_club(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_operate_evento(UUID) TO authenticated;

-- End event (close meeting / close scanning)
CREATE OR REPLACE FUNCTION public.admin_end_evento(p_evento_id UUID)
RETURNS public.eventos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.eventos;
BEGIN
  IF NOT public.user_can_operate_evento(p_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_end_evento';
  END IF;

  UPDATE public.eventos
  SET
    estado = 'finalizado',
    updated_at = now()
  WHERE id = p_evento_id
    AND coalesce(estado, 'activo') = 'activo'
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'event not found or already ended';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_end_evento(UUID) TO authenticated;

-- Patch meeting / scan RPCs to allow advanced operators
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
  IF NOT public.user_can_operate_evento(p_evento_id) THEN
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
  IF NOT public.user_can_operate_evento(p_evento_id) THEN
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

CREATE OR REPLACE FUNCTION public.admin_set_evento_asistencia(
  p_evento_miembro_id UUID,
  p_estado TEXT
)
RETURNS public.evento_asistencia
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.evento_asistencia;
  v_evento_id UUID;
BEGIN
  IF p_estado NOT IN ('a_tiempo', 'tarde', 'ausente') THEN
    RAISE EXCEPTION 'invalid attendance status';
  END IF;

  SELECT em.evento_id INTO v_evento_id
  FROM public.evento_miembro em
  WHERE em.id = p_evento_miembro_id;

  IF v_evento_id IS NULL THEN
    RAISE EXCEPTION 'event member assignment not found';
  END IF;

  IF NOT public.user_can_operate_evento(v_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_set_evento_asistencia';
  END IF;

  INSERT INTO public.evento_asistencia (evento_miembro_id, estado)
  VALUES (p_evento_miembro_id, p_estado)
  ON CONFLICT (evento_miembro_id)
  DO UPDATE SET estado = EXCLUDED.estado, updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_evento_confirmacion(
  p_evento_miembro_id UUID,
  p_confirmacion_estado TEXT
)
RETURNS public.evento_miembro
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.evento_miembro;
  v_evento_id UUID;
BEGIN
  IF p_confirmacion_estado NOT IN ('pendiente', 'confirmado', 'rechazado') THEN
    RAISE EXCEPTION 'invalid confirmation status';
  END IF;

  SELECT em.evento_id INTO v_evento_id
  FROM public.evento_miembro em
  WHERE em.id = p_evento_miembro_id;

  IF v_evento_id IS NULL THEN
    RAISE EXCEPTION 'event member assignment not found';
  END IF;

  IF NOT public.user_can_operate_evento(v_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_set_evento_confirmacion';
  END IF;

  UPDATE public.evento_miembro
  SET
    confirmacion_estado = p_confirmacion_estado,
    confirmado_at = CASE
      WHEN p_confirmacion_estado IN ('confirmado', 'rechazado') THEN now()
      ELSE NULL
    END
  WHERE id = p_evento_miembro_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- admin_checkin_evento: replace permission guard only (body unchanged from EVENTO_ASISTENCIA_GRUPO)
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
  IF NOT public.user_can_operate_evento(p_evento_id) THEN
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

-- Allow church-assigned staff (including advanced users) to read member event listings
CREATE OR REPLACE FUNCTION public.fetch_miembro_event_listing(p_miembro_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_usuario_id UUID;
BEGIN
  IF NOT public.user_can_access_miembro(p_miembro_id) THEN
    v_current_usuario_id := public.resolve_current_usuario_id();
    IF v_current_usuario_id IS NULL
      OR p_miembro_id IS DISTINCT FROM public.resolve_linked_miembro_id_for_current_usuario() THEN
      RAISE EXCEPTION 'permission denied';
    END IF;
  END IF;

  RETURN public.miembro_event_listing_json(p_miembro_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Advanced users: request class/requirement approval on behalf of a member
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fetch_miembro_clase_aprobacion_solicitudes(p_miembro_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_link_col TEXT;
  v_result JSON;
BEGIN
  IF NOT (
    public.user_can_manage_miembro(p_miembro_id)
    OR (
      public.is_usuarios_advanced()
      AND public.user_can_access_miembro(p_miembro_id)
    )
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'miembro_clase_progresiva' AND column_name = 'clase_progresiva_id'
    ) THEN 'clase_progresiva_id'
    ELSE 'clase_id'
  END INTO v_class_link_col;

  EXECUTE format($sql$
    SELECT coalesce(json_agg(row_data ORDER BY row_data->>'solicitado_at' DESC), '[]'::json)
    FROM (
      SELECT json_build_object(
        'id', s.id,
        'miembro_id', s.miembro_id,
        'miembro_clase_progresiva_id', s.miembro_clase_progresiva_id,
        'clase_requisito_id', s.clase_requisito_id,
        'tipo', s.tipo,
        'estado', s.estado,
        'comentario_miembro', s.comentario_miembro,
        'comentario_lider', s.comentario_lider,
        'revisado_por_usuario_id', s.revisado_por_usuario_id,
        'revisado_por_nombre', s.revisado_por_nombre,
        'solicitado_at', s.solicitado_at,
        'revisado_at', s.revisado_at,
        'clase_requisitos', CASE
          WHEN cr.id IS NOT NULL THEN json_build_object(
            'id', cr.id,
            'numero', cr.numero,
            'descripcion', cr.descripcion,
            'texto_opcional', cr.texto_opcional
          )
          ELSE NULL
        END,
        'clases_progresivas', json_build_object(
          'id', cp.id,
          'nombre', cp.nombre
        )
      ) AS row_data
      FROM public.miembro_clase_aprobacion_solicitud s
      JOIN public.miembro_clase_progresiva mcp ON mcp.id = s.miembro_clase_progresiva_id
      JOIN public.clases_progresivas cp ON cp.id = mcp.%1$I
      LEFT JOIN public.clase_requisitos cr ON cr.id = s.clase_requisito_id
      WHERE s.miembro_id = %2$L
    ) rows
  $sql$, v_class_link_col, p_miembro_id)
  INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_request_requisito_approval(
  p_miembro_id UUID,
  p_assignment_id UUID,
  p_clase_requisito_id UUID,
  p_comentario TEXT DEFAULT NULL
)
RETURNS public.miembro_clase_aprobacion_solicitud
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_miembro_id UUID;
  v_clase_id UUID;
  v_class_link_col TEXT;
  v_already_complete BOOLEAN;
  result public.miembro_clase_aprobacion_solicitud;
BEGIN
  IF NOT public.is_usuarios_advanced() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF NOT public.user_can_access_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'miembro_clase_progresiva' AND column_name = 'clase_progresiva_id'
    ) THEN 'clase_progresiva_id'
    ELSE 'clase_id'
  END INTO v_class_link_col;

  EXECUTE format(
    'SELECT mcp.miembro_id, mcp.%I FROM public.miembro_clase_progresiva mcp WHERE mcp.id = $1',
    v_class_link_col
  )
  INTO v_assignment_miembro_id, v_clase_id
  USING p_assignment_id;

  IF v_clase_id IS NULL OR v_assignment_miembro_id IS NULL THEN
    RAISE EXCEPTION 'class assignment not found';
  END IF;

  IF v_assignment_miembro_id <> p_miembro_id THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clase_requisitos cr
    WHERE cr.id = p_clase_requisito_id AND cr.clase_id = v_clase_id
  ) THEN
    RAISE EXCEPTION 'requirement not found for this class';
  END IF;

  SELECT coalesce(mcr.completado, false) INTO v_already_complete
  FROM public.miembro_clase_requisito mcr
  WHERE mcr.miembro_clase_progresiva_id = p_assignment_id
    AND mcr.clase_requisito_id = p_clase_requisito_id;

  IF coalesce(v_already_complete, false) THEN
    RAISE EXCEPTION 'requirement already completed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.miembro_clase_aprobacion_solicitud s
    WHERE s.miembro_clase_progresiva_id = p_assignment_id
      AND s.clase_requisito_id = p_clase_requisito_id
      AND s.estado = 'pendiente'
  ) THEN
    RAISE EXCEPTION 'approval request already pending';
  END IF;

  INSERT INTO public.miembro_clase_aprobacion_solicitud (
    miembro_id,
    miembro_clase_progresiva_id,
    clase_requisito_id,
    tipo,
    comentario_miembro
  )
  VALUES (
    p_miembro_id,
    p_assignment_id,
    p_clase_requisito_id,
    'requisito',
    nullif(trim(coalesce(p_comentario, '')), '')
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_request_clase_approval(
  p_miembro_id UUID,
  p_assignment_id UUID,
  p_comentario TEXT DEFAULT NULL
)
RETURNS public.miembro_clase_aprobacion_solicitud
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_miembro_id UUID;
  v_estado_progreso TEXT;
  v_completado BOOLEAN;
  result public.miembro_clase_aprobacion_solicitud;
BEGIN
  IF NOT public.is_usuarios_advanced() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF NOT public.user_can_access_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT mcp.miembro_id,
    coalesce(mcp.estado_progreso, 'sin_iniciar'),
    coalesce(mcp.completado, false)
  INTO v_assignment_miembro_id, v_estado_progreso, v_completado
  FROM public.miembro_clase_progresiva mcp
  WHERE mcp.id = p_assignment_id;

  IF v_assignment_miembro_id IS NULL THEN
    RAISE EXCEPTION 'class assignment not found';
  END IF;

  IF v_assignment_miembro_id <> p_miembro_id THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF v_completado OR v_estado_progreso IN ('completada', 'investida') THEN
    RAISE EXCEPTION 'class already completed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.miembro_clase_aprobacion_solicitud s
    WHERE s.miembro_clase_progresiva_id = p_assignment_id
      AND s.tipo = 'clase'
      AND s.estado = 'pendiente'
  ) THEN
    RAISE EXCEPTION 'approval request already pending';
  END IF;

  INSERT INTO public.miembro_clase_aprobacion_solicitud (
    miembro_id,
    miembro_clase_progresiva_id,
    clase_requisito_id,
    tipo,
    comentario_miembro
  )
  VALUES (
    p_miembro_id,
    p_assignment_id,
    NULL,
    'clase',
    nullif(trim(coalesce(p_comentario, '')), '')
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_request_requisito_approval(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_request_clase_approval(UUID, UUID, TEXT) TO authenticated;
