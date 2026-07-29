-- =============================================================================
-- Noticias: show "Panel de inicio" (dashboard) articles on public landing #noticias
-- Run in Supabase Dashboard → SQL Editor after NOTICIAS_EXPIRATION.sql
--
-- Dashboard-placement noticias with audience = general appear on the landing
-- news section before login (same pool as explicit "landing" placement).
-- =============================================================================

DROP POLICY IF EXISTS noticias_public_select ON public.noticias;
CREATE POLICY noticias_public_select ON public.noticias
  FOR SELECT TO anon, authenticated
  USING (
    estado = 'activo'
    AND publicado_en <= CURRENT_DATE
    AND (expira_en IS NULL OR expira_en >= CURRENT_DATE)
    AND audience = 'general'
    AND placements && ARRAY[
      'landing',
      'dashboard',
      'hero_slider',
      'standalone_banner'
    ]::TEXT[]
  );
