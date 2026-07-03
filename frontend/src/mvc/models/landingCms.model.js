import { sb } from '../../services/supabase';

function isMissingTableError(error) {
  const msg = error?.message || '';
  return msg.includes('does not exist') || msg.includes('Could not find the table');
}

function pickLang(record, language) {
  if (!record) return '';
  if (typeof record === 'string') return record;
  return record[language] || record.es || record.en || '';
}

const HERO_SCREENSHOTS = ['members', 'progress', 'carnets'];

const LEGACY_HERO_SCREENSHOT_MAP = {
  pathfinders: 'members',
  adventurers: 'progress',
  masterguide: 'carnets',
  ministerios: 'members',
  members: 'members',
  progress: 'progress',
  carnets: 'carnets',
};

function mapLegacyHeroScreenshot(icon, orden) {
  if (icon && LEGACY_HERO_SCREENSHOT_MAP[icon]) return LEGACY_HERO_SCREENSHOT_MAP[icon];
  const index = Math.max(0, (orden || 1) - 1);
  return HERO_SCREENSHOTS[index % HERO_SCREENSHOTS.length];
}

function normalizeLandingText(text, language) {
  if (typeof text !== 'string' || !text) return text;
  const brand = language === 'en' ? 'Teofila' : 'Teófila';
  let result = text.replace(/JA\s*Total/gi, brand);
  if (language === 'es') {
    result = result.replaceAll('Master Guide', 'Guías Mayores');
  }
  return result;
}

function pickItemContent(item, language) {
  const content = language === 'en' ? item?.content_en : item?.content_es;
  const picked = content || item?.content_es || item?.content_en || {};

  return Object.fromEntries(
    Object.entries(picked).map(([key, value]) => [
      key,
      typeof value === 'string' ? normalizeLandingText(value, language) : value,
    ]),
  );
}

export const SECTION_KEYS = [
  'topbar',
  'hero',
  'programs',
  'about',
  'events',
  'news',
  'cta',
  'footer',
];

export const SECTION_LABELS = {
  topbar: 'Top bar',
  hero: 'Hero carousel',
  programs: 'Programs',
  about: 'About + stats',
  events: 'Events',
  news: 'News',
  cta: 'Call to action',
  footer: 'Footer',
};

export const ITEM_TYPES_BY_SECTION = {
  hero: ['slide', 'hero_card'],
  programs: ['program'],
  about: ['stat'],
  events: ['event'],
  news: ['news'],
  footer: ['contact'],
};

export async function fetchLandingSettings() {
  const { data, error } = await sb
    .from('landing_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return { data: null, error: null, hasTable: false };
    return { data: null, error, hasTable: true };
  }

  return { data, error: null, hasTable: true };
}

export async function saveLandingSettings(payload) {
  const existing = await fetchLandingSettings();
  const row = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  if (existing.data?.id) {
    return sb.from('landing_settings').update(row).eq('id', existing.data.id).select('*').single();
  }

  return sb.from('landing_settings').insert([row]).select('*').single();
}

export async function fetchLandingSections({ includeInactive = true } = {}) {
  let query = sb
    .from('landing_sections')
    .select('*')
    .order('orden', { ascending: true });

  if (!includeInactive) query = query.eq('estado', 'activo').eq('visible', true);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return { data: [], error: null, hasTable: false };
    return { data: [], error, hasTable: true };
  }

  return { data: data || [], error: null, hasTable: true };
}

export async function fetchLandingItems({ sectionKey, includeInactive = true } = {}) {
  let query = sb
    .from('landing_items')
    .select('*')
    .order('orden', { ascending: true });

  if (sectionKey) query = query.eq('section_key', sectionKey);
  if (!includeInactive) query = query.eq('estado', 'activo');

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return { data: [], error: null, hasTable: false };
    return { data: [], error, hasTable: true };
  }

  return { data: data || [], error: null, hasTable: true };
}

