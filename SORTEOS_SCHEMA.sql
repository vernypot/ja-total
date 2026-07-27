-- =============================================================================
-- Sorteos (raffles): eligibility lists for external drawing + winner recording
-- Run in Supabase SQL Editor after NOTICIAS_SCHEMA.sql, EVENTOS_SCHEMA.sql,
-- and USUARIO_APP_USAGE.sql (member login events for login-period sorteos)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.miembro_noticia_leida (
  noticia_id UUID NOT NULL REFERENCES public.noticias(id) ON DELETE CASCADE,
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  leido_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (noticia_id, miembro_id)
);

CREATE INDEX IF NOT EXISTS idx_miembro_noticia_leida_miembro
  ON public.miembro_noticia_leida(miembro_id, leido_at DESC);

ALTER TABLE public.miembro_noticia_leida ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_noticia_leida_deny_all ON public.miembro_noticia_leida;
CREATE POLICY miembro_noticia_leida_deny_all ON public.miembro_noticia_leida
  FOR ALL TO authenticated, anon
  USING (false)
  WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.sorteos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iglesia_id UUID NOT NULL REFERENCES public.iglesias(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'asistencia_evento',
    'login_periodo',
    'noticia_leida',
    'personalizado'
  )),
  estado TEXT NOT NULL DEFAULT 'abierto'
    CHECK (estado IN ('abierto', 'cerrado')),
  cantidad_ganadores INT NOT NULL DEFAULT 1 CHECK (cantidad_ganadores >= 1),
  evento_id UUID REFERENCES public.eventos(id) ON DELETE SET NULL,
  login_desde TIMESTAMPTZ,
  login_hasta TIMESTAMPTZ,
  noticia_id UUID REFERENCES public.noticias(id) ON DELETE SET NULL,
  club_id UUID REFERENCES public.clubes(id) ON DELETE SET NULL,
  cerrado_at TIMESTAMPTZ,
  comentarios_cierre TEXT,
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sorteos_tipo_criteria_check CHECK (
    (tipo = 'asistencia_evento' AND evento_id IS NOT NULL)
    OR (tipo = 'login_periodo' AND login_desde IS NOT NULL AND login_hasta IS NOT NULL)
    OR (tipo = 'noticia_leida' AND noticia_id IS NOT NULL)
    OR (tipo = 'personalizado')
  )
);

CREATE INDEX IF NOT EXISTS idx_sorteos_iglesia ON public.sorteos(iglesia_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sorteos_estado ON public.sorteos(estado);

CREATE TABLE IF NOT EXISTS public.sorteo_participantes (
  sorteo_id UUID NOT NULL REFERENCES public.sorteos(id) ON DELETE CASCADE,
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  origen TEXT NOT NULL DEFAULT 'auto' CHECK (origen IN ('auto', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sorteo_id, miembro_id)
);

CREATE INDEX IF NOT EXISTS idx_sorteo_participantes_miembro
  ON public.sorteo_participantes(miembro_id);

CREATE TABLE IF NOT EXISTS public.sorteo_ganadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sorteo_id UUID NOT NULL REFERENCES public.sorteos(id) ON DELETE CASCADE,
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  orden INT NOT NULL DEFAULT 1 CHECK (orden >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sorteo_id, miembro_id),
  UNIQUE (sorteo_id, orden)
);

ALTER TABLE public.sorteos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sorteo_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sorteo_ganadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sorteos_select ON public.sorteos;
CREATE POLICY sorteos_select ON public.sorteos
  FOR SELECT TO authenticated
  USING (public.user_can_access_iglesia(iglesia_id));

DROP POLICY IF EXISTS sorteos_manage ON public.sorteos;
CREATE POLICY sorteos_manage ON public.sorteos
  FOR ALL TO authenticated
  USING (public.user_can_manage_iglesia(iglesia_id))
  WITH CHECK (public.user_can_manage_iglesia(iglesia_id));

DROP POLICY IF EXISTS sorteo_participantes_select ON public.sorteo_participantes;
CREATE POLICY sorteo_participantes_select ON public.sorteo_participantes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sorteos s
      WHERE s.id = sorteo_id
        AND public.user_can_access_iglesia(s.iglesia_id)
    )
  );

