-- =============================================================================
-- Progressive class requirements: optional catalog text + per-member overrides
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: CLASE_REQUISITOS_SECCIONES_SCHEMA.sql, MIEMBRO_CLASE_REQUISITO_SCHEMA.sql
-- =============================================================================

-- Optional alternative wording at catalog level (shown in class listing)
ALTER TABLE public.clase_requisitos
  ADD COLUMN IF NOT EXISTS texto_opcional TEXT;

COMMENT ON COLUMN public.clase_requisitos.texto_opcional IS
  'Optional alternative wording for this requirement in the progressive class catalog.';

-- Per-member text override and active-text selection
ALTER TABLE public.miembro_clase_requisito
  ADD COLUMN IF NOT EXISTS texto_reemplazo TEXT,
  ADD COLUMN IF NOT EXISTS usar_texto_alternativo BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.miembro_clase_requisito.texto_reemplazo IS
  'Member-specific replacement text when special conditions apply.';
COMMENT ON COLUMN public.miembro_clase_requisito.usar_texto_alternativo IS
  'When true, show member replacement (or catalog optional text) instead of original descripcion.';

-- ---------------------------------------------------------------------------
-- Extend upsert to persist text override fields
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.upsert_miembro_clase_requisito(UUID, UUID, BOOLEAN, DATE, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.upsert_miembro_clase_requisito(
  p_assignment_id UUID,
  p_clase_requisito_id UUID,
  p_completado BOOLEAN,
  p_fecha_completado DATE DEFAULT NULL,
  p_validado_por_usuario_id UUID DEFAULT NULL,
  p_validado_por_nombre TEXT DEFAULT NULL,
  p_comentarios TEXT DEFAULT NULL,
  p_texto_reemplazo TEXT DEFAULT NULL,
  p_usar_texto_alternativo BOOLEAN DEFAULT NULL
)
RETURNS public.miembro_clase_requisito
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  result public.miembro_clase_requisito;
  v_usar BOOLEAN;
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

  v_usar := COALESCE(p_usar_texto_alternativo, false);

  INSERT INTO public.miembro_clase_requisito (
    miembro_clase_progresiva_id,
    clase_requisito_id,
    completado,
    fecha_completado,
    validado_por_usuario_id,
    validado_por_nombre,
    comentarios,
    texto_reemplazo,
    usar_texto_alternativo
  )
  VALUES (
    p_assignment_id,
    p_clase_requisito_id,
    p_completado,
    p_fecha_completado,
    p_validado_por_usuario_id,
    NULLIF(trim(p_validado_por_nombre), ''),
    NULLIF(trim(p_comentarios), ''),
    NULLIF(trim(p_texto_reemplazo), ''),
    v_usar
  )
  ON CONFLICT (miembro_clase_progresiva_id, clase_requisito_id) DO UPDATE SET
    completado = EXCLUDED.completado,
    fecha_completado = EXCLUDED.fecha_completado,
    validado_por_usuario_id = EXCLUDED.validado_por_usuario_id,
    validado_por_nombre = EXCLUDED.validado_por_nombre,
    comentarios = EXCLUDED.comentarios,
    texto_reemplazo = EXCLUDED.texto_reemplazo,
    usar_texto_alternativo = EXCLUDED.usar_texto_alternativo,
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_miembro_clase_requisito(
  UUID, UUID, BOOLEAN, DATE, UUID, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated;
