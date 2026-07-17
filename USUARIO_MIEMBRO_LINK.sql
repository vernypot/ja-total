-- =============================================================================
-- Link system users (usuarios) with members (miembros)
-- Run in Supabase SQL Editor after USUARIOS_AUTH_FIX.sql and USUARIOS_SCHEMA.sql
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_miembros_usuario_unique
  ON public.miembros(usuario_id)
  WHERE usuario_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.miembro_primary_iglesia_id(p_miembro_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.iglesia_id
  FROM public.miembro_club mc
  JOIN public.clubes c ON c.id = mc.club_id
  WHERE mc.miembro_id = p_miembro_id
  ORDER BY mc.fecha_inicio NULLS LAST, c.nombre
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.miembro_primary_iglesia_id(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_miembro_linked_usuario(p_miembro_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_result JSON;
BEGIN
  IF NOT public.is_usuarios_superadmin() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT m.usuario_id INTO v_usuario_id
  FROM public.miembros m
  WHERE m.id = p_miembro_id;

  IF v_usuario_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT to_jsonb(u.*) INTO v_result
  FROM public.usuarios u
  WHERE u.id = v_usuario_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_usuario_linked_miembro(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.is_usuarios_superadmin() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT to_jsonb(m.*) INTO v_result
  FROM public.miembros m
  WHERE m.usuario_id = p_usuario_id
  LIMIT 1;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_link_usuario_miembro(
  p_miembro_id UUID,
  p_usuario_id UUID
)
RETURNS public.miembros
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro public.miembros;
  v_usuario public.usuarios;
BEGIN
  IF NOT public.is_usuarios_superadmin() THEN
    RAISE EXCEPTION 'permission denied for admin_link_usuario_miembro';
  END IF;

  IF p_miembro_id IS NULL OR p_usuario_id IS NULL THEN
    RAISE EXCEPTION 'member and user ids are required';
  END IF;

  SELECT * INTO v_miembro FROM public.miembros WHERE id = p_miembro_id;
  IF v_miembro.id IS NULL THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  SELECT * INTO v_usuario FROM public.usuarios WHERE id = p_usuario_id;
  IF v_usuario.id IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  UPDATE public.miembros
  SET usuario_id = NULL
  WHERE usuario_id = p_usuario_id
    AND id <> p_miembro_id;

  UPDATE public.miembros
  SET usuario_id = p_usuario_id
  WHERE id = p_miembro_id
  RETURNING * INTO v_miembro;

  RETURN v_miembro;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unlink_usuario_miembro(p_miembro_id UUID)
RETURNS public.miembros
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro public.miembros;
BEGIN
  IF NOT public.is_usuarios_superadmin() THEN
    RAISE EXCEPTION 'permission denied for admin_unlink_usuario_miembro';
  END IF;

  UPDATE public.miembros
  SET usuario_id = NULL
  WHERE id = p_miembro_id
  RETURNING * INTO v_miembro;

  IF v_miembro.id IS NULL THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  RETURN v_miembro;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_promote_miembro_to_usuario(
  p_miembro_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_rol TEXT DEFAULT 'user',
  p_rol_iglesia TEXT DEFAULT 'member',
  p_iglesia_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_miembro public.miembros;
  v_usuario public.usuarios;
  v_iglesia_id UUID;
  v_existing_link UUID;
BEGIN
  IF NOT public.is_usuarios_superadmin() THEN
    RAISE EXCEPTION 'permission denied for admin_promote_miembro_to_usuario';
  END IF;

  SELECT * INTO v_miembro FROM public.miembros WHERE id = p_miembro_id;
  IF v_miembro.id IS NULL THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  IF v_miembro.usuario_id IS NOT NULL THEN
    RAISE EXCEPTION 'member already linked to a system user';
  END IF;

  v_usuario := public.admin_create_usuario_auth(
    p_email,
    p_password,
    v_miembro.nombre,
    v_miembro.apellido1,
    v_miembro.apellido2,
    coalesce(nullif(trim(p_rol), ''), 'user'),
    'activo',
    coalesce(nullif(trim(v_miembro.telefono), ''), nullif(trim(v_miembro.celular), ''))
  );

  UPDATE public.miembros
  SET usuario_id = v_usuario.id
  WHERE id = p_miembro_id
  RETURNING * INTO v_miembro;

  v_iglesia_id := coalesce(p_iglesia_id, public.miembro_primary_iglesia_id(p_miembro_id));

  IF v_iglesia_id IS NOT NULL THEN
    INSERT INTO public.usuario_iglesia (usuario_id, iglesia_id, rol_iglesia)
    VALUES (
      v_usuario.id,
      v_iglesia_id,
      coalesce(nullif(trim(p_rol_iglesia), ''), 'member')
    )
    ON CONFLICT (usuario_id, iglesia_id) DO UPDATE
    SET rol_iglesia = EXCLUDED.rol_iglesia;
  END IF;

  RETURN json_build_object(
    'usuario', to_jsonb(v_usuario),
    'miembro', to_jsonb(v_miembro)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_usuario_system_access(
  p_usuario_id UUID,
  p_activo BOOLEAN
)
RETURNS public.usuarios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_usuario public.usuarios;
  v_estado TEXT;
BEGIN
  IF NOT public.is_usuarios_superadmin() THEN
    RAISE EXCEPTION 'permission denied for admin_set_usuario_system_access';
  END IF;

  IF p_usuario_id IS NULL THEN
    RAISE EXCEPTION 'user id is required';
  END IF;

  IF p_usuario_id = auth.uid() AND NOT p_activo THEN
    RAISE EXCEPTION 'cannot deactivate your own account';
  END IF;

  v_estado := CASE WHEN p_activo THEN 'activo' ELSE 'inactivo' END;

  UPDATE public.usuarios
  SET estado = v_estado, updated_at = now()
  WHERE id = p_usuario_id
  RETURNING * INTO v_usuario;

  IF v_usuario.id IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  IF p_activo THEN
    UPDATE auth.users
    SET banned_until = NULL, updated_at = now()
    WHERE id = p_usuario_id;
  ELSE
    UPDATE auth.users
    SET banned_until = 'infinity'::timestamptz, updated_at = now()
    WHERE id = p_usuario_id;
  END IF;

  RETURN v_usuario;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_unlinked_usuarios()
RETURNS SETOF public.usuarios
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.*
  FROM public.usuarios u
  WHERE public.is_usuarios_superadmin()
    AND NOT EXISTS (
      SELECT 1
      FROM public.miembros m
      WHERE m.usuario_id = u.id
    )
  ORDER BY u.nombre, u.apellido1, u.email;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_miembro_linked_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_usuario_linked_miembro(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_link_usuario_miembro(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unlink_usuario_miembro(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_promote_miembro_to_usuario(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_usuario_system_access(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_unlinked_usuarios() TO authenticated;