DROP POLICY IF EXISTS sorteo_participantes_manage ON public.sorteo_participantes;
CREATE POLICY sorteo_participantes_manage ON public.sorteo_participantes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sorteos s
      WHERE s.id = sorteo_id
        AND public.user_can_manage_iglesia(s.iglesia_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sorteos s
      WHERE s.id = sorteo_id
        AND public.user_can_manage_iglesia(s.iglesia_id)
    )
  );

DROP POLICY IF EXISTS sorteo_ganadores_select ON public.sorteo_ganadores;
CREATE POLICY sorteo_ganadores_select ON public.sorteo_ganadores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sorteos s
      WHERE s.id = sorteo_id
        AND public.user_can_access_iglesia(s.iglesia_id)
    )
  );

DROP POLICY IF EXISTS sorteo_ganadores_manage ON public.sorteo_ganadores;
CREATE POLICY sorteo_ganadores_manage ON public.sorteo_ganadores
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sorteos s
      WHERE s.id = sorteo_id
        AND public.user_can_manage_iglesia(s.iglesia_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sorteos s
      WHERE s.id = sorteo_id
        AND public.user_can_manage_iglesia(s.iglesia_id)
    )
  );

CREATE OR REPLACE FUNCTION public.sorteo_miembro_in_iglesia(
  p_miembro_id UUID,
  p_iglesia_id UUID
)
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
    JOIN public.miembros m ON m.id = mc.miembro_id
    WHERE mc.miembro_id = p_miembro_id
      AND c.iglesia_id = p_iglesia_id
      AND coalesce(m.estado, 'activo') = 'activo'
  );
$$;