export async function fetchPublicLandingCms() {
  const [settingsRes, sectionsRes, itemsRes] = await Promise.all([
    fetchLandingSettings(),
    fetchLandingSections({ includeInactive: false }),
    fetchLandingItems({ includeInactive: false }),
  ]);

  const hasTable = settingsRes.hasTable || sectionsRes.hasTable || itemsRes.hasTable;
  const error = settingsRes.error || sectionsRes.error || itemsRes.error;

  if (!hasTable) {
    return { data: null, error: null, hasCms: false };
  }

  if (error) return { data: null, error, hasCms: true };

  return {
    data: {
      settings: settingsRes.data,
      sections: sectionsRes.data || [],
      items: itemsRes.data || [],
    },
    error: null,
    hasCms: true,
  };
}

export async function saveLandingSection(section) {
  const payload = {
    section_key: section.section_key,
    section_type: section.section_type,
    orden: Number(section.orden) || 0,
    estado: section.estado || 'activo',
    visible: Boolean(section.visible),
    anchor_id: section.anchor_id || null,
    eyebrow_es: section.eyebrow_es || null,
    eyebrow_en: section.eyebrow_en || null,
    title_es: section.title_es || null,
    title_en: section.title_en || null,
    body_es: section.body_es || null,
    body_en: section.body_en || null,
    cta_text_es: section.cta_text_es || null,
    cta_text_en: section.cta_text_en || null,
    style_json: section.style_json || {},
    updated_at: new Date().toISOString(),
  };

  if (section.id) {
    return sb.from('landing_sections').update(payload).eq('id', section.id).select('*').single();
  }

  return sb.from('landing_sections').insert([payload]).select('*').single();
}

export async function deleteLandingSection(id) {
  return sb.from('landing_sections').delete().eq('id', id);
}

