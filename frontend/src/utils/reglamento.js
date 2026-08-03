function parseNonNegative(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

export function buildReglamentoTree(nodos) {
  const byId = {};
  const roots = [];

  for (const nodo of nodos || []) {
    if (!nodo?.id) continue;
    byId[nodo.id] = { ...nodo, children: [] };
  }

  for (const nodo of Object.values(byId)) {
    if (nodo.parent_id && byId[nodo.parent_id]) {
      byId[nodo.parent_id].children.push(nodo);
    } else {
      roots.push(nodo);
    }
  }

  const sortNodes = list => {
    list.sort((a, b) => {
      const orderDiff = (a.orden || 0) - (b.orden || 0);
      if (orderDiff !== 0) return orderDiff;
      return String(a.titulo || '').localeCompare(String(b.titulo || ''));
    });
    for (const node of list) {
      sortNodes(node.children);
    }
  };

  sortNodes(roots);
  return roots;
}

export function buildReglamentoNodosMap(nodos) {
  const map = {};
  for (const nodo of nodos || []) {
    if (nodo?.id) map[nodo.id] = nodo;
  }
  return map;
}

export function getReglamentoPenaltyLeaves(nodos) {
  const active = (nodos || []).filter(n => n?.estado !== 'inactivo');
  const parentIds = new Set(active.map(n => n.parent_id).filter(Boolean));

  return active.filter(nodo => {
    if (parseNonNegative(nodo.puntos_penalizacion, 0) <= 0) return false;
    return !parentIds.has(nodo.id);
  });
}

export function normalizeReglamentoDate(value) {
  if (!value) return null;
  const normalized = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

export function filterInfraccionesForValidationPeriod(infracciones, validationStartDate) {
  const startDate = normalizeReglamentoDate(validationStartDate);
  if (!startDate) return infracciones || [];
  return (infracciones || []).filter(row => {
    const fecha = normalizeReglamentoDate(row?.fecha);
    return fecha && fecha >= startDate;
  });
}

export function computePenaltyPointsForUnidad(unidadId, infracciones, nodosById) {
  let total = 0;

  for (const row of infracciones || []) {
    if (row?.unidad_id !== unidadId) continue;
    const nodo = nodosById?.[row.reglamento_nodo_id];
    if (!nodo) continue;
    const cantidad = parseNonNegative(row.cantidad, 1);
    const puntos = parseNonNegative(nodo.puntos_penalizacion, 0);
    total += cantidad * puntos;
  }

  return total;
}

export function formatPenaltyPoints(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  return parsed % 1 === 0 ? String(parsed) : parsed.toFixed(2);
}

export function reglamentoNivelLabel(nivel, t) {
  if (nivel === 1) return t('reglamentoLevelSection');
  if (nivel === 2) return t('reglamentoLevelItem');
  if (nivel === 3) return t('reglamentoLevelSubItem');
  return '';
}
