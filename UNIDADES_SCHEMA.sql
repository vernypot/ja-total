-- =============================================================================
-- Unidades: temporary club member groupings (same gender per unit)
-- Roles: capitan, sub_capitan, secretario, tesorero (one per unit), consejero (multiple allowed), miembro
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: EVENTOS_SCHEMA.sql (user_can_access_club / user_can_manage_club)
-- Safe to re-run: adds missing columns if the table already exists.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS descripcion TEXT;

ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS genero VARCHAR(10);

ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activo';

ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.unidades
SET genero = 'M'
WHERE genero IS NULL;

UPDATE public.unidades
SET estado = 'activo'
WHERE estado IS NULL;

ALTER TABLE public.unidades
  ALTER COLUMN genero SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unidades_genero_check'
      AND conrelid = 'public.unidades'::regclass
  ) THEN
    ALTER TABLE public.unidades
      ADD CONSTRAINT unidades_genero_check
      CHECK (genero IN ('M', 'F'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unidades_estado_check'
      AND conrelid = 'public.unidades'::regclass
  ) THEN
    ALTER TABLE public.unidades
      ADD CONSTRAINT unidades_estado_check
      CHECK (estado IN ('activo', 'inactivo'));
  END IF;
END $$;

DROP INDEX IF EXISTS idx_unidades_club;
CREATE INDEX idx_unidades_club ON public.unidades(club_id, estado, orden, nombre);

CREATE TABLE IF NOT EXISTS public.miembro_unidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (unidad_id, miembro_id)
);

ALTER TABLE public.miembro_unidad
  ADD COLUMN IF NOT EXISTS rol TEXT NOT NULL DEFAULT 'miembro';

ALTER TABLE public.miembro_unidad
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.miembro_unidad
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.miembro_unidad
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE;

ALTER TABLE public.miembro_unidad
  ALTER COLUMN fecha_inicio SET DEFAULT CURRENT_DATE;

UPDATE public.miembro_unidad
SET fecha_inicio = CURRENT_DATE
WHERE fecha_inicio IS NULL;

