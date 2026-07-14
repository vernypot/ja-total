-- =============================================================================
-- Member ID card: profile tokens + QR event check-in
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: EVENTOS_SCHEMA.sql, MIEMBRO_* RLS helpers
-- =============================================================================

ALTER TABLE public.evento_asistencia
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

COMMENT ON COLUMN public.evento_asistencia.checked_in_at IS 'Exact timestamp when member QR was scanned at event';

CREATE TABLE IF NOT EXISTS public.miembro_profile_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id UUID NOT NULL UNIQUE REFERENCES public.miembros(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_miembro_profile_tokens_token
  ON public.miembro_profile_tokens(token)
  WHERE activo = true;

ALTER TABLE public.miembro_profile_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_profile_tokens_select ON public.miembro_profile_tokens;
CREATE POLICY miembro_profile_tokens_select ON public.miembro_profile_tokens
  FOR SELECT TO authenticated
  USING (
    public.is_usuarios_superadmin()
    OR public.user_can_access_miembro(miembro_id)
  );

CREATE OR REPLACE FUNCTION public.get_or_create_miembro_profile_token(p_miembro_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  IF NOT (
    public.user_can_manage_miembro(p_miembro_id)
    OR public.user_can_access_miembro(p_miembro_id)
  ) THEN
    RAISE EXCEPTION 'permission denied for get_or_create_miembro_profile_token';
  END IF;

  SELECT token INTO v_token
  FROM public.miembro_profile_tokens
  WHERE miembro_id = p_miembro_id
    AND activo = true
  LIMIT 1;

  IF v_token IS NOT NULL THEN
    RETURN v_token;
  END IF;

  INSERT INTO public.miembro_profile_tokens (miembro_id)
  VALUES (p_miembro_id)
  ON CONFLICT (miembro_id)
  DO UPDATE SET
    activo = true,
    updated_at = now()
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_miembro_from_token(p_token TEXT)
RETURNS TABLE (
  miembro_id UUID,
  nombre TEXT,
  apellido1 TEXT,
  apellido2 TEXT,
  foto_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.nombre, m.apellido1, m.apellido2, m.foto_url
  FROM public.miembro_profile_tokens t
  JOIN public.miembros m ON m.id = t.miembro_id
  WHERE t.token = p_token
    AND t.activo = true
    AND m.estado = 'activo';
END;
$$;

CREATE OR REPLACE FUNCTION public.evento_start_at(p_fecha DATE, p_hora TIME)
RETURNS TIMESTAMPTZ
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (p_fecha + coalesce(p_hora, '00:00'::TIME)) AT TIME ZONE 'America/Bogota';
$$;

CREATE OR REPLACE FUNCTION public.admin_checkin_evento(
  p_evento_id UUID,
  p_token TEXT
)
RETURNS public.evento_asistencia
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_evento_miembro_id UUID;
  v_evento RECORD;
  v_now TIMESTAMPTZ := now();
  v_event_start TIMESTAMPTZ;
  v_estado TEXT;
  v_existing public.evento_asistencia;
  result public.evento_asistencia;
BEGIN
  IF NOT public.user_can_manage_evento(p_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_checkin_evento';
  END IF;

  SELECT miembro_id INTO v_miembro_id
  FROM public.resolve_miembro_from_token(p_token)
  LIMIT 1;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive member token';
  END IF;

  SELECT * INTO v_evento
  FROM public.eventos
  WHERE id = p_evento_id;

  IF v_evento.id IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  SELECT em.id INTO v_evento_miembro_id
  FROM public.evento_miembro em
  WHERE em.evento_id = p_evento_id
    AND em.miembro_id = v_miembro_id;

  IF v_evento_miembro_id IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.miembro_club mc
      JOIN public.miembros m ON m.id = mc.miembro_id
      WHERE mc.miembro_id = v_miembro_id
        AND mc.club_id = v_evento.club_id
        AND m.estado = 'activo'
    ) THEN
      RAISE EXCEPTION 'member is not in this event club';
    END IF;

    INSERT INTO public.evento_miembro (
      evento_id,
      miembro_id,
      confirmacion_estado,
      confirmado_at
    )
    VALUES (
      p_evento_id,
      v_miembro_id,
      CASE WHEN coalesce(v_evento.requiere_confirmacion, true) THEN 'pendiente' ELSE 'confirmado' END,
      CASE WHEN coalesce(v_evento.requiere_confirmacion, true) THEN NULL ELSE v_now END
    )
    ON CONFLICT (evento_id, miembro_id) DO NOTHING
    RETURNING id INTO v_evento_miembro_id;

    IF v_evento_miembro_id IS NULL THEN
      SELECT em.id INTO v_evento_miembro_id
      FROM public.evento_miembro em
      WHERE em.evento_id = p_evento_id
        AND em.miembro_id = v_miembro_id;
    END IF;
  END IF;

  IF v_evento_miembro_id IS NULL THEN
    RAISE EXCEPTION 'member is not assigned to this event';
  END IF;

  SELECT * INTO v_existing
  FROM public.evento_asistencia
  WHERE evento_miembro_id = v_evento_miembro_id;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.checked_in_at IS NOT NULL
       OR v_existing.estado IN ('a_tiempo', 'tarde') THEN
      RETURN v_existing;
    END IF;
  END IF;

  -- Interpret fecha+hora as church wall clock (America/Bogota), not session UTC.
  v_event_start := (v_evento.fecha + coalesce(v_evento.hora, '00:00'::TIME)) AT TIME ZONE 'America/Bogota';

  -- On time: any time before start, or within 15 minutes after start
  IF v_now <= v_event_start + INTERVAL '15 minutes' THEN
    v_estado := 'a_tiempo';
  ELSE
    v_estado := 'tarde';
  END IF;

  IF v_existing.id IS NOT NULL THEN
    UPDATE public.evento_asistencia
    SET
      estado = v_estado,
      checked_in_at = v_now,
      updated_at = v_now
    WHERE id = v_existing.id
    RETURNING * INTO result;

    RETURN result;
  END IF;

  INSERT INTO public.evento_asistencia (evento_miembro_id, estado, checked_in_at)
  VALUES (v_evento_miembro_id, v_estado, v_now)
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_miembro_profile_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_miembro_from_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evento_start_at(DATE, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_checkin_evento(UUID, TEXT) TO authenticated;
