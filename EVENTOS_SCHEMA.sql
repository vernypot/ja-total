-- =============================================================================
-- Eventos: club events, member assignments, attendance
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: USUARIOS_RLS_FIX.sql / MIEMBRO_CONTACTOS_RLS_FIX.sql (helpers)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubes(id) ON DELETE CASCADE,
  nombre TEXT,
  fecha DATE NOT NULL,  -- church-local calendar date (iglesias.timezone)
  hora TIME NOT NULL,   -- church-local wall-clock time (iglesias.timezone)
  lugar TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo', 'cancelado', 'finalizado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_club_id ON public.eventos(club_id);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON public.eventos(fecha DESC);

CREATE TABLE IF NOT EXISTS public.evento_miembro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evento_id, miembro_id)
);

CREATE INDEX IF NOT EXISTS idx_evento_miembro_evento_id ON public.evento_miembro(evento_id);
CREATE INDEX IF NOT EXISTS idx_evento_miembro_miembro_id ON public.evento_miembro(miembro_id);

CREATE TABLE IF NOT EXISTS public.evento_asistencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_miembro_id UUID NOT NULL UNIQUE
    REFERENCES public.evento_miembro(id) ON DELETE CASCADE,
  estado VARCHAR(20) NOT NULL
    CHECK (estado IN ('a_tiempo', 'tarde', 'ausente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evento_asistencia_evento_miembro_id
  ON public.evento_asistencia(evento_miembro_id);

-- ---------------------------------------------------------------------------
-- Access helpers (club-scoped)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_can_access_club(p_club_id UUID)
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
      FROM public.clubes c
      JOIN public.usuario_iglesia ui ON ui.iglesia_id = c.iglesia_id
      WHERE c.id = p_club_id
        AND ui.usuario_id = public.get_user_id()
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_club(p_club_id UUID)
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
        FROM public.clubes c
        JOIN public.usuario_iglesia ui ON ui.iglesia_id = c.iglesia_id
        WHERE c.id = p_club_id
          AND ui.usuario_id = public.get_user_id()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_evento(p_evento_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.eventos e
    WHERE e.id = p_evento_id
      AND public.user_can_access_club(e.club_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_evento(p_evento_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.eventos e
    WHERE e.id = p_evento_id
      AND public.user_can_manage_club(e.club_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_club(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_club(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_evento(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_evento(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_create_evento(
  p_club_id UUID,
  p_fecha DATE,
  p_hora TIME,
  p_lugar TEXT,
  p_nombre TEXT DEFAULT NULL,
  p_miembro_ids UUID[] DEFAULT '{}'
)
RETURNS public.eventos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.eventos;
  v_miembro_id UUID;
BEGIN
  IF NOT public.user_can_manage_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied for admin_create_evento';
  END IF;

  INSERT INTO public.eventos (club_id, nombre, fecha, hora, lugar)
  VALUES (
    p_club_id,
    nullif(trim(coalesce(p_nombre, '')), ''),
    p_fecha,
    p_hora,
    trim(p_lugar)
  )
  RETURNING * INTO result;

  FOREACH v_miembro_id IN ARRAY coalesce(p_miembro_ids, '{}')
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.miembro_club mc
      WHERE mc.club_id = p_club_id
        AND mc.miembro_id = v_miembro_id
    ) THEN
      INSERT INTO public.evento_miembro (evento_id, miembro_id)
      VALUES (result.id, v_miembro_id)
      ON CONFLICT (evento_id, miembro_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_evento_asistencia(
  p_evento_miembro_id UUID,
  p_estado TEXT
)
RETURNS public.evento_asistencia
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.evento_asistencia;
  v_evento_id UUID;
BEGIN
  IF p_estado NOT IN ('a_tiempo', 'tarde', 'ausente') THEN
    RAISE EXCEPTION 'invalid attendance status';
  END IF;

  SELECT em.evento_id INTO v_evento_id
  FROM public.evento_miembro em
  WHERE em.id = p_evento_miembro_id;

  IF v_evento_id IS NULL THEN
    RAISE EXCEPTION 'event member assignment not found';
  END IF;

  IF NOT public.user_can_manage_evento(v_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_set_evento_asistencia';
  END IF;

  INSERT INTO public.evento_asistencia (evento_miembro_id, estado)
  VALUES (p_evento_miembro_id, p_estado)
  ON CONFLICT (evento_miembro_id)
  DO UPDATE SET estado = EXCLUDED.estado, updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_evento_miembros(
  p_evento_id UUID,
  p_miembro_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_miembro_id UUID;
  v_count INTEGER := 0;
BEGIN
  IF NOT public.user_can_manage_evento(p_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_assign_evento_miembros';
  END IF;

  SELECT club_id INTO v_club_id FROM public.eventos WHERE id = p_evento_id;
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  FOREACH v_miembro_id IN ARRAY coalesce(p_miembro_ids, '{}')
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.miembro_club mc
      WHERE mc.club_id = v_club_id AND mc.miembro_id = v_miembro_id
    ) THEN
      INSERT INTO public.evento_miembro (evento_id, miembro_id)
      VALUES (p_evento_id, v_miembro_id)
      ON CONFLICT (evento_id, miembro_id) DO NOTHING;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_evento(UUID, DATE, TIME, TEXT, TEXT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_evento_asistencia(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_evento_miembros(UUID, UUID[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: eventos
-- ---------------------------------------------------------------------------

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eventos_select ON public.eventos;
DROP POLICY IF EXISTS eventos_insert ON public.eventos;
DROP POLICY IF EXISTS eventos_update ON public.eventos;
DROP POLICY IF EXISTS eventos_delete ON public.eventos;

CREATE POLICY eventos_select ON public.eventos
  FOR SELECT TO authenticated
  USING (public.user_can_access_club(club_id));

CREATE POLICY eventos_insert ON public.eventos
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_club(club_id));

CREATE POLICY eventos_update ON public.eventos
  FOR UPDATE TO authenticated
  USING (public.user_can_manage_club(club_id))
  WITH CHECK (public.user_can_manage_club(club_id));

CREATE POLICY eventos_delete ON public.eventos
  FOR DELETE TO authenticated
  USING (public.user_can_manage_club(club_id));

-- ---------------------------------------------------------------------------
-- RLS: evento_miembro
-- ---------------------------------------------------------------------------

ALTER TABLE public.evento_miembro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evento_miembro_select ON public.evento_miembro;
DROP POLICY IF EXISTS evento_miembro_insert ON public.evento_miembro;
DROP POLICY IF EXISTS evento_miembro_delete ON public.evento_miembro;

CREATE POLICY evento_miembro_select ON public.evento_miembro
  FOR SELECT TO authenticated
  USING (
    public.user_can_access_evento(evento_id)
    OR public.user_can_access_miembro(miembro_id)
  );

CREATE POLICY evento_miembro_insert ON public.evento_miembro
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_evento(evento_id));

CREATE POLICY evento_miembro_delete ON public.evento_miembro
  FOR DELETE TO authenticated
  USING (public.user_can_manage_evento(evento_id));

-- ---------------------------------------------------------------------------
-- RLS: evento_asistencia
-- ---------------------------------------------------------------------------

ALTER TABLE public.evento_asistencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evento_asistencia_select ON public.evento_asistencia;
DROP POLICY IF EXISTS evento_asistencia_insert ON public.evento_asistencia;
DROP POLICY IF EXISTS evento_asistencia_update ON public.evento_asistencia;

CREATE POLICY evento_asistencia_select ON public.evento_asistencia
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.evento_miembro em
      WHERE em.id = evento_miembro_id
        AND (
          public.user_can_access_evento(em.evento_id)
          OR public.user_can_access_miembro(em.miembro_id)
        )
    )
  );

CREATE POLICY evento_asistencia_insert ON public.evento_asistencia
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.evento_miembro em
      WHERE em.id = evento_miembro_id
        AND public.user_can_manage_evento(em.evento_id)
    )
  );

CREATE POLICY evento_asistencia_update ON public.evento_asistencia
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.evento_miembro em
      WHERE em.id = evento_miembro_id
        AND public.user_can_manage_evento(em.evento_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.evento_miembro em
      WHERE em.id = evento_miembro_id
        AND public.user_can_manage_evento(em.evento_id)
    )
  );
