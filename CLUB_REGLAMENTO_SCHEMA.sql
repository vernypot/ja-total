-- =============================================================================
-- Club Reglamento: hierarchical rules (sections / items / sub-items) + penalties
-- Run in Supabase Dashboard → SQL Editor after UNIDADES_SCHEMA.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.club_reglamento_nodo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubes(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.club_reglamento_nodo(id) ON DELETE CASCADE,
  nivel SMALLINT NOT NULL CHECK (nivel BETWEEN 1 AND 3),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  puntos_penalizacion NUMERIC(10, 2) NOT NULL DEFAULT 0,
  orden INTEGER NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT club_reglamento_nodo_parent_club CHECK (
    parent_id IS NULL OR club_id IS NOT NULL
  )
);

COMMENT ON TABLE public.club_reglamento_nodo IS
  'Club regulations tree: nivel 1 = section, 2 = item, 3 = sub-item. Leaf nodes may define penalty points.';
COMMENT ON COLUMN public.club_reglamento_nodo.puntos_penalizacion IS
  'Points deducted from unit evaluation when an infraction is recorded for this rule.';

CREATE INDEX IF NOT EXISTS idx_club_reglamento_nodo_club
  ON public.club_reglamento_nodo(club_id, estado, nivel, orden, titulo);

CREATE INDEX IF NOT EXISTS idx_club_reglamento_nodo_parent
  ON public.club_reglamento_nodo(parent_id);

CREATE TABLE IF NOT EXISTS public.unidad_reglamento_infraccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  reglamento_nodo_id UUID NOT NULL REFERENCES public.club_reglamento_nodo(id) ON DELETE RESTRICT,
  cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT,
  registrado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.unidad_reglamento_infraccion IS
  'Recorded unit infractions against reglamento rules; affects evaluation scoring.';

CREATE INDEX IF NOT EXISTS idx_unidad_reglamento_infraccion_unidad
  ON public.unidad_reglamento_infraccion(unidad_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_unidad_reglamento_infraccion_nodo
  ON public.unidad_reglamento_infraccion(reglamento_nodo_id);

DROP TRIGGER IF EXISTS trg_club_reglamento_nodo_updated_at ON public.club_reglamento_nodo;
CREATE TRIGGER trg_club_reglamento_nodo_updated_at
  BEFORE UPDATE ON public.club_reglamento_nodo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_unidad_reglamento_infraccion_updated_at ON public.unidad_reglamento_infraccion;
CREATE TRIGGER trg_unidad_reglamento_infraccion_updated_at
  BEFORE UPDATE ON public.unidad_reglamento_infraccion
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.club_reglamento_nodo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidad_reglamento_infraccion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_reglamento_nodo_select ON public.club_reglamento_nodo;
CREATE POLICY club_reglamento_nodo_select ON public.club_reglamento_nodo
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(club_id));

DROP POLICY IF EXISTS club_reglamento_nodo_write ON public.club_reglamento_nodo;
CREATE POLICY club_reglamento_nodo_write ON public.club_reglamento_nodo
  FOR ALL TO authenticated
  USING (public.user_can_manage_club(club_id))
  WITH CHECK (public.user_can_manage_club(club_id));

DROP POLICY IF EXISTS unidad_reglamento_infraccion_select ON public.unidad_reglamento_infraccion;
CREATE POLICY unidad_reglamento_infraccion_select ON public.unidad_reglamento_infraccion
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.unidades u
      WHERE u.id = unidad_reglamento_infraccion.unidad_id
        AND public.user_can_access_club(u.club_id)
    )
  );

