-- =============================================================================
-- Member evaluation manual point adjustments (admin)
-- Run in Supabase Dashboard → SQL Editor after UNIDADES_SCHEMA.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.miembro_eval_ajuste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubes(id) ON DELETE CASCADE,
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  puntos NUMERIC(10, 2) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo TEXT NOT NULL,
  registrado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT miembro_eval_ajuste_motivo_not_empty CHECK (trim(motivo) <> '')
);

COMMENT ON TABLE public.miembro_eval_ajuste IS
  'Manual point adjustments applied to individual member evaluations by club admins.';

COMMENT ON COLUMN public.miembro_eval_ajuste.puntos IS
  'Points to add (positive) or subtract (negative) from the member evaluation.';

CREATE INDEX IF NOT EXISTS idx_miembro_eval_ajuste_club
  ON public.miembro_eval_ajuste(club_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_miembro_eval_ajuste_miembro
  ON public.miembro_eval_ajuste(miembro_id, fecha DESC);

DROP TRIGGER IF EXISTS trg_miembro_eval_ajuste_updated_at ON public.miembro_eval_ajuste;
CREATE TRIGGER trg_miembro_eval_ajuste_updated_at
  BEFORE UPDATE ON public.miembro_eval_ajuste
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.miembro_eval_ajuste ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_eval_ajuste_select ON public.miembro_eval_ajuste;
CREATE POLICY miembro_eval_ajuste_select ON public.miembro_eval_ajuste
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(club_id));

DROP POLICY IF EXISTS miembro_eval_ajuste_write ON public.miembro_eval_ajuste;
CREATE POLICY miembro_eval_ajuste_write ON public.miembro_eval_ajuste
  FOR ALL TO authenticated
  USING (public.user_can_manage_club(club_id))
  WITH CHECK (public.user_can_manage_club(club_id));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.miembro_belongs_to_club(
  p_miembro_id UUID,
  p_club_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.miembro_club mc
    WHERE mc.miembro_id = p_miembro_id
      AND mc.club_id = p_club_id
  );
$$;

-- ---------------------------------------------------------------------------
-- RPC: list adjustments for a club
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_club_miembro_eval_ajustes(p_club_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_can_access_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN coalesce((
    SELECT json_agg(
      json_build_object(
        'id', a.id,
        'club_id', a.club_id,
        'miembro_id', a.miembro_id,
        'puntos', a.puntos,
        'fecha', a.fecha,
        'motivo', a.motivo,
        'registrado_por', a.registrado_por,
        'created_at', a.created_at
      )
      ORDER BY a.fecha DESC, a.created_at DESC
    )
    FROM public.miembro_eval_ajuste a
    WHERE a.club_id = p_club_id
  ), '[]'::json);
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: add adjustment for one member
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_add_miembro_eval_ajuste(
  p_club_id UUID,
  p_miembro_id UUID,
  p_puntos NUMERIC,
  p_fecha DATE,
  p_motivo TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_motivo TEXT := trim(coalesce(p_motivo, ''));
BEGIN
  IF NOT public.user_can_manage_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF p_miembro_id IS NULL THEN
    RAISE EXCEPTION 'member is required';
  END IF;

  IF NOT public.miembro_belongs_to_club(p_miembro_id, p_club_id) THEN
    RAISE EXCEPTION 'member does not belong to club';
  END IF;

  IF p_puntos IS NULL OR NOT finite(p_puntos::double precision) THEN
    RAISE EXCEPTION 'invalid points';
  END IF;

  IF v_motivo = '' THEN
    RAISE EXCEPTION 'reason is required';
  END IF;

  INSERT INTO public.miembro_eval_ajuste (
    club_id,
    miembro_id,
    puntos,
    fecha,
    motivo,
    registrado_por
  )
  VALUES (
    p_club_id,
    p_miembro_id,
    p_puntos,
    coalesce(p_fecha, CURRENT_DATE),
    v_motivo,
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: bulk add same adjustment to many members
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_add_miembro_eval_ajustes_bulk(
  p_club_id UUID,
  p_miembro_ids UUID[],
  p_puntos NUMERIC,
  p_fecha DATE,
  p_motivo TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_count INTEGER := 0;
  v_motivo TEXT := trim(coalesce(p_motivo, ''));
BEGIN
  IF NOT public.user_can_manage_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF p_miembro_ids IS NULL OR array_length(p_miembro_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'at least one member is required';
  END IF;

  IF p_puntos IS NULL OR NOT finite(p_puntos::double precision) THEN
    RAISE EXCEPTION 'invalid points';
  END IF;

  IF v_motivo = '' THEN
    RAISE EXCEPTION 'reason is required';
  END IF;

  FOREACH v_miembro_id IN ARRAY p_miembro_ids
  LOOP
    IF v_miembro_id IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT public.miembro_belongs_to_club(v_miembro_id, p_club_id) THEN
      RAISE EXCEPTION 'member % does not belong to club', v_miembro_id;
    END IF;

    INSERT INTO public.miembro_eval_ajuste (
      club_id,
      miembro_id,
      puntos,
      fecha,
      motivo,
      registrado_por
    )
    VALUES (
      p_club_id,
      v_miembro_id,
      p_puntos,
      coalesce(p_fecha, CURRENT_DATE),
      v_motivo,
      auth.uid()
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: remove adjustment
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_remove_miembro_eval_ajuste(p_ajuste_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
BEGIN
  SELECT club_id INTO v_club_id
  FROM public.miembro_eval_ajuste
  WHERE id = p_ajuste_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'adjustment not found';
  END IF;

  IF NOT public.user_can_manage_club(v_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  DELETE FROM public.miembro_eval_ajuste
  WHERE id = p_ajuste_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_club_miembro_eval_ajustes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_miembro_eval_ajuste(UUID, UUID, NUMERIC, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_miembro_eval_ajustes_bulk(UUID, UUID[], NUMERIC, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_miembro_eval_ajuste(UUID) TO authenticated;
