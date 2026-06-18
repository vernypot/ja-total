-- =============================================================================
-- Landing page CMS (public pre-login page)
-- Run in Supabase Dashboard → SQL Editor
-- Prerequisite: USUARIOS_RLS_FIX.sql (is_usuarios_superadmin)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.landing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  navy_color VARCHAR(20) NOT NULL DEFAULT '#1b365d',
  navy_dark_color VARCHAR(20) NOT NULL DEFAULT '#0f2340',
  gold_color VARCHAR(20) NOT NULL DEFAULT '#e8a317',
  teal_color VARCHAR(20) NOT NULL DEFAULT '#0d9488',
  cream_color VARCHAR(20) NOT NULL DEFAULT '#faf8f4',
  text_color VARCHAR(20) NOT NULL DEFAULT '#334155',
  font_family VARCHAR(120) NOT NULL DEFAULT 'DM Sans, system-ui, sans-serif',
  display_font VARCHAR(120) NOT NULL DEFAULT 'Playfair Display, Georgia, serif',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.landing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key VARCHAR(40) NOT NULL UNIQUE,
  section_type VARCHAR(30) NOT NULL DEFAULT 'content',
  orden INTEGER NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  anchor_id VARCHAR(40),
  eyebrow_es TEXT,
  eyebrow_en TEXT,
  title_es TEXT,
  title_en TEXT,
  body_es TEXT,
  body_en TEXT,
  cta_text_es TEXT,
  cta_text_en TEXT,
  style_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.landing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key VARCHAR(40) NOT NULL REFERENCES public.landing_sections(section_key) ON DELETE CASCADE,
  item_type VARCHAR(30) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  content_es JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_en JSONB NOT NULL DEFAULT '{}'::jsonb,
  style_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_sections_orden ON public.landing_sections(orden);
CREATE INDEX IF NOT EXISTS idx_landing_items_section_key ON public.landing_items(section_key, orden);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.landing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS landing_settings_public_read ON public.landing_settings;
CREATE POLICY landing_settings_public_read ON public.landing_settings
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS landing_settings_superadmin_write ON public.landing_settings;
CREATE POLICY landing_settings_superadmin_write ON public.landing_settings
  FOR ALL TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());

DROP POLICY IF EXISTS landing_sections_public_read ON public.landing_sections;
CREATE POLICY landing_sections_public_read ON public.landing_sections
  FOR SELECT TO anon, authenticated
  USING (estado = 'activo' AND visible = TRUE);

DROP POLICY IF EXISTS landing_sections_superadmin_write ON public.landing_sections;
CREATE POLICY landing_sections_superadmin_write ON public.landing_sections
  FOR ALL TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());

DROP POLICY IF EXISTS landing_items_public_read ON public.landing_items;
CREATE POLICY landing_items_public_read ON public.landing_items
  FOR SELECT TO anon, authenticated
  USING (
    estado = 'activo'
    AND EXISTS (
      SELECT 1 FROM public.landing_sections s
      WHERE s.section_key = landing_items.section_key
        AND s.estado = 'activo'
        AND s.visible = TRUE
    )
  );

DROP POLICY IF EXISTS landing_items_superadmin_write ON public.landing_items;
CREATE POLICY landing_items_superadmin_write ON public.landing_items
  FOR ALL TO authenticated
  USING (public.is_usuarios_superadmin())
  WITH CHECK (public.is_usuarios_superadmin());

-- ---------------------------------------------------------------------------
-- Default settings row
-- ---------------------------------------------------------------------------

INSERT INTO public.landing_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.landing_settings LIMIT 1);

-- ---------------------------------------------------------------------------
-- Default sections
-- ---------------------------------------------------------------------------

