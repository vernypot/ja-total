-- =============================================================================
-- Especialidades: section groups (JA Honors categories)
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: existing public.especialidades table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.especialidad_secciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo')),
  fuente_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_especialidad_secciones_orden
  ON public.especialidad_secciones(orden);

ALTER TABLE public.especialidades
  ADD COLUMN IF NOT EXISTS seccion_id UUID
  REFERENCES public.especialidad_secciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_especialidades_seccion_id
  ON public.especialidades(seccion_id);

COMMENT ON TABLE public.especialidad_secciones IS
  'Grouped sections for JA Honors / Especialidades (e.g. Nature Study, Vocational Arts).';
COMMENT ON COLUMN public.especialidades.seccion_id IS
  'Section/category for catalog grouping (guiasmayores.com / Pathfinder honors).';

-- ---------------------------------------------------------------------------
-- RLS: sections readable by authenticated users; writes superadmin via policy
-- ---------------------------------------------------------------------------

ALTER TABLE public.especialidad_secciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS especialidad_secciones_select ON public.especialidad_secciones;
CREATE POLICY especialidad_secciones_select ON public.especialidad_secciones
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS especialidad_secciones_write ON public.especialidad_secciones;
CREATE POLICY especialidad_secciones_write ON public.especialidad_secciones
  FOR ALL TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());
