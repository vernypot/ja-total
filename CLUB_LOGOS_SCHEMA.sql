-- =============================================================================
-- Club logos: local club logo + shared club type logo
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: EVENTOS_SCHEMA.sql or helpers with user_can_manage_club
-- Prerequisite: safe_uuid_from_text from MIEMBRO_FOTO_RLS_FIX.sql (or defined below)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.safe_uuid_from_text(p_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_text IS NULL OR p_text = '' THEN
    RETURN NULL;
  END IF;
  RETURN p_text::uuid;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

ALTER TABLE public.clubes
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.tipos_club
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.clubes.logo_url IS 'Local club logo URL (club-logos bucket)';
COMMENT ON COLUMN public.tipos_club.logo_url IS 'Shared club type logo URL (club-logos bucket)';

-- Admin can manage tipo logo if superadmin or has a club of that type in their iglesia
CREATE OR REPLACE FUNCTION public.user_can_manage_tipo_club_logo(p_tipo_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_usuarios_superadmin()
    OR (
      public.is_usuarios_admin()
      AND EXISTS (
        SELECT 1
        FROM public.clubes c
        JOIN public.usuario_iglesia ui ON ui.iglesia_id = c.iglesia_id
        WHERE c.tipo_id = p_tipo_id
          AND ui.usuario_id = public.get_user_id()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.club_id_from_logo_path(p_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN split_part(p_name, '/', 1) = 'clubs'
      THEN public.safe_uuid_from_text(split_part(p_name, '/', 2))
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.tipo_id_from_logo_path(p_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN split_part(p_name, '/', 1) = 'tipos'
      THEN public.safe_uuid_from_text(split_part(p_name, '/', 2))
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_club_logo_object(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.club_id_from_logo_path(p_name) IS NOT NULL
    AND public.user_can_manage_club(public.club_id_from_logo_path(p_name));
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_tipo_logo_object(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.tipo_id_from_logo_path(p_name) IS NOT NULL
    AND public.user_can_manage_tipo_club_logo(public.tipo_id_from_logo_path(p_name));
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_club_logo_object(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.club_id_from_logo_path(p_name) IS NOT NULL
    AND public.user_can_access_club(public.club_id_from_logo_path(p_name));
$$;

GRANT EXECUTE ON FUNCTION public.user_can_manage_tipo_club_logo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_id_from_logo_path(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tipo_id_from_logo_path(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_club_logo_object(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_tipo_logo_object(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_club_logo_object(TEXT) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-logos',
  'club-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS club_logos_select ON storage.objects;
DROP POLICY IF EXISTS club_logos_insert ON storage.objects;
DROP POLICY IF EXISTS club_logos_update ON storage.objects;
DROP POLICY IF EXISTS club_logos_delete ON storage.objects;

CREATE POLICY club_logos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-logos'
    AND (
      public.user_can_manage_club_logo_object(name)
      OR public.user_can_manage_tipo_logo_object(name)
      OR public.user_can_access_club_logo_object(name)
      OR public.is_usuarios_superadmin()
    )
  );

CREATE POLICY club_logos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-logos'
    AND (
      public.user_can_manage_club_logo_object(name)
      OR public.user_can_manage_tipo_logo_object(name)
    )
  );

CREATE POLICY club_logos_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-logos'
    AND (
      public.user_can_manage_club_logo_object(name)
      OR public.user_can_manage_tipo_logo_object(name)
    )
  )
  WITH CHECK (
    bucket_id = 'club-logos'
    AND (
      public.user_can_manage_club_logo_object(name)
      OR public.user_can_manage_tipo_logo_object(name)
    )
  );

CREATE POLICY club_logos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-logos'
    AND (
      public.user_can_manage_club_logo_object(name)
      OR public.user_can_manage_tipo_logo_object(name)
    )
  );

CREATE OR REPLACE FUNCTION public.admin_update_club_logo(
  p_club_id UUID,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS public.clubes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.clubes;
BEGIN
  IF NOT public.user_can_manage_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied for admin_update_club_logo';
  END IF;

  UPDATE public.clubes
  SET logo_url = nullif(trim(coalesce(p_logo_url, '')), '')
  WHERE id = p_club_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'club not found';
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_tipo_club_logo(
  p_tipo_id UUID,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS public.tipos_club
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.tipos_club;
BEGIN
  IF NOT public.user_can_manage_tipo_club_logo(p_tipo_id) THEN
    RAISE EXCEPTION 'permission denied for admin_update_tipo_club_logo';
  END IF;

  UPDATE public.tipos_club
  SET logo_url = nullif(trim(coalesce(p_logo_url, '')), '')
  WHERE id = p_tipo_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'club type not found';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_club_logo(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_tipo_club_logo(UUID, TEXT) TO authenticated;
