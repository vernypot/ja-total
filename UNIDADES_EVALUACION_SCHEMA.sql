-- =============================================================================
-- Unidad evaluation: club-level point weights + optional custom items + counts
-- Run in Supabase Dashboard → SQL Editor after UNIDADES_SCHEMA.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.club_unidad_eval_config (
  club_id UUID PRIMARY KEY REFERENCES public.clubes(id) ON DELETE CASCADE,
  confirmacion_activa BOOLEAN NOT NULL DEFAULT true,
  confirmacion_puntos NUMERIC(10, 2) NOT NULL DEFAULT 1,
  a_tiempo_activa BOOLEAN NOT NULL DEFAULT true,
  a_tiempo_puntos NUMERIC(10, 2) NOT NULL DEFAULT 1,
  tarde_activa BOOLEAN NOT NULL DEFAULT true,
  tarde_puntos NUMERIC(10, 2) NOT NULL DEFAULT 1,
  ausente_injustificada_activa BOOLEAN NOT NULL DEFAULT true,
  ausente_injustificada_puntos NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ausente_justificada_activa BOOLEAN NOT NULL DEFAULT true,
  ausente_justificada_puntos NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cuota_activa BOOLEAN NOT NULL DEFAULT true,
  cuota_puntos NUMERIC(10, 2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.club_unidad_eval_config IS
  'Point weights for unidad evaluation (attendance breakdown, cuota) per club.';

-- Legacy columns from earlier schema versions (safe to drop after migration)
ALTER TABLE public.club_unidad_eval_config
  DROP COLUMN IF EXISTS asistencia_activa,
  DROP COLUMN IF EXISTS asistencia_puntos;

ALTER TABLE public.club_unidad_eval_config
  ADD COLUMN IF NOT EXISTS confirmacion_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS confirmacion_puntos NUMERIC(10, 2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS a_tiempo_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS a_tiempo_puntos NUMERIC(10, 2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tarde_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tarde_puntos NUMERIC(10, 2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ausente_injustificada_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ausente_injustificada_puntos NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ausente_justificada_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ausente_justificada_puntos NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cuota_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cuota_puntos NUMERIC(10, 2) NOT NULL DEFAULT 1;

DROP TRIGGER IF EXISTS trg_club_unidad_eval_config_updated_at ON public.club_unidad_eval_config;
CREATE TRIGGER trg_club_unidad_eval_config_updated_at
  BEFORE UPDATE ON public.club_unidad_eval_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.club_unidad_eval_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  puntos NUMERIC(10, 2) NOT NULL DEFAULT 0,
  orden INTEGER NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT club_unidad_eval_item_estado_check CHECK (estado IN ('activo', 'inactivo'))
);

COMMENT ON TABLE public.club_unidad_eval_item IS
  'Additional evaluation categories for unidades (manual counts × points).';

DROP TRIGGER IF EXISTS trg_club_unidad_eval_item_updated_at ON public.club_unidad_eval_item;
CREATE TRIGGER trg_club_unidad_eval_item_updated_at
  BEFORE UPDATE ON public.club_unidad_eval_item
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_club_unidad_eval_item_club
  ON public.club_unidad_eval_item(club_id, estado, orden, nombre);

CREATE TABLE IF NOT EXISTS public.unidad_eval_item_cantidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  eval_item_id UUID NOT NULL REFERENCES public.club_unidad_eval_item(id) ON DELETE CASCADE,
  cantidad NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (unidad_id, eval_item_id)
);

COMMENT ON TABLE public.unidad_eval_item_cantidad IS
  'Manual count per unidad for each additional evaluation item.';

DROP TRIGGER IF EXISTS trg_unidad_eval_item_cantidad_updated_at ON public.unidad_eval_item_cantidad;
CREATE TRIGGER trg_unidad_eval_item_cantidad_updated_at
  BEFORE UPDATE ON public.unidad_eval_item_cantidad
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.club_unidad_eval_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_unidad_eval_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidad_eval_item_cantidad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_unidad_eval_config_select ON public.club_unidad_eval_config;
CREATE POLICY club_unidad_eval_config_select ON public.club_unidad_eval_config
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(club_id));

DROP POLICY IF EXISTS club_unidad_eval_config_write ON public.club_unidad_eval_config;
CREATE POLICY club_unidad_eval_config_write ON public.club_unidad_eval_config
  FOR ALL TO authenticated
  USING (public.user_can_manage_club(club_id))
  WITH CHECK (public.user_can_manage_club(club_id));

DROP POLICY IF EXISTS club_unidad_eval_item_select ON public.club_unidad_eval_item;
CREATE POLICY club_unidad_eval_item_select ON public.club_unidad_eval_item
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(club_id));

DROP POLICY IF EXISTS club_unidad_eval_item_write ON public.club_unidad_eval_item;
CREATE POLICY club_unidad_eval_item_write ON public.club_unidad_eval_item
  FOR ALL TO authenticated
  USING (public.user_can_manage_club(club_id))
  WITH CHECK (public.user_can_manage_club(club_id));

DROP POLICY IF EXISTS unidad_eval_item_cantidad_select ON public.unidad_eval_item_cantidad;
CREATE POLICY unidad_eval_item_cantidad_select ON public.unidad_eval_item_cantidad
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unidades u
      WHERE u.id = unidad_eval_item_cantidad.unidad_id
        AND public.user_can_access_club(u.club_id)
    )
  );

