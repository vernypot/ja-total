-- =============================================================================
-- Tipos de evento + eventos extensions (tipo, confirmación de asistencia)
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: EVENTOS_SCHEMA.sql
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.tipos_evento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tipos_evento_orden ON public.tipos_evento(orden);
CREATE INDEX IF NOT EXISTS idx_tipos_evento_estado ON public.tipos_evento(estado);

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS tipo_evento_id UUID
    REFERENCES public.tipos_evento(id) ON DELETE SET NULL;

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS requiere_confirmacion BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_eventos_tipo_evento_id ON public.eventos(tipo_evento_id);

ALTER TABLE public.evento_miembro
  ADD COLUMN IF NOT EXISTS confirmacion_estado VARCHAR(20) NOT NULL DEFAULT 'pendiente';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'evento_miembro_confirmacion_estado_check'
      AND conrelid = 'public.evento_miembro'::regclass
  ) THEN
    ALTER TABLE public.evento_miembro
      ADD CONSTRAINT evento_miembro_confirmacion_estado_check
      CHECK (confirmacion_estado IN ('pendiente', 'confirmado', 'rechazado'));
  END IF;
END $$;

ALTER TABLE public.evento_miembro
  ADD COLUMN IF NOT EXISTS confirmado_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_evento_miembro_confirmacion
  ON public.evento_miembro(confirmacion_estado);

-- Seed common types (idempotent by nombre)
INSERT INTO public.tipos_evento (nombre, descripcion, orden, estado)
SELECT v.nombre, v.descripcion, v.orden, 'activo'
FROM (VALUES
  ('Reunión regular', 'Reunión semanal o periódica del club', 1),
  ('Investidura', 'Ceremonia de investidura o promoción de clases', 2),
  ('Camporee', 'Campamento o actividad al aire libre', 3),
  ('Capacitación', 'Entrenamiento para líderes o miembros', 4),
  ('Actividad social', 'Integración, servicio comunitario u otra actividad', 5),
  ('Otro', 'Otro tipo de evento', 99)
) AS v(nombre, descripcion, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tipos_evento t WHERE lower(trim(t.nombre)) = lower(trim(v.nombre))
);

-- ---------------------------------------------------------------------------
-- RLS: tipos_evento (catalog readable by authenticated; writes for admins)
-- ---------------------------------------------------------------------------

ALTER TABLE public.tipos_evento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tipos_evento_select ON public.tipos_evento;
CREATE POLICY tipos_evento_select ON public.tipos_evento
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS tipos_evento_write ON public.tipos_evento;
CREATE POLICY tipos_evento_write ON public.tipos_evento
  FOR ALL TO authenticated
  USING (public.is_usuarios_admin() OR public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_admin() OR public.is_usuarios_superadmin());

-- ---------------------------------------------------------------------------
-- Helper: active club member ids
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.active_club_member_ids(p_club_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(mc.miembro_id), '{}')
  FROM public.miembro_club mc
  JOIN public.miembros m ON m.id = mc.miembro_id
  WHERE mc.club_id = p_club_id
    AND coalesce(m.estado, 'activo') = 'activo';
$$;

