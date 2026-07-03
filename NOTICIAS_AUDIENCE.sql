-- =============================================================================
-- Noticias: audience segmentation (general, church, club)
-- Run in Supabase Dashboard → SQL Editor after NOTICIAS_PLACEMENTS.sql
-- =============================================================================

ALTER TABLE public.noticias
  ADD COLUMN IF NOT EXISTS audience VARCHAR(20) NOT NULL DEFAULT 'church',
  ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubes(id) ON DELETE SET NULL;

ALTER TABLE public.noticias
  DROP CONSTRAINT IF EXISTS noticias_audience_check;

ALTER TABLE public.noticias
  ADD CONSTRAINT noticias_audience_check CHECK (
    audience IN ('general', 'church', 'club')
  );

ALTER TABLE public.noticias
  DROP CONSTRAINT IF EXISTS noticias_audience_club_check;

ALTER TABLE public.noticias
  ADD CONSTRAINT noticias_audience_club_check CHECK (
    (audience = 'club' AND club_id IS NOT NULL)
    OR (audience <> 'club' AND club_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_noticias_audience ON public.noticias(audience);
CREATE INDEX IF NOT EXISTS idx_noticias_club_id ON public.noticias(club_id);

UPDATE public.noticias
SET audience = 'church'
WHERE audience IS NULL OR audience = '';

-- Public read: only general audience on anonymous surfaces
DROP POLICY IF EXISTS noticias_public_select ON public.noticias;
CREATE POLICY noticias_public_select ON public.noticias
  FOR SELECT TO anon, authenticated
  USING (
    estado = 'activo'
    AND publicado_en <= CURRENT_DATE
    AND audience = 'general'
    AND placements && ARRAY['landing', 'hero_slider', 'standalone_banner']::TEXT[]
  );

CREATE OR REPLACE FUNCTION public.fetch_public_noticias(
  p_placements TEXT[],
  p_limit INT DEFAULT 10
)
RETURNS SETOF public.noticias
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.*
  FROM public.noticias n
  WHERE n.estado = 'activo'
    AND n.publicado_en <= CURRENT_DATE
    AND n.audience = 'general'
    AND n.placements && p_placements
  ORDER BY n.publicado_en DESC, n.created_at DESC
  LIMIT GREATEST(1, LEAST(coalesce(p_limit, 10), 50));
$$;

CREATE OR REPLACE FUNCTION public.fetch_dashboard_noticias(
  p_iglesia_id UUID,
  p_club_id UUID DEFAULT NULL,
  p_placements TEXT[] DEFAULT '{dashboard}',
  p_limit INT DEFAULT 10
)
RETURNS SETOF public.noticias
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.*
  FROM public.noticias n
  WHERE n.estado = 'activo'
    AND n.publicado_en <= CURRENT_DATE
    AND n.placements && p_placements
    AND (
      n.audience = 'general'
      OR (n.audience = 'church' AND n.iglesia_id = p_iglesia_id)
      OR (
        n.audience = 'club'
        AND n.iglesia_id = p_iglesia_id
        AND p_club_id IS NOT NULL
        AND n.club_id = p_club_id
      )
    )
  ORDER BY n.publicado_en DESC, n.created_at DESC
  LIMIT GREATEST(1, LEAST(coalesce(p_limit, 10), 50));
$$;

GRANT EXECUTE ON FUNCTION public.fetch_dashboard_noticias(UUID, UUID, TEXT[], INT) TO authenticated;

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
  p_club_id UUID DEFAULT NULL
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

  v_placements := coalesce(p_placements, ARRAY['dashboard']::TEXT[]);
  IF cardinality(v_placements) < 1 THEN
    RAISE EXCEPTION 'at least one placement is required';
  END IF;

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
      iglesia_id, titulo, resumen, contenido, publicado_en, estado,
      categoria, placements, audience, club_id
    ) VALUES (
      p_iglesia_id,
      trim(p_titulo),
      nullif(trim(p_resumen), ''),
      trim(p_contenido),
      coalesce(p_publicado_en, CURRENT_DATE),
      coalesce(p_estado, 'activo'),
      nullif(trim(p_categoria), ''),
      v_placements,
      v_audience,
      CASE WHEN v_audience = 'club' THEN p_club_id ELSE NULL END
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
    estado = coalesce(p_estado, estado),
    categoria = nullif(trim(p_categoria), ''),
    placements = v_placements,
    audience = v_audience,
    club_id = CASE WHEN v_audience = 'club' THEN p_club_id ELSE NULL END,
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

GRANT EXECUTE ON FUNCTION public.admin_save_noticia(UUID, UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT[], TEXT, UUID) TO authenticated;
