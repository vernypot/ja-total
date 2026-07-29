export const NOTICIA_PLACEMENTS = [
  { id: 'dashboard', labelKey: 'noticiasPlacementDashboard' },
  { id: 'landing', labelKey: 'noticiasPlacementLanding' },
  { id: 'newsletter', labelKey: 'noticiasPlacementNewsletter' },
  { id: 'hero_slider', labelKey: 'noticiasPlacementHeroSlider' },
  { id: 'standalone_banner', labelKey: 'noticiasPlacementBanner' },
];

export const NOTICIA_PLACEMENT_IDS = NOTICIA_PLACEMENTS.map(p => p.id);

export const DEFAULT_NOTICIA_PLACEMENTS = ['dashboard'];

/** Surfaces merged into the public landing #noticias section */
export const NOTICIA_LANDING_SECTION_PLACEMENTS = ['landing', 'dashboard'];

/** Any placement that allows anonymous read via direct URL */
export const NOTICIA_PUBLIC_SURFACES = [
  'landing',
  'dashboard',
  'hero_slider',
  'standalone_banner',
];

export function hasPublicNoticiaSurface(placements) {
  const normalized = normalizePlacements(placements, { allowEmpty: true });
  return normalized.some(p => NOTICIA_PUBLIC_SURFACES.includes(p));
}

export function normalizePlacements(value, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    return allowEmpty ? [] : [...DEFAULT_NOTICIA_PLACEMENTS];
  }
  const filtered = value.filter(p => NOTICIA_PLACEMENT_IDS.includes(p));
  if (filtered.length) return filtered;
  return allowEmpty ? [] : [...DEFAULT_NOTICIA_PLACEMENTS];
}

export function togglePlacement(placements, id) {
  const set = new Set(
    Array.isArray(placements)
      ? placements.filter(p => NOTICIA_PLACEMENT_IDS.includes(p))
      : []
  );
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  return [...set];
}

export function clearAllPlacements() {
  return [];
}
