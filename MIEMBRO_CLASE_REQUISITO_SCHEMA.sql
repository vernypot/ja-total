-- =============================================================================
-- Member progressive class: per-requirement completion tracking
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite:
--   - CLASE_REQUISITOS_SECCIONES_SCHEMA.sql (clase_requisitos)
--   - MIEMBRO_CLASE_PROGRESIVA_RLS_FIX.sql (miembro_clase_progresiva + RLS helpers)
-- =============================================================================

-- Ensure assignment link table has a stable UUID primary key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'miembro_clase_progresiva'
      AND column_name = 'id'
  ) THEN
    ALTER TABLE public.miembro_clase_progresiva
      ADD COLUMN id UUID DEFAULT gen_random_uuid();

    UPDATE public.miembro_clase_progresiva
    SET id = gen_random_uuid()
    WHERE id IS NULL;

    ALTER TABLE public.miembro_clase_progresiva
      ALTER COLUMN id SET NOT NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.miembro_clase_progresiva'::regclass
        AND contype = 'p'
    ) THEN
      ALTER TABLE public.miembro_clase_progresiva
        ADD PRIMARY KEY (id);
    END IF;
  END IF;
END $$;

-- Align legacy column name from an earlier draft of this migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'miembro_clase_requisito'
      AND column_name = 'miembro_clase_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'miembro_clase_requisito'
      AND column_name = 'miembro_clase_progresiva_id'
  ) THEN
    ALTER TABLE public.miembro_clase_requisito
      RENAME COLUMN miembro_clase_id TO miembro_clase_progresiva_id;
  END IF;
END $$;

