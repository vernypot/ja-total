-- =============================================================================
-- Period work / agenda planning (meetings + progressive class requirements)
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: EVENTOS_SCHEMA.sql (user_can_manage_club), clases_progresivas, clase_requisitos
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_periodo_trabajo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  num_reuniones INTEGER NOT NULL CHECK (num_reuniones > 0),
  notas TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo', 'archivado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plan_periodo_fechas_validas CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_plan_periodo_trabajo_club
  ON public.plan_periodo_trabajo(club_id, estado);

COMMENT ON TABLE public.plan_periodo_trabajo IS
  'Club-scoped period agenda plan: date range and number of regular meetings.';

-- Progressive classes included in this plan
CREATE TABLE IF NOT EXISTS public.plan_periodo_clase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL
    REFERENCES public.plan_periodo_trabajo(id) ON DELETE CASCADE,
  clase_progresiva_id UUID NOT NULL
    REFERENCES public.clases_progresivas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, clase_progresiva_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_periodo_clase_plan
  ON public.plan_periodo_clase(plan_id);

-- Individual meetings within the plan (1 .. num_reuniones)
CREATE TABLE IF NOT EXISTS public.plan_reunion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL
    REFERENCES public.plan_periodo_trabajo(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL CHECK (numero > 0),
  titulo TEXT,
  fecha DATE,
  notas TEXT,
  hora TIME,
  lugar TEXT,
  evento_id UUID REFERENCES public.eventos(id) ON DELETE SET NULL,
  tipo_evento_id UUID REFERENCES public.tipos_evento(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_plan_reunion_plan_numero
  ON public.plan_reunion(plan_id, numero);

-- Requirements assigned to each meeting
CREATE TABLE IF NOT EXISTS public.plan_reunion_requisito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id UUID NOT NULL
    REFERENCES public.plan_reunion(id) ON DELETE CASCADE,
  clase_requisito_id UUID NOT NULL
    REFERENCES public.clase_requisitos(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reunion_id, clase_requisito_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_reunion_requisito_reunion
  ON public.plan_reunion_requisito(reunion_id, orden);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.plan_club_id(p_plan_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT club_id FROM public.plan_periodo_trabajo WHERE id = p_plan_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.reunion_plan_id(p_reunion_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT plan_id FROM public.plan_reunion WHERE id = p_reunion_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.plan_club_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reunion_plan_id(UUID) TO authenticated;

-- Sync meeting slots when num_reuniones changes
CREATE OR REPLACE FUNCTION public.sync_plan_reuniones(p_plan_id UUID, p_num_reuniones INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_i INTEGER;
BEGIN
  v_club_id := public.plan_club_id(p_plan_id);
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'plan not found';
  END IF;
  IF NOT public.user_can_manage_club(v_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  IF p_num_reuniones IS NULL OR p_num_reuniones < 1 THEN
    RAISE EXCEPTION 'num_reuniones must be at least 1';
  END IF;

  DELETE FROM public.plan_reunion
  WHERE plan_id = p_plan_id AND numero > p_num_reuniones;

  FOR v_i IN 1..p_num_reuniones LOOP
    INSERT INTO public.plan_reunion (plan_id, numero, titulo)
    VALUES (p_plan_id, v_i, 'Reunión ' || v_i)
    ON CONFLICT (plan_id, numero) DO NOTHING;
  END LOOP;

  RETURN p_num_reuniones;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_plan_reuniones(UUID, INTEGER) TO authenticated;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_plan_periodo_trabajo_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_plan_periodo_trabajo_updated_at ON public.plan_periodo_trabajo;
CREATE TRIGGER trg_plan_periodo_trabajo_updated_at
  BEFORE UPDATE ON public.plan_periodo_trabajo
  FOR EACH ROW EXECUTE FUNCTION public.set_plan_periodo_trabajo_updated_at();

CREATE OR REPLACE FUNCTION public.set_plan_reunion_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_plan_reunion_updated_at ON public.plan_reunion;
CREATE TRIGGER trg_plan_reunion_updated_at
  BEFORE UPDATE ON public.plan_reunion
  FOR EACH ROW EXECUTE FUNCTION public.set_plan_reunion_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.plan_periodo_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_periodo_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_reunion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_reunion_requisito ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_periodo_trabajo_select ON public.plan_periodo_trabajo;
CREATE POLICY plan_periodo_trabajo_select ON public.plan_periodo_trabajo
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(club_id));

DROP POLICY IF EXISTS plan_periodo_trabajo_write ON public.plan_periodo_trabajo;
CREATE POLICY plan_periodo_trabajo_write ON public.plan_periodo_trabajo
  FOR ALL TO authenticated
  USING (public.user_can_manage_club(club_id))
  WITH CHECK (public.user_can_manage_club(club_id));

DROP POLICY IF EXISTS plan_periodo_clase_select ON public.plan_periodo_clase;
CREATE POLICY plan_periodo_clase_select ON public.plan_periodo_clase
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(public.plan_club_id(plan_id)));

DROP POLICY IF EXISTS plan_periodo_clase_write ON public.plan_periodo_clase;
CREATE POLICY plan_periodo_clase_write ON public.plan_periodo_clase
  FOR ALL TO authenticated
  USING (public.user_can_manage_club(public.plan_club_id(plan_id)))
  WITH CHECK (public.user_can_manage_club(public.plan_club_id(plan_id)));

DROP POLICY IF EXISTS plan_reunion_select ON public.plan_reunion;
CREATE POLICY plan_reunion_select ON public.plan_reunion
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(public.plan_club_id(plan_id)));

DROP POLICY IF EXISTS plan_reunion_write ON public.plan_reunion;
CREATE POLICY plan_reunion_write ON public.plan_reunion
  FOR ALL TO authenticated
  USING (public.user_can_manage_club(public.plan_club_id(plan_id)))
  WITH CHECK (public.user_can_manage_club(public.plan_club_id(plan_id)));

DROP POLICY IF EXISTS plan_reunion_requisito_select ON public.plan_reunion_requisito;
CREATE POLICY plan_reunion_requisito_select ON public.plan_reunion_requisito
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(public.plan_club_id(public.reunion_plan_id(reunion_id))));

DROP POLICY IF EXISTS plan_reunion_requisito_write ON public.plan_reunion_requisito;
CREATE POLICY plan_reunion_requisito_write ON public.plan_reunion_requisito
  FOR ALL TO authenticated
  USING (public.user_can_manage_club(public.plan_club_id(public.reunion_plan_id(reunion_id))))
  WITH CHECK (public.user_can_manage_club(public.plan_club_id(public.reunion_plan_id(reunion_id))));
