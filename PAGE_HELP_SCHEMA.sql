-- =============================================================================
-- Editable page help / tutorial content (superadmin write, public read)
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: is_usuarios_superadmin() from USUARIOS_RLS_FIX.sql
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.page_help (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id VARCHAR(60) NOT NULL,
  language VARCHAR(5) NOT NULL CHECK (language IN ('en', 'es')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT page_help_page_language_unique UNIQUE (page_id, language)
);

CREATE INDEX IF NOT EXISTS idx_page_help_page_id ON public.page_help(page_id);

COMMENT ON TABLE public.page_help IS
  'Superadmin-editable help/tutorial text shown in page help modals. Falls back to app defaults when no row exists.';
COMMENT ON COLUMN public.page_help.content IS
  'JSON: { title, overview, steps[], fields[{name,description}], tips[] }';

ALTER TABLE public.page_help ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS page_help_public_read ON public.page_help;
CREATE POLICY page_help_public_read ON public.page_help
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS page_help_superadmin_write ON public.page_help;
CREATE POLICY page_help_superadmin_write ON public.page_help
  FOR ALL TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());

COMMIT;
