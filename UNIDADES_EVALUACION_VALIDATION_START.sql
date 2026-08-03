-- =============================================================================
-- Incremental patch: per-unit validation start date only
-- Run this if UNIDADES_EVALUACION_SCHEMA.sql deadlocks or was already applied
-- except for evaluacion_inicio_fecha.
--
-- Before running:
--   1. Close the Unidades admin page and any other app tabs using the DB
--   2. Use a single SQL Editor tab (do not run in parallel with the full schema)
-- =============================================================================

ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS evaluacion_inicio_fecha DATE;

COMMENT ON COLUMN public.unidades.evaluacion_inicio_fecha IS
  'Events on or after this date count toward unit efficiency/excellence evaluation. NULL = all events.';

CREATE OR REPLACE FUNCTION public.admin_create_unidad(
  p_club_id UUID,
  p_nombre TEXT,
  p_genero TEXT,
  p_descripcion TEXT DEFAULT NULL,
  p_evaluacion_inicio_fecha DATE DEFAULT NULL
)
RETURNS public.unidades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_genero TEXT;
  result public.unidades;
BEGIN
  IF NOT public.user_can_manage_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  v_genero := public.normalize_miembro_genero_unidad(p_genero);
  IF v_genero IS NULL THEN
    RAISE EXCEPTION 'invalid unit gender';
  END IF;

  IF trim(coalesce(p_nombre, '')) = '' THEN
    RAISE EXCEPTION 'unit name is required';
  END IF;

  INSERT INTO public.unidades (club_id, nombre, genero, descripcion, evaluacion_inicio_fecha)
  VALUES (
    p_club_id,
    trim(p_nombre),
    v_genero,
    nullif(trim(coalesce(p_descripcion, '')), ''),
    p_evaluacion_inicio_fecha
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_unidad(
  p_unidad_id UUID,
  p_nombre TEXT DEFAULT NULL,
  p_genero TEXT DEFAULT NULL,
  p_descripcion TEXT DEFAULT NULL,
  p_orden INTEGER DEFAULT NULL,
  p_estado TEXT DEFAULT NULL,
  p_evaluacion_inicio_fecha DATE DEFAULT NULL,
  p_clear_evaluacion_inicio_fecha BOOLEAN DEFAULT false
)
RETURNS public.unidades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_genero TEXT;
  result public.unidades;
BEGIN
  IF NOT public.user_can_manage_unidad(p_unidad_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF p_genero IS NOT NULL THEN
    v_genero := public.normalize_miembro_genero_unidad(p_genero);
    IF v_genero IS NULL THEN
      RAISE EXCEPTION 'invalid unit gender';
    END IF;
  END IF;

  IF p_estado IS NOT NULL AND p_estado NOT IN ('activo', 'inactivo') THEN
    RAISE EXCEPTION 'invalid unit status';
  END IF;

  UPDATE public.unidades
  SET
    nombre = coalesce(nullif(trim(p_nombre), ''), nombre),
    genero = coalesce(v_genero, genero),
    descripcion = CASE
      WHEN p_descripcion IS NULL THEN descripcion
      ELSE nullif(trim(p_descripcion), '')
    END,
    orden = coalesce(p_orden, orden),
    estado = coalesce(p_estado, estado),
    evaluacion_inicio_fecha = CASE
      WHEN p_clear_evaluacion_inicio_fecha THEN NULL
      WHEN p_evaluacion_inicio_fecha IS NOT NULL THEN p_evaluacion_inicio_fecha
      ELSE evaluacion_inicio_fecha
    END,
    updated_at = now()
  WHERE id = p_unidad_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_unidad(UUID, TEXT, TEXT, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_unidad(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, DATE, BOOLEAN) TO authenticated;