UPDATE public.miembro_unidad
SET rol = 'miembro'
WHERE rol IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'miembro_unidad_rol_check'
      AND conrelid = 'public.miembro_unidad'::regclass
  ) THEN
    ALTER TABLE public.miembro_unidad
      ADD CONSTRAINT miembro_unidad_rol_check
      CHECK (rol IN ('capitan', 'sub_capitan', 'secretario', 'tesorero', 'consejero', 'miembro'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_miembro_unidad_unidad ON public.miembro_unidad(unidad_id);
CREATE INDEX IF NOT EXISTS idx_miembro_unidad_miembro ON public.miembro_unidad(miembro_id);

DELETE FROM public.miembro_unidad a
USING public.miembro_unidad b
WHERE a.id > b.id
  AND a.unidad_id = b.unidad_id
  AND a.miembro_id = b.miembro_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_unidad_unidad_miembro
  ON public.miembro_unidad (unidad_id, miembro_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_unidad_capitan
  ON public.miembro_unidad(unidad_id) WHERE rol = 'capitan';

CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_unidad_sub_capitan
  ON public.miembro_unidad(unidad_id) WHERE rol = 'sub_capitan';

CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_unidad_secretario
  ON public.miembro_unidad(unidad_id) WHERE rol = 'secretario';

CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_unidad_tesorero
  ON public.miembro_unidad(unidad_id) WHERE rol = 'tesorero';

DROP INDEX IF EXISTS public.uq_miembro_unidad_consejero;

COMMENT ON TABLE public.unidades IS
  'Temporary member groupings within a club. All members in a unit share the same gender.';

COMMENT ON TABLE public.miembro_unidad IS
  'Member assignment to a unit with an optional leadership role.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_can_access_unidad(p_unidad_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.unidades u
    WHERE u.id = p_unidad_id
      AND public.user_can_access_club(u.club_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_unidad(p_unidad_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.unidades u
    WHERE u.id = p_unidad_id
      AND public.user_can_manage_club(u.club_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_miembro_genero_unidad(p_genero TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN upper(trim(coalesce(p_genero, ''))) IN ('M', 'MASCULINO', 'MALE', 'H', 'HOMBRE') THEN 'M'
    WHEN upper(trim(coalesce(p_genero, ''))) IN ('F', 'FEMENINO', 'FEMALE', 'MUJER') THEN 'F'
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_unidad(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_unidad(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_unidad_leadership_role(
  p_unidad_id UUID,
  p_rol TEXT,
  p_keep_miembro_unidad_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_rol NOT IN ('capitan', 'sub_capitan', 'secretario', 'tesorero') THEN
    RETURN;
  END IF;

  UPDATE public.miembro_unidad
  SET rol = 'miembro', updated_at = now()
  WHERE unidad_id = p_unidad_id
    AND rol = p_rol
    AND (p_keep_miembro_unidad_id IS NULL OR id <> p_keep_miembro_unidad_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_unidad_leadership_role(UUID, TEXT, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_create_unidad(
  p_club_id UUID,
  p_nombre TEXT,
  p_genero TEXT,
  p_descripcion TEXT DEFAULT NULL
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

  INSERT INTO public.unidades (club_id, nombre, genero, descripcion)
  VALUES (p_club_id, trim(p_nombre), v_genero, nullif(trim(coalesce(p_descripcion, '')), ''))
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
  p_estado TEXT DEFAULT NULL
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
    updated_at = now()
  WHERE id = p_unidad_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_miembro_unidad(
  p_unidad_id UUID,
  p_miembro_id UUID,
  p_rol TEXT DEFAULT 'miembro'
)
RETURNS public.miembro_unidad
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unidad public.unidades;
  v_member_genero TEXT;
  result public.miembro_unidad;
BEGIN
  IF p_rol NOT IN ('capitan', 'sub_capitan', 'secretario', 'tesorero', 'consejero', 'miembro') THEN
    RAISE EXCEPTION 'invalid unit role';
  END IF;

  SELECT * INTO v_unidad FROM public.unidades WHERE id = p_unidad_id;
  IF v_unidad.id IS NULL THEN
    RAISE EXCEPTION 'unit not found';
  END IF;

  IF NOT public.user_can_manage_club(v_unidad.club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.miembro_club mc
    WHERE mc.club_id = v_unidad.club_id AND mc.miembro_id = p_miembro_id
  ) THEN
    RAISE EXCEPTION 'member is not assigned to this club';
  END IF;

  SELECT public.normalize_miembro_genero_unidad(m.genero) INTO v_member_genero
  FROM public.miembros m
  WHERE m.id = p_miembro_id;

  IF v_member_genero IS NULL OR v_member_genero <> v_unidad.genero THEN
    RAISE EXCEPTION 'member gender does not match unit gender';
  END IF;

  DELETE FROM public.miembro_unidad mu
  USING public.unidades u
  WHERE mu.unidad_id = u.id
    AND u.club_id = v_unidad.club_id
    AND mu.miembro_id = p_miembro_id
    AND mu.unidad_id <> p_unidad_id;

  PERFORM public.clear_unidad_leadership_role(p_unidad_id, p_rol, NULL);

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'miembro_unidad'
      AND column_name = 'fecha_inicio'
  ) THEN
    INSERT INTO public.miembro_unidad (unidad_id, miembro_id, rol, fecha_inicio)
    VALUES (p_unidad_id, p_miembro_id, p_rol, CURRENT_DATE)
    ON CONFLICT (unidad_id, miembro_id) DO UPDATE
    SET rol = EXCLUDED.rol, updated_at = now()
    RETURNING * INTO result;
  ELSE
    INSERT INTO public.miembro_unidad (unidad_id, miembro_id, rol)
    VALUES (p_unidad_id, p_miembro_id, p_rol)
    ON CONFLICT (unidad_id, miembro_id) DO UPDATE
    SET rol = EXCLUDED.rol, updated_at = now()
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_miembro_unidad_rol(
  p_miembro_unidad_id UUID,
  p_rol TEXT
)
RETURNS public.miembro_unidad
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unidad_id UUID;
  result public.miembro_unidad;
BEGIN
  IF p_rol NOT IN ('capitan', 'sub_capitan', 'secretario', 'tesorero', 'consejero', 'miembro') THEN
    RAISE EXCEPTION 'invalid unit role';
  END IF;

  SELECT mu.unidad_id INTO v_unidad_id
  FROM public.miembro_unidad mu
  WHERE mu.id = p_miembro_unidad_id;

  IF v_unidad_id IS NULL THEN
    RAISE EXCEPTION 'unit member assignment not found';
  END IF;

  IF NOT public.user_can_manage_unidad(v_unidad_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  PERFORM public.clear_unidad_leadership_role(v_unidad_id, p_rol, p_miembro_unidad_id);

  UPDATE public.miembro_unidad
  SET rol = p_rol, updated_at = now()
  WHERE id = p_miembro_unidad_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_miembro_unidad(p_miembro_unidad_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unidad_id UUID;
BEGIN
  SELECT mu.unidad_id INTO v_unidad_id
  FROM public.miembro_unidad mu
  WHERE mu.id = p_miembro_unidad_id;

  IF v_unidad_id IS NULL THEN
    RAISE EXCEPTION 'unit member assignment not found';
  END IF;

  IF NOT public.user_can_manage_unidad(v_unidad_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  DELETE FROM public.miembro_unidad WHERE id = p_miembro_unidad_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_unidad(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_unidad(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_miembro_unidad(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_miembro_unidad_rol(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_miembro_unidad(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_unidades_by_club(p_club_id UUID)
RETURNS SETOF public.unidades
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.*
  FROM public.unidades u
  WHERE u.club_id = p_club_id
    AND public.user_can_access_club(p_club_id)
    AND coalesce(u.estado, 'activo') = 'activo'
  ORDER BY u.orden NULLS LAST, u.nombre;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_miembro_unidad_for_club(p_club_id UUID)
RETURNS SETOF public.miembro_unidad
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mu.*
  FROM public.miembro_unidad mu
  JOIN public.unidades u ON u.id = mu.unidad_id
  WHERE u.club_id = p_club_id
    AND public.user_can_access_club(p_club_id)
    AND coalesce(u.estado, 'activo') = 'activo'
  ORDER BY mu.id;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_unidades_by_club(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_miembro_unidad_for_club(UUID) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.miembro_unidad TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: unidades
-- ---------------------------------------------------------------------------

ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unidades_select ON public.unidades;
DROP POLICY IF EXISTS unidades_insert ON public.unidades;
DROP POLICY IF EXISTS unidades_update ON public.unidades;
DROP POLICY IF EXISTS unidades_delete ON public.unidades;

CREATE POLICY unidades_select ON public.unidades
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(club_id));

CREATE POLICY unidades_insert ON public.unidades
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_club(club_id));

CREATE POLICY unidades_update ON public.unidades
  FOR UPDATE TO authenticated
  USING (public.user_can_manage_club(club_id))
  WITH CHECK (public.user_can_manage_club(club_id));

CREATE POLICY unidades_delete ON public.unidades
  FOR DELETE TO authenticated
  USING (public.user_can_manage_club(club_id));

-- ---------------------------------------------------------------------------
-- RLS: miembro_unidad
-- ---------------------------------------------------------------------------

ALTER TABLE public.miembro_unidad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_unidad_select ON public.miembro_unidad;
DROP POLICY IF EXISTS miembro_unidad_insert ON public.miembro_unidad;
DROP POLICY IF EXISTS miembro_unidad_update ON public.miembro_unidad;
DROP POLICY IF EXISTS miembro_unidad_delete ON public.miembro_unidad;

CREATE POLICY miembro_unidad_select ON public.miembro_unidad
  FOR SELECT TO authenticated
  USING (public.user_can_access_unidad(unidad_id));

CREATE POLICY miembro_unidad_insert ON public.miembro_unidad
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_unidad(unidad_id));

CREATE POLICY miembro_unidad_update ON public.miembro_unidad
  FOR UPDATE TO authenticated
  USING (public.user_can_manage_unidad(unidad_id))
  WITH CHECK (public.user_can_manage_unidad(unidad_id));

CREATE POLICY miembro_unidad_delete ON public.miembro_unidad
  FOR DELETE TO authenticated
  USING (public.user_can_manage_unidad(unidad_id));
