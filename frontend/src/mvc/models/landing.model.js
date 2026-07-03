const HERO_SLIDES = [
  {
    id: 'members',
    eyebrowKey: 'landingHeroEyebrow1',
    titleKey: 'landingHeroTitle1',
    textKey: 'landingHeroText1',
    accent: 'gold',
    screenshot: 'members',
  },
  {
    id: 'progress',
    eyebrowKey: 'landingHeroEyebrow2',
    titleKey: 'landingHeroTitle2',
    textKey: 'landingHeroText2',
    accent: 'teal',
    screenshot: 'progress',
  },
  {
    id: 'carnets',
    eyebrowKey: 'landingHeroEyebrow3',
    titleKey: 'landingHeroTitle3',
    textKey: 'landingHeroText3',
    accent: 'navy',
    screenshot: 'carnets',
  },
];

const PROGRAMS = [
  { id: 'adventurers', icon: 'adventurers', titleKey: 'landingProgramAdventurers', textKey: 'landingProgramAdventurersText' },
  { id: 'pathfinders', icon: 'pathfinders', titleKey: 'landingProgramPathfinders', textKey: 'landingProgramPathfindersText' },
  { id: 'masterguide', icon: 'masterguide', titleKey: 'landingProgramMasterGuide', textKey: 'landingProgramMasterGuideText' },
];

const NEWS = [
  {
    id: 'camporee',
    date: '2026-05-10',
    categoryKey: 'landingNewsCategoryEvents',
    title: { es: 'Camporee regional de clubes de conquistadores', en: 'Regional Pathfinder camporee' },
    excerpt: {
      es: 'Más de 40 clubes se reunirán para honrar a Dios en la naturaleza, practicar especialidades y fortalecer la amistad.',
      en: 'Over 40 clubs will gather to honor God in nature, earn honors, and build lasting friendships.',
    },
  },
  {
    id: 'honors',
    date: '2026-04-22',
    categoryKey: 'landingNewsCategoryTraining',
    title: { es: 'Jornada de especialidades y clases progresivas', en: 'Honors and progressive class workshop' },
    excerpt: {
      es: 'Capacitación para líderes y consejeros sobre el plan JA y el registro digital de avances.',
      en: 'Training for leaders and counselors on the JA plan and digital progress tracking.',
    },
  },
  {
    id: 'service',
    date: '2026-03-15',
    categoryKey: 'landingNewsCategoryService',
    title: { es: 'Impacto juvenil: día de servicio comunitario', en: 'Youth impact: community service day' },
    excerpt: {
      es: 'Clubes Aventureros y Conquistadores organizaron jornadas de limpieza, visitas y apoyo a familias.',
      en: 'Adventurer and Pathfinder clubs organized cleanup drives, visits, and family support activities.',
    },
  },
];

const EVENTS = [
  {
    id: 'investiture',
    date: '2026-06-14',
    time: '09:00',
    title: { es: 'Investidura de conquistadores', en: 'Pathfinder investiture' },
    place: { es: 'Iglesia central', en: 'Central church' },
  },
  {
    id: 'ay-week',
    date: '2026-07-05',
    time: '18:30',
    title: { es: 'Semana del joven adventista', en: 'Adventist Youth Week' },
    place: { es: 'Múltiples iglesias', en: 'Multiple churches' },
  },
  {
    id: 'leader-meet',
    date: '2026-08-02',
    time: '14:00',
    title: { es: 'Reunión de líderes de club', en: 'Club leaders meeting' },
    place: { es: 'Salón union', en: 'Conference hall' },
  },
];

function pickLang(record, language) {
  return record[language] || record.es || record.en || '';
}

export function getHeroSlides() {
  return HERO_SLIDES;
}

export function getPrograms() {
  return PROGRAMS;
}

export function getLandingNews(language) {
  return NEWS.map(item => ({
    id: item.id,
    date: item.date,
    categoryKey: item.categoryKey,
    title: pickLang(item.title, language),
    excerpt: pickLang(item.excerpt, language),
  }));
}

export function getLandingEvents(language) {
  return EVENTS.map(item => ({
    id: item.id,
    date: item.date,
    time: item.time,
    title: pickLang(item.title, language),
    place: pickLang(item.place, language),
  }));
}

export function formatLandingDate(dateStr, language) {
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatEventDay(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('es', { month: 'short' }).replace('.', ''),
  };
}
