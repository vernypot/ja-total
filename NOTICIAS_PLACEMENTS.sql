-- =============================================================================
-- Noticias: multi-surface placement (landing, dashboard, newsletter, hero, banner)
-- Run in Supabase Dashboard → SQL Editor after NOTICIAS_SCHEMA.sql
-- =============================================================================

ALTER TABLE public.noticias
  ADD COLUMN IF NOT EXISTS categoria TEXT,
  ADD COLUMN IF NOT EXISTS placements TEXT[] NOT NULL DEFAULT '{dashboard}';

ALTER TABLE public.noticias
  DROP CONSTRAINT IF EXISTS noticias_placements_check;

ALTER TABLE public.noticias
  ADD CONSTRAINT noticias_placements_check CHECK (
    cardinality(placements) >= 1
    AND placements <@ ARRAY[
      'dashboard',
      'landing',
      'newsletter',
      'hero_slider',
      'standalone_banner'
    ]::TEXT[]
  );

CREATE INDEX IF NOT EXISTS idx_noticias_placements ON public.noticias USING GIN (placements);

UPDATE public.noticias
SET placements = '{dashboard}'
WHERE placements IS NULL OR cardinality(placements) = 0;

-- Public read for surfaces shown before login
DROP POLICY IF EXISTS noticias_public_select ON public.noticias;
CREATE POLICY noticias_public_select ON public.noticias
  FOR SELECT TO anon, authenticated
  USING (
    estado = 'activo'
    AND publicado_en <= CURRENT_DATE
    AND placements && ARRAY['landing', 'hero_slider', 'standalone_banner']::TEXT[]
  );

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
    AND n.placements && p_placements
  ORDER BY n.publicado_en DESC, n.created_at DESC
  LIMIT GREATEST(1, LEAST(coalesce(p_limit, 10), 50));
$$;

GRANT EXECUTE ON FUNCTION public.fetch_public_noticias(TEXT[], INT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin RPC: include placements + categoria
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
  p_placements TEXT[] DEFAULT '{dashboard}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_placements TEXT[];
BEGIN
  IF NOT public.user_can_manage_iglesia(p_iglesia_id) THEN
    RAISE EXCEPTION 'permission denied for admin_save_noticia';
  END IF;

  v_placements := coalesce(p_placements, ARRAY['dashboard']::TEXT[]);
  IF cardinality(v_placements) < 1 THEN
    RAISE EXCEPTION 'at least one placement is required';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.noticias (
      iglesia_id, titulo, resumen, contenido, publicado_en, estado, categoria, placements
    ) VALUES (
      p_iglesia_id,
      trim(p_titulo),
      nullif(trim(p_resumen), ''),
      trim(p_contenido),
      coalesce(p_publicado_en, CURRENT_DATE),
      coalesce(p_estado, 'activo'),
      nullif(trim(p_categoria), ''),
      v_placements
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

GRANT EXECUTE ON FUNCTION public.admin_save_noticia(UUID, UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT[]) TO authenticated;
