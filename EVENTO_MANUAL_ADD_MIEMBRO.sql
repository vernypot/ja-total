-- =============================================================================
-- Manual event member assignment with required admin justification
-- Run in Supabase SQL Editor after EVENTOS_SCHEMA.sql / TIPOS_EVENTO_SCHEMA.sql
-- =============================================================================

ALTER TABLE public.evento_miembro
  ADD COLUMN IF NOT EXISTS justificacion_asignacion TEXT,
  ADD COLUMN IF NOT EXISTS asignado_manualmente_por UUID REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS asignado_manualmente_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.admin_add_evento_miembro_manual(
  p_evento_id UUID,
  p_miembro_id UUID,
  p_justificacion TEXT
)
RETURNS public.evento_miembro
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_requiere_confirmacion BOOLEAN;
  v_now TIMESTAMPTZ := now();
  v_justificacion TEXT := trim(coalesce(p_justificacion, ''));
  result public.evento_miembro;
BEGIN
  IF NOT public.user_can_manage_evento(p_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_add_evento_miembro_manual';
  END IF;

  IF v_justificacion = '' THEN
    RAISE EXCEPTION 'justification required';
  END IF;

  IF p_miembro_id IS NULL THEN
    RAISE EXCEPTION 'member required';
  END IF;

  SELECT club_id, coalesce(requiere_confirmacion, true)
  INTO v_club_id, v_requiere_confirmacion
  FROM public.eventos
  WHERE id = p_evento_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.evento_miembro em
    WHERE em.evento_id = p_evento_id
      AND em.miembro_id = p_miembro_id
  ) THEN
    RAISE EXCEPTION 'member already assigned';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.miembro_club mc
    JOIN public.miembros m ON m.id = mc.miembro_id
    WHERE mc.club_id = v_club_id
      AND mc.miembro_id = p_miembro_id
      AND coalesce(m.estado, 'activo') = 'activo'
  ) THEN
    RAISE EXCEPTION 'member is not in this event club';
  END IF;

  INSERT INTO public.evento_miembro (
    evento_id,
    miembro_id,
    confirmacion_estado,
    confirmado_at,
    justificacion_asignacion,
    asignado_manualmente_por,
    asignado_manualmente_at
  )
  VALUES (
    p_evento_id,
    p_miembro_id,
    CASE WHEN v_requiere_confirmacion THEN 'pendiente' ELSE 'confirmado' END,
    CASE WHEN v_requiere_confirmacion THEN NULL ELSE v_now END,
    v_justificacion,
    public.get_user_id(),
    v_now
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_add_evento_miembro_manual(UUID, UUID, TEXT) TO authenticated;