CREATE OR REPLACE FUNCTION public.sorteo_resolve_participante_ids(
  p_tipo TEXT,
  p_iglesia_id UUID,
  p_evento_id UUID DEFAULT NULL,
  p_login_desde TIMESTAMPTZ DEFAULT NULL,
  p_login_hasta TIMESTAMPTZ DEFAULT NULL,
  p_noticia_id UUID DEFAULT NULL,
  p_manual_ids UUID[] DEFAULT NULL
)
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids UUID[];
BEGIN
  IF p_tipo = 'asistencia_evento' THEN
    SELECT coalesce(array_agg(DISTINCT em.miembro_id), '{}'::UUID[])
    INTO v_ids
    FROM public.evento_miembro em
    JOIN public.evento_asistencia ea ON ea.evento_miembro_id = em.id
    JOIN public.eventos e ON e.id = em.evento_id
    JOIN public.clubes c ON c.id = e.club_id
    JOIN public.miembros m ON m.id = em.miembro_id
    WHERE em.evento_id = p_evento_id
      AND c.iglesia_id = p_iglesia_id
      AND ea.estado IN ('a_tiempo', 'tarde')
      AND coalesce(m.estado, 'activo') = 'activo';

  ELSIF p_tipo = 'login_periodo' THEN
    SELECT coalesce(array_agg(DISTINCT e.miembro_id), '{}'::UUID[])
    INTO v_ids
    FROM public.miembro_portal_login_events e
    JOIN public.miembros m ON m.id = e.miembro_id
    WHERE e.logged_in_at >= p_login_desde
      AND e.logged_in_at <= p_login_hasta
      AND coalesce(m.estado, 'activo') = 'activo'
      AND public.sorteo_miembro_in_iglesia(e.miembro_id, p_iglesia_id);

  ELSIF p_tipo = 'noticia_leida' THEN
    SELECT coalesce(array_agg(DISTINCT ml.miembro_id), '{}'::UUID[])
    INTO v_ids
    FROM public.miembro_noticia_leida ml
    JOIN public.noticias n ON n.id = ml.noticia_id
    JOIN public.miembros m ON m.id = ml.miembro_id
    WHERE ml.noticia_id = p_noticia_id
      AND n.iglesia_id = p_iglesia_id
      AND coalesce(m.estado, 'activo') = 'activo';

  ELSIF p_tipo = 'personalizado' THEN
    SELECT coalesce(array_agg(DISTINCT mid), '{}'::UUID[])
    INTO v_ids
    FROM unnest(coalesce(p_manual_ids, '{}'::UUID[])) AS mid
    WHERE public.sorteo_miembro_in_iglesia(mid, p_iglesia_id);
  ELSE
    v_ids := '{}'::UUID[];
  END IF;

  RETURN v_ids;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_preview_sorteo_participantes(
  p_tipo TEXT,
  p_iglesia_id UUID,
  p_evento_id UUID DEFAULT NULL,
  p_login_desde TIMESTAMPTZ DEFAULT NULL,
  p_login_hasta TIMESTAMPTZ DEFAULT NULL,
  p_noticia_id UUID DEFAULT NULL,
  p_manual_ids UUID[] DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids UUID[];
  v_result JSON;
BEGIN
  IF NOT public.user_can_manage_iglesia(p_iglesia_id) THEN
    RAISE EXCEPTION 'permission denied for admin_preview_sorteo_participantes';
  END IF;

  v_ids := public.sorteo_resolve_participante_ids(
    p_tipo,
    p_iglesia_id,
    p_evento_id,
    p_login_desde,
    p_login_hasta,
    p_noticia_id,
    p_manual_ids
  );

  SELECT coalesce(json_agg(row_data ORDER BY sort_name), '[]'::json)
  INTO v_result
  FROM (
    SELECT
      json_build_object(
        'miembro_id', m.id,
        'nombre', m.nombre,
        'apellido1', m.apellido1,
        'apellido2', m.apellido2
      ) AS row_data,
      coalesce(m.nombre, m.apellido1, m.apellido2, m.id::TEXT) AS sort_name
    FROM public.miembros m
    WHERE m.id = ANY(v_ids)
  ) scoped;

  RETURN json_build_object(
    'count', coalesce(array_length(v_ids, 1), 0),
    'participantes', coalesce(v_result, '[]'::json)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_sorteo(
  p_id UUID,
  p_iglesia_id UUID,
  p_titulo TEXT,
  p_descripcion TEXT,
  p_tipo TEXT,
  p_cantidad_ganadores INT,
  p_evento_id UUID,
  p_login_desde TIMESTAMPTZ,
  p_login_hasta TIMESTAMPTZ,
  p_noticia_id UUID,
  p_club_id UUID,
  p_manual_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sorteo_id UUID;
  v_ids UUID[];
  v_miembro_id UUID;
BEGIN
  IF NOT public.user_can_manage_iglesia(p_iglesia_id) THEN
    RAISE EXCEPTION 'permission denied for admin_save_sorteo';
  END IF;

  IF coalesce(p_cantidad_ganadores, 1) < 1 THEN
    RAISE EXCEPTION 'cantidad_ganadores must be at least 1';
  END IF;

  v_ids := public.sorteo_resolve_participante_ids(
    p_tipo,
    p_iglesia_id,
    p_evento_id,
    p_login_desde,
    p_login_hasta,
    p_noticia_id,
    p_manual_ids
  );

  IF p_id IS NULL THEN
    INSERT INTO public.sorteos (
      iglesia_id,
      titulo,
      descripcion,
      tipo,
      cantidad_ganadores,
      evento_id,
      login_desde,
      login_hasta,
      noticia_id,
      club_id,
      created_by
    )
    VALUES (
      p_iglesia_id,
      trim(p_titulo),
      nullif(trim(p_descripcion), ''),
      p_tipo,
      coalesce(p_cantidad_ganadores, 1),
      p_evento_id,
      p_login_desde,
      p_login_hasta,
      p_noticia_id,
      p_club_id,
      public.get_user_id()
    )
    RETURNING id INTO v_sorteo_id;
  ELSE
    SELECT s.id INTO v_sorteo_id
    FROM public.sorteos s
    WHERE s.id = p_id
      AND s.iglesia_id = p_iglesia_id
      AND s.estado = 'abierto';

    IF v_sorteo_id IS NULL THEN
      RAISE EXCEPTION 'sorteo not found or already closed';
    END IF;

    UPDATE public.sorteos
    SET
      titulo = trim(p_titulo),
      descripcion = nullif(trim(p_descripcion), ''),
      tipo = p_tipo,
      cantidad_ganadores = coalesce(p_cantidad_ganadores, 1),
      evento_id = p_evento_id,
      login_desde = p_login_desde,
      login_hasta = p_login_hasta,
      noticia_id = p_noticia_id,
      club_id = p_club_id,
      updated_at = now()
    WHERE id = v_sorteo_id;

    DELETE FROM public.sorteo_participantes WHERE sorteo_id = v_sorteo_id;
  END IF;

  FOREACH v_miembro_id IN ARRAY v_ids LOOP
    INSERT INTO public.sorteo_participantes (sorteo_id, miembro_id, origen)
    VALUES (
      v_sorteo_id,
      v_miembro_id,
      CASE WHEN p_tipo = 'personalizado' THEN 'manual' ELSE 'auto' END
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN v_sorteo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_close_sorteo(
  p_sorteo_id UUID,
  p_comentarios TEXT,
  p_ganador_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sorteo public.sorteos;
  v_ganador_id UUID;
  v_orden INT := 0;
BEGIN
  SELECT * INTO v_sorteo
  FROM public.sorteos
  WHERE id = p_sorteo_id;

  IF v_sorteo.id IS NULL THEN
    RAISE EXCEPTION 'sorteo not found';
  END IF;

  IF NOT public.user_can_manage_iglesia(v_sorteo.iglesia_id) THEN
    RAISE EXCEPTION 'permission denied for admin_close_sorteo';
  END IF;

  IF v_sorteo.estado = 'cerrado' THEN
    RAISE EXCEPTION 'sorteo is already closed';
  END IF;

  IF coalesce(array_length(p_ganador_ids, 1), 0) > v_sorteo.cantidad_ganadores THEN
    RAISE EXCEPTION 'too many winners for this sorteo';
  END IF;

  FOREACH v_ganador_id IN ARRAY coalesce(p_ganador_ids, '{}'::UUID[]) LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.sorteo_participantes sp
      WHERE sp.sorteo_id = p_sorteo_id
        AND sp.miembro_id = v_ganador_id
    ) THEN
      RAISE EXCEPTION 'winner must be a participant of this sorteo';
    END IF;
  END LOOP;

  DELETE FROM public.sorteo_ganadores WHERE sorteo_id = p_sorteo_id;

  FOREACH v_ganador_id IN ARRAY coalesce(p_ganador_ids, '{}'::UUID[]) LOOP
    v_orden := v_orden + 1;
    INSERT INTO public.sorteo_ganadores (sorteo_id, miembro_id, orden)
    VALUES (p_sorteo_id, v_ganador_id, v_orden);
  END LOOP;

  UPDATE public.sorteos
  SET
    estado = 'cerrado',
    cerrado_at = now(),
    comentarios_cierre = nullif(trim(p_comentarios), ''),
    updated_at = now()
  WHERE id = p_sorteo_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_sorteo(p_sorteo_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sorteo public.sorteos;
  v_result JSON;
BEGIN
  SELECT * INTO v_sorteo FROM public.sorteos WHERE id = p_sorteo_id;

  IF v_sorteo.id IS NULL THEN
    RAISE EXCEPTION 'sorteo not found';
  END IF;

  IF NOT public.user_can_access_iglesia(v_sorteo.iglesia_id) THEN
    RAISE EXCEPTION 'permission denied for admin_get_sorteo';
  END IF;

  SELECT json_build_object(
    'sorteo', row_to_json(v_sorteo),
    'participantes', coalesce((
      SELECT json_agg(json_build_object(
        'miembro_id', m.id,
        'nombre', m.nombre,
        'apellido1', m.apellido1,
        'apellido2', m.apellido2,
        'origen', sp.origen
      ) ORDER BY m.nombre, m.apellido1, m.apellido2)
      FROM public.sorteo_participantes sp
      JOIN public.miembros m ON m.id = sp.miembro_id
      WHERE sp.sorteo_id = p_sorteo_id
    ), '[]'::json),
    'ganadores', coalesce((
      SELECT json_agg(json_build_object(
        'id', sg.id,
        'miembro_id', m.id,
        'nombre', m.nombre,
        'apellido1', m.apellido1,
        'apellido2', m.apellido2,
        'orden', sg.orden
      ) ORDER BY sg.orden)
      FROM public.sorteo_ganadores sg
      JOIN public.miembros m ON m.id = sg.miembro_id
      WHERE sg.sorteo_id = p_sorteo_id
    ), '[]'::json),
    'participant_count', (
      SELECT count(*)::INT
      FROM public.sorteo_participantes sp
      WHERE sp.sorteo_id = p_sorteo_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_sorteos(p_iglesia_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.user_can_access_iglesia(p_iglesia_id) THEN
    RAISE EXCEPTION 'permission denied for admin_list_sorteos';
  END IF;

  SELECT coalesce(json_agg(row_data ORDER BY created_at DESC), '[]'::json)
  INTO v_result
  FROM (
    SELECT
      json_build_object(
        'id', s.id,
        'iglesia_id', s.iglesia_id,
        'titulo', s.titulo,
        'descripcion', s.descripcion,
        'tipo', s.tipo,
        'estado', s.estado,
        'cantidad_ganadores', s.cantidad_ganadores,
        'evento_id', s.evento_id,
        'login_desde', s.login_desde,
        'login_hasta', s.login_hasta,
        'noticia_id', s.noticia_id,
        'club_id', s.club_id,
        'cerrado_at', s.cerrado_at,
        'comentarios_cierre', s.comentarios_cierre,
        'created_at', s.created_at,
        'updated_at', s.updated_at,
        'participant_count', (
          SELECT count(*)::INT
          FROM public.sorteo_participantes sp
          WHERE sp.sorteo_id = s.id
        ),
        'evento_nombre', e.nombre,
        'evento_fecha', e.fecha,
        'noticia_titulo', n.titulo
      ) AS row_data,
      s.created_at
    FROM public.sorteos s
    LEFT JOIN public.eventos e ON e.id = s.evento_id
    LEFT JOIN public.noticias n ON n.id = s.noticia_id
    WHERE s.iglesia_id = p_iglesia_id
  ) scoped;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_mark_noticia_leida(
  p_session_token TEXT,
  p_noticia_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired portal session';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.noticias n
    WHERE n.id = p_noticia_id
      AND n.estado = 'activo'
      AND (n.expira_en IS NULL OR n.expira_en >= CURRENT_DATE)
  ) THEN
    RAISE EXCEPTION 'news item not available';
  END IF;

  INSERT INTO public.miembro_noticia_leida (noticia_id, miembro_id)
  VALUES (p_noticia_id, v_miembro_id)
  ON CONFLICT (noticia_id, miembro_id) DO UPDATE
  SET leido_at = now();

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_portal_noticias_leidas(p_session_token TEXT)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
BEGIN
  v_miembro_id := public.member_portal_verify_session(p_session_token);

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired portal session';
  END IF;

  RETURN QUERY
  SELECT ml.noticia_id
  FROM public.miembro_noticia_leida ml
  WHERE ml.miembro_id = v_miembro_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sorteo_miembro_in_iglesia(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sorteo_resolve_participante_ids(TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_preview_sorteo_participantes(TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_sorteo(UUID, UUID, TEXT, TEXT, TEXT, INT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_close_sorteo(UUID, TEXT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_sorteo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_sorteos(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_portal_mark_noticia_leida(TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.member_portal_noticias_leidas(TEXT) TO authenticated, anon;
