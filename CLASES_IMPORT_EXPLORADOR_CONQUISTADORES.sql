-- =============================================================================
-- Import: Clase progresiva Explorador (Conquistadores) — División Interamericana
-- Source: https://mundoja.org/clubes/conquistadores/explorador
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
    'Explorador',
    v_tipo_id,
    (SELECT nombre FROM public.tipos_club WHERE id = v_tipo_id),
    'conquistadores-explorador',
    'https://mundoja.org/clubes/conquistadores/explorador',
    3,
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
    SELECT id INTO v_clase_id FROM public.clases_progresivas WHERE slug = 'conquistadores-explorador';
  END IF;

  DELETE FROM public.clase_requisitos WHERE clase_id = v_clase_id;
  DELETE FROM public.clase_requisito_secciones WHERE clase_id = v_clase_id;

  -- =========================================================================
  -- Requisitos Básicos
  -- =========================================================================

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'I', 'Requisitos Generales', 'explorador-basico-i', 1)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 101, 'Tener por lo menos 12 años de edad y estar en el séptimo grado (o su equivalente).'),
    (v_clase_id, v_sec_id, 2, 102, 'Ser miembro activo del club de Conquistadores.'),
    (v_clase_id, v_sec_id, 3, 103, 'Saber de memoria y el significado de la Ley del Conquistador. Participar en una de las siguientes actividades: mesa redonda, composición escrita, drama u otro proyecto.'),
    (v_clase_id, v_sec_id, 4, 104, 'Leer el libro "El sendero de la felicidad".'),
    (v_clase_id, v_sec_id, 5, 105, 'Tener un certificado vigente del club de libros y escribir un párrafo de resumen de uno de los libros.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'II', 'Investigación Bíblica', 'explorador-basico-ii', 2)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 201, 'Leer los evangelios de Lucas y Juan y discutir en grupo tres de los siguientes temas: (a) Luc. 4:16-19: La lectura de las Escrituras; (b) Lucas 11:9-13: Pedid, Buscad, llamad; (c) Luc. 21:25-29: Señales de la segunda venida; (d) Juan 13:12-17: La humildad; (e) Juan 14:1-3: La Promesa del Señor; (f) Juan 15:5-8: La vid y los pámpanos.'),
    (v_clase_id, v_sec_id, 2, 202, 'En consulta con tu consejero, escoge uno de estos temas y comparte tus ideas de cómo Jesús salva, utilizando uno de estos métodos: disertación, composición, carteles o poema: (a) Juan 3: Nicodemo; (b) Juan 4: La mujer junto al pozo; (c) Lucas 15: El hijo pródigo; (d) Lucas 10: El buen samaritano; (e) Lucas 19: Zaqueo.'),
    (v_clase_id, v_sec_id, 3, 203, 'Aprender de memoria y explicar Prov. 20:1; Prov. 23:29-32.'),
    (v_clase_id, v_sec_id, 4, 204, 'Familiarizarse con el uso de una concordancia.'),
    (v_clase_id, v_sec_id, 5, 205, 'Tener un certificado de las Gemas Bíblicas de los Menores.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'III', 'Sirviendo a Otros', 'explorador-basico-iii', 3)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 301, 'Familiarizarse con los servicios a la comunidad que se ofrecen en tu comunidad y ayudar por lo menos en uno.'),
    (v_clase_id, v_sec_id, 2, 302, 'Participar en tres programas de la iglesia.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'IV', 'Historia Denominacional', 'explorador-basico-iv', 4)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 401, 'Estudiar el material Dilo al Mundo, periodo entre 1844 y la salida de J. N. Andrews (leer las págs. 21-81, 221-238 del libro La Mano de Dios al Timón) y discutir en grupo.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'V', 'Salud y Bienestar Físico', 'explorador-basico-v', 5)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 501, 'Participar en una discusión de grupo sobre los efectos del alcohol sobre el cuerpo. Redactar y firmar un voto de abstinencia del uso de bebidas alcohólicas.'),
    (v_clase_id, v_sec_id, 2, 502, 'Participar en una caminata de 8 km y escribir un breve informe sobre la misma: mapa del recorrido, lugares de interés, equipo usado, alimentos consumidos, sucesos.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VI', 'Estudio de la Naturaleza', 'explorador-basico-vi', 6)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 601, 'Completar una de las siguientes especialidades: Anfibios, Aves, Flores, Cosmografía o Climatología.'),
    (v_clase_id, v_sec_id, 2, 602, 'Identificar 3 planetas, 5 estrellas y 5 constelaciones.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VII', 'Destrezas de Campamento y Supervivencia', 'explorador-basico-vii', 7)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 701, 'Acampar al aire libre por dos noches. Repasar los requisitos de un buen lugar para acampar.'),
    (v_clase_id, v_sec_id, 2, 702, 'Planear y cocinar dos comidas en el campamento del requisito anterior.'),
    (v_clase_id, v_sec_id, 3, 703, 'Pasar el examen de Primeros Auxilios para explorador.'),
    (v_clase_id, v_sec_id, 4, 704, 'Completar una especialidad que no haya cumplido antes en Recreación o Trabajos Manuales.'),
    (v_clase_id, v_sec_id, 5, 705, 'Explicar lo que es un mapa topográfico, qué espera encontrar en él y sus usos. Identificar por lo menos 20 señales y símbolos que se usan.');

  -- =========================================================================
  -- Requisitos de la Sección Avanzada
  -- =========================================================================

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'I', 'Requisitos Generales', 'explorador-avanzado-i', 8)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 801, 'Conocer los elementos que componen la bandera y el banderín de los Conquistadores y el uso adecuado.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'II', 'Investigación Bíblica', 'explorador-avanzado-ii', 9)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 901, 'Identificar en el cielo a: Achernar, la Cruz del sur, las indicadoras y Orión. Conocer la importancia de la constelación de Orión según se relata en Primeros Escritos pág. 41.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'III', 'Sirviendo a Otros', 'explorador-avanzado-iii', 10)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1001, 'Inscribir un nuevo miembro en la Escuela Sabática, el club de Conquistadores o algún curso bíblico.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'IV', 'Historia Denominacional', 'explorador-avanzado-iv', 11)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1101, 'Contestar una serie de preguntas basadas en lo leído o estudiado en el requisito básico.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'V', 'Salud y Bienestar Físico', 'explorador-avanzado-v', 12)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1201, 'Participar en una caminata de 16 kilómetros (10 millas) y hacer una lista de la ropa adecuada para dicha actividad.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'VI', 'Estudio de la Naturaleza', 'explorador-avanzado-vi', 13)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1301, 'Identificar 6 huellas de animales o aves. Hacer un molde de yeso de tres de esas huellas.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'VII', 'Destrezas de Campamento y Supervivencia', 'explorador-avanzado-vii', 14)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1401, 'Repasar los amarres básicos y construir un mueble de campamento.'),
    (v_clase_id, v_sec_id, 2, 1402, 'Planear un menú para cuatro personas para un campamento de tres días.'),
    (v_clase_id, v_sec_id, 3, 1403, 'Poder transmitir y recibir mensajes con sistema de señales de semáforo, o con el Código internacional Morse, o con el Lenguaje de los Sordomudos, o tener un conocimiento básico para una comunicación radial de dos vías.');

END $$;

COMMIT;
