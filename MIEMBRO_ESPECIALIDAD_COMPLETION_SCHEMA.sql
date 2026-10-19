-- =============================================================================
-- Whole-honor completion on miembro_especialidad, plus request/review for the
-- honor as a complete item (tipo = 'especialidad'). Individual requisitos stay
-- available. Run after MIEMBRO_ESPECIALIDAD_APROBACION_SCHEMA.sql
-- =============================================================================

ALTER TABLE public.miembro_especialidad
  ADD COLUMN IF NOT EXISTS completado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.miembro_especialidad
  ADD COLUMN IF NOT EXISTS fecha_completado DATE;

ALTER TABLE public.miembro_especialidad
  ADD COLUMN IF NOT EXISTS validado_por_usuario_id UUID
    REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE public.miembro_especialidad
  ADD COLUMN IF NOT EXISTS validado_por_nombre TEXT;

ALTER TABLE public.miembro_especialidad
  ADD COLUMN IF NOT EXISTS comentarios TEXT;

COMMENT ON COLUMN public.miembro_especialidad.completado IS
  'Whether the assigned honor has been approved as a complete item.';

-- ---------------------------------------------------------------------------
-- Admin: mark the honor complete (also completes all requisitos)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.upsert_miembro_especialidad_progress(
  p_assignment_id UUID,
  p_completado BOOLEAN,
  p_fecha_completado DATE DEFAULT NULL,
  p_validado_por_usuario_id UUID DEFAULT NULL,
  p_validado_por_nombre TEXT DEFAULT NULL,
  p_comentarios TEXT DEFAULT NULL
)
RETURNS public.miembro_especialidad
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_especialidad_id UUID;
  result public.miembro_especialidad;
