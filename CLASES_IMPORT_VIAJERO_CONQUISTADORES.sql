-- =============================================================================
-- Import: Clase progresiva Viajero (Conquistadores) — División Interamericana
-- Source: https://mundoja.org/clubes/conquistadores/viajero
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
    'Viajero',
    v_tipo_id,
    (SELECT nombre FROM public.tipos_club WHERE id = v_tipo_id),
    'conquistadores-viajero',
    'https://mundoja.org/clubes/conquistadores/viajero',
    5,
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
    SELECT id INTO v_clase_id FROM public.clases_progresivas WHERE slug = 'conquistadores-viajero';
  END IF;

  DELETE FROM public.clase_requisitos WHERE clase_id = v_clase_id;
  DELETE FROM public.clase_requisito_secciones WHERE clase_id = v_clase_id;

  -- =========================================================================
  -- Requisitos Básicos
  -- =========================================================================

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'I', 'Requisitos Generales', 'viajero-basico-i', 1)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 101, 'Tener 14 años y/o estar en noveno grado o su equivalente.'),
    (v_clase_id, v_sec_id, 2, 102, 'Aprender de memoria y explicar el significado del Voto de los Jóvenes Adventistas.'),
    (v_clase_id, v_sec_id, 3, 103, 'Ser un miembro activo del Club de Conquistadores.'),
    (v_clase_id, v_sec_id, 4, 104, 'Seleccionar y leer tres libros del Club de Libros.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'II', 'Descubrimiento Espiritual', 'viajero-basico-ii', 2)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 201, 'Estudiar la obra personal del Espíritu Santo a favor de la humanidad, y discutir su participación en el desarrollo espiritual del ser humano.'),
    (v_clase_id, v_sec_id, 2, 202, 'Mediante el estudio y la discusión en grupo, aumentar el conocimiento de los sucesos de los últimos días que convergerán en el segundo advenimiento.'),
    (v_clase_id, v_sec_id, 3, 203, 'Descubrir el verdadero significado de la observancia del sábado mediante el estudio y la discusión de evidencias bíblicas.'),
    (v_clase_id, v_sec_id, 4, 204, 'Tener un certificado vigente de Gemas de Memoria.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'III', 'Sirviendo a Otros', 'viajero-basico-iii', 3)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 301, 'Individualmente o en grupos, invitar a un amigo a una de las actividades juveniles de la iglesia o la asociación/misión.'),
    (v_clase_id, v_sec_id, 2, 302, 'Individualmente o en grupo, ayudar a organizar y participar en un proyecto de servicio a favor de otros.'),
    (v_clase_id, v_sec_id, 3, 303, 'Discutir cómo puede un joven adventista relacionarse con las personas en las diversas situaciones, contactos y asociaciones de la vida diaria.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'IV', 'La Vida en la Iglesia', 'viajero-basico-iv', 4)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 401, 'Discutir y preparar un diagrama sobre la organización local de la iglesia y hacer una lista de las funciones de los departamentos.'),
    (v_clase_id, v_sec_id, 2, 402, 'Participar en los programas de dos departamentos de la iglesia en dos ocasiones distintas.'),
    (v_clase_id, v_sec_id, 3, 403, 'Hacer planes con su grupo para celebrar una actividad social por lo menos una vez al trimestre.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'V', 'Historia Denominacional', 'viajero-basico-v', 5)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 501, 'Mencionar qué papel desempeñó Elena de White en la Iglesia Adventista en lo que respecta a: (1) la organización de la iglesia; (2) la expansión mundial de la iglesia; (3) las creencias principales de la iglesia.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VI', 'Desarrollo Personal', 'viajero-basico-vi', 6)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 601, 'Por medio de discusión en el grupo y un autoexamen, verificar sus actitudes hacia dos de los siguientes asuntos: (1) concepto de sí mismo; (2) relaciones humanas (padres, familia, amigos y otras personas); (3) ganar y gastar el dinero; (4) presión de grupo.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VII', 'Salud y Bienestar Físico', 'viajero-basico-vii', 7)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 701, 'Completar una de las siguientes actividades: (1) realizar un proyecto que consiste en preparar un folleto sobre los motivos que se tiene para no fumar ni beber bebidas intoxicantes, usando ilustraciones de revistas y otros materiales; (2) construir un proyecto de ayuda visual para demostrar los peligros del alcohol y el tabaco.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VIII', 'Vida al aire libre', 'viajero-basico-viii', 8)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 801, 'Organizar una actividad sobre el tema de la salud. Incluir principios de salud, charlas, exhibiciones, etc.'),
    (v_clase_id, v_sec_id, 2, 802, 'Caminar 25 kilómetros en una zona despoblada, pasando una noche a la intemperie o bajo carpa, en grupos de cuatro personas por lo menos, incluyendo un adulto experimentado como consejero. Los planes para la excursión deben hacerse en conjunto. Deben llevar todos los alimentos necesarios. Discutir en el grupo acerca del terreno, la flora y la fauna observada durante la excursión, basándose en las notas tomadas durante la misma.'),
    (v_clase_id, v_sec_id, 3, 803, 'Completar una especialidad de recreación o naturaleza que no se haya estudiado anteriormente.'),
    (v_clase_id, v_sec_id, 4, 804, 'Aprobar el examen de Primeros Auxilios de Viajero.');

  -- =========================================================================
  -- Requisitos de la Sección Avanzada
  -- (La fuente remite a la mitad del Plan del Medallón de Plata)
  -- =========================================================================

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'I', 'Educación física', 'viajero-avanzado-i', 9)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 901, 'Completar la mitad de los requisitos de educación física exigidos para el Plan del Medallón de Plata.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'II', 'Destrezas', 'viajero-avanzado-ii', 10)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1001, 'Completar la mitad de los requisitos de destrezas exigidos para el Plan del Medallón de Plata. Si cumple con los requisitos de la Clase de Guía, esto lo capacitará para recibir el medallón.');

END $$;

COMMIT;
