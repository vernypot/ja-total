-- ============================================
-- Per-user UI theme preference (default | clear | dark)
-- Run in Supabase SQL editor after USUARIOS_SCHEMA.sql
-- ============================================

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS ui_theme VARCHAR(20) NOT NULL DEFAULT 'default';

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_ui_theme_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_ui_theme_check
  CHECK (ui_theme IN ('default', 'clear', 'dark'));

COMMENT ON COLUMN public.usuarios.ui_theme IS
  'User interface theme: default (Teófila brand), clear (minimal light), dark';