DROP POLICY IF EXISTS unidad_eval_item_cantidad_write ON public.unidad_eval_item_cantidad;
CREATE POLICY unidad_eval_item_cantidad_write ON public.unidad_eval_item_cantidad
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unidades u
      WHERE u.id = unidad_eval_item_cantidad.unidad_id
        AND public.user_can_manage_club(u.club_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.unidades u
      WHERE u.id = unidad_eval_item_cantidad.unidad_id
        AND public.user_can_manage_club(u.club_id)
    )
  );

CREATE OR REPLACE FUNCTION public.admin_get_club_unidad_eval(p_club_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config JSON;
  v_items JSON;
  v_cantidades JSON;
BEGIN
  IF NOT public.user_can_access_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT json_build_object(
    'club_id', c.club_id,
    'confirmacion_activa', coalesce(c.confirmacion_activa, true),
    'confirmacion_puntos', coalesce(c.confirmacion_puntos, 1),
    'a_tiempo_activa', coalesce(c.a_tiempo_activa, true),
    'a_tiempo_puntos', coalesce(c.a_tiempo_puntos, 1),
    'tarde_activa', coalesce(c.tarde_activa, true),
    'tarde_puntos', coalesce(c.tarde_puntos, 1),
    'ausente_injustificada_activa', coalesce(c.ausente_injustificada_activa, true),
    'ausente_injustificada_puntos', coalesce(c.ausente_injustificada_puntos, 0),
    'ausente_justificada_activa', coalesce(c.ausente_justificada_activa, true),
    'ausente_justificada_puntos', coalesce(c.ausente_justificada_puntos, 0),
    'cuota_activa', coalesce(c.cuota_activa, true),
    'cuota_puntos', coalesce(c.cuota_puntos, 1)
  )
  INTO v_config
  FROM public.club_unidad_eval_config c
  WHERE c.club_id = p_club_id;

  IF v_config IS NULL THEN
    v_config := json_build_object(
      'club_id', p_club_id,
      'confirmacion_activa', true,
      'confirmacion_puntos', 1,
      'a_tiempo_activa', true,
      'a_tiempo_puntos', 1,
      'tarde_activa', true,
      'tarde_puntos', 1,
      'ausente_injustificada_activa', true,
      'ausente_injustificada_puntos', 0,
      'ausente_justificada_activa', true,
      'ausente_justificada_puntos', 0,
      'cuota_activa', true,
      'cuota_puntos', 1
    );
  END IF;

  SELECT coalesce(json_agg(
    json_build_object(
      'id', i.id,
      'club_id', i.club_id,
      'nombre', i.nombre,
      'descripcion', i.descripcion,
      'puntos', i.puntos,
      'orden', i.orden,
      'estado', i.estado
    )
    ORDER BY i.orden, i.nombre
  ), '[]'::json)
  INTO v_items
  FROM public.club_unidad_eval_item i
  WHERE i.club_id = p_club_id
    AND i.estado = 'activo';

  SELECT coalesce(json_agg(
    json_build_object(
      'id', q.id,
      'unidad_id', q.unidad_id,
      'eval_item_id', q.eval_item_id,
      'cantidad', q.cantidad
    )
  ), '[]'::json)
  INTO v_cantidades
  FROM public.unidad_eval_item_cantidad q
  JOIN public.unidades u ON u.id = q.unidad_id
  WHERE u.club_id = p_club_id;

  RETURN json_build_object(
    'config', v_config,
    'items', v_items,
    'cantidades', v_cantidades
  );
END;
$$;

DROP FUNCTION IF EXISTS public.admin_save_club_unidad_eval_config(UUID, BOOLEAN, NUMERIC, BOOLEAN, NUMERIC);

CREATE OR REPLACE FUNCTION public.admin_save_club_unidad_eval_config(
  p_club_id UUID,
  p_confirmacion_activa BOOLEAN,
  p_confirmacion_puntos NUMERIC,
  p_a_tiempo_activa BOOLEAN,
  p_a_tiempo_puntos NUMERIC,
  p_tarde_activa BOOLEAN,
  p_tarde_puntos NUMERIC,
  p_ausente_injustificada_activa BOOLEAN,
  p_ausente_injustificada_puntos NUMERIC,
  p_ausente_justificada_activa BOOLEAN,
  p_ausente_justificada_puntos NUMERIC,
  p_cuota_activa BOOLEAN,
  p_cuota_puntos NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_can_manage_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  INSERT INTO public.club_unidad_eval_config (
    club_id,
    confirmacion_activa,
    confirmacion_puntos,
    a_tiempo_activa,
    a_tiempo_puntos,
    tarde_activa,
    tarde_puntos,
    ausente_injustificada_activa,
    ausente_injustificada_puntos,
    ausente_justificada_activa,
    ausente_justificada_puntos,
    cuota_activa,
    cuota_puntos
  )
  VALUES (
    p_club_id,
    coalesce(p_confirmacion_activa, true),
    coalesce(p_confirmacion_puntos, 0),
    coalesce(p_a_tiempo_activa, true),
    coalesce(p_a_tiempo_puntos, 0),
    coalesce(p_tarde_activa, true),
    coalesce(p_tarde_puntos, 0),
    coalesce(p_ausente_injustificada_activa, true),
    coalesce(p_ausente_injustificada_puntos, 0),
    coalesce(p_ausente_justificada_activa, true),
    coalesce(p_ausente_justificada_puntos, 0),
    coalesce(p_cuota_activa, true),
    coalesce(p_cuota_puntos, 0)
  )
  ON CONFLICT (club_id) DO UPDATE
  SET
    confirmacion_activa = coalesce(p_confirmacion_activa, true),
    confirmacion_puntos = coalesce(p_confirmacion_puntos, 0),
    a_tiempo_activa = coalesce(p_a_tiempo_activa, true),
    a_tiempo_puntos = coalesce(p_a_tiempo_puntos, 0),
    tarde_activa = coalesce(p_tarde_activa, true),
    tarde_puntos = coalesce(p_tarde_puntos, 0),
    ausente_injustificada_activa = coalesce(p_ausente_injustificada_activa, true),
    ausente_injustificada_puntos = coalesce(p_ausente_injustificada_puntos, 0),
    ausente_justificada_activa = coalesce(p_ausente_justificada_activa, true),
    ausente_justificada_puntos = coalesce(p_ausente_justificada_puntos, 0),
    cuota_activa = coalesce(p_cuota_activa, true),
    cuota_puntos = coalesce(p_cuota_puntos, 0),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_club_unidad_eval_item(
  p_item_id UUID,
  p_club_id UUID,
  p_nombre TEXT,
  p_descripcion TEXT,
  p_puntos NUMERIC,
  p_orden INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.user_can_manage_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF p_item_id IS NULL THEN
    INSERT INTO public.club_unidad_eval_item (
      club_id, nombre, descripcion, puntos, orden
    )
    VALUES (
      p_club_id,
      trim(p_nombre),
      nullif(trim(coalesce(p_descripcion, '')), ''),
      coalesce(p_puntos, 0),
      coalesce(p_orden, 0)
    )
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  UPDATE public.club_unidad_eval_item
  SET
    nombre = trim(p_nombre),
    descripcion = nullif(trim(coalesce(p_descripcion, '')), ''),
    puntos = coalesce(p_puntos, 0),
    orden = coalesce(p_orden, 0),
    updated_at = now()
  WHERE id = p_item_id
    AND club_id = p_club_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'evaluation item not found';
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_deactivate_club_unidad_eval_item(
  p_item_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
BEGIN
  SELECT club_id INTO v_club_id
  FROM public.club_unidad_eval_item
  WHERE id = p_item_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'evaluation item not found';
  END IF;

  IF NOT public.user_can_manage_club(v_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  UPDATE public.club_unidad_eval_item
  SET estado = 'inactivo', updated_at = now()
  WHERE id = p_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_unidad_eval_item_cantidad(
  p_unidad_id UUID,
  p_eval_item_id UUID,
  p_cantidad NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_item_club_id UUID;
BEGIN
  SELECT club_id INTO v_club_id
  FROM public.unidades
  WHERE id = p_unidad_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'unit not found';
  END IF;

  IF NOT public.user_can_manage_club(v_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT club_id INTO v_item_club_id
  FROM public.club_unidad_eval_item
  WHERE id = p_eval_item_id
    AND estado = 'activo';

  IF v_item_club_id IS DISTINCT FROM v_club_id THEN
    RAISE EXCEPTION 'evaluation item not found for club';
  END IF;

  INSERT INTO public.unidad_eval_item_cantidad (unidad_id, eval_item_id, cantidad)
  VALUES (p_unidad_id, p_eval_item_id, coalesce(p_cantidad, 0))
  ON CONFLICT (unidad_id, eval_item_id) DO UPDATE
  SET cantidad = coalesce(p_cantidad, 0), updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_club_unidad_eval(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_club_unidad_eval_config(
  UUID, BOOLEAN, NUMERIC, BOOLEAN, NUMERIC, BOOLEAN, NUMERIC, BOOLEAN, NUMERIC, BOOLEAN, NUMERIC, BOOLEAN, NUMERIC
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_club_unidad_eval_item(UUID, UUID, TEXT, TEXT, NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_club_unidad_eval_item(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_unidad_eval_item_cantidad(UUID, UUID, NUMERIC) TO authenticated;

-- =============================================================================
-- Justified absence flag on evento_asistencia (for unit eval + attendance UI)
-- =============================================================================

ALTER TABLE public.evento_asistencia
  ADD COLUMN IF NOT EXISTS justificada BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.evento_asistencia.justificada IS
  'When true and estado = ausente, counts as a justified absence.';

DROP FUNCTION IF EXISTS public.admin_set_evento_asistencia(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.admin_set_evento_asistencia(
  p_evento_miembro_id UUID,
  p_estado TEXT,
  p_justificada BOOLEAN DEFAULT false
)
RETURNS public.evento_asistencia
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.evento_asistencia;
  v_evento_id UUID;
  v_justificada BOOLEAN := coalesce(p_justificada, false);
BEGIN
  IF p_estado NOT IN ('a_tiempo', 'tarde', 'ausente') THEN
    RAISE EXCEPTION 'invalid attendance status';
  END IF;

  IF p_estado <> 'ausente' THEN
    v_justificada := false;
  END IF;

  SELECT em.evento_id INTO v_evento_id
  FROM public.evento_miembro em
  WHERE em.id = p_evento_miembro_id;

  IF v_evento_id IS NULL THEN
    RAISE EXCEPTION 'event member assignment not found';
  END IF;

  IF NOT public.user_can_manage_evento(v_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_set_evento_asistencia';
  END IF;

  INSERT INTO public.evento_asistencia (evento_miembro_id, estado, justificada)
  VALUES (p_evento_miembro_id, p_estado, v_justificada)
  ON CONFLICT (evento_miembro_id)
  DO UPDATE SET
    estado = EXCLUDED.estado,
    justificada = EXCLUDED.justificada,
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_evento_asistencia(UUID, TEXT, BOOLEAN) TO authenticated;

-- =============================================================================
-- Per-unit validation start date (evaluation counts events on/after this date)
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
