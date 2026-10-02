-- =============================================================================
-- Club birthday calendar flag + member/user message inbox
-- Run in Supabase Dashboard → SQL Editor after UNIDADES_SCHEMA / USUARIOS_SCHEMA
-- and MIEMBRO_PORTAL_DASHBOARD.sql
-- =============================================================================

ALTER TABLE public.clubes
  ADD COLUMN IF NOT EXISTS calendario_cumpleanos_activo BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clubes.calendario_cumpleanos_activo IS
  'When true, the club calendar shows member birthdays by default. Members can still hide them in their own calendar.';

CREATE OR REPLACE FUNCTION public.admin_update_club_calendario_cumpleanos(
  p_club_id UUID,
  p_activo BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_can_manage_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  UPDATE public.clubes
  SET calendario_cumpleanos_activo = coalesce(p_activo, false)
  WHERE id = p_club_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_club_calendario_cumpleanos(UUID, BOOLEAN) TO authenticated;

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubes(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'general'
    CHECK (tipo IN ('general', 'solicitud', 'cumpleanos')),
  asunto TEXT,
  cuerpo TEXT NOT NULL,
  remitente_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  remitente_miembro_id UUID REFERENCES public.miembros(id) ON DELETE SET NULL,
  destinatario_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  destinatario_miembro_id UUID REFERENCES public.miembros(id) ON DELETE CASCADE,
  leido_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mensajes_cuerpo_not_empty CHECK (trim(cuerpo) <> ''),
  CONSTRAINT mensajes_one_sender CHECK (
    (remitente_usuario_id IS NOT NULL AND remitente_miembro_id IS NULL)
    OR (remitente_usuario_id IS NULL AND remitente_miembro_id IS NOT NULL)
  ),
  CONSTRAINT mensajes_one_recipient CHECK (
    (destinatario_usuario_id IS NOT NULL AND destinatario_miembro_id IS NULL)
    OR (destinatario_usuario_id IS NULL AND destinatario_miembro_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.mensajes IS
  'Direct messages between club members and staff users (inbox).';

CREATE INDEX IF NOT EXISTS idx_mensajes_destinatario_miembro
  ON public.mensajes(destinatario_miembro_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mensajes_destinatario_usuario
  ON public.mensajes(destinatario_usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mensajes_club
  ON public.mensajes(club_id, created_at DESC);

ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mensajes_select ON public.mensajes;
CREATE POLICY mensajes_select ON public.mensajes
  FOR SELECT TO authenticated
  USING (
    remitente_usuario_id = auth.uid()
    OR destinatario_usuario_id = auth.uid()
    OR public.user_can_manage_club(club_id)
  );

DROP POLICY IF EXISTS mensajes_insert ON public.mensajes;
CREATE POLICY mensajes_insert ON public.mensajes
  FOR INSERT TO authenticated
  WITH CHECK (
    remitente_usuario_id = auth.uid()
    AND public.user_can_access_club(club_id)
  );

DROP POLICY IF EXISTS mensajes_update ON public.mensajes;
CREATE POLICY mensajes_update ON public.mensajes
  FOR UPDATE TO authenticated
  USING (
    destinatario_usuario_id = auth.uid()
    OR public.user_can_manage_club(club_id)
  )
  WITH CHECK (
    destinatario_usuario_id = auth.uid()
    OR public.user_can_manage_club(club_id)
  );

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.miembro_in_club(p_miembro_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.miembro_club mc
    JOIN public.clubes c ON c.id = mc.club_id
    WHERE mc.miembro_id = p_miembro_id
      AND mc.club_id = p_club_id
      AND c.estado = 'activo'
  );
$$;

CREATE OR REPLACE FUNCTION public.mensaje_party_json(
  p_usuario_id UUID,
  p_miembro_id UUID
)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_miembro_id IS NOT NULL THEN (
      SELECT json_build_object(
        'tipo', 'miembro',
        'id', m.id,
        'nombre', coalesce(nullif(trim(m.nombre_opcional), ''), m.nombre),
        'apellido1', coalesce(nullif(trim(m.apellido_opcional), ''), m.apellido1),
        'foto_url', m.foto_url
      )
      FROM public.miembros m
      WHERE m.id = p_miembro_id
    )
    WHEN p_usuario_id IS NOT NULL THEN (
      SELECT json_build_object(
        'tipo', 'usuario',
        'id', u.id,
        'nombre', u.nombre,
        'apellido1', u.apellido1,
        'foto_url', u.foto
      )
      FROM public.usuarios u
      WHERE u.id = p_usuario_id
    )
    ELSE NULL
  END;
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
    'destinatario', public.mensaje_party_json(p_row.destinatario_usuario_id, p_row.destinatario_miembro_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.club_birthday_members_json(p_club_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(json_agg(row_data ORDER BY row_data->>'nombre', row_data->>'apellido1'), '[]'::json)
  FROM (
    SELECT json_build_object(
      'id', m.id,
      'nombre', m.nombre,
      'apellido1', m.apellido1,
      'apellido2', m.apellido2,
      'nombre_opcional', m.nombre_opcional,
      'apellido_opcional', m.apellido_opcional,
      'fecha_nacimiento', m.fecha_nacimiento,
      'foto_url', m.foto_url
    ) AS row_data
    FROM public.miembro_club mc
    JOIN public.miembros m ON m.id = mc.miembro_id
    WHERE mc.club_id = p_club_id
      AND m.estado = 'activo'
      AND m.fecha_nacimiento IS NOT NULL
  ) rows;
$$;

-- ---------------------------------------------------------------------------
-- Staff RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_club_birthdays(p_club_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_can_access_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN public.club_birthday_members_json(p_club_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_club_message_directory(p_club_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_can_access_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN coalesce((
    SELECT json_agg(
      json_build_object(
        'id', m.id,
        'nombre', m.nombre,
        'apellido1', m.apellido1,
        'apellido2', m.apellido2,
        'nombre_opcional', m.nombre_opcional,
        'apellido_opcional', m.apellido_opcional,
        'foto_url', m.foto_url
      )
      ORDER BY coalesce(nullif(trim(m.nombre_opcional), ''), m.nombre),
               coalesce(nullif(trim(m.apellido_opcional), ''), m.apellido1)
    )
    FROM public.miembro_club mc
    JOIN public.miembros m ON m.id = mc.miembro_id
    WHERE mc.club_id = p_club_id
      AND m.estado = 'activo'
  ), '[]'::json);
END;
$$;

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
    WHERE msg.remitente_usuario_id = v_uid
       OR msg.destinatario_usuario_id = v_uid
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
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_send_mensaje(
  p_club_id UUID,
  p_destinatario_miembro_id UUID,
  p_destinatario_usuario_id UUID,
  p_tipo TEXT,
  p_asunto TEXT,
  p_cuerpo TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_tipo TEXT := coalesce(nullif(trim(p_tipo), ''), 'general');
  v_cuerpo TEXT := trim(coalesce(p_cuerpo, ''));
  v_asunto TEXT := nullif(trim(coalesce(p_asunto, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_can_access_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF v_tipo NOT IN ('general', 'solicitud', 'cumpleanos') THEN
    RAISE EXCEPTION 'invalid message type';
  END IF;

  IF v_cuerpo = '' THEN
    RAISE EXCEPTION 'message body is required';
  END IF;

  IF p_destinatario_miembro_id IS NULL AND p_destinatario_usuario_id IS NULL THEN
    RAISE EXCEPTION 'recipient is required';
  END IF;

  IF p_destinatario_miembro_id IS NOT NULL AND p_destinatario_usuario_id IS NOT NULL THEN
    RAISE EXCEPTION 'only one recipient is allowed';
  END IF;

  IF p_destinatario_miembro_id IS NOT NULL
     AND NOT public.miembro_in_club(p_destinatario_miembro_id, p_club_id) THEN
    RAISE EXCEPTION 'member does not belong to club';
  END IF;

  IF p_destinatario_usuario_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot message yourself';
  END IF;

  INSERT INTO public.mensajes (
    club_id,
    tipo,
    asunto,
    cuerpo,
    remitente_usuario_id,
    destinatario_miembro_id,
    destinatario_usuario_id
  )
  VALUES (
    p_club_id,
    v_tipo,
    v_asunto,
    v_cuerpo,
    auth.uid(),
    p_destinatario_miembro_id,
    p_destinatario_usuario_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_mensaje_leido(p_mensaje_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mensajes
  SET leido_at = coalesce(leido_at, now())
  WHERE id = p_mensaje_id
    AND destinatario_usuario_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_club_birthdays(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_club_message_directory(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_mensajes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unread_mensaje_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_mensaje(UUID, UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_mensaje_leido(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Member portal RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.member_portal_list_club_birthdays(
  p_session_token TEXT,
  p_club_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_activo BOOLEAN;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);
  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  IF NOT public.miembro_in_club(v_miembro_id, p_club_id) THEN
    RAISE EXCEPTION 'club access denied';
  END IF;

  SELECT calendario_cumpleanos_activo INTO v_activo
  FROM public.clubes
  WHERE id = p_club_id;

  IF coalesce(v_activo, false) IS NOT TRUE THEN
    RETURN json_build_object('enabled', false, 'members', '[]'::json);
  END IF;

  RETURN json_build_object(
    'enabled', true,
    'members', public.club_birthday_members_json(p_club_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_list_club_directory(
  p_session_token TEXT,
  p_club_id UUID
)
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

  IF NOT public.miembro_in_club(v_miembro_id, p_club_id) THEN
    RAISE EXCEPTION 'club access denied';
  END IF;

  RETURN coalesce((
    SELECT json_agg(
      json_build_object(
        'id', m.id,
        'nombre', m.nombre,
        'apellido1', m.apellido1,
        'apellido2', m.apellido2,
        'nombre_opcional', m.nombre_opcional,
        'apellido_opcional', m.apellido_opcional,
        'foto_url', m.foto_url
      )
      ORDER BY coalesce(nullif(trim(m.nombre_opcional), ''), m.nombre),
               coalesce(nullif(trim(m.apellido_opcional), ''), m.apellido1)
    )
    FROM public.miembro_club mc
    JOIN public.miembros m ON m.id = mc.miembro_id
    WHERE mc.club_id = p_club_id
      AND m.estado = 'activo'
      AND m.id <> v_miembro_id
  ), '[]'::json);
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
    WHERE msg.remitente_miembro_id = v_miembro_id
       OR msg.destinatario_miembro_id = v_miembro_id
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
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_send_mensaje(
  p_session_token TEXT,
  p_club_id UUID,
  p_destinatario_miembro_id UUID,
  p_destinatario_usuario_id UUID,
  p_tipo TEXT,
  p_asunto TEXT,
  p_cuerpo TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_id UUID;
  v_tipo TEXT := coalesce(nullif(trim(p_tipo), ''), 'general');
  v_cuerpo TEXT := trim(coalesce(p_cuerpo, ''));
  v_asunto TEXT := nullif(trim(coalesce(p_asunto, '')), '');
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);
  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  IF NOT public.miembro_in_club(v_miembro_id, p_club_id) THEN
    RAISE EXCEPTION 'club access denied';
  END IF;

  IF v_tipo NOT IN ('general', 'solicitud', 'cumpleanos') THEN
    RAISE EXCEPTION 'invalid message type';
  END IF;

  IF v_cuerpo = '' THEN
    RAISE EXCEPTION 'message body is required';
  END IF;

  IF p_destinatario_miembro_id IS NULL AND p_destinatario_usuario_id IS NULL THEN
    RAISE EXCEPTION 'recipient is required';
  END IF;

  IF p_destinatario_miembro_id IS NOT NULL AND p_destinatario_usuario_id IS NOT NULL THEN
    RAISE EXCEPTION 'only one recipient is allowed';
  END IF;

  IF p_destinatario_miembro_id = v_miembro_id THEN
    RAISE EXCEPTION 'cannot message yourself';
  END IF;

  IF p_destinatario_miembro_id IS NOT NULL
     AND NOT public.miembro_in_club(p_destinatario_miembro_id, p_club_id) THEN
    RAISE EXCEPTION 'member does not belong to club';
  END IF;

  INSERT INTO public.mensajes (
    club_id,
    tipo,
    asunto,
    cuerpo,
    remitente_miembro_id,
    destinatario_miembro_id,
    destinatario_usuario_id
  )
  VALUES (
    p_club_id,
    v_tipo,
    v_asunto,
    v_cuerpo,
    v_miembro_id,
    p_destinatario_miembro_id,
    p_destinatario_usuario_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_mark_mensaje_leido(
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
  SET leido_at = coalesce(leido_at, now())
  WHERE id = p_mensaje_id
    AND destinatario_miembro_id = v_miembro_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_portal_list_club_birthdays(TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_list_club_directory(TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_list_mensajes(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_unread_mensaje_count(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_send_mensaje(TEXT, UUID, UUID, UUID, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_mark_mensaje_leido(TEXT, UUID) TO authenticated, anon;

-- Include birthday-calendar flag on portal club list
CREATE OR REPLACE FUNCTION public.member_portal_get_profile(p_session_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
  v_profile JSON;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired session';
  END IF;

  SELECT json_build_object(
    'id', m.id,
    'nombre', m.nombre,
    'apellido1', m.apellido1,
    'apellido2', m.apellido2,
    'nombre_opcional', m.nombre_opcional,
    'apellido_opcional', m.apellido_opcional,
    'fecha_nacimiento', m.fecha_nacimiento,
    'genero', m.genero,
    'documento', m.documento,
    'telefono', m.telefono,
    'celular', m.celular,
    'ciudad', m.ciudad,
    'direccion', m.direccion,
    'foto_url', m.foto_url,
    'estado', m.estado,
    'clubes', coalesce((
      SELECT json_agg(
        json_build_object(
          'id', c.id,
          'nombre', c.nombre,
          'tipo_id', c.tipo_id,
          'tipo_nombre', tc.nombre,
          'tipos_club', CASE
            WHEN tc.id IS NOT NULL THEN json_build_object('id', tc.id, 'nombre', tc.nombre)
            ELSE NULL
          END,
          'iglesia_id', i.id,
          'iglesia_nombre', i.nombre,
          'timezone', i.timezone,
          'calendario_cumpleanos_activo', coalesce(c.calendario_cumpleanos_activo, false)
        )
        ORDER BY i.nombre, tc.nombre NULLS LAST, c.nombre
      )
      FROM public.miembro_club mc
      JOIN public.clubes c ON c.id = mc.club_id
      JOIN public.iglesias i ON i.id = c.iglesia_id
      LEFT JOIN public.tipos_club tc ON tc.id = c.tipo_id
      WHERE mc.miembro_id = m.id
        AND c.estado = 'activo'
    ), '[]'::json),
    'iglesias', coalesce((
      SELECT json_agg(church ORDER BY church->>'nombre')
      FROM (
        SELECT json_build_object(
          'id', i.id,
          'nombre', i.nombre,
          'timezone', i.timezone
        ) AS church
        FROM public.miembro_club mc
        JOIN public.clubes c ON c.id = mc.club_id
        JOIN public.iglesias i ON i.id = c.iglesia_id
        WHERE mc.miembro_id = m.id
          AND c.estado = 'activo'
        GROUP BY i.id, i.nombre, i.timezone
      ) churches
    ), '[]'::json)
  )
  INTO v_profile
  FROM public.miembros m
  WHERE m.id = v_miembro_id;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_portal_get_profile(TEXT) TO authenticated, anon;
