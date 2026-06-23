-- =============================================================================
-- Working sessions per progressive-class requirement + per plan meeting assignment
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: clase_requisitos, plan_reunion_requisito (PERIODO_TRABAJO_SCHEMA.sql)
-- =============================================================================

BEGIN;

ALTER TABLE public.clase_requisitos
  ADD COLUMN IF NOT EXISTS sesiones_esperadas INTEGER NOT NULL DEFAULT 3;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clase_requisitos_sesiones_esperadas_check'
      AND conrelid = 'public.clase_requisitos'::regclass
  ) THEN
    ALTER TABLE public.clase_requisitos
      ADD CONSTRAINT clase_requisitos_sesiones_esperadas_check
      CHECK (sesiones_esperadas >= 0 AND sesiones_esperadas <= 10);
  END IF;
END $$;

COMMENT ON COLUMN public.clase_requisitos.sesiones_esperadas IS
  'Expected number of club working sessions to complete this requirement (0–10, default 3).';

UPDATE public.clase_requisitos
SET sesiones_esperadas = 3
WHERE sesiones_esperadas IS NULL;

ALTER TABLE public.plan_reunion_requisito
  ADD COLUMN IF NOT EXISTS sesiones INTEGER NOT NULL DEFAULT 3;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plan_reunion_requisito_sesiones_check'
      AND conrelid = 'public.plan_reunion_requisito'::regclass
  ) THEN
    ALTER TABLE public.plan_reunion_requisito
      ADD CONSTRAINT plan_reunion_requisito_sesiones_check
      CHECK (sesiones >= 0 AND sesiones <= 10);
  END IF;
END $$;

COMMENT ON COLUMN public.plan_reunion_requisito.sesiones IS
  'Working sessions allocated to this requirement in this specific plan meeting (0–10).';

UPDATE public.plan_reunion_requisito
SET sesiones = 3
WHERE sesiones IS NULL;

COMMIT;
