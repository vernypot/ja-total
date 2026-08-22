-- =============================================================================
-- Sync plan reuniones → club eventos (Calendario / Eventos pages)
-- Run after CHICOS_DEL_BARRIO_CONQUISTADORES_REUNIONES_2026.sql
--
-- The app only shows meetings on the calendar once plan_reunion.evento_id is set
-- and a matching row exists in public.eventos (same as saving a meeting in Planificación).
--
-- If lookup fails, set p_club_id from CHICOS_DEL_BARRIO_CONQUISTADORES_LOOKUP.sql
-- =============================================================================

BEGIN;

DO $$
DECLARE
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
      'Club not found. Set p_club_id from CHICOS_DEL_BARRIO_CONQUISTADORES_LOOKUP.sql and re-run.';
  END IF;

  SELECT p.id INTO v_plan_id
  FROM public.plan_periodo_trabajo p
  WHERE p.club_id = v_club_id
    AND p.nombre = 'Calendario 2026 (Ago–Dic)'
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan "Calendario 2026 (Ago–Dic)" not found for club %. Run reuniones import first.', v_club_id;
  END IF;

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
        club_id,
        nombre,
        fecha,
        hora,
        lugar,
        descripcion,
        tipo_evento_id,
        requiere_confirmacion,
        estado
      )
      VALUES (
        v_club_id,
        v_nombre,
        r.fecha,
        v_hora,
        v_lugar,
        r.notas,
        r.tipo_evento_id,
        false,
        'activo'
      )
      RETURNING id INTO v_evento_id;

      UPDATE public.plan_reunion
      SET evento_id = v_evento_id, updated_at = now()
      WHERE id = r.id;
    END IF;

    v_synced := v_synced + 1;
  END LOOP;

  RAISE NOTICE 'Synced % meeting(s) to eventos for club % (plan %)', v_synced, v_club_id, v_plan_id;
END $$;

COMMIT;

-- Verify:
-- SELECT pr.numero, pr.titulo, pr.fecha, pr.evento_id, e.nombre, e.estado
-- FROM plan_reunion pr
-- LEFT JOIN eventos e ON e.id = pr.evento_id
-- WHERE pr.plan_id = (SELECT id FROM plan_periodo_trabajo WHERE nombre = 'Calendario 2026 (Ago–Dic)' LIMIT 1)
-- ORDER BY pr.numero;
