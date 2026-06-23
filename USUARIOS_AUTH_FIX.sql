-- =============================================================================
-- Auth account + password management for usuarios
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: USUARIOS_RLS_FIX.sql (helper functions)
--
-- Creates auth.users alongside public.usuarios so new users can log in.
-- Superadmins set passwords at creation or reset them later via RPC.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.auth_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(p_email))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ensure_auth_user(
  p_email TEXT,
  p_password TEXT,
  p_user_id UUID DEFAULT NULL,
  p_nombre TEXT DEFAULT NULL,
  p_rol TEXT DEFAULT 'user'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_user_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  v_user_id := public.auth_user_id_by_email(v_email);

  IF v_user_id IS NOT NULL THEN
    IF coalesce(trim(p_password), '') <> '' THEN
      v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));
      UPDATE auth.users
      SET
        encrypted_password = v_encrypted_pw,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
      WHERE id = v_user_id;
    END IF;
    RETURN v_user_id;
  END IF;

  v_user_id := coalesce(p_user_id, gen_random_uuid());
  v_encrypted_pw := extensions.crypt(
    coalesce(nullif(trim(p_password), ''), 'ChangeMe1!'),
    extensions.gen_salt('bf')
  );

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'nombre', coalesce(nullif(trim(p_nombre), ''), split_part(v_email, '@', 1)),
      'role', coalesce(nullif(trim(p_rol), ''), 'user')
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_email,
    now(),
    now(),
    now()
  );

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_usuario_auth(
  p_email TEXT,
  p_password TEXT,
  p_nombre TEXT,
  p_apellido1 TEXT DEFAULT NULL,
  p_apellido2 TEXT DEFAULT NULL,
  p_rol TEXT DEFAULT 'user',
  p_estado TEXT DEFAULT 'activo',
  p_telefono TEXT DEFAULT NULL
)
RETURNS public.usuarios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_user_id UUID;
  v_usuario public.usuarios;
BEGIN
  IF NOT public.is_usuarios_superadmin() THEN
    RAISE EXCEPTION 'permission denied for admin_create_usuario_auth';
  END IF;

  IF coalesce(trim(p_password), '') = '' THEN
    RAISE EXCEPTION 'password is required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.usuarios u WHERE lower(u.email) = v_email) THEN
    RAISE EXCEPTION 'a user profile already exists for this email';
  END IF;

  v_user_id := public.ensure_auth_user(
    v_email,
    p_password,
    NULL,
    p_nombre,
    p_rol
  );

  INSERT INTO public.usuarios (
    id, email, nombre, apellido1, apellido2, rol, estado, telefono, updated_at
  ) VALUES (
    v_user_id,
    v_email,
    trim(p_nombre),
    nullif(trim(coalesce(p_apellido1, '')), ''),
    nullif(trim(coalesce(p_apellido2, '')), ''),
    coalesce(nullif(trim(p_rol), ''), 'user'),
    coalesce(nullif(trim(p_estado), ''), 'activo'),
    nullif(trim(coalesce(p_telefono, '')), ''),
    now()
  )
  RETURNING * INTO v_usuario;

  RETURN v_usuario;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_usuario_password(
  p_email TEXT,
  p_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_user_id UUID;
  v_profile public.usuarios;
BEGIN
  IF NOT public.is_usuarios_superadmin() THEN
    RAISE EXCEPTION 'permission denied for admin_set_usuario_password';
  END IF;

  IF coalesce(trim(p_password), '') = '' THEN
    RAISE EXCEPTION 'password is required';
  END IF;

  SELECT * INTO v_profile
  FROM public.usuarios u
  WHERE lower(u.email) = v_email;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'user profile not found';
  END IF;

  v_user_id := public.ensure_auth_user(
    v_email,
    p_password,
    v_profile.id,
    v_profile.nombre,
    v_profile.rol
  );

  UPDATE public.usuarios
  SET id = v_user_id, updated_at = now()
  WHERE lower(email) = v_email AND id <> v_user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_id_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_auth_user(TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_usuario_auth(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_usuario_password(TEXT, TEXT) TO authenticated;
