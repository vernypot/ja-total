-- =============================================================================
-- Noticias: church-scoped news for dashboard home
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: USUARIOS_RLS_FIX.sql, EVENTOS_SCHEMA.sql (club helpers)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.noticias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iglesia_id UUID NOT NULL REFERENCES public.iglesias(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,  -- supports sanitized HTML
  resumen TEXT,          -- supports sanitized HTML
  contenido TEXT NOT NULL,  -- supports sanitized HTML
  publicado_en DATE NOT NULL DEFAULT CURRENT_DATE,
  expira_en DATE,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo')),
  categoria TEXT,
  placements TEXT[] NOT NULL DEFAULT '{dashboard}',
  audience VARCHAR(20) NOT NULL DEFAULT 'church',
  club_id UUID REFERENCES public.clubes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT noticias_placements_check CHECK (
    cardinality(placements) >= 1
    AND placements <@ ARRAY[
      'dashboard',
      'landing',
      'newsletter',
      'hero_slider',
      'standalone_banner'
    ]::TEXT[]
  ),
  CONSTRAINT noticias_audience_check CHECK (
    audience IN ('general', 'church', 'club')
  ),
  CONSTRAINT noticias_audience_club_check CHECK (
    (audience = 'club' AND club_id IS NOT NULL)
    OR (audience <> 'club' AND club_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_noticias_iglesia_id ON public.noticias(iglesia_id);
CREATE INDEX IF NOT EXISTS idx_noticias_publicado_en ON public.noticias(publicado_en DESC);
CREATE INDEX IF NOT EXISTS idx_noticias_placements ON public.noticias USING GIN (placements);
CREATE INDEX IF NOT EXISTS idx_noticias_audience ON public.noticias(audience);
CREATE INDEX IF NOT EXISTS idx_noticias_club_id ON public.noticias(club_id);
CREATE INDEX IF NOT EXISTS idx_noticias_expira_en ON public.noticias(expira_en);

ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Iglesia access helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_can_access_iglesia(p_iglesia_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_usuarios_superadmin()
    OR EXISTS (
      SELECT 1
      FROM public.usuario_iglesia ui
      WHERE ui.iglesia_id = p_iglesia_id
        AND ui.usuario_id = public.get_user_id()
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_iglesia(p_iglesia_id UUID)
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
        FROM public.usuario_iglesia ui
        WHERE ui.iglesia_id = p_iglesia_id
          AND ui.usuario_id = public.get_user_id()
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_iglesia(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_iglesia(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS noticias_public_select ON public.noticias;
CREATE POLICY noticias_public_select ON public.noticias
  FOR SELECT TO anon, authenticated
  USING (
    estado = 'activo'
    AND publicado_en <= CURRENT_DATE
    AND (expira_en IS NULL OR expira_en >= CURRENT_DATE)
    AND audience = 'general'
    AND placements && ARRAY['landing', 'hero_slider', 'standalone_banner']::TEXT[]
  );

DROP POLICY IF EXISTS noticias_select ON public.noticias;
CREATE POLICY noticias_select ON public.noticias
  FOR SELECT TO authenticated
  USING (public.user_can_access_iglesia(iglesia_id));

DROP POLICY IF EXISTS noticias_insert ON public.noticias;
CREATE POLICY noticias_insert ON public.noticias
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_iglesia(iglesia_id));

DROP POLICY IF EXISTS noticias_update ON public.noticias;
CREATE POLICY noticias_update ON public.noticias
  FOR UPDATE TO authenticated
  USING (public.user_can_manage_iglesia(iglesia_id))
  WITH CHECK (public.user_can_manage_iglesia(iglesia_id));

DROP POLICY IF EXISTS noticias_delete ON public.noticias;
CREATE POLICY noticias_delete ON public.noticias
  FOR DELETE TO authenticated
  USING (public.user_can_manage_iglesia(iglesia_id));

-- ---------------------------------------------------------------------------
-- Public fetch RPC (anon-safe)
-- ---------------------------------------------------------------------------

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
    AND (n.expira_en IS NULL OR n.expira_en >= CURRENT_DATE)
    AND n.audience = 'general'
    AND n.placements && p_placements
  ORDER BY n.publicado_en DESC, n.created_at DESC
  LIMIT GREATEST(1, LEAST(coalesce(p_limit, 10), 50));
$$;

GRANT EXECUTE ON FUNCTION public.fetch_public_noticias(TEXT[], INT) TO anon, authenticated;

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
    AND (n.expira_en IS NULL OR n.expira_en >= CURRENT_DATE)
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

-- ---------------------------------------------------------------------------
-- Admin RPC fallbacks
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
  p_expira_en DATE DEFAULT NULL
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
      iglesia_id, titulo, resumen, contenido, publicado_en, expira_en, estado,
      categoria, placements, audience, club_id
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
    expira_en = p_expira_en,
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

CREATE OR REPLACE FUNCTION public.admin_delete_noticia(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_iglesia_id UUID;
BEGIN
  SELECT iglesia_id INTO v_iglesia_id
  FROM public.noticias
  WHERE id = p_id;

  IF v_iglesia_id IS NULL THEN
    RAISE EXCEPTION 'noticia not found';
  END IF;

  IF NOT public.user_can_manage_iglesia(v_iglesia_id) THEN
    RAISE EXCEPTION 'permission denied for admin_delete_noticia';
  END IF;

  DELETE FROM public.noticias WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_noticia(
  UUID, UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT[], TEXT, UUID, DATE
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_noticia(UUID) TO authenticated;
