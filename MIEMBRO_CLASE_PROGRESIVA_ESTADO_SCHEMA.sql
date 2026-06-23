-- =============================================================================
-- Soft-deactivate member progressive class assignments (keep history)
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

ALTER TABLE public.miembro_clase_progresiva
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activo';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'miembro_clase_progresiva_estado_check'
  ) THEN
    ALTER TABLE public.miembro_clase_progresiva
      ADD CONSTRAINT miembro_clase_progresiva_estado_check
      CHECK (estado IN ('activo', 'inactivo'));
  END IF;
END $$;

UPDATE public.miembro_clase_progresiva
SET estado = 'activo'
WHERE estado IS NULL;

CREATE INDEX IF NOT EXISTS idx_miembro_clase_progresiva_miembro_estado
  ON public.miembro_clase_progresiva(miembro_id, estado);

COMMENT ON COLUMN public.miembro_clase_progresiva.estado IS
  'Assignment status: activo = currently assigned, inactivo = removed but kept for history.';

-- Assign or reactivate an existing inactive assignment
CREATE OR REPLACE FUNCTION public.admin_assign_miembro_clase(
  p_miembro_id UUID,
  p_clase_id UUID
)
RETURNS public.miembro_clase_progresiva
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_clase_progresiva;
  v_has_clase_progresiva_id BOOLEAN;
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_assign_miembro_clase';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'miembro_clase_progresiva'
      AND column_name = 'clase_progresiva_id'
  ) INTO v_has_clase_progresiva_id;

  IF v_has_clase_progresiva_id THEN
    SELECT * INTO result
    FROM public.miembro_clase_progresiva
    WHERE miembro_id = p_miembro_id
      AND clase_progresiva_id = p_clase_id
    ORDER BY CASE WHEN estado = 'activo' THEN 0 ELSE 1 END, id
    LIMIT 1;

    IF result.id IS NOT NULL THEN
      UPDATE public.miembro_clase_progresiva
      SET estado = 'activo'
      WHERE id = result.id
      RETURNING * INTO result;
      RETURN result;
    END IF;

    INSERT INTO public.miembro_clase_progresiva (miembro_id, clase_progresiva_id, estado)
    VALUES (p_miembro_id, p_clase_id, 'activo')
    RETURNING * INTO result;
  ELSE
    SELECT * INTO result
    FROM public.miembro_clase_progresiva
    WHERE miembro_id = p_miembro_id
      AND clase_id = p_clase_id
    ORDER BY CASE WHEN estado = 'activo' THEN 0 ELSE 1 END, id
    LIMIT 1;

    IF result.id IS NOT NULL THEN
      UPDATE public.miembro_clase_progresiva
      SET estado = 'activo'
      WHERE id = result.id
      RETURNING * INTO result;
      RETURN result;
    END IF;

    INSERT INTO public.miembro_clase_progresiva (miembro_id, clase_id, estado)
    VALUES (p_miembro_id, p_clase_id, 'activo')
    RETURNING * INTO result;
  END IF;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'unable to assign class to member';
  END IF;

  RETURN result;
END;
$$;

-- Deactivate instead of delete
CREATE OR REPLACE FUNCTION public.admin_unassign_miembro_clase(p_link_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_updated INTEGER;
BEGIN
  SELECT miembro_id INTO v_miembro_id
  FROM public.miembro_clase_progresiva
  WHERE id = p_link_id;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'class assignment not found';
  END IF;

  IF NOT public.user_can_manage_miembro(v_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_unassign_miembro_clase';
  END IF;

  UPDATE public.miembro_clase_progresiva
  SET estado = 'inactivo'
  WHERE id = p_link_id
    AND estado = 'activo';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    UPDATE public.miembro_clase_progresiva
    SET estado = 'inactivo'
    WHERE id = p_link_id;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_assign_miembro_clase(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unassign_miembro_clase(UUID) TO authenticated;
