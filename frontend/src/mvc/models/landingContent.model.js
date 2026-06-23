import * as LandingCmsModel from './landingCms.model';
import {
  getHeroSlides,
  getPrograms,
  getStats,
  getLandingNews,
  getLandingEvents,
} from './landing.model';

function buildDefaultLanding(language) {
  const heroSlides = getHeroSlides().map(slide => ({
    id: slide.id,
    eyebrowKey: slide.eyebrowKey,
    titleKey: slide.titleKey,
    textKey: slide.textKey,
    accent: slide.accent,
    icon: 'pathfinders',
  }));

  return {
    settings: null,
    themeStyle: {},
    sections: {},
    visibleSections: new Set(['topbar', 'hero', 'programs', 'about', 'events', 'news', 'cta', 'footer']),
    heroSlides,
    heroCard: null,
    heroCardIcon: 'pathfinders',
    programs: getPrograms().map(p => ({
      id: p.id,
      icon: p.icon,
      titleKey: p.titleKey,
      textKey: p.textKey,
    })),
    stats: getStats().map(s => ({
      id: s.id,
      valueKey: s.valueKey,
      labelKey: s.labelKey,
    })),
    news: getLandingNews(language),
    events: getLandingEvents(language),
    footerContact: null,
    fromCms: false,
  };
}

export async function loadLandingContent(language) {
  const { data, error, hasCms } = await LandingCmsModel.fetchPublicLandingCms();

  if (!hasCms || error || !data?.sections?.length) {
    return {
      ...buildDefaultLanding(language),
      cmsError: error,
      hasCms: false,
    };
  }

  const mapped = LandingCmsModel.mapCmsToLandingView(data, language);

  return {
    ...mapped,
    themeStyle: LandingCmsModel.buildThemeStyle(mapped.settings),
    fromCms: true,
    hasCms: true,
    cmsError: null,
  };
}

export function getSectionCopy(sections, key, field, language, t) {
  const section = sections?.[key];
  if (section) {
    const text = LandingCmsModel.sectionText(section, field, language);
    if (text) return text;
  }

  const fallbackKeys = {
    topbar: { eyebrow: 'landingTopbarTag', body: 'landingTopbarContact' },
    programs: { eyebrow: 'landingProgramsEyebrow', title: 'landingProgramsTitle', body: 'landingProgramsText' },
    about: { eyebrow: 'landingAboutEyebrow', title: 'landingAboutTitle', body: 'landingAboutText', cta_text: 'landingAboutCta' },
    events: { eyebrow: 'landingEventsEyebrow', title: 'landingEventsTitle', body: 'landingEventsText' },
    news: { eyebrow: 'landingNewsEyebrow', title: 'landingNewsTitle', body: 'landingNewsText' },
    cta: { title: 'landingCtaTitle', body: 'landingCtaText', cta_text: 'landingCtaButton' },
    footer: { body: 'landingFooterAbout' },
  };

  const keyName = fallbackKeys[key]?.[field];
  return keyName ? t(keyName) : '';
}

export function resolveSlideText(slide, field, t) {
  if (slide?.[field]) return slide[field];
  const keyField = `${field}Key`;
  if (slide?.[keyField]) return t(slide[keyField]);
  return '';
}

export function resolveProgramText(program, field, t) {
  if (program?.[field]) return program[field];
  const keyField = `${field}Key`;
  if (program?.[keyField]) return t(program[keyField]);
  return '';
}

export function resolveStatText(stat, field, t) {
  if (stat?.[field]) return stat[field];
  const keyField = `${field}Key`;
  if (stat?.[keyField]) return t(stat[keyField]);
  return '';
}
