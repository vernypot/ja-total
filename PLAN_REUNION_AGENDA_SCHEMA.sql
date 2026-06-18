-- Link plan meetings to club events (general agenda) + schedule fields.
-- Run in Supabase SQL Editor after PERIODO_TRABAJO_SCHEMA.sql and EVENTOS_SCHEMA.sql.

ALTER TABLE public.plan_reunion
  ADD COLUMN IF NOT EXISTS hora TIME,
  ADD COLUMN IF NOT EXISTS lugar TEXT,
  ADD COLUMN IF NOT EXISTS evento_id UUID
    REFERENCES public.eventos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plan_reunion_evento
  ON public.plan_reunion(evento_id);

CREATE INDEX IF NOT EXISTS idx_plan_reunion_fecha
  ON public.plan_reunion(fecha);
