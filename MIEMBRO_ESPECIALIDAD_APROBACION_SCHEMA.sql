-- =============================================================================
-- Member honor (especialidad) requirement completions + admin approval.
-- Mirrors miembro_clase_requisito / miembro_clase_aprobacion_solicitud.
-- Run in Supabase SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Assignment rows need a surrogate id (some databases only have the composite
-- miembro_id + especialidad_id key). Required before FKs below.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'miembro_especialidad'
      AND column_name = 'id'
  ) THEN
    ALTER TABLE public.miembro_especialidad
      ADD COLUMN id UUID DEFAULT gen_random_uuid();
    UPDATE public.miembro_especialidad
      SET id = gen_random_uuid()
      WHERE id IS NULL;
    ALTER TABLE public.miembro_especialidad
      ALTER COLUMN id SET NOT NULL,
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_especialidad_id
  ON public.miembro_especialidad(id);

-- Rebuild leftovers that were created without the assignment-id column.
DO $$
BEGIN
  IF to_regclass('public.miembro_especialidad_requisito') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'miembro_especialidad_requisito'
         AND column_name = 'miembro_especialidad_id'
     ) THEN
    DROP TABLE public.miembro_especialidad_requisito CASCADE;
  END IF;

  IF to_regclass('public.miembro_especialidad_aprobacion_solicitud') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'miembro_especialidad_aprobacion_solicitud'
         AND column_name = 'miembro_especialidad_id'
     ) THEN
    DROP TABLE public.miembro_especialidad_aprobacion_solicitud CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Completion rows
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.miembro_especialidad_requisito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_especialidad_id UUID NOT NULL
    REFERENCES public.miembro_especialidad(id) ON DELETE CASCADE,
  especialidad_requisito_id UUID NOT NULL
    REFERENCES public.especialidad_requisitos(id) ON DELETE CASCADE,
  completado BOOLEAN NOT NULL DEFAULT false,
  fecha_completado DATE,
  validado_por_usuario_id UUID
    REFERENCES public.usuarios(id) ON DELETE SET NULL,
  validado_por_nombre TEXT,
  comentarios TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (miembro_especialidad_id, especialidad_requisito_id),
  CONSTRAINT miembro_especialidad_requisito_fecha_when_complete CHECK (
    completado = false OR fecha_completado IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_miembro_especialidad_requisito_assignment
  ON public.miembro_especialidad_requisito(miembro_especialidad_id);

CREATE INDEX IF NOT EXISTS idx_miembro_especialidad_requisito_requisito
  ON public.miembro_especialidad_requisito(especialidad_requisito_id);

CREATE INDEX IF NOT EXISTS idx_miembro_especialidad_requisito_completado
  ON public.miembro_especialidad_requisito(miembro_especialidad_id, completado);

COMMENT ON TABLE public.miembro_especialidad_requisito IS
  'Completion status for each honor requirement on a member specialty assignment.';

-- ---------------------------------------------------------------------------
-- Approval requests
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.miembro_especialidad_aprobacion_solicitud (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  miembro_especialidad_id UUID NOT NULL
    REFERENCES public.miembro_especialidad(id) ON DELETE CASCADE,
  especialidad_requisito_id UUID
    REFERENCES public.especialidad_requisitos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('requisito', 'especialidad')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  comentario_miembro TEXT,
  comentario_lider TEXT,
  revisado_por_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  revisado_por_nombre TEXT,
  solicitado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revisado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT miembro_especialidad_aprobacion_solicitud_requisito_id_check CHECK (
    (tipo = 'requisito' AND especialidad_requisito_id IS NOT NULL)
    OR (tipo = 'especialidad' AND especialidad_requisito_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_miembro_especialidad_aprobacion_solicitud_miembro
  ON public.miembro_especialidad_aprobacion_solicitud (miembro_id, estado, solicitado_at DESC);

CREATE INDEX IF NOT EXISTS idx_miembro_especialidad_aprobacion_solicitud_assignment
  ON public.miembro_especialidad_aprobacion_solicitud (miembro_especialidad_id, estado);

CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_esp_aprobacion_requisito_pendiente
  ON public.miembro_especialidad_aprobacion_solicitud (miembro_especialidad_id, especialidad_requisito_id)
  WHERE estado = 'pendiente' AND tipo = 'requisito';

CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_esp_aprobacion_especialidad_pendiente
  ON public.miembro_especialidad_aprobacion_solicitud (miembro_especialidad_id)
  WHERE estado = 'pendiente' AND tipo = 'especialidad';

COMMENT ON TABLE public.miembro_especialidad_aprobacion_solicitud IS
  'Approval requests from members for honor requirement completion review by leaders.';

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_miembro_especialidad_requisito_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_miembro_especialidad_requisito_updated_at
  ON public.miembro_especialidad_requisito;

CREATE TRIGGER trg_miembro_especialidad_requisito_updated_at
  BEFORE UPDATE ON public.miembro_especialidad_requisito
  FOR EACH ROW
  EXECUTE FUNCTION public.set_miembro_especialidad_requisito_updated_at();

CREATE OR REPLACE FUNCTION public.set_miembro_especialidad_aprobacion_solicitud_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_miembro_especialidad_aprobacion_solicitud_updated_at
  ON public.miembro_especialidad_aprobacion_solicitud;

CREATE TRIGGER trg_miembro_especialidad_aprobacion_solicitud_updated_at
  BEFORE UPDATE ON public.miembro_especialidad_aprobacion_solicitud
  FOR EACH ROW
  EXECUTE FUNCTION public.set_miembro_especialidad_aprobacion_solicitud_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.miembro_id_for_especialidad_assignment(p_assignment_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT miembro_id
  FROM public.miembro_especialidad
  WHERE id = p_assignment_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.miembro_id_for_especialidad_assignment(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.especialidad_id_for_especialidad_assignment(p_assignment_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT especialidad_id
  FROM public.miembro_especialidad
  WHERE id = p_assignment_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.especialidad_id_for_especialidad_assignment(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed completion rows
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.init_miembro_especialidad_requisitos(p_assignment_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_especialidad_id UUID;
  v_inserted INTEGER;
BEGIN
  v_miembro_id := public.miembro_id_for_especialidad_assignment(p_assignment_id);
  v_especialidad_id := public.especialidad_id_for_especialidad_assignment(p_assignment_id);

  IF v_miembro_id IS NULL OR v_especialidad_id IS NULL THEN
    RAISE EXCEPTION 'invalid miembro_especialidad assignment id';
  END IF;

  IF NOT (
    public.user_can_manage_miembro(v_miembro_id)
    OR public.usuario_can_request_miembro_approval(v_miembro_id)
  ) THEN
    RAISE EXCEPTION 'permission denied for init_miembro_especialidad_requisitos';
  END IF;

  INSERT INTO public.miembro_especialidad_requisito (
    miembro_especialidad_id,
    especialidad_requisito_id
  )
  SELECT p_assignment_id, er.id
  FROM public.especialidad_requisitos er
  WHERE er.especialidad_id = v_especialidad_id
  ON CONFLICT (miembro_especialidad_id, especialidad_requisito_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.init_miembro_especialidad_requisitos(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin: mark complete / update validation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.upsert_miembro_especialidad_requisito(
  p_assignment_id UUID,
  p_especialidad_requisito_id UUID,
  p_completado BOOLEAN,
  p_fecha_completado DATE DEFAULT NULL,
  p_validado_por_usuario_id UUID DEFAULT NULL,
  p_validado_por_nombre TEXT DEFAULT NULL,
  p_comentarios TEXT DEFAULT NULL
)
RETURNS public.miembro_especialidad_requisito
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_especialidad_id UUID;
  result public.miembro_especialidad_requisito;
BEGIN
  v_miembro_id := public.miembro_id_for_especialidad_assignment(p_assignment_id);
  v_especialidad_id := public.especialidad_id_for_especialidad_assignment(p_assignment_id);

  IF v_miembro_id IS NULL OR v_especialidad_id IS NULL THEN
    RAISE EXCEPTION 'specialty assignment not found';
  END IF;

  IF NOT public.user_can_manage_miembro(v_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for upsert_miembro_especialidad_requisito';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.especialidad_requisitos er
    WHERE er.id = p_especialidad_requisito_id
      AND er.especialidad_id = v_especialidad_id
  ) THEN
    RAISE EXCEPTION 'requirement not found for this specialty';
  END IF;

  IF p_completado AND p_fecha_completado IS NULL THEN
    p_fecha_completado := CURRENT_DATE;
  END IF;

  IF NOT p_completado THEN
    p_fecha_completado := NULL;
  END IF;

  INSERT INTO public.miembro_especialidad_requisito (
    miembro_especialidad_id,
    especialidad_requisito_id,
    completado,
    fecha_completado,
    validado_por_usuario_id,
    validado_por_nombre,
    comentarios
  )
  VALUES (
    p_assignment_id,
    p_especialidad_requisito_id,
    p_completado,
    p_fecha_completado,
    p_validado_por_usuario_id,
    NULLIF(trim(p_validado_por_nombre), ''),
    NULLIF(trim(p_comentarios), '')
  )
  ON CONFLICT (miembro_especialidad_id, especialidad_requisito_id) DO UPDATE SET
    completado = EXCLUDED.completado,
    fecha_completado = EXCLUDED.fecha_completado,
    validado_por_usuario_id = EXCLUDED.validado_por_usuario_id,
    validado_por_nombre = EXCLUDED.validado_por_nombre,
    comentarios = EXCLUDED.comentarios,
    updated_at = now()
  RETURNING * INTO result;

  IF p_completado THEN
    UPDATE public.miembro_especialidad_aprobacion_solicitud
    SET
      estado = 'aprobado',
      revisado_por_usuario_id = p_validado_por_usuario_id,
      revisado_por_nombre = NULLIF(trim(p_validado_por_nombre), ''),
      revisado_at = now(),
      updated_at = now()
    WHERE miembro_especialidad_id = p_assignment_id
      AND especialidad_requisito_id = p_especialidad_requisito_id
      AND estado = 'pendiente';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_miembro_especialidad_requisito(
  UUID, UUID, BOOLEAN, DATE, UUID, TEXT, TEXT
) TO authenticated;

-- ---------------------------------------------------------------------------
-- Staff: list approval requests
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fetch_miembro_especialidad_aprobacion_solicitudes(p_miembro_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT (
    public.user_can_manage_miembro(p_miembro_id)
    OR public.usuario_can_request_miembro_approval(p_miembro_id)
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT coalesce(json_agg(row_data ORDER BY row_data->>'solicitado_at' DESC), '[]'::json)
  INTO v_result
  FROM (
    SELECT json_build_object(
      'id', s.id,
      'miembro_id', s.miembro_id,
      'miembro_especialidad_id', s.miembro_especialidad_id,
      'especialidad_requisito_id', s.especialidad_requisito_id,
      'tipo', s.tipo,
      'estado', s.estado,
      'comentario_miembro', s.comentario_miembro,
      'comentario_lider', s.comentario_lider,
      'revisado_por_usuario_id', s.revisado_por_usuario_id,
      'revisado_por_nombre', s.revisado_por_nombre,
      'solicitado_at', s.solicitado_at,
      'revisado_at', s.revisado_at,
      'origen', 'especialidad',
      'especialidad_requisitos', CASE
        WHEN er.id IS NOT NULL THEN json_build_object(
          'id', er.id,
          'descripcion', er.descripcion
        )
        ELSE NULL
      END,
      'especialidades', json_build_object(
        'id', e.id,
        'nombre', e.nombre
      )
    ) AS row_data
    FROM public.miembro_especialidad_aprobacion_solicitud s
    JOIN public.miembro_especialidad me ON me.id = s.miembro_especialidad_id
    JOIN public.especialidades e ON e.id = me.especialidad_id
    LEFT JOIN public.especialidad_requisitos er ON er.id = s.especialidad_requisito_id
    WHERE s.miembro_id = p_miembro_id
  ) rows;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fetch_miembro_especialidad_aprobacion_solicitudes(UUID)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Staff: approve or reject
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

  IF p_aprobar AND v_solicitud.tipo = 'requisito' THEN
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

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_miembro_especialidad_aprobacion_solicitud(
  UUID, BOOLEAN, TEXT, UUID, TEXT
) TO authenticated;

-- ---------------------------------------------------------------------------
-- Shared insert for a requisito approval request
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._insert_especialidad_requisito_approval(
  p_miembro_id UUID,
  p_assignment_id UUID,
  p_especialidad_requisito_id UUID,
  p_comentario TEXT
)
RETURNS public.miembro_especialidad_aprobacion_solicitud
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_miembro_id UUID;
  v_especialidad_id UUID;
  v_already_complete BOOLEAN;
  result public.miembro_especialidad_aprobacion_solicitud;
BEGIN
  SELECT me.miembro_id, me.especialidad_id
  INTO v_assignment_miembro_id, v_especialidad_id
  FROM public.miembro_especialidad me
  WHERE me.id = p_assignment_id;

  IF v_especialidad_id IS NULL OR v_assignment_miembro_id IS NULL THEN
    RAISE EXCEPTION 'specialty assignment not found';
  END IF;

  IF v_assignment_miembro_id <> p_miembro_id THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.especialidad_requisitos er
    WHERE er.id = p_especialidad_requisito_id
      AND er.especialidad_id = v_especialidad_id
  ) THEN
    RAISE EXCEPTION 'requirement not found for this specialty';
  END IF;

  SELECT coalesce(mer.completado, false) INTO v_already_complete
  FROM public.miembro_especialidad_requisito mer
  WHERE mer.miembro_especialidad_id = p_assignment_id
    AND mer.especialidad_requisito_id = p_especialidad_requisito_id;

  IF coalesce(v_already_complete, false) THEN
    RAISE EXCEPTION 'requirement already completed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.miembro_especialidad_aprobacion_solicitud s
    WHERE s.miembro_especialidad_id = p_assignment_id
      AND s.especialidad_requisito_id = p_especialidad_requisito_id
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
    p_especialidad_requisito_id,
    'requisito',
    nullif(trim(coalesce(p_comentario, '')), '')
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Portal: request requisito approval
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.member_portal_request_especialidad_requisito_approval(
  p_session_token TEXT,
  p_assignment_id UUID,
  p_especialidad_requisito_id UUID,
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

  RETURN public._insert_especialidad_requisito_approval(
    v_miembro_id,
    p_assignment_id,
    p_especialidad_requisito_id,
    p_comentario
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_portal_request_especialidad_requisito_approval(
  TEXT, UUID, UUID, TEXT
) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- Portal: completions + solicitudes for the specialties tab
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

-- ---------------------------------------------------------------------------
-- Staff (advanced linked user): request on behalf of the member
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.staff_request_especialidad_requisito_approval(
  p_miembro_id UUID,
  p_assignment_id UUID,
  p_especialidad_requisito_id UUID,
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

  RETURN public._insert_especialidad_requisito_approval(
    p_miembro_id,
    p_assignment_id,
    p_especialidad_requisito_id,
    p_comentario
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_request_especialidad_requisito_approval(
  UUID, UUID, UUID, TEXT
) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.miembro_especialidad_requisito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miembro_especialidad_aprobacion_solicitud ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_especialidad_requisito_select ON public.miembro_especialidad_requisito;
CREATE POLICY miembro_especialidad_requisito_select ON public.miembro_especialidad_requisito
  FOR SELECT TO authenticated
  USING (
    public.user_can_access_miembro(
      public.miembro_id_for_especialidad_assignment(miembro_especialidad_id)
    )
  );

DROP POLICY IF EXISTS miembro_especialidad_requisito_insert ON public.miembro_especialidad_requisito;
CREATE POLICY miembro_especialidad_requisito_insert ON public.miembro_especialidad_requisito
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_manage_miembro(
      public.miembro_id_for_especialidad_assignment(miembro_especialidad_id)
    )
  );

DROP POLICY IF EXISTS miembro_especialidad_requisito_update ON public.miembro_especialidad_requisito;
CREATE POLICY miembro_especialidad_requisito_update ON public.miembro_especialidad_requisito
  FOR UPDATE TO authenticated
  USING (
    public.user_can_manage_miembro(
      public.miembro_id_for_especialidad_assignment(miembro_especialidad_id)
    )
  )
  WITH CHECK (
    public.user_can_manage_miembro(
      public.miembro_id_for_especialidad_assignment(miembro_especialidad_id)
    )
  );

DROP POLICY IF EXISTS miembro_especialidad_requisito_delete ON public.miembro_especialidad_requisito;
CREATE POLICY miembro_especialidad_requisito_delete ON public.miembro_especialidad_requisito
  FOR DELETE TO authenticated
  USING (
    public.user_can_manage_miembro(
      public.miembro_id_for_especialidad_assignment(miembro_especialidad_id)
    )
  );

DROP POLICY IF EXISTS miembro_especialidad_aprobacion_solicitud_admin_select
  ON public.miembro_especialidad_aprobacion_solicitud;
CREATE POLICY miembro_especialidad_aprobacion_solicitud_admin_select
  ON public.miembro_especialidad_aprobacion_solicitud FOR SELECT
  TO authenticated
  USING (public.user_can_manage_miembro(miembro_id));

NOTIFY pgrst, 'reload schema';
