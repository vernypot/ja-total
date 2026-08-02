-- =============================================================================
-- Noticias: superadmin listing scope + reassign owning church on save
-- Run in Supabase Dashboard → SQL Editor after NOTICIAS_ENHANCEMENTS.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- admin_save_noticia: superadmins may reassign iglesia_id on update
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

  IF public.is_usuarios_superadmin() THEN
    UPDATE public.noticias
    SET
      iglesia_id = p_iglesia_id,
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
    RETURNING id INTO v_id;
  ELSE
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
  END IF;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'noticia not found';
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_noticia(
  UUID, UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT[], TEXT, UUID, DATE, TEXT, TEXT
) TO authenticated;
