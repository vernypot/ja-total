-- =============================================================================
-- Enable RLS on evento_asistencia_grupo
-- Run if Supabase linter reports: rls_disabled_in_public
-- Requires EVENTOS_SCHEMA.sql (user_can_access_club, user_can_manage_club)
-- =============================================================================

ALTER TABLE IF EXISTS public.evento_asistencia_grupo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evento_asistencia_grupo_select ON public.evento_asistencia_grupo;
CREATE POLICY evento_asistencia_grupo_select ON public.evento_asistencia_grupo
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(club_id));

DROP POLICY IF EXISTS evento_asistencia_grupo_insert ON public.evento_asistencia_grupo;
CREATE POLICY evento_asistencia_grupo_insert ON public.evento_asistencia_grupo
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_club(club_id));

DROP POLICY IF EXISTS evento_asistencia_grupo_update ON public.evento_asistencia_grupo;
CREATE POLICY evento_asistencia_grupo_update ON public.evento_asistencia_grupo
  FOR UPDATE TO authenticated
  USING (public.user_can_manage_club(club_id))
  WITH CHECK (public.user_can_manage_club(club_id));

DROP POLICY IF EXISTS evento_asistencia_grupo_delete ON public.evento_asistencia_grupo;
CREATE POLICY evento_asistencia_grupo_delete ON public.evento_asistencia_grupo
  FOR DELETE TO authenticated
  USING (public.user_can_manage_club(club_id));

REVOKE ALL ON public.evento_asistencia_grupo FROM anon;
GRANT SELECT ON public.evento_asistencia_grupo TO authenticated;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'evento_asistencia_grupo';
