-- =============================================================================
-- Ensure miembro_datos_medicos.factor_rh exists for RH (+ / -) storage
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

ALTER TABLE public.miembro_datos_medicos
  ADD COLUMN IF NOT EXISTS factor_rh TEXT;

COMMENT ON COLUMN public.miembro_datos_medicos.factor_rh IS
  'RH factor for blood type: + or -';

-- Refresh save RPC (church-admin permission + factor_rh column)
DROP FUNCTION IF EXISTS public.admin_save_miembro_datos_medicos(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.admin_save_miembro_datos_medicos(
  p_miembro_id UUID,
  p_tipo_sangre TEXT DEFAULT NULL,
  p_factor_rh TEXT DEFAULT NULL,
  p_alergias TEXT DEFAULT NULL,
  p_medicamentos TEXT DEFAULT NULL,
  p_enfermedades TEXT DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL,
  p_aseguradora TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL
)
RETURNS public.miembro_datos_medicos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_datos_medicos;
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_save_miembro_datos_medicos';
  END IF;

  IF p_record_id IS NULL THEN
    INSERT INTO public.miembro_datos_medicos (
      miembro_id, tipo_sangre, factor_rh, alergias, medicamentos, enfermedades, observaciones, aseguradora
    )
    VALUES (
      p_miembro_id,
      nullif(trim(coalesce(p_tipo_sangre, '')), ''),
      nullif(trim(coalesce(p_factor_rh, '')), ''),
      nullif(trim(coalesce(p_alergias, '')), ''),
      nullif(trim(coalesce(p_medicamentos, '')), ''),
      nullif(trim(coalesce(p_enfermedades, '')), ''),
      nullif(trim(coalesce(p_observaciones, '')), ''),
      nullif(trim(coalesce(p_aseguradora, '')), '')
    )
    RETURNING * INTO result;
  ELSE
    UPDATE public.miembro_datos_medicos
    SET
      tipo_sangre = nullif(trim(coalesce(p_tipo_sangre, '')), ''),
      factor_rh = nullif(trim(coalesce(p_factor_rh, '')), ''),
      alergias = nullif(trim(coalesce(p_alergias, '')), ''),
      medicamentos = nullif(trim(coalesce(p_medicamentos, '')), ''),
      enfermedades = nullif(trim(coalesce(p_enfermedades, '')), ''),
      observaciones = nullif(trim(coalesce(p_observaciones, '')), ''),
      aseguradora = nullif(trim(coalesce(p_aseguradora, '')), '')
    WHERE id = p_record_id AND miembro_id = p_miembro_id
    RETURNING * INTO result;
  END IF;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'medical record not found';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_miembro_datos_medicos(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
