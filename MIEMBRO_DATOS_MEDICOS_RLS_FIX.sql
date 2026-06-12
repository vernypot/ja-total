-- =============================================================================
-- RLS for miembro_datos_medicos (one medical record per member)
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: MIEMBRO_CONTACTOS_RLS_FIX.sql or USUARIOS_RLS_FIX.sql (helpers)
-- =============================================================================

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
  IF NOT public.is_usuarios_superadmin() THEN
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

DROP POLICY IF EXISTS miembro_datos_medicos_select ON public.miembro_datos_medicos;
DROP POLICY IF EXISTS miembro_datos_medicos_insert ON public.miembro_datos_medicos;
DROP POLICY IF EXISTS miembro_datos_medicos_update ON public.miembro_datos_medicos;
DROP POLICY IF EXISTS miembro_datos_medicos_delete ON public.miembro_datos_medicos;

ALTER TABLE public.miembro_datos_medicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY miembro_datos_medicos_select ON public.miembro_datos_medicos
  FOR SELECT TO authenticated
  USING (public.user_can_access_miembro(miembro_id));

CREATE POLICY miembro_datos_medicos_insert ON public.miembro_datos_medicos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_usuarios_superadmin());

CREATE POLICY miembro_datos_medicos_update ON public.miembro_datos_medicos
  FOR UPDATE TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());

CREATE POLICY miembro_datos_medicos_delete ON public.miembro_datos_medicos
  FOR DELETE TO authenticated
  USING (public.is_usuarios_superadmin());