DROP POLICY IF EXISTS unidad_reglamento_infraccion_write ON public.unidad_reglamento_infraccion;
CREATE POLICY unidad_reglamento_infraccion_write ON public.unidad_reglamento_infraccion
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.unidades u
      WHERE u.id = unidad_reglamento_infraccion.unidad_id
        AND public.user_can_manage_club(u.club_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.unidades u
      WHERE u.id = unidad_reglamento_infraccion.unidad_id
        AND public.user_can_manage_club(u.club_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reglamento_nodo_es_hoja(p_nodo_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.club_reglamento_nodo child
    WHERE child.parent_id = p_nodo_id
      AND child.estado = 'activo'
  );
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_club_reglamento(p_club_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nodos JSON;
  v_infracciones JSON;
BEGIN
  IF NOT public.user_can_access_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT coalesce(json_agg(
    json_build_object(
      'id', n.id,
      'club_id', n.club_id,
      'parent_id', n.parent_id,
      'nivel', n.nivel,
      'titulo', n.titulo,
      'descripcion', n.descripcion,
      'puntos_penalizacion', n.puntos_penalizacion,
      'orden', n.orden,
      'estado', n.estado
    )
    ORDER BY n.nivel, n.orden, n.titulo
  ), '[]'::json)
  INTO v_nodos
  FROM public.club_reglamento_nodo n
  WHERE n.club_id = p_club_id
    AND n.estado = 'activo';

  SELECT coalesce(json_agg(
    json_build_object(
      'id', i.id,
      'unidad_id', i.unidad_id,
      'reglamento_nodo_id', i.reglamento_nodo_id,
      'cantidad', i.cantidad,
      'fecha', i.fecha,
      'notas', i.notas
    )
    ORDER BY i.fecha DESC, i.created_at DESC
  ), '[]'::json)
  INTO v_infracciones
  FROM public.unidad_reglamento_infraccion i
  JOIN public.unidades u ON u.id = i.unidad_id
  WHERE u.club_id = p_club_id;

  RETURN json_build_object(
    'nodos', v_nodos,
    'infracciones', v_infracciones
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_reglamento_nodo(
  p_nodo_id UUID,
  p_club_id UUID,
  p_parent_id UUID,
  p_titulo TEXT,
  p_descripcion TEXT DEFAULT NULL,
  p_puntos_penalizacion NUMERIC DEFAULT 0,
  p_orden INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_nivel SMALLINT;
  v_parent_nivel SMALLINT;
  v_parent_club UUID;
BEGIN
  IF NOT public.user_can_manage_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF trim(coalesce(p_titulo, '')) = '' THEN
    RAISE EXCEPTION 'title is required';
  END IF;

  IF p_parent_id IS NULL THEN
    v_nivel := 1;
  ELSE
    SELECT n.nivel, n.club_id
    INTO v_parent_nivel, v_parent_club
    FROM public.club_reglamento_nodo n
    WHERE n.id = p_parent_id
      AND n.estado = 'activo';

    IF v_parent_club IS NULL OR v_parent_club <> p_club_id THEN
      RAISE EXCEPTION 'parent node not found';
    END IF;

    IF v_parent_nivel >= 3 THEN
      RAISE EXCEPTION 'maximum reglamento depth is 3 levels';
    END IF;

    v_nivel := v_parent_nivel + 1;
  END IF;

  IF p_nodo_id IS NULL THEN
    INSERT INTO public.club_reglamento_nodo (
      club_id, parent_id, nivel, titulo, descripcion, puntos_penalizacion, orden
    )
    VALUES (
      p_club_id,
      p_parent_id,
      v_nivel,
      trim(p_titulo),
      nullif(trim(coalesce(p_descripcion, '')), ''),
      greatest(coalesce(p_puntos_penalizacion, 0), 0),
      coalesce(p_orden, 0)
    )
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  UPDATE public.club_reglamento_nodo
  SET
    titulo = trim(p_titulo),
    descripcion = nullif(trim(coalesce(p_descripcion, '')), ''),
    puntos_penalizacion = greatest(coalesce(p_puntos_penalizacion, 0), 0),
    orden = coalesce(p_orden, orden),
    updated_at = now()
  WHERE id = p_nodo_id
    AND club_id = p_club_id
    AND estado = 'activo'
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'reglamento node not found';
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_deactivate_reglamento_nodo(p_nodo_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
BEGIN
  SELECT club_id INTO v_club_id
  FROM public.club_reglamento_nodo
  WHERE id = p_nodo_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'reglamento node not found';
  END IF;

  IF NOT public.user_can_manage_club(v_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  UPDATE public.club_reglamento_nodo
  SET estado = 'inactivo', updated_at = now()
  WHERE id = p_nodo_id;

  UPDATE public.club_reglamento_nodo
  SET estado = 'inactivo', updated_at = now()
  WHERE parent_id = p_nodo_id
    AND estado = 'activo';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_unidad_infraccion(
  p_infraccion_id UUID,
  p_unidad_id UUID,
  p_reglamento_nodo_id UUID,
  p_cantidad NUMERIC DEFAULT 1,
  p_fecha DATE DEFAULT CURRENT_DATE,
  p_notas TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_club_id UUID;
  v_nodo_club UUID;
  v_puntos NUMERIC;
  v_es_hoja BOOLEAN;
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

  SELECT n.club_id, n.puntos_penalizacion, public.reglamento_nodo_es_hoja(n.id)
  INTO v_nodo_club, v_puntos, v_es_hoja
  FROM public.club_reglamento_nodo n
  WHERE n.id = p_reglamento_nodo_id
    AND n.estado = 'activo';

  IF v_nodo_club IS NULL OR v_nodo_club <> v_club_id THEN
    RAISE EXCEPTION 'reglamento rule not found';
  END IF;

  IF NOT v_es_hoja OR coalesce(v_puntos, 0) <= 0 THEN
    RAISE EXCEPTION 'infractions require a leaf rule with penalty points';
  END IF;

  IF p_infraccion_id IS NULL THEN
    INSERT INTO public.unidad_reglamento_infraccion (
      unidad_id, reglamento_nodo_id, cantidad, fecha, notas, registrado_por
    )
    VALUES (
      p_unidad_id,
      p_reglamento_nodo_id,
      greatest(coalesce(p_cantidad, 1), 0),
      coalesce(p_fecha, CURRENT_DATE),
      nullif(trim(coalesce(p_notas, '')), ''),
      auth.uid()
    )
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  UPDATE public.unidad_reglamento_infraccion i
  SET
    cantidad = greatest(coalesce(p_cantidad, 1), 0),
    fecha = coalesce(p_fecha, i.fecha),
    notas = nullif(trim(coalesce(p_notas, '')), ''),
    updated_at = now()
  FROM public.unidades u
  WHERE i.id = p_infraccion_id
    AND i.unidad_id = u.id
    AND u.club_id = v_club_id
    AND i.unidad_id = p_unidad_id
    AND i.reglamento_nodo_id = p_reglamento_nodo_id
  RETURNING i.id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'infraction not found';
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_unidad_infraccion(p_infraccion_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
BEGIN
  SELECT u.club_id INTO v_club_id
  FROM public.unidad_reglamento_infraccion i
  JOIN public.unidades u ON u.id = i.unidad_id
  WHERE i.id = p_infraccion_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'infraction not found';
  END IF;

  IF NOT public.user_can_manage_club(v_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  DELETE FROM public.unidad_reglamento_infraccion
  WHERE id = p_infraccion_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Member portal read-only
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.member_portal_fetch_reglamento(
  p_session_token TEXT,
  p_club_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_nodos JSON;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.miembro_club mc
    JOIN public.clubes c ON c.id = mc.club_id
    WHERE mc.miembro_id = v_miembro_id
      AND mc.club_id = p_club_id
      AND c.estado = 'activo'
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT coalesce(json_agg(
    json_build_object(
      'id', n.id,
      'parent_id', n.parent_id,
      'nivel', n.nivel,
      'titulo', n.titulo,
      'descripcion', n.descripcion,
      'puntos_penalizacion', n.puntos_penalizacion,
      'orden', n.orden
    )
    ORDER BY n.nivel, n.orden, n.titulo
  ), '[]'::json)
  INTO v_nodos
  FROM public.club_reglamento_nodo n
  WHERE n.club_id = p_club_id
    AND n.estado = 'activo';

  RETURN json_build_object('nodos', v_nodos);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_club_reglamento(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_reglamento_nodo(UUID, UUID, UUID, TEXT, TEXT, NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_reglamento_nodo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_unidad_infraccion(UUID, UUID, UUID, NUMERIC, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_unidad_infraccion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_portal_fetch_reglamento(TEXT, UUID) TO authenticated, anon;
