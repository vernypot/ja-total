-- =============================================================================
-- Fix RLS for member profile photos (storage + miembros.foto_url)
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: USUARIOS_RLS_FIX.sql, MIEMBRO_CLASE_PROGRESIVA_RLS_FIX.sql
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

CREATE OR REPLACE FUNCTION public.miembro_id_from_foto_path(p_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.safe_uuid_from_text(split_part(p_name, '/', 1));
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_miembro_foto_object(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.miembro_id_from_foto_path(p_name) IS NOT NULL
    AND public.user_can_manage_miembro(public.miembro_id_from_foto_path(p_name));
$$;

GRANT EXECUTE ON FUNCTION public.safe_uuid_from_text(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.miembro_id_from_foto_path(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_miembro_foto_object(TEXT) TO authenticated;

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'miembro-fotos',
  'miembro-fotos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Storage policies (SELECT required for upsert)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS miembro_fotos_select ON storage.objects;
DROP POLICY IF EXISTS miembro_fotos_insert ON storage.objects;
DROP POLICY IF EXISTS miembro_fotos_update ON storage.objects;
DROP POLICY IF EXISTS miembro_fotos_delete ON storage.objects;

CREATE POLICY miembro_fotos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'miembro-fotos'
    AND (
      public.user_can_manage_miembro_foto_object(name)
      OR public.user_can_access_miembro(public.miembro_id_from_foto_path(name))
    )
  );

CREATE POLICY miembro_fotos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'miembro-fotos'
    AND public.user_can_manage_miembro_foto_object(name)
  );

CREATE POLICY miembro_fotos_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'miembro-fotos'
    AND public.user_can_manage_miembro_foto_object(name)
  )
  WITH CHECK (
    bucket_id = 'miembro-fotos'
    AND public.user_can_manage_miembro_foto_object(name)
  );

CREATE POLICY miembro_fotos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'miembro-fotos'
    AND public.user_can_manage_miembro_foto_object(name)
  );

-- ---------------------------------------------------------------------------
-- miembros: allow foto_url updates for church admins
-- ---------------------------------------------------------------------------

ALTER TABLE public.miembros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembros_select ON public.miembros;
DROP POLICY IF EXISTS miembros_update ON public.miembros;
DROP POLICY IF EXISTS miembros_insert ON public.miembros;

CREATE POLICY miembros_select ON public.miembros
  FOR SELECT TO authenticated
  USING (
    public.is_usuarios_superadmin()
    OR public.user_can_access_miembro(id)
  );

CREATE POLICY miembros_update ON public.miembros
  FOR UPDATE TO authenticated
  USING (public.user_can_manage_miembro(id))
  WITH CHECK (public.user_can_manage_miembro(id));

CREATE POLICY miembros_insert ON public.miembros
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_usuarios_superadmin()
    OR public.is_usuarios_admin()
  );

CREATE OR REPLACE FUNCTION public.admin_update_miembro_foto(
  p_miembro_id UUID,
  p_foto_url TEXT DEFAULT NULL
)
RETURNS public.miembros
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembros;
BEGIN
  IF NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_update_miembro_foto';
  END IF;

  UPDATE public.miembros
  SET foto_url = nullif(trim(coalesce(p_foto_url, '')), '')
  WHERE id = p_miembro_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_miembro_foto(UUID, TEXT) TO authenticated;
