import { EVENTO_ASISTENCIA_ITEM_TIPO } from '../constants/eventoAsistenciaItems';

export function newAsistenciaItemId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `new-${crypto.randomUUID()}`;
  }
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeAsistenciaItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    tipo: row.tipo || EVENTO_ASISTENCIA_ITEM_TIPO.PERSONALIZADO,
    etiqueta: String(row.etiqueta || '').trim(),
    detalle: row.detalle ? String(row.detalle).trim() : '',
    orden: Number.isFinite(Number(row.orden)) ? Number(row.orden) : 0,
  };
}

export function createPresetAsistenciaItem(tipo, { t, orden = 0 } = {}) {
  const presetLabels = {
    [EVENTO_ASISTENCIA_ITEM_TIPO.CUOTA]: t?.('eventItemCuota') || 'Cuota',
    [EVENTO_ASISTENCIA_ITEM_TIPO.BIBLIA]: t?.('eventItemBible') || 'Biblia',
    [EVENTO_ASISTENCIA_ITEM_TIPO.PERSONALIZADO]: '',
  };

  return {
    id: newAsistenciaItemId(),
    tipo,
    etiqueta: presetLabels[tipo] ?? '',
    detalle: '',
    orden,
  };
}

export function sanitizeAsistenciaItemsForSave(items = []) {
  return (items || [])
    .map((item, index) => {
      const normalized = normalizeAsistenciaItem(item);
      if (!normalized) return null;
      const etiqueta = normalized.etiqueta
        || (normalized.tipo === EVENTO_ASISTENCIA_ITEM_TIPO.CUOTA
          ? 'Cuota'
          : normalized.tipo === EVENTO_ASISTENCIA_ITEM_TIPO.BIBLIA
            ? 'Biblia'
            : '');
      if (!etiqueta) return null;
      return {
        ...normalized,
        etiqueta,
        orden: index,
      };
    })
    .filter(Boolean);
}

export function formatAsistenciaItemLine(item, { t } = {}) {
  const normalized = normalizeAsistenciaItem(item);
  if (!normalized) return '';
  const label = normalized.etiqueta
    || (normalized.tipo === EVENTO_ASISTENCIA_ITEM_TIPO.CUOTA
      ? (t?.('eventItemCuota') || 'Cuota')
      : normalized.tipo === EVENTO_ASISTENCIA_ITEM_TIPO.BIBLIA
        ? (t?.('eventItemBible') || 'Biblia')
        : '');
  if (!label) return normalized.detalle || '';
  return normalized.detalle ? `${label}: ${normalized.detalle}` : label;
}

export function mapAsistenciaItemsByKey(rows = [], keyField) {
  const map = {};
  for (const row of rows || []) {
    const item = normalizeAsistenciaItem(row);
    if (!item) continue;
    const key = row[keyField];
    if (!key) continue;
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }
  return map;
}
