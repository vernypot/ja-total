-- =============================================================================
-- Hierarchical club leadership positions (cargos) — superadmin catalog
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: tipos_club table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.cargos(id) ON DELETE RESTRICT,
  nombre TEXT NOT NULL,
  codigo VARCHAR(30),
  descripcion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  tipo_id UUID REFERENCES public.tipos_club(id) ON DELETE SET NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cargos_parent_orden
  ON public.cargos(parent_id, orden, nombre);

CREATE INDEX IF NOT EXISTS idx_cargos_estado
  ON public.cargos(estado);

CREATE INDEX IF NOT EXISTS idx_cargos_tipo_id
  ON public.cargos(tipo_id);

COMMENT ON TABLE public.cargos IS
  'Hierarchical catalog of club leadership positions (cargos). Maintained by superadmin.';
COMMENT ON COLUMN public.cargos.parent_id IS
  'Parent cargo for hierarchy (e.g. Director → Subdirector → Secretario).';
COMMENT ON COLUMN public.cargos.tipo_id IS
  'Optional club type scope; NULL means applicable to all club types.';

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cargos_updated_at ON public.cargos;
CREATE TRIGGER trg_cargos_updated_at
  BEFORE UPDATE ON public.cargos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: read all authenticated; write superadmin only
-- ---------------------------------------------------------------------------

ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cargos_select ON public.cargos;
CREATE POLICY cargos_select ON public.cargos
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS cargos_write ON public.cargos;
CREATE POLICY cargos_write ON public.cargos
  FOR ALL TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());
