-- =============================================================================
-- Import: Reuniones — Chicos del Barrio - Conquistadores (Agosto–Diciembre 2026)
-- Source: Calendario_Combinado_Chicos_del_Barrio_2026-version.xlsx (column C = Conquistadores)
-- Filter: meetings on or after 2026-08-21 only (34 reuniones)
-- Run in Supabase SQL Editor after PERIODO_TRABAJO_SCHEMA.sql and EVENTOS_SCHEMA.sql
-- Creates plan_reunion rows AND linked eventos rows for Calendario / Eventos.
--
-- If this script fails with "Club not found", run the lookup below first:
--
--   SELECT c.id, c.nombre AS club, tc.nombre AS tipo, i.nombre AS iglesia
--   FROM public.clubes c
--   JOIN public.tipos_club tc ON tc.id = c.tipo_id
--   LEFT JOIN public.iglesias i ON i.id = c.iglesia_id
--   WHERE tc.nombre ILIKE '%conquistador%'
--   ORDER BY i.nombre NULLS LAST, c.nombre;
--
-- Then paste the club UUID into p_club_id below (or leave NULL for auto-detect).
-- =============================================================================

BEGIN;

DO $$
DECLARE
  -- Paste club UUID from lookup query if auto-detect fails:
  p_club_id UUID := NULL;
  v_club_id UUID;
  v_club_nombre TEXT;
  v_plan_id UUID;
  v_evento_id UUID;
  v_hora TIME;
  v_nombre TEXT;
  v_lugar TEXT;
  v_synced INTEGER := 0;
  r RECORD;
