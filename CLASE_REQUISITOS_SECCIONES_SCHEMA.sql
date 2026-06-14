-- =============================================================================
-- Clases progresivas: grouped & numbered requirements (Mundo JA structure)
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: public.clases_progresivas, public.clase_requisitos
-- =============================================================================

-- Optional metadata on progressive classes
ALTER TABLE public.clases_progresivas
  ADD COLUMN IF NOT EXISTS slug VARCHAR(120),
  ADD COLUMN IF NOT EXISTS fuente_url TEXT,
  ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clases_progresivas_slug
  ON public.clases_progresivas(slug)
  WHERE slug IS NOT NULL;

COMMENT ON COLUMN public.clases_progresivas.slug IS
  'Stable key for imports (e.g. conquistadores-amigo).';
COMMENT ON COLUMN public.clases_progresivas.fuente_url IS
  'Source URL for official requirements (mundoja.org, etc.).';
COMMENT ON COLUMN public.clases_progresivas.orden IS
  'Display order within club type (Amigo, Compañero, …).';

-- ---------------------------------------------------------------------------
-- Requirement sections (I Requisitos Generales, II Investigación Bíblica, …)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.clase_requisito_secciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clase_id UUID NOT NULL
    REFERENCES public.clases_progresivas(id) ON DELETE CASCADE,
  parte VARCHAR(20) NOT NULL DEFAULT 'basico'
    CHECK (parte IN ('basico', 'avanzado')),
  numero_romano VARCHAR(10),
  nombre TEXT NOT NULL,
  slug VARCHAR(120) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clase_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_clase_requisito_secciones_clase_orden
  ON public.clase_requisito_secciones(clase_id, parte, orden);

COMMENT ON TABLE public.clase_requisito_secciones IS
  'Grouped sections within a progressive class (basic / advanced blocks).';
COMMENT ON COLUMN public.clase_requisito_secciones.parte IS
  'basico = Requisitos Básicos; avanzado = Sección Avanzada.';
COMMENT ON COLUMN public.clase_requisito_secciones.numero_romano IS
  'Roman numeral label shown before section name (I, II, III, …).';

-- ---------------------------------------------------------------------------
-- Numbered requirements within each section
-- ---------------------------------------------------------------------------

ALTER TABLE public.clase_requisitos
  ADD COLUMN IF NOT EXISTS seccion_id UUID
    REFERENCES public.clase_requisito_secciones(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS numero INTEGER,
  ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_clase_requisitos_seccion_orden
  ON public.clase_requisitos(seccion_id, orden);

CREATE INDEX IF NOT EXISTS idx_clase_requisitos_clase_orden
  ON public.clase_requisitos(clase_id, orden);

COMMENT ON COLUMN public.clase_requisitos.numero IS
  'Requirement number within its section (1, 2, 3, …).';
COMMENT ON COLUMN public.clase_requisitos.orden IS
  'Global sort order within the class (section order × 100 + numero).';

-- Backfill orden for legacy rows (alphabetical fallback)
UPDATE public.clase_requisitos
SET orden = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY clase_id ORDER BY descripcion
  ) AS rn
  FROM public.clase_requisitos
  WHERE orden = 0 OR orden IS NULL
) sub
WHERE public.clase_requisitos.id = sub.id
  AND (public.clase_requisitos.orden = 0 OR public.clase_requisitos.orden IS NULL);

-- ---------------------------------------------------------------------------
-- RLS: sections readable by authenticated users; writes superadmin
-- ---------------------------------------------------------------------------

ALTER TABLE public.clase_requisito_secciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clase_requisito_secciones_select ON public.clase_requisito_secciones;
CREATE POLICY clase_requisito_secciones_select ON public.clase_requisito_secciones
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS clase_requisito_secciones_write ON public.clase_requisito_secciones;
CREATE POLICY clase_requisito_secciones_write ON public.clase_requisito_secciones
  FOR ALL TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());