INSERT INTO public.landing_sections (section_key, section_type, orden, anchor_id, eyebrow_es, eyebrow_en, title_es, title_en, body_es, body_en, cta_text_es, cta_text_en)
VALUES
  ('topbar', 'content', 1, NULL,
   'Clubes juveniles adventistas', 'Seventh-day Adventist youth clubs',
   NULL, NULL,
   'Noticias y anuncios compartidos para líderes y familias', 'Shared news and announcements for leaders and families',
   NULL, NULL),
  ('hero', 'carousel', 2, 'inicio', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('programs', 'grid', 3, 'clubes',
   'Nuestros clubes', 'Our clubs',
   'Ministerios juveniles adventistas en un solo lugar', 'Adventist youth ministries in one place',
   'Cada tipo de club tiene su identidad, especialidades y metas — todo apoyado por JA Total.',
   'Each club type has its own identity, honors, and milestones — all supported by JA Total.',
   NULL, NULL),
  ('about', 'content', 4, NULL,
   'Acerca de JA Total', 'About JA Total',
   'Información compartida para iglesias y clubes', 'Shared information for churches and clubs',
   'Esta página pública destaca noticias y actividades próximas. Los líderes autorizados ingresan para administrar registros y asistencia.',
   'This public page highlights news and upcoming activities. Authorized leaders sign in to manage records and attendance.',
   'Ingresar para administrar', 'Sign in to manage'),
  ('events', 'list', 5, 'eventos',
   'Próximos', 'Upcoming',
   'Eventos de club en el calendario', 'Club events on the calendar',
   'Investiduras, camporees, capacitaciones y semana del joven — manténgase informado.',
   'Investitures, camporees, training, and youth week — stay informed about what is coming next.',
   NULL, NULL),
  ('news', 'grid', 6, 'noticias',
   'Noticias', 'News',
   'Anuncios y novedades compartidas', 'Announcements and shared updates',
   'Información importante para directores, consejeros, padres y miembros de club.',
   'Important information for directors, counselors, parents, and club members.',
   NULL, NULL),
  ('cta', 'content', 7, NULL, NULL, NULL,
   '¿Listo para administrar su club?', 'Ready to manage your club?',
   'Ingrese para acceder a perfiles, asistencia, clases progresivas y carnets imprimibles.',
   'Sign in to access member profiles, attendance, progressive classes, and printable ID cards.',
   'Ingresar ahora', 'Sign in now'),
  ('footer', 'content', 8, NULL, NULL, NULL, NULL, NULL,
   'Plataforma digital para ministerios juveniles adventistas: Aventureros, Conquistadores y Master Guide.',
   'Digital platform for Seventh-day Adventist youth club ministries: Adventurers, Pathfinders, and Master Guide.',
   NULL, NULL)
ON CONFLICT (section_key) DO NOTHING;

-- Hero slides
INSERT INTO public.landing_items (section_key, item_type, orden, content_es, content_en, style_json)
SELECT v.section_key, v.item_type, v.orden, v.content_es::jsonb, v.content_en::jsonb, v.style_json::jsonb
FROM (VALUES
  ('hero', 'slide', 1,
   '{"eyebrow":"Conquistadores · Aventureros · Master Guide","title":"Crecer en Cristo mediante el servicio y la aventura","text":"Nuestros clubes ayudan a los jóvenes a conocer a Cristo, desarrollar carácter y servir a su iglesia y comunidad con alegría."}',
   '{"eyebrow":"Pathfinders · Adventurers · Master Guide","title":"Growing faith through service and adventure","text":"Our clubs help young people know Christ, develop character, and serve their church and community with joy."}',
   '{"accent":"gold","icon":"pathfinders"}'),
  ('hero', 'slide', 2,
   '{"eyebrow":"Comunidad y liderazgo","title":"Empoderando a la juventud con acción compasiva","text":"Líderes y consejeros coordinan clases, especialidades, eventos y asistencia en una sola plataforma."}',
   '{"eyebrow":"Community and leadership","title":"Empowering youth through compassionate action","text":"Leaders and counselors coordinate classes, honors, events, and attendance in one shared platform."}',
   '{"accent":"teal","icon":"adventurers"}'),
  ('hero', 'slide', 3,
   '{"eyebrow":"Misión y discipulado","title":"Transformando vidas, un club a la vez","text":"Desde camporees hasta investiduras, manténgase conectado con horarios, noticias y novedades del club."}',
   '{"eyebrow":"Mission and discipleship","title":"Transforming lives, one club at a time","text":"From camporees to investitures, stay connected with schedules, news, and club updates."}',
   '{"accent":"navy","icon":"masterguide"}'),
  ('hero', 'hero_card', 99,
   '{"title":"Plataforma de ministerio de clubes","text":"Miembros, datos médicos, clases progresivas, eventos y carnets imprimibles."}',
   '{"title":"Club ministry platform","text":"Members, medical data, progressive classes, events, and printable ID cards."}',
   '{"icon":"pathfinders"}')
) AS v(section_key, item_type, orden, content_es, content_en, style_json)
WHERE NOT EXISTS (SELECT 1 FROM public.landing_items WHERE section_key = 'hero' LIMIT 1);

-- Programs
INSERT INTO public.landing_items (section_key, item_type, orden, content_es, content_en, style_json)
SELECT v.section_key, v.item_type, v.orden, v.content_es::jsonb, v.content_en::jsonb, v.style_json::jsonb
FROM (VALUES
  ('programs', 'program', 1,
   '{"title":"Aventureros","text":"Para niños de 4 a 9 años: participación familiar, estrellas y fundamentos bíblicos."}',
   '{"title":"Adventurers","text":"For children ages 4–9: family involvement, stars, and foundational Bible learning."}',
   '{"icon":"adventurers"}'),
  ('programs', 'program', 2,
   '{"title":"Conquistadores","text":"Para edades 10–15: especialidades, camporees, clases y aventura al aire libre."}',
   '{"title":"Pathfinders","text":"For ages 10–15: honors, camporees, class levels, and outdoor discipleship."}',
   '{"icon":"pathfinders"}'),
  ('programs', 'program', 3,
   '{"title":"Master Guide","text":"Desarrollo de liderazgo para jóvenes que mentoran a sus pares en el club."}',
   '{"title":"Master Guide","text":"Leadership development for youth who mentor peers and serve as club role models."}',
   '{"icon":"masterguide"}')
) AS v(section_key, item_type, orden, content_es, content_en, style_json)
WHERE NOT EXISTS (SELECT 1 FROM public.landing_items WHERE section_key = 'programs' LIMIT 1);

-- Stats (about section)
INSERT INTO public.landing_items (section_key, item_type, orden, content_es, content_en, style_json)
SELECT v.section_key, v.item_type, v.orden, v.content_es::jsonb, v.content_en::jsonb, '{}'::jsonb
FROM (VALUES
  ('about', 'stat', 1, '{"value":"120+","label":"Clubes activos"}', '{"value":"120+","label":"Active clubs"}'),
  ('about', 'stat', 2, '{"value":"3.5K+","label":"Miembros registrados"}', '{"value":"3.5K+","label":"Registered members"}'),
  ('about', 'stat', 3, '{"value":"80+","label":"Eventos al año"}', '{"value":"80+","label":"Events per year"}'),
  ('about', 'stat', 4, '{"value":"45+","label":"Iglesias asociadas"}', '{"value":"45+","label":"Partner churches"}')
) AS v(section_key, item_type, orden, content_es, content_en)
WHERE NOT EXISTS (SELECT 1 FROM public.landing_items WHERE section_key = 'about' AND item_type = 'stat' LIMIT 1);

-- Events
INSERT INTO public.landing_items (section_key, item_type, orden, content_es, content_en, style_json)
SELECT v.section_key, v.item_type, v.orden, v.content_es::jsonb, v.content_en::jsonb, '{}'::jsonb
FROM (VALUES
  ('events', 'event', 1,
   '{"date":"2026-06-14","time":"09:00","title":"Investidura de conquistadores","place":"Iglesia central"}',
   '{"date":"2026-06-14","time":"09:00","title":"Pathfinder investiture","place":"Central church"}'),
  ('events', 'event', 2,
   '{"date":"2026-07-05","time":"18:30","title":"Semana del joven adventista","place":"Múltiples iglesias"}',
   '{"date":"2026-07-05","time":"18:30","title":"Adventist Youth Week","place":"Multiple churches"}'),
  ('events', 'event', 3,
   '{"date":"2026-08-02","time":"14:00","title":"Reunión de líderes de club","place":"Salón unión"}',
   '{"date":"2026-08-02","time":"14:00","title":"Club leaders meeting","place":"Conference hall"}')
) AS v(section_key, item_type, orden, content_es, content_en)
WHERE NOT EXISTS (SELECT 1 FROM public.landing_items WHERE section_key = 'events' LIMIT 1);

-- News
INSERT INTO public.landing_items (section_key, item_type, orden, content_es, content_en, style_json)
SELECT v.section_key, v.item_type, v.orden, v.content_es::jsonb, v.content_en::jsonb, v.style_json::jsonb
FROM (VALUES
  ('news', 'news', 1,
   '{"date":"2026-05-10","category":"Eventos","title":"Camporee regional de clubes de conquistadores","excerpt":"Más de 40 clubes se reunirán para honrar a Dios en la naturaleza, practicar especialidades y fortalecer la amistad."}',
   '{"date":"2026-05-10","category":"Events","title":"Regional Pathfinder camporee","excerpt":"Over 40 clubs will gather to honor God in nature, earn honors, and build lasting friendships."}',
   '{}'),
  ('news', 'news', 2,
   '{"date":"2026-04-22","category":"Capacitación","title":"Jornada de especialidades y clases progresivas","excerpt":"Capacitación para líderes y consejeros sobre el plan JA y el registro digital de avances."}',
   '{"date":"2026-04-22","category":"Training","title":"Honors and progressive class workshop","excerpt":"Training for leaders and counselors on the JA plan and digital progress tracking."}',
   '{}'),
  ('news', 'news', 3,
   '{"date":"2026-03-15","category":"Servicio","title":"Impacto juvenil: día de servicio comunitario","excerpt":"Clubes Aventureros y Conquistadores organizaron jornadas de limpieza, visitas y apoyo a familias."}',
   '{"date":"2026-03-15","category":"Service","title":"Youth impact: community service day","excerpt":"Adventurer and Pathfinder clubs organized cleanup drives, visits, and family support activities."}',
   '{}')
) AS v(section_key, item_type, orden, content_es, content_en, style_json)
WHERE NOT EXISTS (SELECT 1 FROM public.landing_items WHERE section_key = 'news' LIMIT 1);

-- Footer contact
INSERT INTO public.landing_items (section_key, item_type, orden, content_es, content_en, style_json)
SELECT v.section_key, v.item_type, v.orden, v.content_es::jsonb, v.content_en::jsonb, '{}'::jsonb
FROM (VALUES
  ('footer', 'contact', 1, '{"email":"youth@example.org","phone":"+57 300 000 0000"}', '{"email":"youth@example.org","phone":"+57 300 000 0000"}')
) AS v(section_key, item_type, orden, content_es, content_en)
WHERE NOT EXISTS (SELECT 1 FROM public.landing_items WHERE section_key = 'footer' LIMIT 1);
