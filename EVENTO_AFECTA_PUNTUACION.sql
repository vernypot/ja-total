-- =============================================================================
-- Event flag: whether a finished event affects unit/member evaluation scores.
-- Run in Supabase SQL Editor after EVENTO_EXCLUIR_ASISTENCIA.sql and
-- UNIDADES_EVALUACION_SCORE_MATRIX.sql
-- =============================================================================

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS afecta_puntuacion BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.eventos.afecta_puntuacion IS
  'When false, attendance may still be tracked but the event is excluded from unidad/member eval scoring.';

-- Events removed from the attendance registry must not affect scoring either.
UPDATE public.eventos
SET afecta_puntuacion = false
WHERE coalesce(excluir_registro_asistencia, false) = true
  AND coalesce(afecta_puntuacion, true) = true;

-- Cancelled / inactive events never contribute to eval (app filters finalizado only).
-- Optional: disable scoring for non-meeting event types (camporee, social, etc.).
UPDATE public.eventos e
SET afecta_puntuacion = false
FROM public.tipos_evento te
WHERE e.tipo_evento_id = te.id
  AND coalesce(e.afecta_puntuacion, true) = true
  AND coalesce(e.excluir_registro_asistencia, false) = false
  AND te.nombre NOT ILIKE '%reuni%'
  AND te.nombre NOT ILIKE '%regular%';

-- Ensure regular club meetings affect scoring when still active in the registry.
UPDATE public.eventos e
SET afecta_puntuacion = true
FROM public.tipos_evento te
WHERE e.tipo_evento_id = te.id
  AND coalesce(e.excluir_registro_asistencia, false) = false
  AND (te.nombre ILIKE '%reuni%' OR te.nombre ILIKE '%regular%');

-- Events excluded from eval scoring should not require member confirmation.
UPDATE public.eventos
SET requiere_confirmacion = false
WHERE coalesce(requiere_confirmacion, true) = true
  AND (
    coalesce(afecta_puntuacion, true) = false
    OR coalesce(excluir_registro_asistencia, false) = true
  );

-- =============================================================================
-- Apply the 0–10 evaluation score matrix to existing club configs (idempotent)
-- =============================================================================

ALTER TABLE public.club_unidad_eval_config
  ADD COLUMN IF NOT EXISTS confirmado_a_tiempo_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS confirmado_a_tiempo_puntos NUMERIC(10, 2) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS confirmado_tarde_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS confirmado_tarde_puntos NUMERIC(10, 2) NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS no_confirmado_a_tiempo_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS no_confirmado_a_tiempo_puntos NUMERIC(10, 2) NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS no_confirmado_tarde_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS no_confirmado_tarde_puntos NUMERIC(10, 2) NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS confirmado_ausente_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS confirmado_ausente_puntos NUMERIC(10, 2) NOT NULL DEFAULT -8,
  ADD COLUMN IF NOT EXISTS no_confirmado_ausente_activa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS no_confirmado_ausente_puntos NUMERIC(10, 2) NOT NULL DEFAULT -5;

UPDATE public.club_unidad_eval_config
SET
  a_tiempo_puntos = CASE WHEN a_tiempo_puntos = 1 THEN 10 ELSE a_tiempo_puntos END,
  tarde_puntos = CASE WHEN tarde_puntos = 1 THEN 7 ELSE tarde_puntos END,
  ausente_injustificada_puntos = CASE WHEN ausente_injustificada_puntos = 0 THEN -5 ELSE ausente_injustificada_puntos END,
  confirmacion_puntos = CASE WHEN confirmacion_puntos = 1 THEN 10 ELSE confirmacion_puntos END
WHERE a_tiempo_puntos = 1
   OR tarde_puntos = 1
   OR ausente_injustificada_puntos = 0
   OR confirmacion_puntos = 1;

-- =============================================================================
-- Audit: review finished events and whether they would affect scoring today
-- =============================================================================

-- Summary by club
SELECT
  c.nombre AS club,
  count(*) FILTER (WHERE e.estado = 'finalizado') AS eventos_finalizados,
  count(*) FILTER (
    WHERE e.estado = 'finalizado'
      AND coalesce(e.afecta_puntuacion, true)
      AND NOT coalesce(e.excluir_registro_asistencia, false)
  ) AS cuentan_para_puntuacion,
  count(*) FILTER (
    WHERE e.estado = 'finalizado'
      AND NOT coalesce(e.afecta_puntuacion, true)
  ) AS excluidos_de_puntuacion
FROM public.eventos e
JOIN public.clubes c ON c.id = e.club_id
GROUP BY c.id, c.nombre
ORDER BY c.nombre;

-- Detail: finished events with attendance records
SELECT
  c.nombre AS club,
  e.fecha,
  e.nombre AS evento,
  coalesce(te.nombre, '—') AS tipo,
  e.estado,
  coalesce(e.afecta_puntuacion, true) AS afecta_puntuacion,
  coalesce(e.excluir_registro_asistencia, false) AS excluir_asistencia,
  count(DISTINCT em.miembro_id) AS miembros_asignados,
  count(DISTINCT ea.id) FILTER (WHERE ea.estado IN ('a_tiempo', 'tarde')) AS asistencias,
  count(DISTINCT ea.id) FILTER (WHERE coalesce(ea.estado, 'ausente') = 'ausente') AS ausencias
FROM public.eventos e
JOIN public.clubes c ON c.id = e.club_id
LEFT JOIN public.tipos_evento te ON te.id = e.tipo_evento_id
LEFT JOIN public.evento_miembro em ON em.evento_id = e.id
LEFT JOIN public.evento_asistencia ea ON ea.evento_miembro_id = em.id
WHERE e.estado = 'finalizado'
GROUP BY c.nombre, e.id, e.fecha, e.nombre, te.nombre, e.estado, e.afecta_puntuacion, e.excluir_registro_asistencia
ORDER BY e.fecha DESC, c.nombre, e.nombre;
