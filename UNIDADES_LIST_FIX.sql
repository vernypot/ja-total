-- Patch: fix Unidades list + member assignment on legacy miembro_unidad tables
-- Run in Supabase Dashboard → SQL Editor (safe to re-run)

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

DELETE FROM public.miembro_unidad a
USING public.miembro_unidad b
WHERE a.id > b.id
  AND a.unidad_id = b.unidad_id
  AND a.miembro_id = b.miembro_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_miembro_unidad_unidad_miembro
  ON public.miembro_unidad (unidad_id, miembro_id);

DROP INDEX IF EXISTS public.uq_miembro_unidad_consejero;

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

GRANT EXECUTE ON FUNCTION public.clear_unidad_leadership_role(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_miembro_unidad(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_miembro_unidad_rol(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_unidades_by_club(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_miembro_unidad_for_club(UUID) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.miembro_unidad TO authenticated;
