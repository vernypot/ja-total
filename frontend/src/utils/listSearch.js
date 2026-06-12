export function normalizeSearch(text) {
  return (text ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function matchesSearch(query, ...fields) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;
  return fields.some(field => normalizeSearch(field).includes(normalizedQuery));
}

export function filterBySearch(items, query, getFields) {
  const trimmed = query?.trim();
  if (!trimmed) return items || [];
  return (items || []).filter(item => matchesSearch(trimmed, ...getFields(item)));
}
