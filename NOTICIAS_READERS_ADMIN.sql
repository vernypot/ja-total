-- =============================================================================
-- Admin: list members who marked a news article as read (portal "Leído")
-- Run in Supabase SQL Editor after SORTEOS_SCHEMA.sql (miembro_noticia_leida)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_list_noticia_readers(p_noticia_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_iglesia_id UUID;
  v_result JSON;
BEGIN
  SELECT iglesia_id INTO v_iglesia_id
  FROM public.noticias
  WHERE id = p_noticia_id;

  IF v_iglesia_id IS NULL THEN
    RAISE EXCEPTION 'noticia not found';
  END IF;

  IF NOT public.user_can_manage_iglesia(v_iglesia_id) THEN
    RAISE EXCEPTION 'permission denied for admin_list_noticia_readers';
  END IF;

  SELECT coalesce(json_agg(row_data ORDER BY leido_at DESC), '[]'::json)
  INTO v_result
  FROM (
    SELECT
      json_build_object(
        'miembro_id', m.id,
        'nombre', m.nombre,
        'apellido1', m.apellido1,
        'apellido2', m.apellido2,
        'nombre_opcional', m.nombre_opcional,
        'apellido_opcional', m.apellido_opcional,
        'estado', m.estado,
        'leido_at', ml.leido_at
      ) AS row_data,
      ml.leido_at
    FROM public.miembro_noticia_leida ml
    JOIN public.miembros m ON m.id = ml.miembro_id
    WHERE ml.noticia_id = p_noticia_id
  ) sub;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_noticia_readers(UUID) TO authenticated;
