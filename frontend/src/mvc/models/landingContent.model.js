import * as LandingCmsModel from './landingCms.model';
import * as NoticiasModel from './noticias.model';
import { buildUsageStatCards, fetchPublicUsageStats } from './landingUsageStats.model';
import {
  getHeroSlides,
  getStorySlides,
  getPrograms,
  getLandingNews,
  getLandingEvents,
} from './landing.model';

function applyUsageStats(landing, usage, language) {
  return {
    ...landing,
    stats: buildUsageStatCards(usage, language),
  };
}

function buildBaseHeroSlides() {
  return getHeroSlides().map(slide => ({
    id: slide.id,
    eyebrowKey: slide.eyebrowKey,
    titleKey: slide.titleKey,
    textKey: slide.textKey,
    accent: slide.accent,
    screenshot: slide.screenshot,
  }));
}

function buildStorySlides() {
  return getStorySlides().map(slide => ({
    id: slide.id,
    layout: slide.layout,
    eyebrowKey: slide.eyebrowKey,
    taglineKey: slide.taglineKey,
    titleKey: slide.titleKey,
    textKey: slide.textKey,
    text2Key: slide.text2Key,
    accent: slide.accent,
    screenshot: slide.screenshot,
    visual: slide.visual,
  }));
}

function mergeHeroSlides(baseSlides) {
  return [...baseSlides, ...buildStorySlides()];
}

function buildDefaultLanding(language) {
  return {
    settings: null,
    themeStyle: {},
    sections: {},
    visibleSections: new Set(['topbar', 'hero', 'programs', 'about', 'events', 'news', 'cta', 'footer']),
    heroSlides: mergeHeroSlides(buildBaseHeroSlides()),
    heroCard: null,
    heroCardIcon: null,
    programs: getPrograms().map(p => ({
      id: p.id,
      icon: p.icon,
      titleKey: p.titleKey,
      textKey: p.textKey,
    })),
    stats: buildUsageStatCards(null, language),
    news: getLandingNews(language),
    events: getLandingEvents(language),
    footerContact: null,
    fromCms: false,
  };
}

export async function loadLandingContent(language) {
  const [cmsResult, landingNewsResult, heroNewsResult, bannerNewsResult, usageResult] = await Promise.all([
    LandingCmsModel.fetchPublicLandingCms(),
    NoticiasModel.fetchPublicNoticias({ placements: ['landing'], limit: 6 }),
    NoticiasModel.fetchPublicNoticias({ placements: ['hero_slider'], limit: 5 }),
    NoticiasModel.fetchPublicNoticias({ placements: ['standalone_banner'], limit: 1 }),
    fetchPublicUsageStats(),
  ]);

  const usageStats = usageResult.data;

  const dbLandingNews = (landingNewsResult.data || []).map(n => NoticiasModel.mapNoticiaToLandingCard(n, language));
  const dbHeroSlides = (heroNewsResult.data || []).map(n => NoticiasModel.mapNoticiaToHeroSlide(n));
  const bannerNoticias = bannerNewsResult.data || [];

  const { data, error, hasCms } = cmsResult;

  if (!hasCms || error || !data?.sections?.length) {
    const defaults = applyUsageStats(buildDefaultLanding(language), usageStats, language);
    const heroBase = dbHeroSlides.length
      ? [...dbHeroSlides, ...buildBaseHeroSlides()]
      : buildBaseHeroSlides();

    return {
      ...defaults,
      news: dbLandingNews.length ? dbLandingNews : defaults.news,
      heroSlides: mergeHeroSlides(heroBase),
      bannerNoticias,
      cmsError: error,
      hasCms: false,
      usageStatsError: usageResult.error,
    };
  }

  const mapped = LandingCmsModel.mapCmsToLandingView(data, language);
  const withUsage = applyUsageStats(mapped, usageStats, language);
  const heroBase = dbHeroSlides.length
    ? [...dbHeroSlides, ...mapped.heroSlides]
    : mapped.heroSlides;

  return {
    ...withUsage,
    news: dbLandingNews.length ? dbLandingNews : mapped.news,
    heroSlides: mergeHeroSlides(heroBase),
    bannerNoticias,
    themeStyle: LandingCmsModel.buildThemeStyle(mapped.settings),
    fromCms: true,
    hasCms: true,
    cmsError: null,
    usageStatsError: usageResult.error,
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
