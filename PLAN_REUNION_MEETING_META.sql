-- Optional meeting type for plan agenda slots (links to event types catalog).
-- Run in Supabase SQL Editor after PERIODO_TRABAJO_SCHEMA.sql.

ALTER TABLE public.plan_reunion
  ADD COLUMN IF NOT EXISTS tipo_evento_id UUID
  REFERENCES public.tipos_evento(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plan_reunion_tipo_evento
  ON public.plan_reunion(tipo_evento_id);