BEGIN
  IF p_club_id IS NOT NULL THEN
    SELECT c.id, c.nombre INTO v_club_id, v_club_nombre
    FROM public.clubes c
    WHERE c.id = p_club_id;
  ELSE
    -- Prefer Conquistadores club under iglesia "Chicos del Barrio" (name is often just "Conquistadores").
    SELECT c.id, c.nombre INTO v_club_id, v_club_nombre
    FROM public.clubes c
    JOIN public.tipos_club tc ON tc.id = c.tipo_id
    LEFT JOIN public.iglesias i ON i.id = c.iglesia_id
    WHERE tc.nombre ILIKE '%conquistador%'
      AND COALESCE(c.estado, 'activo') = 'activo'
      AND (
        i.nombre ILIKE '%chicos%barrio%'
        OR i.nombre ILIKE '%chicos del barrio%'
        OR c.nombre ILIKE '%chicos%barrio%conquist%'
        OR c.nombre ILIKE '%chicos del barrio%conquist%'
      )
    ORDER BY
      CASE
        WHEN i.nombre ILIKE '%chicos del barrio%' THEN 0
        WHEN i.nombre ILIKE '%chicos%barrio%' THEN 1
        ELSE 2
      END,
      c.nombre
    LIMIT 1;

    -- Broader fallback: any Conquistadores club whose church or club name mentions "barrio".
    IF v_club_id IS NULL THEN
      SELECT c.id, c.nombre INTO v_club_id, v_club_nombre
      FROM public.clubes c
      JOIN public.tipos_club tc ON tc.id = c.tipo_id
      LEFT JOIN public.iglesias i ON i.id = c.iglesia_id
      WHERE tc.nombre ILIKE '%conquistador%'
        AND COALESCE(c.estado, 'activo') = 'activo'
        AND (i.nombre ILIKE '%barrio%' OR c.nombre ILIKE '%barrio%')
      ORDER BY c.nombre
      LIMIT 1;
    END IF;
  END IF;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION
      'Club not found for Chicos del Barrio - Conquistadores. Run the lookup SELECT in the script header, set p_club_id := ''your-uuid''; and re-run.';
  END IF;

  SELECT p.id INTO v_plan_id
  FROM public.plan_periodo_trabajo p
  WHERE p.club_id = v_club_id
    AND p.nombre = 'Calendario 2026 (Ago–Dic)'
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    INSERT INTO public.plan_periodo_trabajo (
      club_id, nombre, fecha_inicio, fecha_fin, num_reuniones, notas, estado
    ) VALUES (
      v_club_id,
      'Calendario 2026 (Ago–Dic)',
      DATE '2026-08-22',
      DATE '2026-12-13',
      34,
      'Importado desde Calendario Combinado Chicos del Barrio 2026 (desde 2026-08-21)',
      'activo'
    )
    RETURNING id INTO v_plan_id;
  ELSE
    UPDATE public.plan_periodo_trabajo
    SET
      fecha_inicio = DATE '2026-08-22',
      fecha_fin = DATE '2026-12-13',
      num_reuniones = 34,
      notas = 'Importado desde Calendario Combinado Chicos del Barrio 2026 (desde 2026-08-21)',
      estado = 'activo',
      updated_at = now()
    WHERE id = v_plan_id;
  END IF;

  DELETE FROM public.plan_reunion WHERE plan_id = v_plan_id;

  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 1, 'Reunión 3:00 p.m.', DATE '2026-08-22', TIME '15:00', 'Sábado — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 2, 'Reunión 9:00 a.m.', DATE '2026-08-23', TIME '09:00', 'Domingo');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 3, 'Reunión 3:00 p.m.', DATE '2026-08-29', TIME '15:00', 'Sábado');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 4, 'Caminata al Barva?', DATE '2026-08-30', NULL, 'Domingo');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 5, 'Reunión 3:00 p.m. / Conqui-Guías 6:00pm', DATE '2026-09-05', TIME '15:00', 'Sábado — Buscar lugar alternativo - Bible journaling');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 6, 'Reunión asincrónica', DATE '2026-09-06', NULL, 'Domingo — Feria de salud');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 7, 'Libre', DATE '2026-09-12', NULL, 'Sábado — Libre Conquistadores');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 8, 'Libre / Ventas GMs', DATE '2026-09-13', NULL, 'Domingo — Libre Conquistadores');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 9, 'Programa Día del Conquistador', DATE '2026-09-19', NULL, 'Sábado — Práctica viernes de noche?');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 10, 'Día del Conquistador', DATE '2026-09-20', NULL, 'Domingo — Actividad zonal');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 11, 'Reunión asincrónica', DATE '2026-09-26', NULL, 'Sábado — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 12, 'Reunión asincrónica', DATE '2026-09-27', NULL, 'Domingo — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 13, 'Reunión 3:00 p.m.', DATE '2026-10-03', TIME '15:00', 'Sábado — Buscar lugar alternativo - Bible journaling');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 14, 'Reunión 9:00 a.m.', DATE '2026-10-04', TIME '09:00', 'Domingo — Horas consejería - Guías Mayores');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 15, 'Libre', DATE '2026-10-10', NULL, 'Sábado — Libre Conquis/Guías Mayores');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 16, 'Libre', DATE '2026-10-11', NULL, 'Domingo — Libre Conquis/Guías Mayores');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 17, 'Reunión 3:00 p.m.', DATE '2026-10-17', TIME '15:00', 'Sábado — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 18, 'Ventas Conqui - Guias', DATE '2026-10-18', NULL, 'Domingo');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 19, 'Reunión 3:00 p.m. / Conqui-Guías 6:00pm', DATE '2026-10-24', TIME '15:00', 'Sábado — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 20, 'Por definir', DATE '2026-10-25', NULL, 'Domingo');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 21, 'Reunión 3:00 p.m. / Conqui-Guías 6:00pm', DATE '2026-10-31', TIME '15:00', 'Sábado — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 22, 'Reunión asincrónica', DATE '2026-11-01', NULL, 'Domingo — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 23, 'Reunión 3:00 p.m.', DATE '2026-11-07', TIME '15:00', 'Sábado — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 24, 'Reunión 9:00 a.m.', DATE '2026-11-08', TIME '09:00', 'Domingo — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 25, 'Libre', DATE '2026-11-14', NULL, 'Sábado — Libre Conquis/Guías Mayores');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 26, 'Libre', DATE '2026-11-15', NULL, 'Domingo — Libre Conquis/Guías Mayores');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 27, 'Reunión 3:00 p.m.', DATE '2026-11-21', TIME '15:00', 'Sábado — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 28, 'Reunión 9:00 a.m.', DATE '2026-11-22', TIME '09:00', 'Domingo — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 29, 'Reunión asincrónica', DATE '2026-11-28', NULL, 'Sábado — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 30, 'Reunión asincrónica', DATE '2026-11-29', NULL, 'Domingo — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 31, 'Reunión 3:00 p.m.', DATE '2026-12-05', TIME '15:00', 'Sábado — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 32, 'Reunión 9:00 a.m.', DATE '2026-12-06', TIME '09:00', 'Domingo — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 33, 'Reunión 3:00 p.m.', DATE '2026-12-12', TIME '15:00', 'Sábado — Trabajo clases progresivas');
  INSERT INTO public.plan_reunion (plan_id, numero, titulo, fecha, hora, notas)
  VALUES (v_plan_id, 34, 'Reunión 9:00 a.m.', DATE '2026-12-13', TIME '09:00', 'Domingo — Trabajo clases progresivas');

  -- Sync each dated meeting to public.eventos (Calendario / Eventos modules).
  FOR r IN
    SELECT
      pr.id,
      pr.numero,
      pr.titulo,
      pr.fecha,
      pr.hora,
      pr.notas,
      pr.lugar,
      pr.tipo_evento_id,
      pr.evento_id
    FROM public.plan_reunion pr
    WHERE pr.plan_id = v_plan_id
      AND pr.fecha IS NOT NULL
    ORDER BY pr.numero
  LOOP
    v_hora := COALESCE(r.hora, TIME '18:00');
    v_nombre := COALESCE(NULLIF(trim(r.titulo), ''), 'Reunión ' || r.numero);
    v_lugar := COALESCE(NULLIF(trim(r.lugar), ''), NULLIF(trim(v_club_nombre), ''), 'Por definir');

    IF r.evento_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.eventos e WHERE e.id = r.evento_id)
    THEN
      UPDATE public.eventos e
      SET
        club_id = v_club_id,
        nombre = v_nombre,
        fecha = r.fecha,
        hora = v_hora,
        lugar = v_lugar,
        descripcion = r.notas,
        tipo_evento_id = r.tipo_evento_id,
        requiere_confirmacion = false,
        estado = 'activo',
        updated_at = now()
      WHERE e.id = r.evento_id;
      v_evento_id := r.evento_id;
    ELSE
      INSERT INTO public.eventos (
        club_id, nombre, fecha, hora, lugar, descripcion,
        tipo_evento_id, requiere_confirmacion, estado
      )
      VALUES (
        v_club_id, v_nombre, r.fecha, v_hora, v_lugar, r.notas,
        r.tipo_evento_id, false, 'activo'
      )
      RETURNING id INTO v_evento_id;

      UPDATE public.plan_reunion
      SET evento_id = v_evento_id, updated_at = now()
      WHERE id = r.id;
    END IF;

    v_synced := v_synced + 1;
  END LOOP;

  RAISE NOTICE 'Plan % — % reuniones, % eventos synced for club %', v_plan_id, 34, v_synced, v_club_id;
END $$;

COMMIT;
