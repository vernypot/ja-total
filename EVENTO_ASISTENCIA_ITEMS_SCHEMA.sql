-- =============================================================================
-- Event / plan meeting: items attendees should bring (cuota, bible, custom)
-- Run in Supabase SQL Editor after EVENTOS_SCHEMA.sql and PERIODO_TRABAJO_SCHEMA.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.evento_asistencia_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 0,
  tipo VARCHAR(20) NOT NULL
    CHECK (tipo IN ('cuota', 'biblia', 'personalizado')),
  etiqueta TEXT NOT NULL,
  detalle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evento_asistencia_item_evento
  ON public.evento_asistencia_item(evento_id, orden);

COMMENT ON TABLE public.evento_asistencia_item IS
  'Checklist of items attendees should bring to an event (cuota, bible, custom).';

CREATE TABLE IF NOT EXISTS public.plan_reunion_asistencia_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id UUID NOT NULL REFERENCES public.plan_reunion(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 0,
  tipo VARCHAR(20) NOT NULL
    CHECK (tipo IN ('cuota', 'biblia', 'personalizado')),
  etiqueta TEXT NOT NULL,
  detalle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_reunion_asistencia_item_reunion
  ON public.plan_reunion_asistencia_item(reunion_id, orden);

COMMENT ON TABLE public.plan_reunion_asistencia_item IS
  'Planned attendee items for a plan meeting; copied to evento_asistencia_item on agenda sync.';

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_evento_asistencia_item_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_evento_asistencia_item_updated_at ON public.evento_asistencia_item;
CREATE TRIGGER trg_evento_asistencia_item_updated_at
  BEFORE UPDATE ON public.evento_asistencia_item
  FOR EACH ROW EXECUTE FUNCTION public.set_evento_asistencia_item_updated_at();

CREATE OR REPLACE FUNCTION public.set_plan_reunion_asistencia_item_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_plan_reunion_asistencia_item_updated_at ON public.plan_reunion_asistencia_item;
CREATE TRIGGER trg_plan_reunion_asistencia_item_updated_at
  BEFORE UPDATE ON public.plan_reunion_asistencia_item
  FOR EACH ROW EXECUTE FUNCTION public.set_plan_reunion_asistencia_item_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.evento_asistencia_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_reunion_asistencia_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evento_asistencia_item_select ON public.evento_asistencia_item;
CREATE POLICY evento_asistencia_item_select ON public.evento_asistencia_item
  FOR SELECT TO authenticated
  USING (public.user_can_access_evento(evento_id));

DROP POLICY IF EXISTS evento_asistencia_item_write ON public.evento_asistencia_item;
CREATE POLICY evento_asistencia_item_write ON public.evento_asistencia_item
  FOR ALL TO authenticated
  USING (public.user_can_manage_evento(evento_id))
  WITH CHECK (public.user_can_manage_evento(evento_id));

DROP POLICY IF EXISTS plan_reunion_asistencia_item_select ON public.plan_reunion_asistencia_item;
CREATE POLICY plan_reunion_asistencia_item_select ON public.plan_reunion_asistencia_item
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(public.plan_club_id(public.reunion_plan_id(reunion_id))));

DROP POLICY IF EXISTS plan_reunion_asistencia_item_write ON public.plan_reunion_asistencia_item;
CREATE POLICY plan_reunion_asistencia_item_write ON public.plan_reunion_asistencia_item
  FOR ALL TO authenticated
  USING (public.user_can_manage_club(public.plan_club_id(public.reunion_plan_id(reunion_id))))
  WITH CHECK (public.user_can_manage_club(public.plan_club_id(public.reunion_plan_id(reunion_id))));
