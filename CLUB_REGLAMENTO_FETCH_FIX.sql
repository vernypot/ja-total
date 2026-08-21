-- Fix: member portal reglamento fetch failed with
-- "cannot execute UPDATE in a read-only transaction"
-- because STABLE + member_portal_verify_session() updates last_seen_at.

CREATE OR REPLACE FUNCTION public.member_portal_fetch_reglamento(
  p_session_token TEXT,
  p_club_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_nodos JSON;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.miembro_club mc
    JOIN public.clubes c ON c.id = mc.club_id
    WHERE mc.miembro_id = v_miembro_id
      AND mc.club_id = p_club_id
      AND c.estado = 'activo'
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT coalesce(json_agg(
    json_build_object(
      'id', n.id,
      'parent_id', n.parent_id,
      'nivel', n.nivel,
      'titulo', n.titulo,
      'descripcion', n.descripcion,
      'puntos_penalizacion', n.puntos_penalizacion,
      'orden', n.orden
    )
    ORDER BY n.nivel, n.orden, n.titulo
  ), '[]'::json)
  INTO v_nodos
  FROM public.club_reglamento_nodo n
  WHERE n.club_id = p_club_id
    AND n.estado = 'activo';

  RETURN json_build_object('nodos', v_nodos);
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_portal_fetch_reglamento(TEXT, UUID) TO authenticated, anon;
