-- =============================================================================
-- Clase progresiva requisitos: free-form tags + assignments (global library)
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: public.clases_progresivas, public.clase_requisitos
-- If you already ran an older per-clase version, also run
-- CLASE_REQUISITO_TAGS_GLOBAL_MIGRATION.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clase_requisito_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clase_requisito_tags_nombre_check CHECK (char_length(trim(nombre)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clase_requisito_tags_nombre_lower
  ON public.clase_requisito_tags (lower(trim(nombre)));

COMMENT ON TABLE public.clase_requisito_tags IS
  'Free-form tags for progressive class requirements. Shared across all clases progresivas.';

CREATE TABLE IF NOT EXISTS public.clase_requisito_tag_links (
  requisito_id UUID NOT NULL
    REFERENCES public.clase_requisitos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL
    REFERENCES public.clase_requisito_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (requisito_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_clase_requisito_tag_links_tag
  ON public.clase_requisito_tag_links (tag_id);

COMMENT ON TABLE public.clase_requisito_tag_links IS
  'Many-to-many: tags assigned to individual clase requisitos.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.clase_requisito_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clase_requisito_tag_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clase_requisito_tags_select ON public.clase_requisito_tags;
CREATE POLICY clase_requisito_tags_select ON public.clase_requisito_tags
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS clase_requisito_tags_write ON public.clase_requisito_tags;
CREATE POLICY clase_requisito_tags_write ON public.clase_requisito_tags
  FOR ALL TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());

DROP POLICY IF EXISTS clase_requisito_tag_links_select ON public.clase_requisito_tag_links;
CREATE POLICY clase_requisito_tag_links_select ON public.clase_requisito_tag_links
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS clase_requisito_tag_links_write ON public.clase_requisito_tag_links;
CREATE POLICY clase_requisito_tag_links_write ON public.clase_requisito_tag_links
  FOR ALL TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());
