-- =============================================================================
-- Import: Clase progresiva Compañero (Conquistadores) — División Interamericana
-- Source: https://mundoja.org/clubes/conquistadores/comp
-- Run CLASE_REQUISITOS_SECCIONES_SCHEMA.sql first
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_tipo_id UUID;
  v_clase_id UUID;
  v_sec_id UUID;
BEGIN
  SELECT id INTO v_tipo_id
  FROM public.tipos_club
  WHERE nombre ILIKE '%conquistador%'
  ORDER BY nombre
  LIMIT 1;

  IF v_tipo_id IS NULL THEN
    RAISE EXCEPTION 'No tipos_club row matching Conquistadores. Create it first or adjust the ILIKE filter.';
  END IF;

  INSERT INTO public.clases_progresivas (nombre, tipo_id, club_tipo, slug, fuente_url, orden, estado)
  VALUES (
    'Compañero',
    v_tipo_id,
    (SELECT nombre FROM public.tipos_club WHERE id = v_tipo_id),
    'conquistadores-companero',
    'https://mundoja.org/clubes/conquistadores/comp',
    2,
    'activo'
  )
  ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tipo_id = EXCLUDED.tipo_id,
    club_tipo = EXCLUDED.club_tipo,
    fuente_url = EXCLUDED.fuente_url,
    orden = EXCLUDED.orden
  RETURNING id INTO v_clase_id;

  IF v_clase_id IS NULL THEN
    SELECT id INTO v_clase_id FROM public.clases_progresivas WHERE slug = 'conquistadores-companero';
  END IF;

  DELETE FROM public.clase_requisitos WHERE clase_id = v_clase_id;
  DELETE FROM public.clase_requisito_secciones WHERE clase_id = v_clase_id;

  -- =========================================================================
  -- Requisitos Básicos
  -- =========================================================================

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'I', 'Requisitos Generales', 'companero-basico-i', 1)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 101, 'Tener 11 años y/o estar en el sexto grado.'),
    (v_clase_id, v_sec_id, 2, 102, 'Ser miembro activo del Club de Conquistadores.'),
    (v_clase_id, v_sec_id, 3, 103, 'Aprender o repasar el significado del Voto de los Conquistadores e ilustrar su significado de forma interesante.'),
    (v_clase_id, v_sec_id, 4, 104, 'Leer el libro El Sendero de la Felicidad, si no lo ha leído.'),
    (v_clase_id, v_sec_id, 5, 105, 'Tener un certificado vigente del Club de Libros y escribir por lo menos un párrafo de resumen sobre uno de los libros de elección: un libro para misiones menores; un libro sobre naturaleza o ciencia; un libro sobre biografía(s); dos libros de elección del candidato a Compañero.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'II', 'Investigación Bíblica', 'companero-basico-ii', 2)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 201, 'Memorizar los libros del Nuevo Testamento y saber las cuatro áreas en que estos libros están agrupados. Demostrar habilidad en encontrar cualquiera de esos libros.'),
    (v_clase_id, v_sec_id, 2, 202, 'Tener un certificado vigente de Gemas Bíblicas.'),
    (v_clase_id, v_sec_id, 3, 203, 'En consulta con su consejero, escoger uno de los siguientes temas: (a) una de las parábolas de Jesús; (b) uno de los milagros de Jesús; (c) el sermón de la montaña; (d) un sermón sobre la segunda venida. Mostrar su conocimiento sobre las enseñanzas de Jesús mediante intercambio de ideas con su consejero, una actividad grupal o una disertación.'),
    (v_clase_id, v_sec_id, 4, 204, 'Leer los Evangelios de Mateo y Marcos en cualquier traducción. Comprométase a memorizar dos de los siguientes textos: (a) Bienaventuranzas, Mateo 5:3-12; (b) Oración del Señor, Mateo 6:9-13; (c) Vuelta de Cristo, Mateo 24:4-7, 11-14; (d) Misión del Evangelio, Mateo 28:18-20.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'III', 'Sirviendo a Otros', 'companero-basico-iii', 3)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 301, 'En consulta con tu consejero, emplear de manera conveniente dos horas en tu comunidad, siendo un verdadero compañero a alguien que lo necesite.'),
    (v_clase_id, v_sec_id, 2, 302, 'Dedicar por lo menos una hora a un proyecto que beneficie a la comunidad o a la iglesia.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'IV', 'Historia Denominacional', 'companero-basico-iv', 4)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 401, 'Ver la presentación audiovisual titulada "El clamor de medianoche" y discutir en clase los sucesos y las personalidades que dirigieron el establecimiento de la Iglesia Adventista del Séptimo Día.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'V', 'Salud y Aptitud Física', 'companero-basico-v', 5)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 501, 'Memorizar y explicar I Corintios 9:24-27.'),
    (v_clase_id, v_sec_id, 2, 502, 'Discutir con su consejero el tema de la salud y un programa regular de ejercicios y su relación con una vida sana.'),
    (v_clase_id, v_sec_id, 3, 503, 'Aprender sobre los maleficios del tabaco en la salud y aptitudes, y escribir su propio voto de compromiso de abstención del uso del tabaco.'),
    (v_clase_id, v_sec_id, 4, 504, 'Completar la especialidad de Natación II.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VI', 'Estudio de la Naturaleza', 'companero-basico-vi', 6)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 601, 'Identificar y describir siete pájaros y siete árboles.'),
    (v_clase_id, v_sec_id, 2, 602, 'Completar una de las especialidades indicadas en la cartilla oficial de Compañero.'),
    (v_clase_id, v_sec_id, 3, 603, 'Participar en una caminata de una hora por el campo.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VII', 'Destrezas de Campamento y Supervivencia', 'companero-basico-vii', 7)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 701, 'Encontrar los ocho puntos cardinales sin la ayuda de una brújula, usando las estrellas o un reloj.'),
    (v_clase_id, v_sec_id, 2, 702, 'Pernoctar dos noches en campamento.'),
    (v_clase_id, v_sec_id, 3, 703, 'Saber o repasar los nudos requeridos en la clase de Amigo. Atar y saber el uso práctico de los siguientes nudos: Vuelta de Escota, Margarita, Pescador, Vuelta de Braza, Tensor. Aprender también a atar y el uso práctico de los cuatro tipos de amarras.'),
    (v_clase_id, v_sec_id, 4, 704, 'Pasar el examen de Primeros Auxilios para la clase de Compañero.');

  -- =========================================================================
  -- Requisitos de la Sección Avanzada
  -- =========================================================================

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'I', 'Requisitos Generales', 'companero-avanzado-i', 8)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 801, 'Saber el significado y el uso correcto de la Bandera Nacional.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'II', 'Investigación Bíblica', 'companero-avanzado-ii', 9)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 901, 'Aprender de memoria los siguientes textos: Mateo 5:3-12; Mateo 6:9-13; Mateo 24:4-7, 11-14; Mateo 28:18-20.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'III', 'Sirviendo a Otros', 'companero-avanzado-iii', 10)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1001, 'Dedicar por lo menos cinco horas en un servicio a la comunidad.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'IV', 'Historia Denominacional', 'companero-avanzado-iv', 11)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1101, 'Responder el cuestionario basado en la serie "El clamor de medianoche".');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'V', 'Salud y Aptitud Física', 'companero-avanzado-v', 12)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1201, 'Caminar ocho kilómetros y llevar un diario.'),
    (v_clase_id, v_sec_id, 2, 1202, 'Elaborar un dibujo sobre temperancia.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'VI', 'Estudio de la Naturaleza', 'companero-avanzado-vi', 13)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1301, 'Identificar y describir 12 pájaros y 12 árboles.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'VII', 'Destrezas de Campamento y Supervivencia', 'companero-avanzado-vii', 14)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1401, 'Hacer cinco diferentes fuegos y describir su uso.'),
    (v_clase_id, v_sec_id, 2, 1402, 'Cocinar una comida de campamento sin la ayuda de utensilios.'),
    (v_clase_id, v_sec_id, 3, 1403, 'Preparar una tabla con quince nudos diferentes.');

END $$;

COMMIT;
