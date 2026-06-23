-- =============================================================================
-- SDA organizational hierarchy: División → Unión → Campo (Misión/Asociación) → Zona
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: iglesias table exists
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- divisiones
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.divisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(10) NOT NULL,
  nombre TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (codigo)
);

CREATE INDEX IF NOT EXISTS idx_divisiones_estado ON public.divisiones(estado);
CREATE INDEX IF NOT EXISTS idx_divisiones_nombre ON public.divisiones(nombre);

-- ---------------------------------------------------------------------------
-- uniones
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.uniones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID NOT NULL REFERENCES public.divisiones(id) ON DELETE RESTRICT,
  codigo VARCHAR(20),
  nombre TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uniones_division_id ON public.uniones(division_id);
CREATE INDEX IF NOT EXISTS idx_uniones_estado ON public.uniones(estado);
CREATE INDEX IF NOT EXISTS idx_uniones_nombre ON public.uniones(nombre);

-- ---------------------------------------------------------------------------
-- campos (Misión / Asociación)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.campos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  union_id UUID NOT NULL REFERENCES public.uniones(id) ON DELETE RESTRICT,
  tipo_campo VARCHAR(20) NOT NULL DEFAULT 'mision'
    CHECK (tipo_campo IN ('mision', 'asociacion')),
  codigo VARCHAR(20),
  nombre TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campos_union_id ON public.campos(union_id);
CREATE INDEX IF NOT EXISTS idx_campos_tipo ON public.campos(tipo_campo);
CREATE INDEX IF NOT EXISTS idx_campos_estado ON public.campos(estado);

-- ---------------------------------------------------------------------------
-- zonas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.zonas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campo_id UUID NOT NULL REFERENCES public.campos(id) ON DELETE RESTRICT,
  codigo VARCHAR(20),
  nombre TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zonas_campo_id ON public.zonas(campo_id);
CREATE INDEX IF NOT EXISTS idx_zonas_estado ON public.zonas(estado);

-- ---------------------------------------------------------------------------
-- iglesias → zona
-- ---------------------------------------------------------------------------

ALTER TABLE public.iglesias
  ADD COLUMN IF NOT EXISTS zona_id UUID
    REFERENCES public.zonas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_iglesias_zona_id ON public.iglesias(zona_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
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

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['divisiones', 'uniones', 'campos', 'zonas']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Seed: three Inter-Americas divisions
-- ---------------------------------------------------------------------------

INSERT INTO public.divisiones (codigo, nombre, estado)
SELECT v.codigo, v.nombre, 'activo'
FROM (VALUES
  ('DIA', 'División Interamericana'),
  ('DSA', 'División Sudamericana'),
  ('NAD', 'División Norteamericana')
) AS v(codigo, nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM public.divisiones d WHERE upper(trim(d.codigo)) = upper(trim(v.codigo))
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.divisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uniones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zonas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS divisiones_select ON public.divisiones;
CREATE POLICY divisiones_select ON public.divisiones
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS divisiones_write ON public.divisiones;
CREATE POLICY divisiones_write ON public.divisiones
  FOR ALL TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());

DROP POLICY IF EXISTS uniones_select ON public.uniones;
CREATE POLICY uniones_select ON public.uniones
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS uniones_write ON public.uniones;
CREATE POLICY uniones_write ON public.uniones
  FOR ALL TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());

DROP POLICY IF EXISTS campos_select ON public.campos;
CREATE POLICY campos_select ON public.campos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS campos_write ON public.campos;
CREATE POLICY campos_write ON public.campos
  FOR ALL TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());

DROP POLICY IF EXISTS zonas_select ON public.zonas;
CREATE POLICY zonas_select ON public.zonas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS zonas_write ON public.zonas;
CREATE POLICY zonas_write ON public.zonas
  FOR ALL TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());

COMMIT;
