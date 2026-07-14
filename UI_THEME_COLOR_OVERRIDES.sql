-- Super-admin UI theme color overrides (Default, Clear, Dark)
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_settings_read ON public.system_settings;
CREATE POLICY system_settings_read ON public.system_settings
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS system_settings_superadmin_write ON public.system_settings;
CREATE POLICY system_settings_superadmin_write ON public.system_settings
  FOR ALL
  USING (es_super_admin())
  WITH CHECK (es_super_admin());

COMMENT ON TABLE public.system_settings IS
  'Global application settings (e.g. ui_theme_color_overrides JSON for Default/Clear/Dark CSS variables).';

COMMENT ON COLUMN public.system_settings.value IS
  'JSON payload. For ui_theme_color_overrides: { "default": { "primary": "#0f766e", ... }, "clear": {}, "dark": {} }';
