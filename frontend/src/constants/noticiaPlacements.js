export const NOTICIA_PLACEMENTS = [
  { id: 'dashboard', labelKey: 'noticiasPlacementDashboard' },
  { id: 'landing', labelKey: 'noticiasPlacementLanding' },
  { id: 'newsletter', labelKey: 'noticiasPlacementNewsletter' },
  { id: 'hero_slider', labelKey: 'noticiasPlacementHeroSlider' },
  { id: 'standalone_banner', labelKey: 'noticiasPlacementBanner' },
];

export const NOTICIA_PLACEMENT_IDS = NOTICIA_PLACEMENTS.map(p => p.id);

export const DEFAULT_NOTICIA_PLACEMENTS = ['dashboard'];

export function normalizePlacements(value) {
  if (!Array.isArray(value)) return [...DEFAULT_NOTICIA_PLACEMENTS];
  const filtered = value.filter(p => NOTICIA_PLACEMENT_IDS.includes(p));
  return filtered.length ? filtered : [...DEFAULT_NOTICIA_PLACEMENTS];
}

export function togglePlacement(placements, id) {
  const set = new Set(normalizePlacements(placements));
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  const next = [...set];
  return next.length ? next : [...DEFAULT_NOTICIA_PLACEMENTS];
}
