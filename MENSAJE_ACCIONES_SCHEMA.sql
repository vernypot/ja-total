-- =============================================================================
-- Per-user message delete (hide from inbox/sent without erasing the original)
-- Run in Supabase Dashboard → SQL Editor after CLUB_CALENDARIO_MENSAJES_SCHEMA.sql
-- =============================================================================

ALTER TABLE public.mensajes
  ADD COLUMN IF NOT EXISTS eliminado_por_remitente BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eliminado_por_destinatario BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.admin_list_mensajes()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN coalesce((
    SELECT json_agg(public.mensaje_row_json(msg, v_uid, NULL) ORDER BY msg.created_at DESC)
    FROM public.mensajes msg
    WHERE (msg.remitente_usuario_id = v_uid AND msg.eliminado_por_remitente IS NOT TRUE)
       OR (msg.destinatario_usuario_id = v_uid AND msg.eliminado_por_destinatario IS NOT TRUE)
  ), '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unread_mensaje_count()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN (
    SELECT count(*)::integer
    FROM public.mensajes
    WHERE destinatario_usuario_id = auth.uid()
      AND leido_at IS NULL
      AND eliminado_por_destinatario IS NOT TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_mensaje(p_mensaje_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  UPDATE public.mensajes
  SET
    eliminado_por_remitente = CASE
      WHEN remitente_usuario_id = v_uid THEN TRUE
      ELSE eliminado_por_remitente
    END,
    eliminado_por_destinatario = CASE
      WHEN destinatario_usuario_id = v_uid THEN TRUE
      ELSE eliminado_por_destinatario
    END
  WHERE id = p_mensaje_id
    AND (remitente_usuario_id = v_uid OR destinatario_usuario_id = v_uid);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_list_mensajes(p_session_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);
  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  RETURN coalesce((
    SELECT json_agg(public.mensaje_row_json(msg, NULL, v_miembro_id) ORDER BY msg.created_at DESC)
    FROM public.mensajes msg
    WHERE (msg.remitente_miembro_id = v_miembro_id AND msg.eliminado_por_remitente IS NOT TRUE)
       OR (msg.destinatario_miembro_id = v_miembro_id AND msg.eliminado_por_destinatario IS NOT TRUE)
  ), '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_unread_mensaje_count(p_session_token TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);
  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  RETURN (
    SELECT count(*)::integer
    FROM public.mensajes
    WHERE destinatario_miembro_id = v_miembro_id
      AND leido_at IS NULL
      AND eliminado_por_destinatario IS NOT TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_delete_mensaje(
  p_session_token TEXT,
  p_mensaje_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);
  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  UPDATE public.mensajes
  SET
    eliminado_por_remitente = CASE
      WHEN remitente_miembro_id = v_miembro_id THEN TRUE
      ELSE eliminado_por_remitente
    END,
    eliminado_por_destinatario = CASE
      WHEN destinatario_miembro_id = v_miembro_id THEN TRUE
      ELSE eliminado_por_destinatario
    END
  WHERE id = p_mensaje_id
    AND (remitente_miembro_id = v_miembro_id OR destinatario_miembro_id = v_miembro_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_mensaje(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_portal_delete_mensaje(TEXT, UUID) TO authenticated, anon;
