-- =============================================================================
-- Enable RLS on reglamento + unidad evaluation tables
-- Run if Supabase linter reports: rls_disabled_in_public
-- Safe to re-run (idempotent)
-- =============================================================================

-- Reglamento
ALTER TABLE IF EXISTS public.club_reglamento_nodo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.unidad_reglamento_infraccion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_reglamento_nodo_select ON public.club_reglamento_nodo;
CREATE POLICY club_reglamento_nodo_select ON public.club_reglamento_nodo
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(club_id));

DROP POLICY IF EXISTS club_reglamento_nodo_write ON public.club_reglamento_nodo;
CREATE POLICY club_reglamento_nodo_write ON public.club_reglamento_nodo
  FOR ALL TO authenticated
  USING (public.user_can_manage_club(club_id))
  WITH CHECK (public.user_can_manage_club(club_id));

DROP POLICY IF EXISTS unidad_reglamento_infraccion_select ON public.unidad_reglamento_infraccion;
CREATE POLICY unidad_reglamento_infraccion_select ON public.unidad_reglamento_infraccion
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.unidades u
      WHERE u.id = unidad_reglamento_infraccion.unidad_id
        AND public.user_can_access_club(u.club_id)
    )
  );

DROP POLICY IF EXISTS unidad_reglamento_infraccion_write ON public.unidad_reglamento_infraccion;
CREATE POLICY unidad_reglamento_infraccion_write ON public.unidad_reglamento_infraccion
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.unidades u
      WHERE u.id = unidad_reglamento_infraccion.unidad_id
        AND public.user_can_manage_club(u.club_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.unidades u
      WHERE u.id = unidad_reglamento_infraccion.unidad_id
        AND public.user_can_manage_club(u.club_id)
    )
  );

-- Unidad evaluation (same linter issue if schema was partially applied)
ALTER TABLE IF EXISTS public.club_unidad_eval_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.club_unidad_eval_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.unidad_eval_item_cantidad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_unidad_eval_config_select ON public.club_unidad_eval_config;
CREATE POLICY club_unidad_eval_config_select ON public.club_unidad_eval_config
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(club_id));

DROP POLICY IF EXISTS club_unidad_eval_config_write ON public.club_unidad_eval_config;
CREATE POLICY club_unidad_eval_config_write ON public.club_unidad_eval_config
  FOR ALL TO authenticated
  USING (public.user_can_manage_club(club_id))
  WITH CHECK (public.user_can_manage_club(club_id));

DROP POLICY IF EXISTS club_unidad_eval_item_select ON public.club_unidad_eval_item;
CREATE POLICY club_unidad_eval_item_select ON public.club_unidad_eval_item
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(club_id));

DROP POLICY IF EXISTS club_unidad_eval_item_write ON public.club_unidad_eval_item;
CREATE POLICY club_unidad_eval_item_write ON public.club_unidad_eval_item
  FOR ALL TO authenticated
  USING (public.user_can_manage_club(club_id))
  WITH CHECK (public.user_can_manage_club(club_id));

DROP POLICY IF EXISTS unidad_eval_item_cantidad_select ON public.unidad_eval_item_cantidad;
CREATE POLICY unidad_eval_item_cantidad_select ON public.unidad_eval_item_cantidad
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unidades u
      WHERE u.id = unidad_eval_item_cantidad.unidad_id
        AND public.user_can_access_club(u.club_id)
    )
  );

DROP POLICY IF EXISTS unidad_eval_item_cantidad_write ON public.unidad_eval_item_cantidad;
CREATE POLICY unidad_eval_item_cantidad_write ON public.unidad_eval_item_cantidad
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unidades u
      WHERE u.id = unidad_eval_item_cantidad.unidad_id
        AND public.user_can_manage_club(u.club_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.unidades u
      WHERE u.id = unidad_eval_item_cantidad.unidad_id
        AND public.user_can_manage_club(u.club_id)
    )
  );

-- Optional: confirm RLS is on (results appear in SQL editor output)
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'club_reglamento_nodo',
    'unidad_reglamento_infraccion',
    'club_unidad_eval_config',
    'club_unidad_eval_item',
    'unidad_eval_item_cantidad'
  )
ORDER BY c.relname;
