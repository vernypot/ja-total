-- =============================================================================
-- Especialidad: Semillas (+ Semillas - Avanzado)
-- Source: AY Honors / Estudio de la naturaleza — Asociación General, Edición 2002
--         (Clubes/Semillas.pdf)
-- Prerequisite: ESPECIALIDADES_IMPORT_ESTUDIO_NATURALEZA.sql or
--               ESPECIALIDADES_IMPORT_GUIASMAYORES.sql
-- Idempotent: replaces requirements for each matching catalog honor name
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Semillas (honor base)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_esp RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_esp IN
    SELECT e.id
    FROM public.especialidades e
    WHERE lower(trim(e.nombre)) = lower(trim('Semillas'))
    ORDER BY e.club_tipo, e.id
  LOOP
    DELETE FROM public.especialidad_requisitos
    WHERE especialidad_id = v_esp.id;

    INSERT INTO public.especialidad_requisitos (especialidad_id, descripcion, estado) VALUES
      (
        v_esp.id,
        '1. ¿Cuál es el objetivo principal de la semilla?',
        'activo'
      ),
      (
        v_esp.id,
        '2. ¿Cuáles alimentos fueron dados por primera vez al hombre en el Jardín del Edén?',
        'activo'
      ),
      (
        v_esp.id,
        '3. Identificar una semilla o el dibujo y conocer la finalidad de cada una de estas partes de una semilla: tegumento, cotiledón y embrión.',
        'activo'
      ),
      (
        v_esp.id,
        '4. Decir de memoria cuatro diferentes métodos con los cuales se esparcen las semillas. Nombrar tres tipos de plantas cuyas semillas son esparcidas por cada método.',
        'activo'
      ),
      (
        v_esp.id,
        '5. Mencionar de memoria diez tipos de semillas que utilizamos para la alimentación.',
        'activo'
      ),
      (
        v_esp.id,
        '6. Mencionar de memoria cinco clases de semillas que se utilizan como fuentes de aceite.',
        'activo'
      ),
      (
        v_esp.id,
        '7. Mencionar de memoria cinco clases de semillas que se utilizan para las especias.',
        'activo'
      ),
      (
        v_esp.id,
        '8. ¿Qué condiciones son necesarias para que una semilla brote?',
        'activo'
      ),
      (
        v_esp.id,
        '9. Hacer una colección de 30 diferentes tipos de semillas, de los cuales sólo diez se pueden obtener de los paquetes de semillas comerciales; los otros 20 debes recolectarlos tú mismo. Etiquetar cada tipo con: nombre de la semilla, fecha recolectada, ubicación donde la recogiste y nombre del coleccionista.',
        'activo'
      );

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No especialidad named "Semillas" found. Run ESPECIALIDADES_IMPORT_ESTUDIO_NATURALEZA.sql or ESPECIALIDADES_IMPORT_GUIASMAYORES.sql first.';
  END IF;

  RAISE NOTICE 'Inserted 9 requirements for % Semillas honor row(s).', v_count;
END $$;

-- ---------------------------------------------------------------------------
-- Semillas - Avanzado
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_esp RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_esp IN
    SELECT e.id
    FROM public.especialidades e
    WHERE lower(trim(e.nombre)) = lower(trim('Semillas - Avanzado'))
    ORDER BY e.club_tipo, e.id
  LOOP
    DELETE FROM public.especialidad_requisitos
    WHERE especialidad_id = v_esp.id;

    INSERT INTO public.especialidad_requisitos (especialidad_id, descripcion, estado) VALUES
      (
        v_esp.id,
        '1. Tener la especialidad de Semillas.',
        'activo'
      ),
      (
        v_esp.id,
        '2. Identificar a partir de dibujos y conocer la finalidad de cada una de las siguientes partes de una semilla: endospermo, radículo, plúmula y micrópilo.',
        'activo'
      ),
      (
        v_esp.id,
        '3. Conocer varias diferencias entre una semilla monocotiledón y una dicotiledón, y dar tres ejemplos de cada una de ellas.',
        'activo'
      ),
      (
        v_esp.id,
        '4. Explicar el objetivo y el uso de un probador de semillas (semillas en papel húmedo). Utilízalo para probar la germinación de 100 semillas de una planta silvestre y 100 semillas de una planta doméstica. Informar sobre los resultados de cada prueba.',
        'activo'
      ),
      (
        v_esp.id,
        '5. ¿En qué se diferencian una semilla de una espora?',
        'activo'
      ),
      (
        v_esp.id,
        '6. Escribir o decir por vía oral dos lecciones espirituales que se pueden aprender a partir de las semillas (consultar Palabras de vida del gran Maestro, Elena G. de White, págs. 16–42).',
        'activo'
      ),
      (
        v_esp.id,
        '7. Hacer una colección de 60 diferentes tipos de semillas, de los cuales sólo 15 podrán ser tomadas de paquetes de semillas comerciales; los otros 45 debes recolectarlos tú mismo. Etiquetar cada tipo con: nombre de la semilla, fecha de recolección, ubicación donde fue recogida y nombre del colector.',
        'activo'
      ),
      (
        v_esp.id,
        '8. Tener en tu colección cuatro tipos de semillas de cada una de dos familias de plantas, mostrando similitud entre las semillas de plantas de una misma familia.',
        'activo'
      );

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No especialidad named "Semillas - Avanzado" found. Run ESPECIALIDADES_IMPORT_ESTUDIO_NATURALEZA.sql or ESPECIALIDADES_IMPORT_GUIASMAYORES.sql first.';
  END IF;

  RAISE NOTICE 'Inserted 8 requirements for % Semillas - Avanzado honor row(s).', v_count;
END $$;

COMMIT;
