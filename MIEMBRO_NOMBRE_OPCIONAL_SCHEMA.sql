-- =============================================================================
-- Optional display names for members (used in listings when set).
-- Default listing name remains nombre + apellido1.
-- Run in Supabase SQL Editor.
-- =============================================================================

ALTER TABLE public.miembros
  ADD COLUMN IF NOT EXISTS nombre_opcional TEXT,
  ADD COLUMN IF NOT EXISTS apellido_opcional TEXT;

COMMENT ON COLUMN public.miembros.nombre_opcional IS
  'Optional first name shown in listings instead of nombre when set.';
COMMENT ON COLUMN public.miembros.apellido_opcional IS
  'Optional last name shown in listings instead of apellido1 when set.';

-- Member portal profile (dashboard header + datos tab source)
CREATE OR REPLACE FUNCTION public.member_portal_get_profile(p_session_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_profile JSON;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  SELECT json_build_object(
    'id', m.id,
    'nombre', m.nombre,
    'apellido1', m.apellido1,
    'apellido2', m.apellido2,
    'nombre_opcional', m.nombre_opcional,
    'apellido_opcional', m.apellido_opcional,
    'fecha_nacimiento', m.fecha_nacimiento,
    'genero', m.genero,
    'documento', m.documento,
    'telefono', m.telefono,
    'celular', m.celular,
    'ciudad', m.ciudad,
    'direccion', m.direccion,
    'foto_url', m.foto_url,
    'estado', m.estado,
    'clubes', coalesce((
      SELECT json_agg(
        json_build_object(
          'id', c.id,
          'nombre', c.nombre,
          'iglesia_id', i.id,
          'iglesia_nombre', i.nombre,
          'timezone', i.timezone
        )
        ORDER BY i.nombre, c.nombre
      )
      FROM public.miembro_club mc
      JOIN public.clubes c ON c.id = mc.club_id
      JOIN public.iglesias i ON i.id = c.iglesia_id
      WHERE mc.miembro_id = m.id
        AND c.estado = 'activo'
    ), '[]'::json),
    'iglesias', coalesce((
      SELECT json_agg(church ORDER BY church->>'nombre')
      FROM (
        SELECT json_build_object(
          'id', i.id,
          'nombre', i.nombre,
          'timezone', i.timezone
        ) AS church
        FROM public.miembro_club mc
        JOIN public.clubes c ON c.id = mc.club_id
        JOIN public.iglesias i ON i.id = c.iglesia_id
        WHERE mc.miembro_id = m.id
          AND c.estado = 'activo'
        GROUP BY i.id, i.nombre, i.timezone
      ) churches
    ), '[]'::json)
  )
  INTO v_profile
  FROM public.miembros m
  WHERE m.id = v_miembro_id;

  RETURN v_profile;
END;
$$;
