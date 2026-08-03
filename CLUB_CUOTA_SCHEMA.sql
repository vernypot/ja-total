-- =============================================================================
-- Club default cuota (dues) + optional event overrides (per member via evento_miembro)
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: clubes, eventos, evento_miembro, miembro_club tables
-- =============================================================================

ALTER TABLE public.clubes
  ADD COLUMN IF NOT EXISTS cuota_activa BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cuota_monto NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS cuota_frecuencia VARCHAR(20)
    CHECK (cuota_frecuencia IS NULL OR cuota_frecuencia IN ('semanal', 'quincenal', 'mensual', 'otro')),
  ADD COLUMN IF NOT EXISTS cuota_frecuencia_otro TEXT,
  ADD COLUMN IF NOT EXISTS cuota_moneda_nombre TEXT,
  ADD COLUMN IF NOT EXISTS cuota_moneda_simbolo TEXT;

COMMENT ON COLUMN public.clubes.cuota_activa IS 'Whether the club charges a default member cuota (dues).';
COMMENT ON COLUMN public.clubes.cuota_monto IS 'Default cuota amount per member.';
COMMENT ON COLUMN public.clubes.cuota_frecuencia IS 'Billing cadence: semanal, quincenal, mensual, otro.';
COMMENT ON COLUMN public.clubes.cuota_frecuencia_otro IS 'Free-text cadence when cuota_frecuencia = otro.';
COMMENT ON COLUMN public.clubes.cuota_moneda_nombre IS 'Display name of the cuota currency (e.g. Peso colombiano).';
COMMENT ON COLUMN public.clubes.cuota_moneda_simbolo IS 'Display symbol for cuota amounts (e.g. $, COP, €).';

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS cuota_aplica BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cuota_monto_override NUMERIC(12, 2);

COMMENT ON COLUMN public.eventos.cuota_aplica IS 'When true, assigned members owe a cuota for this event/meeting.';
COMMENT ON COLUMN public.eventos.cuota_monto_override IS 'Optional per-event cuota override; NULL inherits club default.';

ALTER TABLE public.evento_miembro
  ADD COLUMN IF NOT EXISTS cuota_monto_override NUMERIC(12, 2);

COMMENT ON COLUMN public.evento_miembro.cuota_monto_override IS 'Optional per-member cuota override for this event.';

ALTER TABLE public.evento_miembro
  ADD COLUMN IF NOT EXISTS cuota_pagada BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cuota_pagada_at TIMESTAMPTZ;

COMMENT ON COLUMN public.evento_miembro.cuota_pagada IS 'Whether this member paid the event cuota.';
COMMENT ON COLUMN public.evento_miembro.cuota_pagada_at IS 'Timestamp when cuota was marked paid.';

CREATE OR REPLACE FUNCTION public.admin_set_evento_miembro_cuota_pagada(
  p_evento_miembro_id UUID,
  p_pagada BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
BEGIN
  SELECT e.club_id INTO v_club_id
  FROM public.evento_miembro em
  JOIN public.eventos e ON e.id = em.evento_id
  WHERE em.id = p_evento_miembro_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'event member link not found';
  END IF;

  IF NOT public.user_can_manage_club(v_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  UPDATE public.evento_miembro
  SET
    cuota_pagada = COALESCE(p_pagada, false),
    cuota_pagada_at = CASE WHEN COALESCE(p_pagada, false) THEN now() ELSE NULL END
  WHERE id = p_evento_miembro_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_evento_miembro_cuota_pagada(UUID, BOOLEAN) TO authenticated;

CREATE TABLE IF NOT EXISTS public.miembro_club_cuota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubes(id) ON DELETE CASCADE,
  monto_override NUMERIC(12, 2) NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (miembro_id, club_id)
);

COMMENT ON TABLE public.miembro_club_cuota IS
  'Optional per-member cuota override at club level (e.g. scholarships).';

DROP TRIGGER IF EXISTS trg_miembro_club_cuota_updated_at ON public.miembro_club_cuota;
CREATE TRIGGER trg_miembro_club_cuota_updated_at
  BEFORE UPDATE ON public.miembro_club_cuota
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.miembro_club_cuota ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_club_cuota_select ON public.miembro_club_cuota;
CREATE POLICY miembro_club_cuota_select ON public.miembro_club_cuota
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(club_id));

DROP POLICY IF EXISTS miembro_club_cuota_write ON public.miembro_club_cuota;
CREATE POLICY miembro_club_cuota_write ON public.miembro_club_cuota
  FOR ALL TO authenticated
  USING (public.user_can_manage_club(club_id))
  WITH CHECK (public.user_can_manage_club(club_id));

DROP FUNCTION IF EXISTS public.admin_update_club_cuota(UUID, BOOLEAN, NUMERIC, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_update_club_cuota(
  p_club_id UUID,
  p_cuota_activa BOOLEAN,
  p_cuota_monto NUMERIC,
  p_cuota_frecuencia TEXT,
  p_cuota_frecuencia_otro TEXT,
  p_cuota_moneda_nombre TEXT,
  p_cuota_moneda_simbolo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_can_manage_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  UPDATE public.clubes
  SET
    cuota_activa = COALESCE(p_cuota_activa, false),
    cuota_monto = CASE WHEN COALESCE(p_cuota_activa, false) THEN p_cuota_monto ELSE NULL END,
    cuota_frecuencia = CASE WHEN COALESCE(p_cuota_activa, false) THEN p_cuota_frecuencia ELSE NULL END,
    cuota_frecuencia_otro = CASE
      WHEN COALESCE(p_cuota_activa, false) AND p_cuota_frecuencia = 'otro' THEN NULLIF(trim(p_cuota_frecuencia_otro), '')
      ELSE NULL
    END,
    cuota_moneda_nombre = CASE
      WHEN COALESCE(p_cuota_activa, false) THEN NULLIF(trim(p_cuota_moneda_nombre), '')
      ELSE NULL
    END,
    cuota_moneda_simbolo = CASE
      WHEN COALESCE(p_cuota_activa, false) THEN NULLIF(trim(p_cuota_moneda_simbolo), '')
      ELSE NULL
    END
  WHERE id = p_club_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_club_cuota(UUID, BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated;
