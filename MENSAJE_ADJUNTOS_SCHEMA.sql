-- =============================================================================
-- Message rich-text attachments (images / files up to 1 GB)
-- Run in Supabase Dashboard → SQL Editor after CLUB_CALENDARIO_MENSAJES_SCHEMA.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mensaje_adjuntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensaje_id UUID NOT NULL REFERENCES public.mensajes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  mime_type TEXT,
  tamano BIGINT NOT NULL DEFAULT 0 CHECK (tamano >= 0 AND tamano <= 1073741824),
  storage_path TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mensaje_adjuntos IS
  'Files and images attached to inbox messages. Maximum 1 GB per file.';

CREATE INDEX IF NOT EXISTS idx_mensaje_adjuntos_mensaje
  ON public.mensaje_adjuntos(mensaje_id, created_at);

ALTER TABLE public.mensaje_adjuntos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_can_read_mensaje(p_mensaje_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mensajes m
    WHERE m.id = p_mensaje_id
      AND (
        m.remitente_usuario_id = auth.uid()
        OR m.destinatario_usuario_id = auth.uid()
        OR public.user_can_manage_club(m.club_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_mensaje_sender(p_mensaje_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mensajes m
    WHERE m.id = p_mensaje_id
      AND m.remitente_usuario_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS mensaje_adjuntos_select ON public.mensaje_adjuntos;
CREATE POLICY mensaje_adjuntos_select ON public.mensaje_adjuntos
  FOR SELECT TO authenticated
  USING (public.user_can_read_mensaje(mensaje_id));

DROP POLICY IF EXISTS mensaje_adjuntos_write ON public.mensaje_adjuntos;
CREATE POLICY mensaje_adjuntos_write ON public.mensaje_adjuntos
  FOR ALL TO authenticated
  USING (public.user_is_mensaje_sender(mensaje_id))
  WITH CHECK (public.user_is_mensaje_sender(mensaje_id));

CREATE OR REPLACE FUNCTION public.mensaje_adjuntos_json(p_mensaje_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(json_agg(
    json_build_object(
      'id', a.id,
      'nombre', a.nombre,
      'mime_type', a.mime_type,
      'tamano', a.tamano,
      'url', a.url
    )
    ORDER BY a.created_at
  ), '[]'::json)
  FROM public.mensaje_adjuntos a
  WHERE a.mensaje_id = p_mensaje_id
    AND a.url IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.mensaje_row_json(p_row public.mensajes, p_self_usuario_id UUID, p_self_miembro_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', p_row.id,
    'club_id', p_row.club_id,
    'club_nombre', (SELECT c.nombre FROM public.clubes c WHERE c.id = p_row.club_id),
    'tipo', p_row.tipo,
    'asunto', p_row.asunto,
    'cuerpo', p_row.cuerpo,
    'created_at', p_row.created_at,
    'leido_at', p_row.leido_at,
    'folder', CASE
      WHEN p_self_miembro_id IS NOT NULL AND p_row.remitente_miembro_id = p_self_miembro_id THEN 'sent'
      WHEN p_self_usuario_id IS NOT NULL AND p_row.remitente_usuario_id = p_self_usuario_id THEN 'sent'
      ELSE 'inbox'
    END,
    'unread', (
      p_row.leido_at IS NULL
      AND (
        (p_self_miembro_id IS NOT NULL AND p_row.destinatario_miembro_id = p_self_miembro_id)
        OR (p_self_usuario_id IS NOT NULL AND p_row.destinatario_usuario_id = p_self_usuario_id)
      )
    ),
    'remitente', public.mensaje_party_json(p_row.remitente_usuario_id, p_row.remitente_miembro_id),
    'destinatario', public.mensaje_party_json(p_row.destinatario_usuario_id, p_row.destinatario_miembro_id),
    'adjuntos', public.mensaje_adjuntos_json(p_row.id)
  );
$$;

CREATE OR REPLACE FUNCTION public.mensaje_storage_path_writable(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mensaje_adjuntos a
    WHERE a.mensaje_id::text = split_part(p_name, '/', 1)
      AND a.id::text = split_part(p_name, '/', 2)
      AND a.url IS NULL
      AND a.created_at > now() - interval '30 minutes'
  );
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'mensaje-archivos',
  'mensaje-archivos',
  true,
  1073741824
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS mensaje_archivos_select ON storage.objects;
DROP POLICY IF EXISTS mensaje_archivos_insert ON storage.objects;
DROP POLICY IF EXISTS mensaje_archivos_update ON storage.objects;
DROP POLICY IF EXISTS mensaje_archivos_delete ON storage.objects;

CREATE POLICY mensaje_archivos_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'mensaje-archivos');

CREATE POLICY mensaje_archivos_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'mensaje-archivos'
    AND public.mensaje_storage_path_writable(name)
  );

CREATE POLICY mensaje_archivos_update ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (
    bucket_id = 'mensaje-archivos'
    AND public.mensaje_storage_path_writable(name)
  )
  WITH CHECK (
    bucket_id = 'mensaje-archivos'
    AND public.mensaje_storage_path_writable(name)
  );

CREATE POLICY mensaje_archivos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'mensaje-archivos'
    AND public.user_is_mensaje_sender(split_part(name, '/', 1)::uuid)
  );

-- ---------------------------------------------------------------------------
-- Staff RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_update_mensaje_cuerpo(
  p_mensaje_id UUID,
  p_cuerpo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cuerpo TEXT := trim(coalesce(p_cuerpo, ''));
BEGIN
  IF v_cuerpo = '' THEN
    RAISE EXCEPTION 'message body is required';
  END IF;

  UPDATE public.mensajes
  SET cuerpo = v_cuerpo
  WHERE id = p_mensaje_id
    AND remitente_usuario_id = auth.uid()
    AND created_at > now() - interval '30 minutes';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_prepare_mensaje_adjunto(
  p_mensaje_id UUID,
  p_nombre TEXT,
  p_mime_type TEXT,
  p_tamano BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_nombre TEXT := left(coalesce(nullif(trim(p_nombre), ''), 'file'), 180);
  v_path TEXT;
BEGIN
  v_nombre := regexp_replace(v_nombre, '[\\/]+', '_', 'g');
  IF v_nombre = '' THEN
    v_nombre := 'file';
  END IF;

  IF NOT public.user_is_mensaje_sender(p_mensaje_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF p_tamano IS NULL OR p_tamano < 0 OR p_tamano > 1073741824 THEN
    RAISE EXCEPTION 'file exceeds 1 GB limit';
  END IF;

  INSERT INTO public.mensaje_adjuntos (mensaje_id, nombre, mime_type, tamano)
  VALUES (p_mensaje_id, v_nombre, nullif(trim(coalesce(p_mime_type, '')), ''), coalesce(p_tamano, 0))
  RETURNING id INTO v_id;

  v_path := p_mensaje_id::text || '/' || v_id::text || '/' || v_nombre;

  UPDATE public.mensaje_adjuntos
  SET storage_path = v_path
  WHERE id = v_id;

  RETURN json_build_object('id', v_id, 'path', v_path);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_finalize_mensaje_adjunto(
  p_adjunto_id UUID,
  p_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mensaje_adjuntos a
  SET url = nullif(trim(coalesce(p_url, '')), '')
  FROM public.mensajes m
  WHERE a.id = p_adjunto_id
    AND m.id = a.mensaje_id
    AND m.remitente_usuario_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_can_read_mensaje(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_mensaje_sender(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mensaje_storage_path_writable(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.mensaje_adjuntos_json(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_mensaje_cuerpo(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_prepare_mensaje_adjunto(UUID, TEXT, TEXT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finalize_mensaje_adjunto(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Portal RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.member_portal_update_mensaje_cuerpo(
  p_session_token TEXT,
  p_mensaje_id UUID,
  p_cuerpo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_cuerpo TEXT := trim(coalesce(p_cuerpo, ''));
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);
  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  IF v_cuerpo = '' THEN
    RAISE EXCEPTION 'message body is required';
  END IF;

  UPDATE public.mensajes
  SET cuerpo = v_cuerpo
  WHERE id = p_mensaje_id
    AND remitente_miembro_id = v_miembro_id
    AND created_at > now() - interval '30 minutes';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_prepare_mensaje_adjunto(
  p_session_token TEXT,
  p_mensaje_id UUID,
  p_nombre TEXT,
  p_mime_type TEXT,
  p_tamano BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_id UUID;
  v_nombre TEXT := left(coalesce(nullif(trim(p_nombre), ''), 'file'), 180);
  v_path TEXT;
BEGIN
  v_nombre := regexp_replace(v_nombre, '[\\/]+', '_', 'g');
  IF v_nombre = '' THEN
    v_nombre := 'file';
  END IF;

  v_miembro_id := public.member_portal_verify_session(p_session_token);
  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.mensajes
    WHERE id = p_mensaje_id
      AND remitente_miembro_id = v_miembro_id
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF p_tamano IS NULL OR p_tamano < 0 OR p_tamano > 1073741824 THEN
    RAISE EXCEPTION 'file exceeds 1 GB limit';
  END IF;

  INSERT INTO public.mensaje_adjuntos (mensaje_id, nombre, mime_type, tamano)
  VALUES (p_mensaje_id, v_nombre, nullif(trim(coalesce(p_mime_type, '')), ''), coalesce(p_tamano, 0))
  RETURNING id INTO v_id;

  v_path := p_mensaje_id::text || '/' || v_id::text || '/' || v_nombre;

  UPDATE public.mensaje_adjuntos
  SET storage_path = v_path
  WHERE id = v_id;

  RETURN json_build_object('id', v_id, 'path', v_path);
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_finalize_mensaje_adjunto(
  p_session_token TEXT,
  p_adjunto_id UUID,
  p_url TEXT
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

  UPDATE public.mensaje_adjuntos a
  SET url = nullif(trim(coalesce(p_url, '')), '')
  FROM public.mensajes m
  WHERE a.id = p_adjunto_id
    AND m.id = a.mensaje_id
    AND m.remitente_miembro_id = v_miembro_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_portal_update_mensaje_cuerpo(TEXT, UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_prepare_mensaje_adjunto(TEXT, UUID, TEXT, TEXT, BIGINT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_finalize_mensaje_adjunto(TEXT, UUID, TEXT) TO authenticated, anon;
