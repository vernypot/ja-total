-- =============================================================================
-- Fix Supabase linter: security_definer_view on v_administradores_iglesia
-- (and v_usuarios_con_iglesias if flagged)
--
-- Views default to the owner's privileges (SECURITY DEFINER behavior).
-- security_invoker = true applies RLS as the querying user instead.
-- Requires PostgreSQL 15+ (Supabase).
-- =============================================================================

ALTER VIEW IF EXISTS public.v_administradores_iglesia SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_usuarios_con_iglesias SET (security_invoker = true);

-- Views should not be exposed to anon; access via authenticated + RLS only.
REVOKE ALL ON public.v_administradores_iglesia FROM anon;
REVOKE ALL ON public.v_usuarios_con_iglesias FROM anon;

GRANT SELECT ON public.v_administradores_iglesia TO authenticated;
GRANT SELECT ON public.v_usuarios_con_iglesias TO authenticated;

-- Verify (security_invoker should be true in options)
SELECT
  c.relname AS view_name,
  c.reloptions AS view_options
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND c.relname IN ('v_administradores_iglesia', 'v_usuarios_con_iglesias');
