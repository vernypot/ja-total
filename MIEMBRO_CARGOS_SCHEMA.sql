-- =============================================================================
-- Member cargo assignments with start/end history
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: CARGOS_SCHEMA.sql, MIEMBRO_CONTACTOS_RLS_FIX.sql (RLS helpers)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.miembro_cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  cargo_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE RESTRICT,
  club_id UUID REFERENCES public.clubes(id) ON DELETE SET NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  en_curso BOOLEAN NOT NULL DEFAULT true,
  notas TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT miembro_cargos_fechas_validas
    CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio),
  CONSTRAINT miembro_cargos_en_curso_sin_fin
    CHECK (NOT en_curso OR fecha_fin IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_miembro_cargos_miembro
  ON public.miembro_cargos(miembro_id, en_curso, estado);

CREATE INDEX IF NOT EXISTS idx_miembro_cargos_cargo
  ON public.miembro_cargos(cargo_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_miembro_cargos_ongoing_unique
  ON public.miembro_cargos(miembro_id, cargo_id)
  WHERE en_curso = true AND estado = 'activo';

COMMENT ON TABLE public.miembro_cargos IS
  'Historic log of leadership positions held by a member.';
COMMENT ON COLUMN public.miembro_cargos.fecha_inicio IS
  'Start date; NULL means unknown / undefined start date.';
COMMENT ON COLUMN public.miembro_cargos.fecha_fin IS
  'End date; NULL while en_curso is true.';
COMMENT ON COLUMN public.miembro_cargos.en_curso IS
  'True when the member currently holds this cargo.';

DROP TRIGGER IF EXISTS trg_miembro_cargos_updated_at ON public.miembro_cargos;
CREATE TRIGGER trg_miembro_cargos_updated_at
  BEFORE UPDATE ON public.miembro_cargos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.miembro_cargos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_cargos_select ON public.miembro_cargos;
CREATE POLICY miembro_cargos_select ON public.miembro_cargos
  FOR SELECT TO authenticated
  USING (public.user_can_access_miembro(miembro_id));

DROP POLICY IF EXISTS miembro_cargos_insert ON public.miembro_cargos;
CREATE POLICY miembro_cargos_insert ON public.miembro_cargos
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_miembro(miembro_id));

DROP POLICY IF EXISTS miembro_cargos_update ON public.miembro_cargos;
CREATE POLICY miembro_cargos_update ON public.miembro_cargos
  FOR UPDATE TO authenticated
  USING (public.user_can_manage_miembro(miembro_id))
  WITH CHECK (public.user_can_manage_miembro(miembro_id));

DROP POLICY IF EXISTS miembro_cargos_delete ON public.miembro_cargos;
CREATE POLICY miembro_cargos_delete ON public.miembro_cargos
  FOR DELETE TO authenticated
  USING (public.user_can_manage_miembro(miembro_id));

-- ---------------------------------------------------------------------------
-- RPC helpers (SECURITY DEFINER fallback)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_assign_miembro_cargo(
  p_miembro_id UUID,
  p_cargo_id UUID,
  p_club_id UUID DEFAULT NULL,
  p_fecha_inicio DATE DEFAULT NULL,
  p_fecha_fin DATE DEFAULT NULL,
  p_en_curso BOOLEAN DEFAULT true,
  p_notas TEXT DEFAULT NULL
)
RETURNS public.miembro_cargos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_cargos;
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_assign_miembro_cargo';
  END IF;

  IF p_en_curso AND EXISTS (
    SELECT 1 FROM public.miembro_cargos
    WHERE miembro_id = p_miembro_id
      AND cargo_id = p_cargo_id
      AND en_curso = true
      AND estado = 'activo'
  ) THEN
    RAISE EXCEPTION 'member already has this ongoing cargo';
  END IF;

  INSERT INTO public.miembro_cargos (
    miembro_id, cargo_id, club_id, fecha_inicio, fecha_fin, en_curso, notas, estado
  )
  VALUES (
    p_miembro_id,
    p_cargo_id,
    p_club_id,
    p_fecha_inicio,
    CASE WHEN p_en_curso THEN NULL ELSE p_fecha_fin END,
    COALESCE(p_en_curso, true),
    p_notas,
    'activo'
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_miembro_cargo(
  p_link_id UUID,
  p_club_id UUID DEFAULT NULL,
  p_fecha_inicio DATE DEFAULT NULL,
  p_fecha_fin DATE DEFAULT NULL,
  p_en_curso BOOLEAN DEFAULT NULL,
  p_notas TEXT DEFAULT NULL,
  p_clear_fecha_inicio BOOLEAN DEFAULT false
)
RETURNS public.miembro_cargos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_cargos;
  v_miembro_id UUID;
  v_cargo_id UUID;
  v_en_curso BOOLEAN;
BEGIN
  SELECT miembro_id, cargo_id, en_curso
  INTO v_miembro_id, v_cargo_id, v_en_curso
  FROM public.miembro_cargos
  WHERE id = p_link_id;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'cargo assignment not found';
  END IF;

  IF NOT public.user_can_manage_miembro(v_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_update_miembro_cargo';
  END IF;

  IF COALESCE(p_en_curso, v_en_curso) AND EXISTS (
    SELECT 1 FROM public.miembro_cargos
    WHERE miembro_id = v_miembro_id
      AND cargo_id = v_cargo_id
      AND en_curso = true
      AND estado = 'activo'
      AND id <> p_link_id
  ) THEN
    RAISE EXCEPTION 'member already has this ongoing cargo';
  END IF;

  UPDATE public.miembro_cargos
  SET
    club_id = COALESCE(p_club_id, club_id),
    fecha_inicio = CASE
      WHEN p_clear_fecha_inicio THEN NULL
      WHEN p_fecha_inicio IS NOT NULL THEN p_fecha_inicio
      ELSE fecha_inicio
    END,
    en_curso = COALESCE(p_en_curso, en_curso),
    fecha_fin = CASE
      WHEN COALESCE(p_en_curso, en_curso) THEN NULL
      ELSE COALESCE(p_fecha_fin, fecha_fin, CURRENT_DATE)
    END,
    notas = COALESCE(p_notas, notas)
  WHERE id = p_link_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_close_miembro_cargo(
  p_link_id UUID,
  p_fecha_fin DATE DEFAULT NULL
)
RETURNS public.miembro_cargos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_cargos;
  v_miembro_id UUID;
BEGIN
  SELECT miembro_id INTO v_miembro_id
  FROM public.miembro_cargos
  WHERE id = p_link_id;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'cargo assignment not found';
  END IF;

  IF NOT public.user_can_manage_miembro(v_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_close_miembro_cargo';
  END IF;

  UPDATE public.miembro_cargos
  SET en_curso = false, fecha_fin = COALESCE(p_fecha_fin, CURRENT_DATE)
  WHERE id = p_link_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_assign_miembro_cargo(UUID, UUID, UUID, DATE, DATE, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_miembro_cargo(UUID, UUID, DATE, DATE, BOOLEAN, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_close_miembro_cargo(UUID, DATE) TO authenticated;
