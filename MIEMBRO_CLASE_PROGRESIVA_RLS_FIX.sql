-- =============================================================================
-- RLS for miembro_clase_progresiva (+ miembro_especialidad member links)
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: MIEMBRO_CONTACTOS_RLS_FIX.sql or USUARIOS_RLS_FIX.sql (helpers)
-- =============================================================================

-- Scope read access: superadmin or user assigned to member's church via clubs
CREATE OR REPLACE FUNCTION public.user_can_access_miembro(p_miembro_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_usuarios_superadmin()
    OR EXISTS (
      SELECT 1
      FROM public.miembro_club mc
      JOIN public.clubes c ON c.id = mc.club_id
      JOIN public.usuario_iglesia ui ON ui.iglesia_id = c.iglesia_id
      WHERE mc.miembro_id = p_miembro_id
        AND ui.usuario_id = public.get_user_id()
    );
$$;

-- Write access: superadmin or admin assigned to member's church
CREATE OR REPLACE FUNCTION public.user_can_manage_miembro(p_miembro_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_usuarios_superadmin()
    OR (
      public.is_usuarios_admin()
      AND EXISTS (
        SELECT 1
        FROM public.miembro_club mc
        JOIN public.clubes c ON c.id = mc.club_id
        JOIN public.usuario_iglesia ui ON ui.iglesia_id = c.iglesia_id
        WHERE mc.miembro_id = p_miembro_id
          AND ui.usuario_id = public.get_user_id()
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_miembro(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_miembro(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- miembro_clase_progresiva
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_assign_miembro_clase(
  p_miembro_id UUID,
  p_clase_id UUID
)
RETURNS public.miembro_clase_progresiva
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_clase_progresiva;
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_assign_miembro_clase';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'miembro_clase_progresiva'
      AND column_name = 'clase_progresiva_id'
  ) THEN
    INSERT INTO public.miembro_clase_progresiva (miembro_id, clase_progresiva_id)
    VALUES (p_miembro_id, p_clase_id)
    ON CONFLICT DO NOTHING
    RETURNING * INTO result;

    IF result.id IS NULL THEN
      SELECT * INTO result
      FROM public.miembro_clase_progresiva
      WHERE miembro_id = p_miembro_id
        AND clase_progresiva_id = p_clase_id
      LIMIT 1;
    END IF;
  ELSE
    INSERT INTO public.miembro_clase_progresiva (miembro_id, clase_id)
    VALUES (p_miembro_id, p_clase_id)
    ON CONFLICT DO NOTHING
    RETURNING * INTO result;

    IF result.id IS NULL THEN
      SELECT * INTO result
      FROM public.miembro_clase_progresiva
      WHERE miembro_id = p_miembro_id
        AND clase_id = p_clase_id
      LIMIT 1;
    END IF;
  END IF;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'unable to assign class to member';
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unassign_miembro_clase(p_link_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
BEGIN
  SELECT miembro_id INTO v_miembro_id
  FROM public.miembro_clase_progresiva
  WHERE id = p_link_id;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'class assignment not found';
  END IF;

  IF NOT public.user_can_manage_miembro(v_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_unassign_miembro_clase';
  END IF;

  DELETE FROM public.miembro_clase_progresiva WHERE id = p_link_id;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_assign_miembro_clase(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unassign_miembro_clase(UUID) TO authenticated;

DROP POLICY IF EXISTS miembro_clase_progresiva_select ON public.miembro_clase_progresiva;
DROP POLICY IF EXISTS miembro_clase_progresiva_insert ON public.miembro_clase_progresiva;
DROP POLICY IF EXISTS miembro_clase_progresiva_update ON public.miembro_clase_progresiva;
DROP POLICY IF EXISTS miembro_clase_progresiva_delete ON public.miembro_clase_progresiva;

ALTER TABLE public.miembro_clase_progresiva ENABLE ROW LEVEL SECURITY;

CREATE POLICY miembro_clase_progresiva_select ON public.miembro_clase_progresiva
  FOR SELECT TO authenticated
  USING (public.user_can_access_miembro(miembro_id));

CREATE POLICY miembro_clase_progresiva_insert ON public.miembro_clase_progresiva
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_miembro(miembro_id));

CREATE POLICY miembro_clase_progresiva_update ON public.miembro_clase_progresiva
  FOR UPDATE TO authenticated
  USING (public.user_can_manage_miembro(miembro_id))
  WITH CHECK (public.user_can_manage_miembro(miembro_id));

CREATE POLICY miembro_clase_progresiva_delete ON public.miembro_clase_progresiva
  FOR DELETE TO authenticated
  USING (public.user_can_manage_miembro(miembro_id));

-- ---------------------------------------------------------------------------
-- miembro_especialidad (same admin write rules)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_assign_miembro_especialidad(
  p_miembro_id UUID,
  p_especialidad_id UUID
)
RETURNS public.miembro_especialidad
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_especialidad;
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_assign_miembro_especialidad';
  END IF;

  INSERT INTO public.miembro_especialidad (miembro_id, especialidad_id)
  VALUES (p_miembro_id, p_especialidad_id)
  ON CONFLICT DO NOTHING
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    SELECT * INTO result
    FROM public.miembro_especialidad
    WHERE miembro_id = p_miembro_id
      AND especialidad_id = p_especialidad_id
    LIMIT 1;
  END IF;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'unable to assign specialty to member';
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unassign_miembro_especialidad(p_link_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
BEGIN
  SELECT miembro_id INTO v_miembro_id
  FROM public.miembro_especialidad
  WHERE id = p_link_id;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'specialty assignment not found';
  END IF;

  IF NOT public.user_can_manage_miembro(v_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_unassign_miembro_especialidad';
  END IF;

  DELETE FROM public.miembro_especialidad WHERE id = p_link_id;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_assign_miembro_especialidad(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unassign_miembro_especialidad(UUID) TO authenticated;

DROP POLICY IF EXISTS miembro_especialidad_select ON public.miembro_especialidad;
DROP POLICY IF EXISTS miembro_especialidad_insert ON public.miembro_especialidad;
DROP POLICY IF EXISTS miembro_especialidad_update ON public.miembro_especialidad;
DROP POLICY IF EXISTS miembro_especialidad_delete ON public.miembro_especialidad;

ALTER TABLE public.miembro_especialidad ENABLE ROW LEVEL SECURITY;

CREATE POLICY miembro_especialidad_select ON public.miembro_especialidad
  FOR SELECT TO authenticated
  USING (public.user_can_access_miembro(miembro_id));

CREATE POLICY miembro_especialidad_insert ON public.miembro_especialidad
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_miembro(miembro_id));

CREATE POLICY miembro_especialidad_update ON public.miembro_especialidad
  FOR UPDATE TO authenticated
  USING (public.user_can_manage_miembro(miembro_id))
  WITH CHECK (public.user_can_manage_miembro(miembro_id));

CREATE POLICY miembro_especialidad_delete ON public.miembro_especialidad
  FOR DELETE TO authenticated
  USING (public.user_can_manage_miembro(miembro_id));

-- ---------------------------------------------------------------------------
-- miembro_contactos: allow church admins (not only superadmin)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_save_miembro_contacto(
  p_miembro_id UUID,
  p_nombre TEXT,
  p_telefono TEXT,
  p_relacion TEXT DEFAULT NULL,
  p_contacto_id UUID DEFAULT NULL
)
RETURNS public.miembro_contactos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_contactos;
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_save_miembro_contacto';
  END IF;

  IF p_contacto_id IS NULL THEN
    INSERT INTO public.miembro_contactos (miembro_id, nombre, telefono, relacion, estado)
    VALUES (
      p_miembro_id,
      trim(p_nombre),
      trim(p_telefono),
      nullif(trim(coalesce(p_relacion, '')), ''),
      'activo'
    )
    RETURNING * INTO result;
  ELSE
    UPDATE public.miembro_contactos
    SET
      nombre = trim(p_nombre),
      telefono = trim(p_telefono),
      relacion = nullif(trim(coalesce(p_relacion, '')), '')
    WHERE id = p_contacto_id
      AND miembro_id = p_miembro_id
    RETURNING * INTO result;
  END IF;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'contact not found';
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_miembro_contacto_estado(
  p_contacto_id UUID,
  p_estado TEXT
)
RETURNS public.miembro_contactos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_contactos;
  v_miembro_id UUID;
BEGIN
  SELECT miembro_id INTO v_miembro_id
  FROM public.miembro_contactos
  WHERE id = p_contacto_id;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'contact not found';
  END IF;

  IF NOT public.user_can_manage_miembro(v_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_set_miembro_contacto_estado';
  END IF;

  UPDATE public.miembro_contactos
  SET estado = p_estado
  WHERE id = p_contacto_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

DROP POLICY IF EXISTS miembro_contactos_insert ON public.miembro_contactos;
DROP POLICY IF EXISTS miembro_contactos_update ON public.miembro_contactos;
DROP POLICY IF EXISTS miembro_contactos_delete ON public.miembro_contactos;

CREATE POLICY miembro_contactos_insert ON public.miembro_contactos
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_miembro(miembro_id));

CREATE POLICY miembro_contactos_update ON public.miembro_contactos
  FOR UPDATE TO authenticated
  USING (public.user_can_manage_miembro(miembro_id))
  WITH CHECK (public.user_can_manage_miembro(miembro_id));

CREATE POLICY miembro_contactos_delete ON public.miembro_contactos
  FOR DELETE TO authenticated
  USING (public.user_can_manage_miembro(miembro_id));

-- ---------------------------------------------------------------------------
-- miembro_datos_medicos: allow church admins
-- ---------------------------------------------------------------------------

-- Must drop first: an older version used parameter name p_eps instead of p_aseguradora
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

DROP POLICY IF EXISTS miembro_datos_medicos_insert ON public.miembro_datos_medicos;
DROP POLICY IF EXISTS miembro_datos_medicos_update ON public.miembro_datos_medicos;

CREATE POLICY miembro_datos_medicos_insert ON public.miembro_datos_medicos
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_miembro(miembro_id));

CREATE POLICY miembro_datos_medicos_update ON public.miembro_datos_medicos
  FOR UPDATE TO authenticated
  USING (public.user_can_manage_miembro(miembro_id))
  WITH CHECK (public.user_can_manage_miembro(miembro_id));
