-- =============================================================================
-- Especialidad: Helechos — requisitos (Pathfinder Wiki, ES)
-- Source: https://wiki.pathfindersonline.org/w/AY_Honors/Ferns/Requirements/es
-- Prerequisite: ESPECIALIDADES_IMPORT_* (honor "Helechos" in catalog)
-- Idempotent: replaces requirements for every catalog row named "Helechos"
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_esp RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_esp IN
    SELECT e.id
    FROM public.especialidades e
    WHERE lower(trim(e.nombre)) = lower(trim('Helechos'))
    ORDER BY e.club_tipo, e.id
  LOOP
    DELETE FROM public.especialidad_requisitos
    WHERE especialidad_id = v_esp.id;

    INSERT INTO public.especialidad_requisitos (especialidad_id, descripcion, estado) VALUES
      (
        v_esp.id,
        '1. ¿Cómo son los helechos diferentes de plantas con flores o los árboles?',
        'activo'
      ),
      (
        v_esp.id,
        '2. ¿Dónde está la verdadera raíz de un helecho? ¿Qué parte crece por encima del suelo? ¿Cuál es el entorno más favorable en el que los helechos crecen?',
        'activo'
      ),
      (
        v_esp.id,
        '3. ¿Cómo se reproducen los helechos? Localizar y describir tres tipos de soros (de tres tipos de helechos).',
        'activo'
      ),
      (
        v_esp.id,
        '4. ¿Cómo viajan las esporas de la planta a una nueva ubicación? ¿Cuánto tiempo tarda una espora en desarrollar una planta madura? Observar en helechos vivos o imágenes cómo un helecho joven es diferente de un helecho adulto.',
        'activo'
      ),
      (
        v_esp.id,
        '5. Conocer los usos medicinales de tres helechos.',
        'activo'
      ),
      (
        v_esp.id,
        '6. Dibujar o fotografiar 10 tipos de helechos e identificarlos correctamente.',
        'activo'
      ),
      (
        v_esp.id,
        '7. Además de los helechos comunes hay plantas conocidas como musgos y colas de caballo. Ser capaz de reconocer dos tipos de musgos y una cola de caballo. ¿Cómo son similares a los helechos?',
        'activo'
      );

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No especialidad named "Helechos" found. Run ESPECIALIDADES_IMPORT_ESTUDIO_NATURALEZA.sql or ESPECIALIDADES_IMPORT_GUIASMAYORES.sql first.';
  END IF;

  RAISE NOTICE 'Inserted 7 requirements for % Helechos honor row(s).', v_count;
END $$;

COMMIT;
