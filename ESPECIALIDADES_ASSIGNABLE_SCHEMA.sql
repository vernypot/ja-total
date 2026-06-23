-- =============================================================================
-- Especialidades: assignable only when honor + requirements are active
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: especialidades, especialidad_requisitos, miembro_especialidad
-- =============================================================================

ALTER TABLE public.especialidades
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activo';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'especialidades_estado_check'
      AND conrelid = 'public.especialidades'::regclass
  ) THEN
    ALTER TABLE public.especialidades
      ADD CONSTRAINT especialidades_estado_check
      CHECK (estado IN ('activo', 'inactivo'));
  END IF;
END $$;

ALTER TABLE public.especialidad_requisitos
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activo';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'especialidad_requisitos_estado_check'
      AND conrelid = 'public.especialidad_requisitos'::regclass
  ) THEN
    ALTER TABLE public.especialidad_requisitos
      ADD CONSTRAINT especialidad_requisitos_estado_check
      CHECK (estado IN ('activo', 'inactivo'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_especialidad_requisitos_esp_estado
  ON public.especialidad_requisitos(especialidad_id, estado);

COMMENT ON COLUMN public.especialidad_requisitos.estado IS
  'Only active requirements count toward making an honor assignable to members.';

-- ---------------------------------------------------------------------------
-- Assignability helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.especialidad_is_assignable(p_especialidad_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.especialidades e
    WHERE e.id = p_especialidad_id
      AND COALESCE(e.estado, 'activo') = 'activo'
      AND EXISTS (
        SELECT 1
        FROM public.especialidad_requisitos r
        WHERE r.especialidad_id = e.id
          AND COALESCE(r.estado, 'activo') = 'activo'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.especialidad_is_assignable(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Enforce on RPC fallback path
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_assign_miembro_especialidad(
  p_miembro_id UUID,
  p_especialidad_id UUID
)
RETURNS public.miembro_especialidad
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_especialidad;
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_assign_miembro_especialidad';
  END IF;

  IF NOT public.especialidad_is_assignable(p_especialidad_id) THEN
    RAISE EXCEPTION 'honor is not assignable: it must be active and have at least one active requirement';
  END IF;

  INSERT INTO public.miembro_especialidad (miembro_id, especialidad_id)
  VALUES (p_miembro_id, p_especialidad_id)
  ON CONFLICT DO NOTHING
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    SELECT * INTO result
    FROM public.miembro_especialidad
    WHERE miembro_id = p_miembro_id
      AND especialidad_id = p_especialidad_id
    LIMIT 1;
  END IF;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'unable to assign specialty to member';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_assign_miembro_especialidad(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Enforce on direct INSERT (RLS)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS miembro_especialidad_insert ON public.miembro_especialidad;

CREATE POLICY miembro_especialidad_insert ON public.miembro_especialidad
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_manage_miembro(miembro_id)
    AND public.especialidad_is_assignable(especialidad_id)
  );
