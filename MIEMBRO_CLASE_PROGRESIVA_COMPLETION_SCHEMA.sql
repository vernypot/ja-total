-- =============================================================================
-- Member progressive class: class completion + investiture (investidura)
-- Run in Supabase Dashboard → SQL Editor after MIEMBRO_CLASE_REQUISITO_SCHEMA.sql
-- =============================================================================

ALTER TABLE public.miembro_clase_progresiva
  ADD COLUMN IF NOT EXISTS completado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_completado DATE,
  ADD COLUMN IF NOT EXISTS tiene_investidura BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS investidura_fecha DATE,
  ADD COLUMN IF NOT EXISTS investidura_lugar TEXT,
  ADD COLUMN IF NOT EXISTS investidura_validado_por_usuario_id UUID
    REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS investidura_validado_por_nombre TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'miembro_clase_progresiva_fecha_when_complete'
  ) THEN
    ALTER TABLE public.miembro_clase_progresiva
      ADD CONSTRAINT miembro_clase_progresiva_fecha_when_complete CHECK (
        completado = false OR fecha_completado IS NOT NULL
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'miembro_clase_progresiva_investidura_fecha_when_set'
  ) THEN
    ALTER TABLE public.miembro_clase_progresiva
      ADD CONSTRAINT miembro_clase_progresiva_investidura_fecha_when_set CHECK (
        tiene_investidura = false OR investidura_fecha IS NOT NULL
      );
  END IF;
END $$;

COMMENT ON COLUMN public.miembro_clase_progresiva.completado IS
  'Whether the member has completed this progressive class assignment.';
COMMENT ON COLUMN public.miembro_clase_progresiva.fecha_completado IS
  'Date the progressive class was marked complete for this member.';
COMMENT ON COLUMN public.miembro_clase_progresiva.tiene_investidura IS
  'Whether an investiture ceremony (investidura) was held for this class.';
COMMENT ON COLUMN public.miembro_clase_progresiva.investidura_fecha IS
  'Date of the investiture ceremony.';
COMMENT ON COLUMN public.miembro_clase_progresiva.investidura_lugar IS
  'Place where the investiture ceremony was held.';
COMMENT ON COLUMN public.miembro_clase_progresiva.investidura_validado_por_nombre IS
  'Person who validated or officiated the investiture.';

-- Save class completion + investidura via RPC (works once columns exist)
CREATE OR REPLACE FUNCTION public.update_miembro_clase_progresiva_progress(
  p_assignment_id UUID,
  p_completado BOOLEAN DEFAULT false,
  p_fecha_completado DATE DEFAULT NULL,
  p_tiene_investidura BOOLEAN DEFAULT false,
  p_investidura_fecha DATE DEFAULT NULL,
  p_investidura_lugar TEXT DEFAULT NULL,
  p_investidura_validado_por_usuario_id UUID DEFAULT NULL,
  p_investidura_validado_por_nombre TEXT DEFAULT NULL
)
RETURNS public.miembro_clase_progresiva
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  result public.miembro_clase_progresiva;
BEGIN
  SELECT miembro_id INTO v_miembro_id
  FROM public.miembro_clase_progresiva
  WHERE id = p_assignment_id;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'class assignment not found';
  END IF;

  IF NOT public.user_can_manage_miembro(v_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for update_miembro_clase_progresiva_progress';
  END IF;

  IF p_completado AND p_fecha_completado IS NULL THEN
    p_fecha_completado := CURRENT_DATE;
  END IF;

  IF NOT p_completado THEN
    p_fecha_completado := NULL;
  END IF;

  IF NOT p_tiene_investidura THEN
    p_investidura_fecha := NULL;
    p_investidura_lugar := NULL;
    p_investidura_validado_por_usuario_id := NULL;
    p_investidura_validado_por_nombre := NULL;
  ELSIF p_investidura_fecha IS NULL THEN
    p_investidura_fecha := CURRENT_DATE;
  END IF;

  UPDATE public.miembro_clase_progresiva
  SET
    completado = p_completado,
    fecha_completado = p_fecha_completado,
    tiene_investidura = p_tiene_investidura,
    investidura_fecha = p_investidura_fecha,
    investidura_lugar = nullif(trim(coalesce(p_investidura_lugar, '')), ''),
    investidura_validado_por_usuario_id = p_investidura_validado_por_usuario_id,
    investidura_validado_por_nombre = nullif(trim(coalesce(p_investidura_validado_por_nombre, '')), '')
  WHERE id = p_assignment_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'class assignment not found';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_miembro_clase_progresiva_progress(
  UUID, BOOLEAN, DATE, BOOLEAN, DATE, TEXT, UUID, TEXT
) TO authenticated;

