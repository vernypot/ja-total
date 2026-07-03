-- ============================================
-- Landing page — public app usage statistics
-- Run in Supabase SQL editor
-- ============================================

CREATE OR REPLACE FUNCTION public.fetch_public_usage_stats()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'active_clubs',
      (SELECT COUNT(*)::int FROM public.clubes WHERE estado = 'activo'),
    'active_members',
      (SELECT COUNT(*)::int FROM public.miembros WHERE estado = 'activo'),
    'active_churches',
      (SELECT COUNT(*)::int FROM public.iglesias WHERE estado = 'activo'),
    'events_this_year',
      (
        SELECT COUNT(*)::int
        FROM public.eventos
        WHERE estado = 'activo'
          AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.fetch_public_usage_stats() TO anon, authenticated;
