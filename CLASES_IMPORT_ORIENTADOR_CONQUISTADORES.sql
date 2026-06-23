-- =============================================================================
-- Import: Clase progresiva Orientador (Conquistadores) — División Interamericana
-- Source: https://mundoja.org/clubes/conquistadores/orientador
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
    'Orientador',
    v_tipo_id,
    (SELECT nombre FROM public.tipos_club WHERE id = v_tipo_id),
    'conquistadores-orientador',
    'https://mundoja.org/clubes/conquistadores/orientador',
    4,
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
    SELECT id INTO v_clase_id FROM public.clases_progresivas WHERE slug = 'conquistadores-orientador';
  END IF;

  DELETE FROM public.clase_requisitos WHERE clase_id = v_clase_id;
  DELETE FROM public.clase_requisito_secciones WHERE clase_id = v_clase_id;

  -- =========================================================================
  -- Requisitos Básicos
  -- =========================================================================

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'I', 'Requisitos Generales', 'orientador-basico-i', 1)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 101, 'Tener por lo menos 13 años de edad y estar en el octavo grado (o su equivalente).'),
    (v_clase_id, v_sec_id, 2, 102, 'Ser miembro activo del club de Conquistadores.'),
    (v_clase_id, v_sec_id, 3, 103, 'Conocer de memoria el Blanco y Lema de los J.A. y poder explicar su significado.'),
    (v_clase_id, v_sec_id, 4, 104, 'Leer los libros del Club de Libros para jóvenes.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'II', 'Investigación Bíblica', 'orientador-basico-ii', 2)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 201, 'Descubrir a través de una discusión de grupo: (a) qué es el cristianismo; (b) las características de un verdadero discípulo; (c) qué fuerzas o poderes te mueven a ser cristiano.'),
    (v_clase_id, v_sec_id, 2, 202, 'Participar en un proyecto de Marcar la Biblia sobre el tema de la Inspiración de la Biblia.'),
    (v_clase_id, v_sec_id, 3, 203, 'Mirar un programa sobre la Creación, luego tener una discusión de grupo sobre la creación y los argumentos a favor de la evolución y cómo comenzó la vida.'),
    (v_clase_id, v_sec_id, 4, 204, 'Tener un certificado de las Gemas Bíblicas.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'III', 'Sirviendo a Otros', 'orientador-basico-iii', 3)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 301, 'Bajo la orientación de tu consejero, participar en dos actividades de avance tales como: (a) plan de 5 días para dejar de fumar; (b) un esfuerzo evangelístico; (c) Escuela Bíblica de verano; (d) evangelismo telefónico.'),
    (v_clase_id, v_sec_id, 2, 302, 'Participar en una discusión sobre la manera como un joven adventista se relaciona con otros en la escuela, incluyendo maneras para compartir la fe y testificar.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'IV', 'La vida en la iglesia', 'orientador-basico-iv', 4)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 401, 'Asistir a por lo menos una reunión de negocios de la iglesia. Preparar un breve informe para discutir en el grupo.'),
    (v_clase_id, v_sec_id, 2, 402, 'Hacer planes con el grupo para celebrar una actividad social una vez al trimestre por lo menos.'),
    (v_clase_id, v_sec_id, 3, 403, 'Matricular por lo menos a tres personas en algún curso bíblico por correspondencia.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'V', 'Historia Denominacional', 'orientador-basico-v', 5)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 501, 'Ver la presentación audiovisual "El esparcimiento del mensaje Adventista" y discutir como grupo los detalles principales.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VI', 'Desarrollo Personal', 'orientador-basico-vi', 6)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 601, 'Por medio de la discusión en grupo y la investigación personal, examinar tus actitudes hacia dos de los siguientes temas: (1) la confianza propia; (2) la amistad; (3) las gracias sociales; (4) el poder de la voluntad.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VII', 'Salud y Bienestar Físico', 'orientador-basico-vii', 7)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 701, 'Discutir los principios de la cultura física. Proporcionar un bosquejo de un programa diario de ejercicios. Escribir y firmar un voto personal de dedicación a un programa regular de ejercicios.'),
    (v_clase_id, v_sec_id, 2, 702, 'Discutir las ventajas naturales de practicar el estilo de vida adventista de acuerdo con los principios bíblicos.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VIII', 'Vida al aire libre', 'orientador-basico-viii', 8)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 801, 'Construir y demostrar el uso de un horno reflector.'),
    (v_clase_id, v_sec_id, 2, 802, 'Participar en un campamento que incluya dos noches. Preparar una mochila o morral correctamente, incluyendo artículos de uso personal y alimentos suficientes.'),
    (v_clase_id, v_sec_id, 3, 803, 'Hacer una especialidad de naturaleza o recreación que no haya hecho antes.'),
    (v_clase_id, v_sec_id, 4, 804, 'Aprobar el examen de primeros auxilios de orientador.');

  -- =========================================================================
  -- Requisitos de la Sección Avanzada
  -- =========================================================================

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'I', 'Requisitos Generales', 'orientador-avanzado-i', 9)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 901, 'Conocer la formación correcta y las marchas de una escolta de bandera.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'IV', 'La vida en la iglesia', 'orientador-avanzado-iv', 10)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1101, 'Dar dos estudios bíblicos a dos personas no adventistas.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'V', 'Historia Denominacional', 'orientador-avanzado-v', 11)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1201, 'Contestar una serie de preguntas basadas en lo leído o estudiado en el requisito básico.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'VII', 'Salud y Bienestar Físico', 'orientador-avanzado-vii', 12)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1301, 'Participar en una de las siguientes actividades: (a) hacer una caminata de 15 kilómetros y escribir un informe; (b) hacer un viaje de 15 kilómetros a caballo; (c) dar un viaje de canoa en un día; (d) dar un viaje de 80 kilómetros en bicicleta; (e) nadar un kilómetro.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'VIII', 'Vida al aire libre', 'orientador-avanzado-viii', 13)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1401, 'Cumplir uno de los siguientes requisitos: (1) reconocer, preparar y comer diez variedades de plantas silvestres; (2) identificar por medio de fotos, dibujos, ilustraciones o directamente una de las siguientes categorías: 25 hojas de árboles, 25 rocas y minerales, 25 flores silvestres, 25 mariposas, 25 insectos o 25 caracoles; (3) enviar y recibir 35 letras por minuto por medio del código semáforo; (4) enviar y recibir 15 letras por minuto con banderines de señales usando el código Morse; (5) enviar y recibir el capítulo 24 de Mateo por medio del lenguaje de sordomudos; (6) tomar parte en operaciones de emergencia y rescate sencillas usando la comunicación por radio de dos vías.');

END $$;

COMMIT;
