-- =============================================================================
-- Member class approval requests: members request leader review via portal;
-- leaders approve/reject from the member classes tab.
-- Run in Supabase SQL Editor, then re-run MIEMBRO_PORTAL_PROFILE_TABS.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.miembro_clase_aprobacion_solicitud (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  miembro_clase_progresiva_id UUID NOT NULL REFERENCES public.miembro_clase_progresiva(id) ON DELETE CASCADE,
  clase_requisito_id UUID REFERENCES public.clase_requisitos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('requisito', 'clase')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  comentario_miembro TEXT,
  comentario_lider TEXT,
  revisado_por_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  revisado_por_nombre TEXT,
  solicitado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revisado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT miembro_clase_aprobacion_solicitud_requisito_id_check CHECK (
    (tipo = 'requisito' AND clase_requisito_id IS NOT NULL)
    OR (tipo = 'clase' AND clase_requisito_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_miembro_clase_aprobacion_solicitud_miembro
  ON public.miembro_clase_aprobacion_solicitud (miembro_id, estado, solicitado_at DESC);

CREATE INDEX IF NOT EXISTS idx_miembro_clase_aprobacion_solicitud_assignment
  ON public.miembro_clase_aprobacion_solicitud (miembro_clase_progresiva_id, estado);

CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_clase_aprobacion_solicitud_requisito_pendiente
  ON public.miembro_clase_aprobacion_solicitud (miembro_clase_progresiva_id, clase_requisito_id)
  WHERE estado = 'pendiente' AND tipo = 'requisito';

CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_clase_aprobacion_solicitud_clase_pendiente
  ON public.miembro_clase_aprobacion_solicitud (miembro_clase_progresiva_id)
  WHERE estado = 'pendiente' AND tipo = 'clase';

ALTER TABLE public.miembro_clase_aprobacion_solicitud ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_clase_aprobacion_solicitud_admin_select ON public.miembro_clase_aprobacion_solicitud;
CREATE POLICY miembro_clase_aprobacion_solicitud_admin_select
  ON public.miembro_clase_aprobacion_solicitud FOR SELECT
  TO authenticated
  USING (public.user_can_manage_miembro(miembro_id));

COMMENT ON TABLE public.miembro_clase_aprobacion_solicitud IS
  'Approval requests from members for class or requirement completion review by leaders.';

-- ---------------------------------------------------------------------------
-- Portal: request requisito approval
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.member_portal_request_requisito_approval(
  p_session_token TEXT,
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
  v_session_miembro_id UUID;
  v_assignment_miembro_id UUID;
  v_clase_id UUID;
  v_class_link_col TEXT;
  v_already_complete BOOLEAN;
  result public.miembro_clase_aprobacion_solicitud;
BEGIN
  v_session_miembro_id := public.member_portal_verify_session(p_session_token);
  IF v_session_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
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

  IF v_assignment_miembro_id <> v_session_miembro_id THEN
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
    v_session_miembro_id,
    p_assignment_id,
    p_clase_requisito_id,
    'requisito',
    nullif(trim(coalesce(p_comentario, '')), '')
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_portal_request_requisito_approval(TEXT, UUID, UUID, TEXT)
  TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- Portal: request class completion approval
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.member_portal_request_clase_approval(
  p_session_token TEXT,
  p_assignment_id UUID,
  p_comentario TEXT DEFAULT NULL
)
RETURNS public.miembro_clase_aprobacion_solicitud
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_estado_progreso TEXT;
  v_completado BOOLEAN;
  result public.miembro_clase_aprobacion_solicitud;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);
  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.miembro_clase_progresiva mcp
    WHERE mcp.id = p_assignment_id AND mcp.miembro_id = v_miembro_id
  ) THEN
    RAISE EXCEPTION 'class assignment not found';
  END IF;

  SELECT
    coalesce(mcp.estado_progreso, 'sin_iniciar'),
    coalesce(mcp.completado, false)
  INTO v_estado_progreso, v_completado
  FROM public.miembro_clase_progresiva mcp
  WHERE mcp.id = p_assignment_id;

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
    v_miembro_id,
    p_assignment_id,
    NULL,
    'clase',
    nullif(trim(coalesce(p_comentario, '')), '')
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_portal_request_clase_approval(TEXT, UUID, TEXT)
  TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- Staff: list approval requests for a member
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
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
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

GRANT EXECUTE ON FUNCTION public.fetch_miembro_clase_aprobacion_solicitudes(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Staff: approve or reject a request
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.review_miembro_clase_aprobacion_solicitud(
  p_solicitud_id UUID,
  p_aprobar BOOLEAN,
  p_comentario_lider TEXT DEFAULT NULL,
  p_revisor_usuario_id UUID DEFAULT NULL,
  p_revisor_nombre TEXT DEFAULT NULL
)
RETURNS public.miembro_clase_aprobacion_solicitud
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solicitud public.miembro_clase_aprobacion_solicitud;
  result public.miembro_clase_aprobacion_solicitud;
BEGIN
  SELECT * INTO v_solicitud
  FROM public.miembro_clase_aprobacion_solicitud
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

  UPDATE public.miembro_clase_aprobacion_solicitud
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
    IF v_solicitud.tipo = 'requisito' THEN
      PERFORM public.upsert_miembro_clase_requisito(
        v_solicitud.miembro_clase_progresiva_id,
        v_solicitud.clase_requisito_id,
        true,
        CURRENT_DATE,
        p_revisor_usuario_id,
        nullif(trim(coalesce(p_revisor_nombre, '')), ''),
        nullif(trim(coalesce(p_comentario_lider, '')), ''),
        NULL,
        NULL
      );
    ELSIF v_solicitud.tipo = 'clase' THEN
      PERFORM public.update_miembro_clase_progresiva_progress(
        v_solicitud.miembro_clase_progresiva_id,
        true,
        CURRENT_DATE,
        false,
        NULL,
        NULL,
        NULL,
        NULL,
        'completada'
      );
    END IF;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_miembro_clase_aprobacion_solicitud(
  UUID, BOOLEAN, TEXT, UUID, TEXT
) TO authenticated;
