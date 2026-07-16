-- =============================================================================
-- Member progressive classes taken previously or outside the app (no requisitos)
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: public.miembros, public.clubes, public.clases_progresivas
--               MIEMBRO_CLASE_PROGRESIVA_RLS_FIX.sql (user_can_manage_miembro)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.miembro_clase_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id UUID NOT NULL
    REFERENCES public.miembros(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  clase_progresiva_id UUID
    REFERENCES public.clases_progresivas(id) ON DELETE SET NULL,
  club_id UUID
    REFERENCES public.clubes(id) ON DELETE SET NULL,
  club_nombre TEXT,
  estado_progreso VARCHAR(20),
  fecha_completado DATE,
  tiene_investidura BOOLEAN NOT NULL DEFAULT false,
  investidura_fecha DATE,
  investidura_lugar TEXT,
  investidura_validado_por_nombre TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT miembro_clase_historial_nombre_check CHECK (char_length(trim(nombre)) > 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'miembro_clase_historial_estado_progreso_check'
  ) THEN
    ALTER TABLE public.miembro_clase_historial
      ADD CONSTRAINT miembro_clase_historial_estado_progreso_check
      CHECK (
        estado_progreso IS NULL
        OR estado_progreso IN (
          'sin_iniciar',
          'en_progreso',
          'incompleta',
          'completada',
          'investida'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_miembro_clase_historial_miembro
  ON public.miembro_clase_historial (miembro_id);

CREATE INDEX IF NOT EXISTS idx_miembro_clase_historial_clase
  ON public.miembro_clase_historial (clase_progresiva_id)
  WHERE clase_progresiva_id IS NOT NULL;

COMMENT ON TABLE public.miembro_clase_historial IS
  'Historical or external progressive class records for a member. No requisitos tracking.';

ALTER TABLE public.miembro_clase_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS miembro_clase_historial_select ON public.miembro_clase_historial;
CREATE POLICY miembro_clase_historial_select ON public.miembro_clase_historial
  FOR SELECT TO authenticated
  USING (public.user_can_access_miembro(miembro_id));

DROP POLICY IF EXISTS miembro_clase_historial_write ON public.miembro_clase_historial;
CREATE POLICY miembro_clase_historial_write ON public.miembro_clase_historial
  FOR ALL TO authenticated
  USING (public.user_can_manage_miembro(miembro_id))
  WITH CHECK (public.user_can_manage_miembro(miembro_id));
