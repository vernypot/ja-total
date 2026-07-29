-- =============================================================================
-- Noticias: public direct URL to read a full article without login
-- Run in Supabase Dashboard → SQL Editor after NOTICIAS_LANDING_DASHBOARD.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fetch_public_noticia_by_id(p_id UUID)
RETURNS public.noticias
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.*
  FROM public.noticias n
  WHERE n.id = p_id
    AND n.estado = 'activo'
    AND n.publicado_en <= CURRENT_DATE
    AND (n.expira_en IS NULL OR n.expira_en >= CURRENT_DATE)
    AND n.audience = 'general'
    AND n.placements && ARRAY[
      'landing',
      'dashboard',
      'hero_slider',
      'standalone_banner'
    ]::TEXT[]
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.fetch_public_noticia_by_id(UUID) TO anon, authenticated;
