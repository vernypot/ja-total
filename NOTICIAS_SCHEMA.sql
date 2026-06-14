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
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_noticias_iglesia_id ON public.noticias(iglesia_id);
CREATE INDEX IF NOT EXISTS idx_noticias_publicado_en ON public.noticias(publicado_en DESC);

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
-- Admin RPC fallbacks
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_save_noticia(
  p_id UUID,
  p_iglesia_id UUID,
  p_titulo TEXT,
  p_resumen TEXT,
  p_contenido TEXT,
  p_publicado_en DATE,
  p_estado TEXT DEFAULT 'activo'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.user_can_manage_iglesia(p_iglesia_id) THEN
    RAISE EXCEPTION 'permission denied for admin_save_noticia';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.noticias (
      iglesia_id, titulo, resumen, contenido, publicado_en, estado
    ) VALUES (
      p_iglesia_id,
      trim(p_titulo),
      nullif(trim(p_resumen), ''),
      trim(p_contenido),
      coalesce(p_publicado_en, CURRENT_DATE),
      coalesce(p_estado, 'activo')
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

GRANT EXECUTE ON FUNCTION public.admin_save_noticia(UUID, UUID, TEXT, TEXT, TEXT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_noticia(UUID) TO authenticated;