BEGIN
  SELECT me.miembro_id, me.especialidad_id
  INTO v_miembro_id, v_especialidad_id
  FROM public.miembro_especialidad me
  WHERE me.id = p_assignment_id;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'specialty assignment not found';
  END IF;

  IF NOT public.user_can_manage_miembro(v_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for upsert_miembro_especialidad_progress';
  END IF;

  IF p_completado AND p_fecha_completado IS NULL THEN
    p_fecha_completado := CURRENT_DATE;
  END IF;

  IF NOT p_completado THEN
    p_fecha_completado := NULL;
  END IF;

  UPDATE public.miembro_especialidad
  SET
    completado = p_completado,
    fecha_completado = p_fecha_completado,
    validado_por_usuario_id = CASE
      WHEN p_completado THEN p_validado_por_usuario_id ELSE NULL
    END,
    validado_por_nombre = CASE
      WHEN p_completado THEN NULLIF(trim(p_validado_por_nombre), '') ELSE NULL
    END,
    comentarios = NULLIF(trim(p_comentarios), '')
  WHERE id = p_assignment_id
  RETURNING * INTO result;

  IF p_completado THEN
    INSERT INTO public.miembro_especialidad_requisito (
      miembro_especialidad_id,
      especialidad_requisito_id,
      completado,
      fecha_completado,
      validado_por_usuario_id,
      validado_por_nombre,
      comentarios
    )
    SELECT
      p_assignment_id,
      er.id,
      true,
      p_fecha_completado,
      p_validado_por_usuario_id,
      NULLIF(trim(p_validado_por_nombre), ''),
      NULLIF(trim(p_comentarios), '')
    FROM public.especialidad_requisitos er
    WHERE er.especialidad_id = v_especialidad_id
    ON CONFLICT (miembro_especialidad_id, especialidad_requisito_id) DO UPDATE SET
      completado = true,
      fecha_completado = EXCLUDED.fecha_completado,
      validado_por_usuario_id = EXCLUDED.validado_por_usuario_id,
      validado_por_nombre = EXCLUDED.validado_por_nombre,
      comentarios = COALESCE(public.miembro_especialidad_requisito.comentarios, EXCLUDED.comentarios),
      updated_at = now();

    UPDATE public.miembro_especialidad_aprobacion_solicitud
    SET
      estado = 'aprobado',
      revisado_por_usuario_id = p_validado_por_usuario_id,
      revisado_por_nombre = NULLIF(trim(p_validado_por_nombre), ''),
      revisado_at = now(),
      updated_at = now()
    WHERE miembro_especialidad_id = p_assignment_id
      AND estado = 'pendiente';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_miembro_especialidad_progress(
  UUID, BOOLEAN, DATE, UUID, TEXT, TEXT
) TO authenticated;

-- ---------------------------------------------------------------------------
-- Shared insert for whole-honor approval request
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._insert_especialidad_approval(
  p_miembro_id UUID,
  p_assignment_id UUID,
  p_comentario TEXT
)
RETURNS public.miembro_especialidad_aprobacion_solicitud
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_miembro_id UUID;
  v_completado BOOLEAN;
  result public.miembro_especialidad_aprobacion_solicitud;
BEGIN
  SELECT me.miembro_id, coalesce(me.completado, false)
  INTO v_assignment_miembro_id, v_completado
  FROM public.miembro_especialidad me
  WHERE me.id = p_assignment_id;

  IF v_assignment_miembro_id IS NULL THEN
    RAISE EXCEPTION 'specialty assignment not found';
  END IF;

  IF v_assignment_miembro_id <> p_miembro_id THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF coalesce(v_completado, false) THEN
    RAISE EXCEPTION 'specialty already completed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.miembro_especialidad_aprobacion_solicitud s
    WHERE s.miembro_especialidad_id = p_assignment_id
      AND s.tipo = 'especialidad'
      AND s.estado = 'pendiente'
  ) THEN
    RAISE EXCEPTION 'approval request already pending';
  END IF;

  INSERT INTO public.miembro_especialidad_aprobacion_solicitud (
    miembro_id,
    miembro_especialidad_id,
    especialidad_requisito_id,
    tipo,
    comentario_miembro
  )
  VALUES (
    p_miembro_id,
    p_assignment_id,
    NULL,
    'especialidad',
    nullif(trim(coalesce(p_comentario, '')), '')
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_request_especialidad_approval(
  p_session_token TEXT,
  p_assignment_id UUID,
  p_comentario TEXT DEFAULT NULL
)
RETURNS public.miembro_especialidad_aprobacion_solicitud
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

  RETURN public._insert_especialidad_approval(
    v_miembro_id,
    p_assignment_id,
    p_comentario
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_portal_request_especialidad_approval(TEXT, UUID, TEXT)
  TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.staff_request_especialidad_approval(
  p_miembro_id UUID,
  p_assignment_id UUID,
  p_comentario TEXT DEFAULT NULL
)
RETURNS public.miembro_especialidad_aprobacion_solicitud
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.usuario_can_request_miembro_approval(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN public._insert_especialidad_approval(
    p_miembro_id,
    p_assignment_id,
    p_comentario
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_request_especialidad_approval(UUID, UUID, TEXT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Review: approving the honor marks it complete (and all requisitos)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.review_miembro_especialidad_aprobacion_solicitud(
  p_solicitud_id UUID,
  p_aprobar BOOLEAN,
  p_comentario_lider TEXT DEFAULT NULL,
  p_revisor_usuario_id UUID DEFAULT NULL,
  p_revisor_nombre TEXT DEFAULT NULL
)
RETURNS public.miembro_especialidad_aprobacion_solicitud
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solicitud public.miembro_especialidad_aprobacion_solicitud;
  result public.miembro_especialidad_aprobacion_solicitud;
BEGIN
  SELECT * INTO v_solicitud
  FROM public.miembro_especialidad_aprobacion_solicitud
  WHERE id = p_solicitud_id
  FOR UPDATE;

  IF v_solicitud.id IS NULL THEN
    RAISE EXCEPTION 'approval request not found';
  END IF;

  IF NOT public.user_can_manage_miembro(v_solicitud.miembro_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF v_solicitud.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'approval request already reviewed';
  END IF;

  UPDATE public.miembro_especialidad_aprobacion_solicitud
  SET
    estado = CASE WHEN p_aprobar THEN 'aprobado' ELSE 'rechazado' END,
    comentario_lider = nullif(trim(coalesce(p_comentario_lider, '')), ''),
    revisado_por_usuario_id = p_revisor_usuario_id,
    revisado_por_nombre = nullif(trim(coalesce(p_revisor_nombre, '')), ''),
    revisado_at = now(),
    updated_at = now()
  WHERE id = p_solicitud_id
  RETURNING * INTO result;

  IF p_aprobar THEN
    IF v_solicitud.tipo = 'especialidad' THEN
      PERFORM public.upsert_miembro_especialidad_progress(
        v_solicitud.miembro_especialidad_id,
        true,
        CURRENT_DATE,
        p_revisor_usuario_id,
        nullif(trim(coalesce(p_revisor_nombre, '')), ''),
        nullif(trim(coalesce(p_comentario_lider, '')), '')
      );
    ELSIF v_solicitud.tipo = 'requisito' THEN
      PERFORM public.upsert_miembro_especialidad_requisito(
        v_solicitud.miembro_especialidad_id,
        v_solicitud.especialidad_requisito_id,
        true,
        CURRENT_DATE,
        p_revisor_usuario_id,
        nullif(trim(coalesce(p_revisor_nombre, '')), ''),
        nullif(trim(coalesce(p_comentario_lider, '')), '')
      );
    END IF;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_miembro_especialidad_aprobacion_solicitud(
  UUID, BOOLEAN, TEXT, UUID, TEXT
) TO authenticated;

-- ---------------------------------------------------------------------------
-- Portal progress includes honor-level completion
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.member_portal_fetch_especialidad_progress(p_session_token TEXT)
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

  SELECT json_build_object(
    'assignments', coalesce((
      SELECT json_agg(json_build_object(
        'id', me.id,
        'completado', coalesce(me.completado, false),
        'fecha_completado', me.fecha_completado,
        'validado_por_usuario_id', me.validado_por_usuario_id,
        'validado_por_nombre', me.validado_por_nombre,
        'comentarios', me.comentarios
      ))
      FROM public.miembro_especialidad me
      WHERE me.miembro_id = v_miembro_id
    ), '[]'::json),
    'completions', coalesce((
      SELECT json_agg(json_build_object(
        'id', mer.id,
        'miembro_especialidad_id', mer.miembro_especialidad_id,
        'especialidad_requisito_id', mer.especialidad_requisito_id,
        'completado', coalesce(mer.completado, false),
        'fecha_completado', mer.fecha_completado,
        'validado_por_usuario_id', mer.validado_por_usuario_id,
        'validado_por_nombre', mer.validado_por_nombre,
        'comentarios', mer.comentarios
      ))
      FROM public.miembro_especialidad_requisito mer
      WHERE mer.miembro_especialidad_id IN (
        SELECT me.id FROM public.miembro_especialidad me WHERE me.miembro_id = v_miembro_id
      )
    ), '[]'::json),
    'solicitudes', coalesce((
      SELECT json_agg(json_build_object(
        'id', s.id,
        'miembro_especialidad_id', s.miembro_especialidad_id,
        'especialidad_requisito_id', s.especialidad_requisito_id,
        'tipo', s.tipo,
        'estado', s.estado,
        'comentario_miembro', s.comentario_miembro,
        'comentario_lider', s.comentario_lider,
        'solicitado_at', s.solicitado_at,
        'revisado_at', s.revisado_at
      ) ORDER BY s.solicitado_at DESC)
      FROM public.miembro_especialidad_aprobacion_solicitud s
      WHERE s.miembro_id = v_miembro_id
    ), '[]'::json)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_portal_fetch_especialidad_progress(TEXT)
  TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
