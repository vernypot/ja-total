-- =============================================================================
-- Noticias enhancements: featured image, optional placements (hidden everywhere)
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: NOTICIAS_SCHEMA.sql, safe_uuid_from_text (CLUB_LOGOS_SCHEMA.sql)
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

ALTER TABLE public.noticias
  ADD COLUMN IF NOT EXISTS imagen_destacada_url TEXT;

ALTER TABLE public.noticias
  ADD COLUMN IF NOT EXISTS imagen_destacada_mobile_url TEXT;

COMMENT ON COLUMN public.noticias.imagen_destacada_url IS 'Featured hero image for desktop (noticia-imagenes bucket)';
COMMENT ON COLUMN public.noticias.imagen_destacada_mobile_url IS 'Featured hero image for mobile (noticia-imagenes bucket)';

ALTER TABLE public.noticias DROP CONSTRAINT IF EXISTS noticias_placements_check;

ALTER TABLE public.noticias ADD CONSTRAINT noticias_placements_check CHECK (
  placements <@ ARRAY[
    'dashboard',
    'landing',
    'newsletter',
    'hero_slider',
    'standalone_banner'
  ]::TEXT[]
);

-- ---------------------------------------------------------------------------
-- Storage: featured news images
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.noticia_id_from_image_path(p_path TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.safe_uuid_from_text(
    nullif(split_part(trim(both '/' from coalesce(p_path, '')), '/', 2), '')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_noticia_image_object(p_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.noticias n
    WHERE n.id = public.noticia_id_from_image_path(p_path)
      AND public.user_can_manage_iglesia(n.iglesia_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.noticia_id_from_image_path(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_noticia_image_object(TEXT) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'noticia-imagenes',
  'noticia-imagenes',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS noticia_imagenes_select ON storage.objects;
DROP POLICY IF EXISTS noticia_imagenes_insert ON storage.objects;
DROP POLICY IF EXISTS noticia_imagenes_update ON storage.objects;
DROP POLICY IF EXISTS noticia_imagenes_delete ON storage.objects;

CREATE POLICY noticia_imagenes_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'noticia-imagenes');

CREATE POLICY noticia_imagenes_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'noticia-imagenes'
    AND public.user_can_manage_noticia_image_object(name)
  );

CREATE POLICY noticia_imagenes_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'noticia-imagenes'
    AND public.user_can_manage_noticia_image_object(name)
  )
  WITH CHECK (
    bucket_id = 'noticia-imagenes'
    AND public.user_can_manage_noticia_image_object(name)
  );

CREATE POLICY noticia_imagenes_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'noticia-imagenes'
    AND public.user_can_manage_noticia_image_object(name)
  );

DROP FUNCTION IF EXISTS public.admin_update_noticia_featured_image(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.admin_update_noticia_featured_image(
  p_noticia_id UUID,
  p_variant TEXT DEFAULT 'desktop',
  p_image_url TEXT DEFAULT NULL
)
RETURNS public.noticias
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.noticias;
  v_variant TEXT;
BEGIN
  v_variant := coalesce(nullif(trim(p_variant), ''), 'desktop');

  IF v_variant NOT IN ('desktop', 'mobile') THEN
    RAISE EXCEPTION 'invalid featured image variant';
  END IF;

  IF v_variant = 'mobile' THEN
    UPDATE public.noticias n
    SET
      imagen_destacada_mobile_url = nullif(trim(coalesce(p_image_url, '')), ''),
      updated_at = now()
    WHERE n.id = p_noticia_id
      AND public.user_can_manage_iglesia(n.iglesia_id)
    RETURNING * INTO result;
  ELSE
    UPDATE public.noticias n
    SET
      imagen_destacada_url = nullif(trim(coalesce(p_image_url, '')), ''),
      updated_at = now()
    WHERE n.id = p_noticia_id
      AND public.user_can_manage_iglesia(n.iglesia_id)
    RETURNING * INTO result;
  END IF;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'noticia not found or permission denied';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_noticia_featured_image(UUID, TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- admin_save_noticia: allow empty placements + featured image URL
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_save_noticia(
  p_id UUID,
  p_iglesia_id UUID,
  p_titulo TEXT,
  p_resumen TEXT,
  p_contenido TEXT,
  p_publicado_en DATE,
  p_estado TEXT DEFAULT 'activo',
  p_categoria TEXT DEFAULT NULL,
  p_placements TEXT[] DEFAULT '{dashboard}',
  p_audience TEXT DEFAULT 'church',
  p_club_id UUID DEFAULT NULL,
  p_expira_en DATE DEFAULT NULL,
  p_imagen_destacada_url TEXT DEFAULT NULL,
  p_imagen_destacada_mobile_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_placements TEXT[];
  v_audience TEXT;
BEGIN
  IF NOT public.user_can_manage_iglesia(p_iglesia_id) THEN
    RAISE EXCEPTION 'permission denied for admin_save_noticia';
  END IF;

  IF p_expira_en IS NOT NULL AND p_publicado_en IS NOT NULL AND p_expira_en < p_publicado_en THEN
    RAISE EXCEPTION 'expiration date cannot be before publish date';
  END IF;

  v_placements := coalesce(p_placements, ARRAY[]::TEXT[]);

  v_audience := coalesce(nullif(trim(p_audience), ''), 'church');
  IF v_audience NOT IN ('general', 'church', 'club') THEN
    RAISE EXCEPTION 'invalid audience';
  END IF;

  IF v_audience = 'club' THEN
    IF p_club_id IS NULL THEN
      RAISE EXCEPTION 'club_id is required for club audience';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.clubes c
      WHERE c.id = p_club_id AND c.iglesia_id = p_iglesia_id
    ) THEN
      RAISE EXCEPTION 'club does not belong to church';
    END IF;
  ELSIF p_club_id IS NOT NULL THEN
    RAISE EXCEPTION 'club_id must be null unless audience is club';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.noticias (
      iglesia_id, titulo, resumen, contenido, publicado_en, expira_en, estado,
      categoria, placements, audience, club_id, imagen_destacada_url, imagen_destacada_mobile_url
    ) VALUES (
      p_iglesia_id,
      trim(p_titulo),
      nullif(trim(p_resumen), ''),
      trim(p_contenido),
      coalesce(p_publicado_en, CURRENT_DATE),
      p_expira_en,
      coalesce(p_estado, 'activo'),
      nullif(trim(p_categoria), ''),
      v_placements,
      v_audience,
      CASE WHEN v_audience = 'club' THEN p_club_id ELSE NULL END,
      nullif(trim(coalesce(p_imagen_destacada_url, '')), ''),
      nullif(trim(coalesce(p_imagen_destacada_mobile_url, '')), '')
    )
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  UPDATE public.noticias
  SET
    titulo = trim(p_titulo),
    resumen = nullif(trim(p_resumen), ''),
    contenido = trim(p_contenido),
    publicado_en = coalesce(p_publicado_en, publicado_en),
    expira_en = p_expira_en,
    estado = coalesce(p_estado, estado),
    categoria = nullif(trim(p_categoria), ''),
    placements = v_placements,
    audience = v_audience,
    club_id = CASE WHEN v_audience = 'club' THEN p_club_id ELSE NULL END,
    imagen_destacada_url = nullif(trim(coalesce(p_imagen_destacada_url, '')), ''),
    imagen_destacada_mobile_url = nullif(trim(coalesce(p_imagen_destacada_mobile_url, '')), ''),
    updated_at = now()
  WHERE id = p_id
    AND iglesia_id = p_iglesia_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'noticia not found';
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_noticia(
  UUID, UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT[], TEXT, UUID, DATE, TEXT, TEXT
) TO authenticated;