export async function patchLandingSection(id, partial) {
  return sb
    .from('landing_sections')
    .update({ ...partial, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
}

export async function patchLandingItem(id, partial) {
  return sb
    .from('landing_items')
    .update({ ...partial, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
}

export async function reindexLandingSections(orderedSections) {
  const updates = orderedSections.map((section, index) =>
    sb
      .from('landing_sections')
      .update({ orden: (index + 1) * 10, updated_at: new Date().toISOString() })
      .eq('id', section.id),
  );
  const results = await Promise.all(updates);
  const error = results.find(r => r.error)?.error || null;
  return { error };
}

export async function reindexLandingItems(orderedItems) {
  const updates = orderedItems.map((item, index) =>
    sb
      .from('landing_items')
      .update({ orden: (index + 1) * 10, updated_at: new Date().toISOString() })
      .eq('id', item.id),
  );
  const results = await Promise.all(updates);
  const error = results.find(r => r.error)?.error || null;
  return { error };
}

export async function saveLandingItem(item) {
  const payload = {
    section_key: item.section_key,
    item_type: item.item_type,
    orden: Number(item.orden) || 0,
    estado: item.estado || 'activo',
    content_es: item.content_es || {},
    content_en: item.content_en || {},
    style_json: item.style_json || {},
    updated_at: new Date().toISOString(),
  };

  if (item.id) {
    return sb.from('landing_items').update(payload).eq('id', item.id).select('*').single();
  }

  return sb.from('landing_items').insert([payload]).select('*').single();
}

export async function deleteLandingItem(id) {
  return sb.from('landing_items').delete().eq('id', id);
}

export function sectionText(section, field, language) {
  if (!section) return '';
  const key = `${field}_${language}`;
  const raw = section[key] || section[`${field}_es`] || section[`${field}_en`] || '';
  return normalizeLandingText(raw, language);
}

export function mapCmsToLandingView({ settings, sections, items }, language) {
  const sectionMap = Object.fromEntries((sections || []).map(s => [s.section_key, s]));
  const itemsBySection = (items || []).reduce((acc, item) => {
    if (!acc[item.section_key]) acc[item.section_key] = [];
    acc[item.section_key].push(item);
    return acc;
  }, {});

  const heroItems = (itemsBySection.hero || [])
    .filter(i => i.item_type === 'slide')
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const heroCard = (itemsBySection.hero || []).find(i => i.item_type === 'hero_card');

  const heroSlides = heroItems.map(item => {
    const content = pickItemContent(item, language);
    return {
      id: item.id,
      eyebrow: content.eyebrow || '',
      title: content.title || '',
      text: content.text || '',
      accent: item.style_json?.accent || 'gold',
      screenshot: item.style_json?.screenshot || mapLegacyHeroScreenshot(item.style_json?.icon, item.orden),
    };
  });

  const heroCardContent = heroCard ? pickItemContent(heroCard, language) : null;

  const programs = (itemsBySection.programs || [])
    .filter(i => i.item_type === 'program')
    .map(item => {
      const content = pickItemContent(item, language);
      return {
        id: item.id,
        icon: item.style_json?.icon || 'pathfinders',
        title: content.title || '',
        text: content.text || '',
      };
    });

  const stats = (itemsBySection.about || [])
    .filter(i => i.item_type === 'stat')
    .map(item => {
      const content = pickItemContent(item, language);
      return {
        id: item.id,
        value: content.value || '',
        label: content.label || '',
      };
    });

  const events = (itemsBySection.events || [])
    .filter(i => i.item_type === 'event')
    .map(item => {
      const content = pickItemContent(item, language);
      return {
        id: item.id,
        date: content.date || '',
        time: content.time || '',
        title: content.title || '',
        place: content.place || '',
      };
    });

  const news = (itemsBySection.news || [])
    .filter(i => i.item_type === 'news')
    .map(item => {
      const content = pickItemContent(item, language);
      return {
        id: item.id,
        date: content.date || '',
        category: content.category || '',
        title: content.title || '',
        excerpt: content.excerpt || '',
      };
    });

  const footerContact = (itemsBySection.footer || []).find(i => i.item_type === 'contact');
  const footerContactContent = footerContact ? pickItemContent(footerContact, language) : null;

  return {
    settings,
    sections: sectionMap,
    heroSlides,
    heroCard: heroCardContent,
    heroCardIcon: heroCard?.style_json?.icon || 'ministerios',
    programs,
    stats,
    events,
    news,
    footerContact: footerContactContent,
    visibleSections: new Set((sections || []).filter(s => s.visible).map(s => s.section_key)),
  };
}

export function buildThemeStyle(settings) {
  if (!settings) return {};
  return {
    '--lp-navy': settings.navy_color,
    '--lp-navy-dark': settings.navy_dark_color,
    '--lp-gold': settings.gold_color,
    '--lp-teal': settings.teal_color,
    '--lp-cream': settings.cream_color,
    '--lp-text': settings.text_color,
    '--lp-font': settings.font_family,
    '--lp-display': settings.display_font,
  };
}

export function emptySectionForm(sectionKey = 'custom') {
  return {
    id: '',
    section_key: sectionKey,
    section_type: 'content',
    orden: 0,
    estado: 'activo',
    visible: true,
    anchor_id: '',
    eyebrow_es: '',
    eyebrow_en: '',
    title_es: '',
    title_en: '',
    body_es: '',
    body_en: '',
    cta_text_es: '',
    cta_text_en: '',
    style_json: { background_color: '', text_color: '' },
  };
}

export function emptyItemForm(sectionKey, itemType) {
  const base = {
    id: '',
    section_key: sectionKey,
    item_type: itemType,
    orden: 0,
    estado: 'activo',
    content_es: {},
    content_en: {},
    style_json: {},
  };

  if (itemType === 'slide') {
    base.content_es = { eyebrow: '', title: '', text: '' };
    base.content_en = { eyebrow: '', title: '', text: '' };
    base.style_json = { accent: 'gold', screenshot: 'members' };
  } else if (itemType === 'hero_card') {
    base.content_es = { title: '', text: '' };
    base.content_en = { title: '', text: '' };
    base.style_json = { icon: 'pathfinders' };
  } else if (itemType === 'program') {
    base.content_es = { title: '', text: '' };
    base.content_en = { title: '', text: '' };
    base.style_json = { icon: 'pathfinders' };
  } else if (itemType === 'stat') {
    base.content_es = { value: '', label: '' };
    base.content_en = { value: '', label: '' };
  } else if (itemType === 'event') {
    base.content_es = { date: '', time: '', title: '', place: '' };
    base.content_en = { date: '', time: '', title: '', place: '' };
  } else if (itemType === 'news') {
    base.content_es = { date: '', category: '', title: '', excerpt: '' };
    base.content_en = { date: '', category: '', title: '', excerpt: '' };
  } else if (itemType === 'contact') {
    base.content_es = { email: '', phone: '' };
    base.content_en = { email: '', phone: '' };
  }

  return base;
}

export function parseJsonField(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export { pickLang, pickItemContent };
