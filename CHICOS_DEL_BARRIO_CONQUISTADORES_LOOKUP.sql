-- Find the Conquistadores club for Chicos del Barrio.
-- Copy the `id` column into p_club_id in CHICOS_DEL_BARRIO_CONQUISTADORES_REUNIONES_2026.sql

SELECT
  c.id,
  c.nombre AS club,
  tc.nombre AS tipo,
  i.nombre AS iglesia,
  c.estado
FROM public.clubes c
JOIN public.tipos_club tc ON tc.id = c.tipo_id
LEFT JOIN public.iglesias i ON i.id = c.iglesia_id
WHERE tc.nombre ILIKE '%conquistador%'
ORDER BY i.nombre NULLS LAST, c.nombre;
