import {
  createMemberMergedAttendanceHelpers,
  eventRequiresConfirmation,
  filterRowsForMemberAttendanceStats,
  getAsistenciaFromRow,
  getAsistenciaJustificadaFromRow,
  getConfirmacionFromRow,
  getCuotaPagadaFromRow,
  getEventoFromRow,
  isEventInFuture,
  isEventoIncludedInMemberStats,
} from '../mvc/models/eventos.model';
import { normalizeEventDate } from './eventTimezone';

export const ATTENDANCE_EVAL_KEYS = [
  'confirmacion',
  'a_tiempo',
  'tarde',
  'ausente_injustificada',
  'ausente_justificada',
];

export const DEFAULT_UNIDAD_EVAL_CONFIG = {
  confirmacion_activa: true,
  confirmacion_puntos: 1,
  a_tiempo_activa: true,
  a_tiempo_puntos: 1,
  tarde_activa: true,
  tarde_puntos: 1,
  ausente_injustificada_activa: true,
  ausente_injustificada_puntos: 0,
  ausente_justificada_activa: true,
  ausente_justificada_puntos: 0,
  cuota_activa: true,
  cuota_puntos: 1,
};

const ATTENDANCE_CONFIG_FIELDS = [
  ['confirmacion_activa', 'confirmacion_puntos'],
  ['a_tiempo_activa', 'a_tiempo_puntos'],
  ['tarde_activa', 'tarde_puntos'],
  ['ausente_injustificada_activa', 'ausente_injustificada_puntos'],
  ['ausente_justificada_activa', 'ausente_justificada_puntos'],
];

