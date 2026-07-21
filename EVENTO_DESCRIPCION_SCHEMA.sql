-- =============================================================================
-- Eventos: optional short description
-- Run in Supabase Dashboard → SQL Editor after TIPOS_EVENTO_SCHEMA.sql
-- =============================================================================

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS descripcion TEXT;

COMMENT ON COLUMN public.eventos.descripcion IS
  'Optional short note for an event; shown on demand in listings.';

DROP FUNCTION IF EXISTS public.admin_create_evento(UUID, DATE, TIME, TEXT, TEXT, UUID[]);
DROP FUNCTION IF EXISTS public.admin_create_evento(UUID, DATE, TIME, TEXT, TEXT, UUID[], UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.admin_create_evento(
  p_club_id UUID,
  p_fecha DATE,
  p_hora TIME,
  p_lugar TEXT,
  p_nombre TEXT DEFAULT NULL,
  p_miembro_ids UUID[] DEFAULT NULL,
  p_tipo_evento_id UUID DEFAULT NULL,
  p_requiere_confirmacion BOOLEAN DEFAULT TRUE,
  p_descripcion TEXT DEFAULT NULL
)
RETURNS public.eventos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.eventos;
  v_miembro_id UUID;
  v_miembro_ids UUID[];
  v_confirmacion TEXT;
BEGIN
  IF NOT public.user_can_manage_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied for admin_create_evento';
  END IF;

  IF coalesce(p_requiere_confirmacion, true) THEN
    IF p_miembro_ids IS NULL OR coalesce(array_length(p_miembro_ids, 1), 0) = 0 THEN
      v_miembro_ids := public.active_club_member_ids(p_club_id);
    ELSE
      v_miembro_ids := p_miembro_ids;
    END IF;
    v_confirmacion := 'pendiente';
  ELSE
    v_miembro_ids := '{}';
    v_confirmacion := 'pendiente';
  END IF;

  INSERT INTO public.eventos (
    club_id, nombre, fecha, hora, lugar, descripcion, tipo_evento_id, requiere_confirmacion
  )
  VALUES (
    p_club_id,
    nullif(trim(coalesce(p_nombre, '')), ''),
    p_fecha,
    p_hora,
    trim(p_lugar),
    nullif(trim(coalesce(p_descripcion, '')), ''),
    p_tipo_evento_id,
    coalesce(p_requiere_confirmacion, true)
  )
  RETURNING * INTO result;

  FOREACH v_miembro_id IN ARRAY coalesce(v_miembro_ids, '{}')
  LOOP
    IF coalesce(p_requiere_confirmacion, true)
      AND EXISTS (
        SELECT 1
        FROM public.miembro_club mc
        JOIN public.miembros m ON m.id = mc.miembro_id
        WHERE mc.club_id = p_club_id
          AND mc.miembro_id = v_miembro_id
          AND coalesce(m.estado, 'activo') = 'activo'
      )
    THEN
      INSERT INTO public.evento_miembro (evento_id, miembro_id, confirmacion_estado)
      VALUES (result.id, v_miembro_id, v_confirmacion)
      ON CONFLICT (evento_id, miembro_id) DO UPDATE SET
        confirmacion_estado = EXCLUDED.confirmacion_estado;
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_evento(UUID, DATE, TIME, TEXT, TEXT, UUID[], UUID, BOOLEAN, TEXT) TO authenticated;
