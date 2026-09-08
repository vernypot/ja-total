-- =============================================================================
-- Extend club_unidad_eval_config for editable per-meeting score matrix (0–10).
-- Run in Supabase SQL Editor after UNIDADES_EVALUACION_SCHEMA.sql
-- =============================================================================

ALTER TABLE public.club_unidad_eval_config
  ADD COLUMN IF NOT EXISTS confirmado_a_tiempo_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS confirmado_a_tiempo_puntos NUMERIC(10, 2) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS confirmado_tarde_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS confirmado_tarde_puntos NUMERIC(10, 2) NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS no_confirmado_a_tiempo_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS no_confirmado_a_tiempo_puntos NUMERIC(10, 2) NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS no_confirmado_tarde_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS no_confirmado_tarde_puntos NUMERIC(10, 2) NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS confirmado_ausente_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS confirmado_ausente_puntos NUMERIC(10, 2) NOT NULL DEFAULT -8,
  ADD COLUMN IF NOT EXISTS no_confirmado_ausente_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS no_confirmado_ausente_puntos NUMERIC(10, 2) NOT NULL DEFAULT -5;

-- Align legacy columns with default matrix when still at factory defaults
UPDATE public.club_unidad_eval_config
SET
  a_tiempo_puntos = CASE WHEN a_tiempo_puntos = 1 THEN 10 ELSE a_tiempo_puntos END,
  tarde_puntos = CASE WHEN tarde_puntos = 1 THEN 7 ELSE tarde_puntos END,
  ausente_injustificada_puntos = CASE WHEN ausente_injustificada_puntos = 0 THEN -5 ELSE ausente_injustificada_puntos END
WHERE a_tiempo_puntos = 1 OR tarde_puntos = 1 OR ausente_injustificada_puntos = 0;
