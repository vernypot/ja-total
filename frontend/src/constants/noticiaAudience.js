export const NOTICIA_AUDIENCES = [
  { id: 'general', labelKey: 'noticiasAudienceGeneral' },
  { id: 'church', labelKey: 'noticiasAudienceChurch' },
  { id: 'club', labelKey: 'noticiasAudienceClub' },
];

export const NOTICIA_AUDIENCE_IDS = NOTICIA_AUDIENCES.map(a => a.id);

export const DEFAULT_NOTICIA_AUDIENCE = 'church';

export function normalizeAudience(value) {
  return NOTICIA_AUDIENCE_IDS.includes(value) ? value : DEFAULT_NOTICIA_AUDIENCE;
}

export function audienceRequiresClub(audience) {
  return normalizeAudience(audience) === 'club';
}

export function matchesNoticiaAudience(noticia, { iglesiaId, clubId } = {}) {
  const audience = normalizeAudience(noticia?.audience);
  if (audience === 'general') return true;
  if (audience === 'church') return Boolean(iglesiaId && noticia?.iglesia_id === iglesiaId);
  if (audience === 'club') {
    return Boolean(
      iglesiaId
      && clubId
      && noticia?.iglesia_id === iglesiaId
      && noticia?.club_id === clubId,
    );
  }
  return false;
}

export function filterNoticiasByAudience(items, scope) {
  return (items || []).filter(item => matchesNoticiaAudience(item, scope));
}
