-- =============================================================================
-- Import: Clase progresiva Guía (Conquistadores) — División Interamericana
-- Source: https://mundoja.org/clubes/conquistadores/guia
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
    'Guía',
    v_tipo_id,
    (SELECT nombre FROM public.tipos_club WHERE id = v_tipo_id),
    'conquistadores-guia',
    'https://mundoja.org/clubes/conquistadores/guia',
    6,
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
    SELECT id INTO v_clase_id FROM public.clases_progresivas WHERE slug = 'conquistadores-guia';
  END IF;

  DELETE FROM public.clase_requisitos WHERE clase_id = v_clase_id;
  DELETE FROM public.clase_requisito_secciones WHERE clase_id = v_clase_id;

  -- =========================================================================
  -- Requisitos Básicos
  -- =========================================================================

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'I', 'Requisitos Generales', 'guia-basico-i', 1)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 101, 'Tener 15 años de edad, y/o estar en el décimo grado o su equivalente.'),
    (v_clase_id, v_sec_id, 2, 102, 'Conocer y comprender la Legión de Honor de los jóvenes adventistas.'),
    (v_clase_id, v_sec_id, 3, 103, 'Ser miembro activo del Club de Conquistadores.'),
    (v_clase_id, v_sec_id, 4, 104, 'Seleccionar y leer un libro de su elección del Club de Libros.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'II', 'Descubrimiento Espiritual', 'guia-basico-ii', 2)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 201, 'Discutir cómo pueden los cristianos tener los dones del Espíritu como los describe Pablo en su carta a los Gálatas.'),
    (v_clase_id, v_sec_id, 2, 202, 'Ver la serie audiovisual sobre El Servicio del Santuario del Antiguo Testamento y discutir cómo señala la cruz y el ministerio personal de Jesús.'),
    (v_clase_id, v_sec_id, 3, 203, 'Mediante el estudio y la discusión, familiarizarse con el énfasis que hace la Biblia en la mayordomía del tiempo, la salud y las posesiones.'),
    (v_clase_id, v_sec_id, 4, 204, 'Tener un certificado vigente de Gemas Bíblicas.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'III', 'Evangelismo en la Comunidad', 'guia-basico-iii', 3)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 301, 'Como grupo (o en forma individual), ayudar a organizar y participar en una de las siguientes actividades: (1) hacer una visita amigable a alguna persona confinada en su casa o en un hospital; (2) adoptar a una persona o a una familia necesitada para ayudarla; (3) cualquier otra actividad de su elección aprobada por el director.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'IV', 'La Vida en la Iglesia', 'guia-basico-iv', 4)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 401, 'Participar en una discusión sobre testificación con otros jóvenes de la misma edad.'),
    (v_clase_id, v_sec_id, 2, 402, 'Después de una discusión al respecto, preparar un diagrama sobre la organización denominacional, con detalles especiales sobre la División Interamericana.'),
    (v_clase_id, v_sec_id, 3, 403, 'Hacer planes con su grupo para tener una actividad social por lo menos una vez al trimestre.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'V', 'Historia Denominacional', 'guia-basico-v', 5)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 501, 'Trazar el desarrollo de la Iglesia Adventista del Séptimo Día en su unión y campo local.'),
    (v_clase_id, v_sec_id, 2, 502, 'Buscar datos de la historia de la iglesia local.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VI', 'Desarrollo Personal', 'guia-basico-vi', 6)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 601, 'Mediante la discusión en grupo y por investigación personal, examinar sus actitudes en relación con dos de los siguientes temas: (1) elección de la profesión en la vida; (2) la moralidad y la conducta; (3) enamoramiento; (4) elección del compañero de la vida.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VII', 'Salud y Bienestar Físico', 'guia-basico-vii', 7)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 701, 'Realizar dos de las siguientes actividades: (1) escribir un poema o artículo para someterlo a ser publicado en alguna revista denominacional; (2) preparar o participar con el grupo en un programa sobre la vida saludable y presentarlo en la sociedad de jóvenes, la iglesia o al público; (3) individualmente o como grupo, organizar y participar en un maratón u otra actividad similar, discutir y anotar su programa personal de adiestramiento físico en preparación para este acontecimiento; (4) leer las páginas 91-106 del libro La Temperancia, de Elena White, y aprobar el examen de falso y verdadero.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'basico', 'VIII', 'Vida al aire libre', 'guia-basico-viii', 8)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 801, 'Participar en un campamento de dos noches. Discutir el equipo necesario.'),
    (v_clase_id, v_sec_id, 2, 802, 'Hacer planes y cocinar de manera satisfactoria una comida de tres platos en fuego al aire libre.'),
    (v_clase_id, v_sec_id, 3, 803, 'Hacer un objeto usando amarras de cuerdas (torre, puente, etc.).'),
    (v_clase_id, v_sec_id, 4, 804, 'Estudiar una especialidad no estudiada anteriormente, que le pueda servir como requisito para recibir el distintivo de Maestría en Naturaleza o Recreación.'),
    (v_clase_id, v_sec_id, 5, 805, 'Aprobar el examen de primeros auxilios de Guía.');

  -- =========================================================================
  -- Requisitos de la Sección Avanzada
  -- (La fuente remite a la mitad del Plan del Medallón de Plata)
  -- =========================================================================

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'I', 'Excursiones', 'guia-avanzado-i', 9)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 901, 'Completar la mitad de los requisitos de excursiones exigidos para el Plan del Medallón de Plata.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'II', 'Proyectos de servicio', 'guia-avanzado-ii', 10)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1001, 'Completar la mitad de los requisitos de proyectos de servicio exigidos para el Plan del Medallón de Plata.');

  INSERT INTO public.clase_requisito_secciones (clase_id, parte, numero_romano, nombre, slug, orden)
  VALUES (v_clase_id, 'avanzado', 'III', 'Mejoramiento cultural', 'guia-avanzado-iii', 11)
  RETURNING id INTO v_sec_id;
  INSERT INTO public.clase_requisitos (clase_id, seccion_id, numero, orden, descripcion) VALUES
    (v_clase_id, v_sec_id, 1, 1101, 'Completar la mitad de los requisitos de mejoramiento cultural exigidos para el Plan del Medallón de Plata. Si cumple con los requisitos de la clase avanzada de Viajero y de Guía, eso lo capacitará para ganar el Medallón de Plata.');

END $$;

COMMIT;