GRANT EXECUTE ON FUNCTION public.active_club_member_ids(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: create evento (updated)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.admin_create_evento(UUID, DATE, TIME, TEXT, TEXT, UUID[]);

CREATE OR REPLACE FUNCTION public.admin_create_evento(
  p_club_id UUID,
  p_fecha DATE,
  p_hora TIME,
  p_lugar TEXT,
  p_nombre TEXT DEFAULT NULL,
  p_miembro_ids UUID[] DEFAULT NULL,
  p_tipo_evento_id UUID DEFAULT NULL,
  p_requiere_confirmacion BOOLEAN DEFAULT TRUE
)
RETURNS public.eventos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.eventos;
  v_miembro_id UUID;
  v_miembro_ids UUID[];
  v_confirmacion TEXT;
BEGIN
  IF NOT public.user_can_manage_club(p_club_id) THEN
    RAISE EXCEPTION 'permission denied for admin_create_evento';
  END IF;

  IF coalesce(p_requiere_confirmacion, true) THEN
    IF p_miembro_ids IS NULL OR coalesce(array_length(p_miembro_ids, 1), 0) = 0 THEN
      v_miembro_ids := public.active_club_member_ids(p_club_id);
    ELSE
      v_miembro_ids := p_miembro_ids;
    END IF;
    v_confirmacion := 'pendiente';
  ELSE
    v_miembro_ids := '{}';
    v_confirmacion := 'pendiente';
  END IF;

  INSERT INTO public.eventos (
    club_id, nombre, fecha, hora, lugar, tipo_evento_id, requiere_confirmacion
  )
  VALUES (
    p_club_id,
    nullif(trim(coalesce(p_nombre, '')), ''),
    p_fecha,
    p_hora,
    trim(p_lugar),
    p_tipo_evento_id,
    coalesce(p_requiere_confirmacion, true)
  )
  RETURNING * INTO result;

  FOREACH v_miembro_id IN ARRAY coalesce(v_miembro_ids, '{}')
  LOOP
    IF coalesce(p_requiere_confirmacion, true)
      AND EXISTS (
        SELECT 1
        FROM public.miembro_club mc
        JOIN public.miembros m ON m.id = mc.miembro_id
        WHERE mc.club_id = p_club_id
          AND mc.miembro_id = v_miembro_id
          AND coalesce(m.estado, 'activo') = 'activo'
      )
    THEN
      INSERT INTO public.evento_miembro (evento_id, miembro_id, confirmacion_estado)
      VALUES (result.id, v_miembro_id, v_confirmacion)
      ON CONFLICT (evento_id, miembro_id) DO UPDATE SET
        confirmacion_estado = EXCLUDED.confirmacion_estado;
    END IF;
  END LOOP;

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
  v_requiere_confirmacion BOOLEAN;
  v_confirmacion TEXT;
  v_miembro_id UUID;
  v_count INTEGER := 0;
BEGIN
  IF NOT public.user_can_manage_evento(p_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_assign_evento_miembros';
  END IF;

  SELECT club_id, coalesce(requiere_confirmacion, true)
  INTO v_club_id, v_requiere_confirmacion
  FROM public.eventos
  WHERE id = p_evento_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  IF NOT v_requiere_confirmacion THEN
    RETURN 0;
  END IF;

  v_confirmacion := 'pendiente';

  FOREACH v_miembro_id IN ARRAY coalesce(p_miembro_ids, '{}')
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.miembro_club mc
      JOIN public.miembros m ON m.id = mc.miembro_id
      WHERE mc.club_id = v_club_id
        AND mc.miembro_id = v_miembro_id
        AND coalesce(m.estado, 'activo') = 'activo'
    ) THEN
      INSERT INTO public.evento_miembro (evento_id, miembro_id, confirmacion_estado)
      VALUES (p_evento_id, v_miembro_id, v_confirmacion)
      ON CONFLICT (evento_id, miembro_id) DO NOTHING;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_evento_confirmacion(
  p_evento_miembro_id UUID,
  p_confirmacion_estado TEXT
)
RETURNS public.evento_miembro
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.evento_miembro;
  v_evento_id UUID;
BEGIN
  IF p_confirmacion_estado NOT IN ('pendiente', 'confirmado', 'rechazado') THEN
    RAISE EXCEPTION 'invalid confirmation status';
  END IF;

  SELECT em.evento_id INTO v_evento_id
  FROM public.evento_miembro em
  WHERE em.id = p_evento_miembro_id;

  IF v_evento_id IS NULL THEN
    RAISE EXCEPTION 'event member assignment not found';
  END IF;

  IF NOT public.user_can_manage_evento(v_evento_id) THEN
    RAISE EXCEPTION 'permission denied for admin_set_evento_confirmacion';
  END IF;

  UPDATE public.evento_miembro
  SET
    confirmacion_estado = p_confirmacion_estado,
    confirmado_at = CASE
      WHEN p_confirmacion_estado IN ('confirmado', 'rechazado') THEN now()
      ELSE NULL
    END
  WHERE id = p_evento_miembro_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_evento(UUID, DATE, TIME, TEXT, TEXT, UUID[], UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_evento_confirmacion(UUID, TEXT) TO authenticated;

-- Allow updating member assignment confirmation
DROP POLICY IF EXISTS evento_miembro_update ON public.evento_miembro;
CREATE POLICY evento_miembro_update ON public.evento_miembro
  FOR UPDATE TO authenticated
  USING (public.user_can_manage_evento(evento_id))
  WITH CHECK (public.user_can_manage_evento(evento_id));

COMMIT;
