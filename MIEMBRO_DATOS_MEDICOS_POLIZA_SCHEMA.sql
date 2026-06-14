-- =============================================================================
-- Medical data: poliza (insurance policy number) linked to aseguradora
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

ALTER TABLE public.miembro_datos_medicos
  ADD COLUMN IF NOT EXISTS poliza TEXT;

COMMENT ON COLUMN public.miembro_datos_medicos.poliza IS
  'Insurance policy number for the member''s health insurer (aseguradora).';

DROP FUNCTION IF EXISTS public.admin_save_miembro_datos_medicos(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.admin_save_miembro_datos_medicos(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.admin_save_miembro_datos_medicos(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, DATE, UUID);

CREATE OR REPLACE FUNCTION public.admin_save_miembro_datos_medicos(
  p_miembro_id UUID,
  p_tipo_sangre TEXT DEFAULT NULL,
  p_factor_rh TEXT DEFAULT NULL,
  p_alergias TEXT DEFAULT NULL,
  p_medicamentos TEXT DEFAULT NULL,
  p_enfermedades TEXT DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL,
  p_aseguradora TEXT DEFAULT NULL,
  p_poliza TEXT DEFAULT NULL,
  p_seguro_denominacional BOOLEAN DEFAULT false,
  p_seguro_denominacional_fecha DATE DEFAULT NULL,
  p_record_id UUID DEFAULT NULL
)
RETURNS public.miembro_datos_medicos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_datos_medicos;
  v_seguro_denominacional BOOLEAN := COALESCE(p_seguro_denominacional, false);
  v_seguro_fecha DATE := p_seguro_denominacional_fecha;
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_save_miembro_datos_medicos';
  END IF;

  IF v_seguro_denominacional AND v_seguro_fecha IS NULL THEN
    v_seguro_fecha := CURRENT_DATE;
  END IF;

  IF NOT v_seguro_denominacional THEN
    v_seguro_fecha := NULL;
  END IF;

  IF p_record_id IS NULL THEN
    INSERT INTO public.miembro_datos_medicos (
      miembro_id,
      tipo_sangre,
      factor_rh,
      alergias,
      medicamentos,
      enfermedades,
      observaciones,
      aseguradora,
      poliza,
      seguro_denominacional,
      seguro_denominacional_fecha
    )
    VALUES (
      p_miembro_id,
      nullif(trim(coalesce(p_tipo_sangre, '')), ''),
      nullif(trim(coalesce(p_factor_rh, '')), ''),
      nullif(trim(coalesce(p_alergias, '')), ''),
      nullif(trim(coalesce(p_medicamentos, '')), ''),
      nullif(trim(coalesce(p_enfermedades, '')), ''),
      nullif(trim(coalesce(p_observaciones, '')), ''),
      nullif(trim(coalesce(p_aseguradora, '')), ''),
      nullif(trim(coalesce(p_poliza, '')), ''),
      v_seguro_denominacional,
      v_seguro_fecha
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
      aseguradora = nullif(trim(coalesce(p_aseguradora, '')), ''),
      poliza = nullif(trim(coalesce(p_poliza, '')), ''),
      seguro_denominacional = v_seguro_denominacional,
      seguro_denominacional_fecha = v_seguro_fecha
    WHERE id = p_record_id AND miembro_id = p_miembro_id
    RETURNING * INTO result;
  END IF;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'medical record not found';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_miembro_datos_medicos(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, DATE, UUID
) TO authenticated;