export function parsePoints(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

export function normalizeValidationStartDate(value) {
  if (!value) return null;
  const normalized = normalizeEventDate(value);
  return normalized || null;
}

export function isUnidadValidationActive(validationStartDate, refDate = new Date()) {
  const startDate = normalizeValidationStartDate(validationStartDate);
  if (!startDate) return true;
  const today = refDate.toISOString().slice(0, 10);
  return today >= startDate;
}

export function isEventOnOrAfterValidationStart(evento, validationStartDate) {
  const startDate = normalizeValidationStartDate(validationStartDate);
  if (!startDate) return true;
  const eventDate = normalizeEventDate(evento?.fecha);
  if (!eventDate) return false;
  return eventDate >= startDate;
}

export function filterRowsForUnidadValidationPeriod(rows, validationStartDate) {
  if (!normalizeValidationStartDate(validationStartDate)) {
    return rows || [];
  }
  return (rows || []).filter(row => isEventOnOrAfterValidationStart(getEventoFromRow(row), validationStartDate));
}

export function formatValidationStartDate(value, language = 'es') {
  const normalized = normalizeValidationStartDate(value);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return normalized;
  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function normalizeEvalConfig(config) {
  const normalized = {
    cuota_activa: config?.cuota_activa !== false,
    cuota_puntos: parsePoints(config?.cuota_puntos, 1),
  };

  for (const [activaKey, puntosKey] of ATTENDANCE_CONFIG_FIELDS) {
    const category = activaKey.replace('_activa', '');
    const legacyPoints = config?.asistencia_puntos;
    normalized[activaKey] = config?.[activaKey] !== false && config?.asistencia_activa !== false;
    normalized[puntosKey] = parsePoints(
      config?.[puntosKey] ?? (category === 'a_tiempo' ? legacyPoints : undefined),
      category === 'ausente_injustificada' || category === 'ausente_justificada' ? 0 : 1,
    );
  }

  return normalized;
}

export function createEmptyAttendanceBreakdown() {
  return {
    confirmacion: 0,
    a_tiempo: 0,
    tarde: 0,
    ausente_injustificada: 0,
    ausente_justificada: 0,
  };
}

export function buildCantidadMap(cantidades) {
  const map = {};
  for (const row of cantidades || []) {
    if (!row?.unidad_id || !row?.eval_item_id) continue;
    if (!map[row.unidad_id]) map[row.unidad_id] = {};
    map[row.unidad_id][row.eval_item_id] = parsePoints(row.cantidad, 0);
  }
  return map;
}

export function countMemberAttendanceBreakdown(memberRows, helpers) {
  const counts = createEmptyAttendanceBreakdown();
  const seenEventIds = new Set();

  for (const row of memberRows || []) {
    const evento = getEventoFromRow(row);
    if (!isEventoIncludedInMemberStats(evento)) continue;
    if (isEventInFuture(evento)) continue;

    const eventoId = evento?.id;
    if (!eventoId || seenEventIds.has(eventoId)) continue;
    seenEventIds.add(eventoId);

    const asistencia = helpers.getAsistenciaFromRow(row);
    const justificada = getAsistenciaJustificadaFromRow(row);
    const confirmacion = getConfirmacionFromRow(row);

    if (eventRequiresConfirmation(evento) && confirmacion === 'confirmado') {
      counts.confirmacion += 1;
    }

    if (asistencia === 'a_tiempo') {
      counts.a_tiempo += 1;
    } else if (asistencia === 'tarde') {
      counts.tarde += 1;
    } else if (asistencia === 'ausente' && justificada) {
      counts.ausente_justificada += 1;
    } else {
      counts.ausente_injustificada += 1;
    }
  }

  return counts;
}

export function countMemberOpportunities(memberRows, helpers) {
  const opportunities = {
    pastSlots: 0,
    confirmationSlots: 0,
    cuotaSlots: 0,
  };
  const seenEventIds = new Set();

  for (const row of memberRows || []) {
    const evento = getEventoFromRow(row);
    if (!isEventoIncludedInMemberStats(evento)) continue;
    if (isEventInFuture(evento)) continue;

    const eventoId = evento?.id;
    if (!eventoId || seenEventIds.has(eventoId)) continue;
    seenEventIds.add(eventoId);

    opportunities.pastSlots += 1;
    if (eventRequiresConfirmation(evento)) {
      opportunities.confirmationSlots += 1;
    }
    if (evento?.cuota_aplica) {
      opportunities.cuotaSlots += 1;
    }
  }

  return opportunities;
}

function categoryPoints(count, config, key) {
  if (!config[`${key}_activa`]) return 0;
  return (count || 0) * config[`${key}_puntos`];
}

export function computeMemberEfficiencyEarned(breakdown, cuotaCount, config) {
  const normalizedConfig = normalizeEvalConfig(config);
  let earned = 0;

  for (const key of ATTENDANCE_EVAL_KEYS) {
    earned += categoryPoints(breakdown[key], normalizedConfig, key);
  }

  if (normalizedConfig.cuota_activa) {
    earned += (cuotaCount || 0) * normalizedConfig.cuota_puntos;
  }

  return earned;
}

export function computeMemberEfficiencyMax(opportunities, config) {
  const normalizedConfig = normalizeEvalConfig(config);
  let max = 0;

  if (normalizedConfig.confirmacion_activa) {
    max += (opportunities.confirmationSlots || 0) * normalizedConfig.confirmacion_puntos;
  }

  const attendWeight = Math.max(
    normalizedConfig.a_tiempo_activa ? normalizedConfig.a_tiempo_puntos : 0,
    normalizedConfig.tarde_activa ? normalizedConfig.tarde_puntos : 0,
  );
  if (attendWeight > 0) {
    max += (opportunities.pastSlots || 0) * attendWeight;
  }

  if (normalizedConfig.cuota_activa) {
    max += (opportunities.cuotaSlots || 0) * normalizedConfig.cuota_puntos;
  }

  return max;
}

export function computeMemberExcellenceEarned(breakdown, otherPerMember, config) {
  const normalizedConfig = normalizeEvalConfig(config);
  return categoryPoints(breakdown.a_tiempo, normalizedConfig, 'a_tiempo') + (otherPerMember || 0);
}

export function computeMemberExcellenceMax(opportunities, otherPerMember, config) {
  const normalizedConfig = normalizeEvalConfig(config);
  let max = 0;

  if (normalizedConfig.a_tiempo_activa) {
    max += (opportunities.pastSlots || 0) * normalizedConfig.a_tiempo_puntos;
  }

  if (otherPerMember > 0) {
    max += otherPerMember;
  }

  return max;
}

export function toEvalPercent(earned, max) {
  if (!max || max <= 0) return null;
  const percent = (earned / max) * 100;
  return Math.round(Math.max(0, Math.min(100, percent)));
}

export function computeUnidadPercentages({
  memberIds,
  relevantRows,
  helpers,
  config,
  otherPoints,
}) {
  const ids = [...(memberIds || [])];
  const memberCount = ids.length;
  const otherPerMember = memberCount > 0 ? (otherPoints || 0) / memberCount : 0;

  if (!memberCount) {
    return {
      memberCount: 0,
      efficiencyPercent: null,
      excellencePercent: null,
    };
  }

  let efficiencyTotal = 0;
  let efficiencyMembers = 0;
  let excellenceTotal = 0;
  let excellenceMembers = 0;

  for (const memberId of ids) {
    const memberRows = relevantRows.filter(row => row.miembro_id === memberId);
    const breakdown = countMemberAttendanceBreakdown(memberRows, helpers);
    const opportunities = countMemberOpportunities(memberRows, helpers);
    const cuotaCount = countMemberPaidCuotas(memberRows, helpers);

    const efficiencyEarned = computeMemberEfficiencyEarned(breakdown, cuotaCount, config);
    const efficiencyMax = computeMemberEfficiencyMax(opportunities, config);
    const efficiencyPercent = toEvalPercent(efficiencyEarned, efficiencyMax);
    if (efficiencyPercent != null) {
      efficiencyTotal += efficiencyPercent;
      efficiencyMembers += 1;
    }

    const excellenceEarned = computeMemberExcellenceEarned(breakdown, otherPerMember, config);
    const excellenceMax = computeMemberExcellenceMax(opportunities, otherPerMember, config);
    const excellencePercent = toEvalPercent(excellenceEarned, excellenceMax);
    if (excellencePercent != null) {
      excellenceTotal += excellencePercent;
      excellenceMembers += 1;
    }
  }

  return {
    memberCount,
    efficiencyPercent: efficiencyMembers > 0
      ? Math.round(efficiencyTotal / efficiencyMembers)
      : null,
    excellencePercent: excellenceMembers > 0
      ? Math.round(excellenceTotal / excellenceMembers)
      : null,
  };
}

export function computeAttendancePoints(breakdown, config) {
  const normalizedConfig = normalizeEvalConfig(config);
  const points = {
    confirmacion: 0,
    a_tiempo: 0,
    tarde: 0,
    ausente_injustificada: 0,
    ausente_justificada: 0,
    total: 0,
  };

  for (const key of ATTENDANCE_EVAL_KEYS) {
    const activaKey = `${key}_activa`;
    const puntosKey = `${key}_puntos`;
    if (!normalizedConfig[activaKey]) continue;
    const categoryPoints = (breakdown[key] || 0) * normalizedConfig[puntosKey];
    points[key] = categoryPoints;
    points.total += categoryPoints;
  }

  return points;
}

export function countMemberPaidCuotas(memberRows, helpers) {
  let count = 0;

  for (const row of memberRows || []) {
    const evento = getEventoFromRow(row);
    if (!evento?.cuota_aplica) continue;
    if (!isEventoIncludedInMemberStats(evento)) continue;
    if (!helpers.memberAttendedEvent(row)) continue;
    if (!getCuotaPagadaFromRow(row)) continue;
    count += 1;
  }

  return count;
}

export function computeOtherPointsForUnidad(unidadId, evalItems, cantidadMap) {
  const byItem = cantidadMap[unidadId] || {};
  let total = 0;

  for (const item of evalItems || []) {
    if (!item?.id) continue;
    const cantidad = parsePoints(byItem[item.id], 0);
    const puntos = parsePoints(item.puntos, 0);
    total += cantidad * puntos;
  }

  return total;
}

export function computeUnidadEvaluation({
  unidad,
  memberEventRows,
  config,
  evalItems,
  cantidadMap,
}) {
  const normalizedConfig = normalizeEvalConfig(config);
  const memberIds = new Set(
    (unidad?.miembro_unidad || []).map(row => row.miembro_id).filter(Boolean)
  );

  const validationStartDate = unidad?.evaluacion_inicio_fecha || null;
  const validationActive = isUnidadValidationActive(validationStartDate);

  const baseRows = filterRowsForMemberAttendanceStats(
    (memberEventRows || []).filter(row => memberIds.has(row.miembro_id))
  );
  const relevantRows = validationActive
    ? filterRowsForUnidadValidationPeriod(baseRows, validationStartDate)
    : [];
  const helpers = createMemberMergedAttendanceHelpers(relevantRows);

  const breakdown = createEmptyAttendanceBreakdown();
  let cuotaCount = 0;

  for (const memberId of memberIds) {
    const memberRows = relevantRows.filter(row => row.miembro_id === memberId);
    const memberBreakdown = countMemberAttendanceBreakdown(memberRows, helpers);
    for (const key of ATTENDANCE_EVAL_KEYS) {
      breakdown[key] += memberBreakdown[key];
    }
    cuotaCount += countMemberPaidCuotas(memberRows, helpers);
  }

  const attendanceByCategory = computeAttendancePoints(breakdown, normalizedConfig);
  const cuotaPoints = normalizedConfig.cuota_activa
    ? cuotaCount * normalizedConfig.cuota_puntos
    : 0;
  const otherPoints = validationActive
    ? computeOtherPointsForUnidad(unidad?.id, evalItems, cantidadMap)
    : 0;
  const total = attendanceByCategory.total + cuotaPoints + otherPoints;
  const percentages = computeUnidadPercentages({
    memberIds,
    relevantRows,
    helpers,
    config: normalizedConfig,
    otherPoints,
  });

  return {
    unidadId: unidad?.id,
    memberCount: percentages.memberCount,
    breakdown,
    cuotaCount,
    attendanceByCategory,
    attendancePoints: attendanceByCategory.total,
    cuotaPoints,
    otherPoints,
    total,
    efficiencyPercent: validationActive ? percentages.efficiencyPercent : null,
    excellencePercent: validationActive ? percentages.excellencePercent : null,
    evaluacionInicioFecha: validationStartDate,
    validationActive,
  };
}

export function computeAllUnidadEvaluations({
  unidades,
  memberEventRows,
  config,
  evalItems,
  cantidades,
}) {
  const cantidadMap = buildCantidadMap(cantidades);
  const scoresByUnidadId = {};

  for (const unidad of unidades || []) {
    if (!unidad?.id) continue;
    scoresByUnidadId[unidad.id] = computeUnidadEvaluation({
      unidad,
      memberEventRows,
      config,
      evalItems,
      cantidadMap,
    });
  }

  return scoresByUnidadId;
}

export function formatEvalPercent(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `${Math.round(Number(value))}%`;
}

export function formatEvalPoints(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0';
  if (Number.isInteger(parsed)) return String(parsed);
  return parsed.toFixed(2).replace(/\.?0+$/, '');
}

export { getAsistenciaJustificadaFromRow } from '../mvc/models/eventos.model';

export function getAttendanceDisplayEstado(row) {
  const estado = getAsistenciaFromRow(row);
  if (estado === 'ausente' && getAsistenciaJustificadaFromRow(row)) {
    return 'ausente_justificado';
  }
  return estado || null;
}