-- Replace broken/partial table from a failed earlier run
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'miembro_clase_requisito'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'miembro_clase_requisito'
      AND column_name = 'miembro_clase_progresiva_id'
  ) THEN
    DROP TABLE public.miembro_clase_requisito CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.miembro_clase_requisito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_clase_progresiva_id UUID NOT NULL
    REFERENCES public.miembro_clase_progresiva(id) ON DELETE CASCADE,
  clase_requisito_id UUID NOT NULL
    REFERENCES public.clase_requisitos(id) ON DELETE CASCADE,
  completado BOOLEAN NOT NULL DEFAULT false,
  fecha_completado DATE,
  validado_por_usuario_id UUID
    REFERENCES public.usuarios(id) ON DELETE SET NULL,
  validado_por_nombre TEXT,
  comentarios TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (miembro_clase_progresiva_id, clase_requisito_id),
  CONSTRAINT miembro_clase_requisito_fecha_when_complete CHECK (
    completado = false OR fecha_completado IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_miembro_clase_requisito_assignment
  ON public.miembro_clase_requisito(miembro_clase_progresiva_id);

CREATE INDEX IF NOT EXISTS idx_miembro_clase_requisito_requisito
  ON public.miembro_clase_requisito(clase_requisito_id);

CREATE INDEX IF NOT EXISTS idx_miembro_clase_requisito_completado
  ON public.miembro_clase_requisito(miembro_clase_progresiva_id, completado);

COMMENT ON TABLE public.miembro_clase_requisito IS
  'Completion status for each class requirement on a member''s progressive class assignment.';
COMMENT ON COLUMN public.miembro_clase_requisito.miembro_clase_progresiva_id IS
  'Link to miembro_clase_progresiva (member assigned to a progressive class).';
COMMENT ON COLUMN public.miembro_clase_requisito.clase_requisito_id IS
  'Catalog requirement being tracked for this assignment.';
COMMENT ON COLUMN public.miembro_clase_requisito.completado IS
  'Whether the requirement has been marked complete for this member.';
COMMENT ON COLUMN public.miembro_clase_requisito.fecha_completado IS
  'Date the requirement was completed (required when completado is true).';
COMMENT ON COLUMN public.miembro_clase_requisito.validado_por_usuario_id IS
  'App user (instructor/staff) who validated completion, when they have a login.';
COMMENT ON COLUMN public.miembro_clase_requisito.validado_por_nombre IS
  'Instructor or validator name (e.g. when validator has no system account).';
COMMENT ON COLUMN public.miembro_clase_requisito.comentarios IS
  'Optional notes about how or when the requirement was fulfilled.';

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_miembro_clase_requisito_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_miembro_clase_requisito_updated_at ON public.miembro_clase_requisito;

CREATE TRIGGER trg_miembro_clase_requisito_updated_at
  BEFORE UPDATE ON public.miembro_clase_requisito
  FOR EACH ROW
  EXECUTE FUNCTION public.set_miembro_clase_requisito_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helper: resolve member from assignment link
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.miembro_id_for_clase_assignment(p_assignment_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT miembro_id
  FROM public.miembro_clase_progresiva
  WHERE id = p_assignment_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.miembro_id_for_clase_assignment(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.clase_id_for_clase_assignment(p_assignment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clase_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'miembro_clase_progresiva'
      AND column_name = 'clase_progresiva_id'
  ) THEN
    EXECUTE $q$
      SELECT clase_progresiva_id
      FROM public.miembro_clase_progresiva
      WHERE id = $1
      LIMIT 1
    $q$ INTO v_clase_id USING p_assignment_id;
  END IF;

  IF v_clase_id IS NULL AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'miembro_clase_progresiva'
      AND column_name = 'clase_id'
  ) THEN
    EXECUTE $q$
      SELECT clase_id
      FROM public.miembro_clase_progresiva
      WHERE id = $1
      LIMIT 1
    $q$ INTO v_clase_id USING p_assignment_id;
  END IF;

  RETURN v_clase_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clase_id_for_clase_assignment(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed completion rows for all requirements on an assignment
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.init_miembro_clase_requisitos(p_assignment_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_clase_id UUID;
  v_inserted INTEGER;
BEGIN
  v_miembro_id := public.miembro_id_for_clase_assignment(p_assignment_id);
  v_clase_id := public.clase_id_for_clase_assignment(p_assignment_id);

  IF v_miembro_id IS NULL OR v_clase_id IS NULL THEN
    RAISE EXCEPTION 'invalid miembro_clase_progresiva assignment id';
  END IF;

  IF NOT public.user_can_manage_miembro(v_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for init_miembro_clase_requisitos';
  END IF;

  INSERT INTO public.miembro_clase_requisito (miembro_clase_progresiva_id, clase_requisito_id)
  SELECT p_assignment_id, cr.id
  FROM public.clase_requisitos cr
  WHERE cr.clase_id = v_clase_id
  ON CONFLICT (miembro_clase_progresiva_id, clase_requisito_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.init_miembro_clase_requisitos(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Upsert completion (mark complete / update validation details)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.upsert_miembro_clase_requisito(
  p_assignment_id UUID,
  p_clase_requisito_id UUID,
  p_completado BOOLEAN,
  p_fecha_completado DATE DEFAULT NULL,
  p_validado_por_usuario_id UUID DEFAULT NULL,
  p_validado_por_nombre TEXT DEFAULT NULL,
  p_comentarios TEXT DEFAULT NULL
)
RETURNS public.miembro_clase_requisito
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  result public.miembro_clase_requisito;
BEGIN
  v_miembro_id := public.miembro_id_for_clase_assignment(p_assignment_id);

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'class assignment not found';
  END IF;

  IF NOT public.user_can_manage_miembro(v_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for upsert_miembro_clase_requisito';
  END IF;

  IF p_completado AND p_fecha_completado IS NULL THEN
    p_fecha_completado := CURRENT_DATE;
  END IF;

  IF NOT p_completado THEN
    p_fecha_completado := NULL;
  END IF;

  INSERT INTO public.miembro_clase_requisito (
    miembro_clase_progresiva_id,
    clase_requisito_id,
    completado,
    fecha_completado,
    validado_por_usuario_id,
    validado_por_nombre,
    comentarios
  )
  VALUES (
    p_assignment_id,
    p_clase_requisito_id,
    p_completado,
    p_fecha_completado,
    p_validado_por_usuario_id,
    NULLIF(trim(p_validado_por_nombre), ''),
    NULLIF(trim(p_comentarios), '')
  )
  ON CONFLICT (miembro_clase_progresiva_id, clase_requisito_id) DO UPDATE SET
    completado = EXCLUDED.completado,
    fecha_completado = EXCLUDED.fecha_completado,
    validado_por_usuario_id = EXCLUDED.validado_por_usuario_id,
    validado_por_nombre = EXCLUDED.validado_por_nombre,
    comentarios = EXCLUDED.comentarios,
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_miembro_clase_requisito(
  UUID, UUID, BOOLEAN, DATE, UUID, TEXT, TEXT
) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.miembro_clase_requisito ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_clase_requisito_select ON public.miembro_clase_requisito;
CREATE POLICY miembro_clase_requisito_select ON public.miembro_clase_requisito
  FOR SELECT TO authenticated
  USING (
    public.user_can_access_miembro(
      public.miembro_id_for_clase_assignment(miembro_clase_progresiva_id)
    )
  );

DROP POLICY IF EXISTS miembro_clase_requisito_insert ON public.miembro_clase_requisito;
CREATE POLICY miembro_clase_requisito_insert ON public.miembro_clase_requisito
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_manage_miembro(
      public.miembro_id_for_clase_assignment(miembro_clase_progresiva_id)
    )
  );

DROP POLICY IF EXISTS miembro_clase_requisito_update ON public.miembro_clase_requisito;
CREATE POLICY miembro_clase_requisito_update ON public.miembro_clase_requisito
  FOR UPDATE TO authenticated
  USING (
    public.user_can_manage_miembro(
      public.miembro_id_for_clase_assignment(miembro_clase_progresiva_id)
    )
  )
  WITH CHECK (
    public.user_can_manage_miembro(
      public.miembro_id_for_clase_assignment(miembro_clase_progresiva_id)
    )
  );

DROP POLICY IF EXISTS miembro_clase_requisito_delete ON public.miembro_clase_requisito;
CREATE POLICY miembro_clase_requisito_delete ON public.miembro_clase_requisito
  FOR DELETE TO authenticated
  USING (
    public.user_can_manage_miembro(
      public.miembro_id_for_clase_assignment(miembro_clase_progresiva_id)
    )
  );
