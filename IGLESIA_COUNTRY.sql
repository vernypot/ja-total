-- =============================================================================
-- Per-church country configuration
-- Run in Supabase Dashboard → SQL Editor (after IGLESIA_TIMEZONE.sql if applied)
-- =============================================================================

ALTER TABLE public.iglesias
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'CO';

COMMENT ON COLUMN public.iglesias.country IS
  'ISO 3166-1 alpha-2 country code for the church location.';
