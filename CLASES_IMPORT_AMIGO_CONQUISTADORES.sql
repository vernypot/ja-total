-- =============================================================================
-- Import: Clase progresiva Amigo (Conquistadores) — División Interamericana
-- Source: https://mundoja.org/clubes/conquistadores/amigo
-- Run CLASE_REQUISITOS_SECCIONES_SCHEMA.sql first
-- =============================================================================

BEGIN;

-- Resolve Conquistadores club type (adjust ILIKE if your tipo name differs)
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
    'Amigo',
    v_tipo_id,
    (SELECT nombre FROM public.tipos_club WHERE id = v_tipo_id),
    'conquistadores-amigo',
    'https://mundoja.org/clubes/conquistadores/amigo',
    1,
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
    SELECT id INTO v_clase_id FROM public.clases_progresivas WHERE slug = 'conquistadores-amigo';
  END IF;

  -- Replace prior import for idempotent re-runs
  DELETE FROM public.clase_requisitos WHERE clase_id = v_clase_id;
  DELETE FROM public.clase_requisito_secciones WHERE clase_id = v_clase_id;

  -- =========================================================================
  -- Requisitos Básicos
  -- =========================================================================

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'I', 'Requisitos Generales', 'amigo-basico-i', 1)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 101, 'Tener un mínimo de 10 años de edad.'),
    (v_clase_id, v_sec_id, 2, 102, 'Ser miembro activo de un Club de Conquistadores.'),
    (v_clase_id, v_sec_id, 3, 103, 'Saber de memoria y explicar el Voto y la Ley del Conquistador.'),
    (v_clase_id, v_sec_id, 4, 104, 'Leer el libro: "El sendero de la felicidad".'),
    (v_clase_id, v_sec_id, 5, 105, 'Tener un Certificado vigente del Club de Libros');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'II', 'Investigación Bíblica', 'amigo-basico-ii', 2)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 201, 'Saber de memoria los libros del Antiguo Testamento y conocer las cinco áreas en las cuales están agrupados. Demostrar habilidad para encontrar cualquiera de ellos.'),
    (v_clase_id, v_sec_id, 2, 202, 'Tener un certificado vigente de Gemas Bíblicas'),
    (v_clase_id, v_sec_id, 3, 203, 'Saber de memoria y explicar el Salmo 23 o el Salmo 46.'),
    (v_clase_id, v_sec_id, 4, 204, 'En consulta con tu consejero/a, escoge uno de los siguientes personajes del Antiguo Testamento: José, Jonás, Ester o Rut. Discutir como grupo la liberación y el cuidado amoroso de Cristo como se revela en la historia.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'III', 'Sirviendo a Otros', 'amigo-basico-iii', 3)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 301, 'En consulta con tu líder planea dedicar, por lo menos dos horas, demostrando tu amistad hacia alguien con necesidad en tu comunidad, realizando dos de los siguientes ítems: (1) Visitar a alguien que necesita amistad; (2) Ayudar a algún necesitado; (3) Con la colaboración de otros, dedicar medio día en un proyecto de la escuela o iglesia de ayuda para la comunidad.'),
    (v_clase_id, v_sec_id, 2, 302, 'Demostrar ser un buen ciudadano en el hogar y en la escuela.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'IV', 'Historia Denominacional', 'amigo-basico-iv', 4)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 401, 'Intercambiar ideas sobre el periodo de tiempo comprendido entre la ascensión de Cristo y 1844');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'V', 'Salud y Bienestar Físico', 'amigo-basico-v', 5)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 501, 'Discutir los principios de temperancia en la vida de Daniel o participar en una presentación o escenificación de Daniel 1.'),
    (v_clase_id, v_sec_id, 2, 502, 'Saber de memoria y explicar Daniel 1:8 y/o firmar el voto adecuado, o crear el propio voto mostrando por qué quiere seguir un estilo de vida en armonía con los verdaderos principios de la temperancia.'),
    (v_clase_id, v_sec_id, 3, 503, 'Aprender los principios de una dieta saludable y participar en un proyecto preparando un cuadro con los grupos básicos de alimentos.'),
    (v_clase_id, v_sec_id, 4, 504, 'Completar la especialidad de Natación I.'),
    (v_clase_id, v_sec_id, 5, 505, 'Realizar una caminata de 3 Km en una hora');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VI', 'Estudio de la Naturaleza', 'amigo-basico-vi', 6)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 601, 'Participar en una caminata para apreciar la naturaleza y observar los objetos naturales que se relacionan con pasajes bíblicos.'),
    (v_clase_id, v_sec_id, 2, 602, 'Completar una de las siguientes especialidades: Gatos, Perros, Mamíferos, Semillas, Pajaros o Aves.'),
    (v_clase_id, v_sec_id, 3, 603, 'Conocer e identificar cinco flores silvestres y cinco insectos de su zona.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VII', 'Destrezas de Campamento y Supervivencia', 'amigo-basico-vii', 7)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 701, 'Saber cómo se hace una cuerda y demostrar cómo debemos cuidar correctamente una cuerda. Dar a conocer el uso práctico de los siguientes nudos: Cote o media malla, falso, llano, corredizo, doble lazo, dos medios cotes, ballestrinque, as de guía o potreador, torniquete.'),
    (v_clase_id, v_sec_id, 2, 702, 'Pernoctar en un campamento.'),
    (v_clase_id, v_sec_id, 3, 703, 'Aprobar un examen sobre medidas generales de seguridad.'),
    (v_clase_id, v_sec_id, 4, 704, 'Armar y desarmar una carpa y hacer una cama de campaña.'),
    (v_clase_id, v_sec_id, 5, 705, 'Saber diez reglas para realizar caminatas y qué hacer cuando se está perdido.'),
    (v_clase_id, v_sec_id, 6, 706, 'Aprender las señales de rastro de pista. Ser capaz de diseñar un rastro de 2 Km para que otros puedan seguir la pista, y ser capaz de seguir la misma senda.'),
    (v_clase_id, v_sec_id, 7, 707, 'Completar una especialidad en Artes y Habilidades Manuales');

  -- =========================================================================
  -- Requisitos de la Sección Avanzada
  -- =========================================================================

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'I', 'Requisitos Generales', 'amigo-avanzado-i', 8)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 801, 'Saber cantar o tocar y explicar el significado del Himno de los Conquistadores y la primera estrofa del Himno Nacional');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'II', 'Investigación Bíblica', 'amigo-avanzado-ii', 9)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 901, 'Saber los diferentes métodos para purificar el agua y demostrar su habilidad para construir un refugio. Considerar el significado de Jesús como Agua de Vida y como nuestro Refugio');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'III', 'Sirviendo a Otros', 'amigo-avanzado-iii', 10)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1001, 'Llevar por lo menos dos visitas a la Escuela Sabática o al Club de Conquistadores.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'IV', 'Historia Denominacional', 'amigo-avanzado-iv', 11)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1101, 'Contestar las preguntas basadas en la presentación audiovisual "El Gran Conflicto".');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'V', 'Salud y Aptitud Física', 'amigo-avanzado-v', 12)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1201, 'Saber hornear, hervir y freir los alimentos en un campamento');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'VI', 'Estudio de la Naturaleza', 'amigo-avanzado-vi', 13)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1301, 'Conocer e identificar 10 flores silvestres y 10 insectos de su zona.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'VII', 'Destrezas de Campamento y Supervivencia', 'amigo-avanzado-vii', 14)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1401, 'Empezar un fuego sólo con un fósforo, usando materiales naturales y mantenerlo vivo.'),
    (v_clase_id, v_sec_id, 2, 1402, 'Usar correctamente el cuchillo y el hacha, y saber diez reglas de seguridad en el uso de ellos.'),
    (v_clase_id, v_sec_id, 3, 1403, 'Atar cinco nudos rápidos');

END $$;

COMMIT;
