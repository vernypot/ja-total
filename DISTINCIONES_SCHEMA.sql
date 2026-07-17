-- =============================================================================
-- Distinciones: honors catalog + member assignments
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: USUARIOS_RLS_FIX.sql (is_usuarios_admin, user_can_manage_miembro)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.distinciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distinciones_orden ON public.distinciones(orden);
CREATE INDEX IF NOT EXISTS idx_distinciones_estado ON public.distinciones(estado);

CREATE TABLE IF NOT EXISTS public.miembro_distincion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id UUID NOT NULL REFERENCES public.miembros(id) ON DELETE CASCADE,
  distincion_id UUID NOT NULL REFERENCES public.distinciones(id) ON DELETE RESTRICT,
  club_id UUID REFERENCES public.clubes(id) ON DELETE SET NULL,
  fecha_otorgada DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (miembro_id, distincion_id)
);

CREATE INDEX IF NOT EXISTS idx_miembro_distincion_miembro ON public.miembro_distincion(miembro_id);
CREATE INDEX IF NOT EXISTS idx_miembro_distincion_distincion ON public.miembro_distincion(distincion_id);

INSERT INTO public.distinciones (nombre, descripcion, orden, estado)
SELECT v.nombre, v.descripcion, v.orden, 'activo'
FROM (VALUES
  ('Barra de Excelencia', 'Reconocimiento por excelencia en servicio y conducta', 1),
  ('Distintivo de Liderazgo', 'Reconocimiento por liderazgo destacado en el club', 2)
) AS v(nombre, descripcion, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM public.distinciones d WHERE lower(trim(d.nombre)) = lower(trim(v.nombre))
);

ALTER TABLE public.distinciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miembro_distincion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS distinciones_select ON public.distinciones;
CREATE POLICY distinciones_select ON public.distinciones
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS distinciones_write ON public.distinciones;
CREATE POLICY distinciones_write ON public.distinciones
  FOR ALL TO authenticated
  USING (public.is_usuarios_admin() OR public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_admin() OR public.is_usuarios_superadmin());

DROP POLICY IF EXISTS miembro_distincion_select ON public.miembro_distincion;
CREATE POLICY miembro_distincion_select ON public.miembro_distincion
  FOR SELECT TO authenticated
  USING (
    public.is_usuarios_admin()
    OR public.user_can_manage_miembro(miembro_id)
  );

DROP POLICY IF EXISTS miembro_distincion_write ON public.miembro_distincion;
CREATE POLICY miembro_distincion_write ON public.miembro_distincion
  FOR ALL TO authenticated
  USING (
    public.is_usuarios_admin()
    OR public.user_can_manage_miembro(miembro_id)
  )
  WITH CHECK (
    public.is_usuarios_admin()
    OR public.user_can_manage_miembro(miembro_id)
  );

CREATE OR REPLACE FUNCTION public.admin_assign_miembro_distincion(
  p_miembro_id UUID,
  p_distincion_id UUID,
  p_club_id UUID DEFAULT NULL,
  p_fecha_otorgada DATE DEFAULT CURRENT_DATE,
  p_notas TEXT DEFAULT NULL
)
RETURNS public.miembro_distincion
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.miembro_distincion;
BEGIN
  IF NOT public.is_usuarios_admin() AND NOT public.user_can_manage_miembro(p_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_assign_miembro_distincion';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.distinciones d
    WHERE d.id = p_distincion_id AND d.estado = 'activo'
  ) THEN
    RAISE EXCEPTION 'distinction not found or inactive';
  END IF;

  INSERT INTO public.miembro_distincion (
    miembro_id,
    distincion_id,
    club_id,
    fecha_otorgada,
    notas,
    estado
  )
  VALUES (
    p_miembro_id,
    p_distincion_id,
    p_club_id,
    coalesce(p_fecha_otorgada, CURRENT_DATE),
    nullif(trim(coalesce(p_notas, '')), ''),
    'activo'
  )
  ON CONFLICT (miembro_id, distincion_id) DO UPDATE
  SET
    club_id = EXCLUDED.club_id,
    fecha_otorgada = EXCLUDED.fecha_otorgada,
    notas = EXCLUDED.notas,
    estado = 'activo',
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unassign_miembro_distincion(p_link_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miembro_id UUID;
BEGIN
  SELECT miembro_id INTO v_miembro_id
  FROM public.miembro_distincion
  WHERE id = p_link_id;

  IF v_miembro_id IS NULL THEN
    RAISE EXCEPTION 'assignment not found';
  END IF;

  IF NOT public.is_usuarios_admin() AND NOT public.user_can_manage_miembro(v_miembro_id) THEN
    RAISE EXCEPTION 'permission denied for admin_unassign_miembro_distincion';
  END IF;

  DELETE FROM public.miembro_distincion WHERE id = p_link_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_assign_miembro_distincion(UUID, UUID, UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unassign_miembro_distincion(UUID) TO authenticated;
