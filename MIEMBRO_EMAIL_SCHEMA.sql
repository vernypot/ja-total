-- =============================================================================
-- Optional email on miembros (personal data + bulk import)
-- Run in Supabase SQL Editor
-- =============================================================================

ALTER TABLE public.miembros
  ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.miembros.email IS
  'Optional member email (personal data; not used for portal login).';

CREATE INDEX IF NOT EXISTS idx_miembros_email_lower
  ON public.miembros (lower(email))
  WHERE email IS NOT NULL AND trim(email) <> '';

-- Include email in member portal profile (read-only display)
CREATE OR REPLACE FUNCTION public.member_portal_get_profile(p_session_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
    'email', m.email,
    'telefono', m.telefono,
    'celular', m.celular,
    'ciudad', m.ciudad,
    'direccion', m.direccion,
    'foto_url', m.foto_url,
    'clubes', coalesce((
      SELECT json_agg(json_build_object('id', c.id, 'nombre', c.nombre) ORDER BY c.nombre)
      FROM public.miembro_club mc
      JOIN public.clubes c ON c.id = mc.club_id
      WHERE mc.miembro_id = m.id
        AND c.estado = 'activo'
    ), '[]'::json)
  )
  INTO v_profile
  FROM public.miembros m
  WHERE m.id = v_miembro_id;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_portal_get_profile(TEXT) TO authenticated, anon;
