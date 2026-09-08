import {
  createMemberMergedAttendanceHelpers,
  eventRequiresConfirmation,
  filterRowsForUnidadEvalStats,
  getAsistenciaFromRow,
  getAsistenciaJustificadaFromRow,
  getConfirmacionFromRow,
  getCuotaPagadaFromRow,
  getEventoFromRow,
  isEventoIncludedInUnidadEval,
} from '../mvc/models/eventos.model';
import { normalizeEventDate, compareEventsByLocalDateTime } from './eventTimezone';
import {
  computePenaltyPointsForUnidad,
  filterInfraccionesForValidationPeriod,
} from './reglamento';

export const ATTENDANCE_EVAL_KEYS = [
  'confirmacion',
  'a_tiempo',
  'tarde',
  'ausente_injustificada',
  'ausente_justificada',
];

export const ATTENDANCE_SCORE_KEYS = [
  'a_tiempo',
  'tarde',
  'ausente_justificada',
  'ausente_injustificada',
  'confirmado_a_tiempo',
  'confirmado_tarde',
  'no_confirmado_a_tiempo',
  'no_confirmado_tarde',
  'confirmado_ausente',
  'no_confirmado_ausente',
];

export const ATTENDANCE_SCORE_FIELD_GROUPS = [
  {
    titleKey: 'unidadEvalAttendanceSchemeWithoutConfirmation',
    fields: [
      { key: 'a_tiempo', labelKey: 'unidadEvalOnTimeLabel' },
      { key: 'tarde', labelKey: 'unidadEvalLateLabel' },
      { key: 'ausente_justificada', labelKey: 'unidadEvalAbsentJustifiedLabel' },
      { key: 'ausente_injustificada', labelKey: 'unidadEvalAbsentUnjustifiedLabel' },
    ],
  },
  {
    titleKey: 'unidadEvalAttendanceSchemeWithConfirmation',
    fields: [
      { key: 'confirmado_a_tiempo', labelKey: 'unidadEvalScoreConfirmedOnTime' },
      { key: 'confirmado_tarde', labelKey: 'unidadEvalScoreConfirmedLate' },
      { key: 'no_confirmado_a_tiempo', labelKey: 'unidadEvalScoreUnconfirmedOnTime' },
      { key: 'no_confirmado_tarde', labelKey: 'unidadEvalScoreUnconfirmedLate' },
      { key: 'confirmado_ausente', labelKey: 'unidadEvalScoreConfirmedAbsent' },
      { key: 'no_confirmado_ausente', labelKey: 'unidadEvalScoreUnconfirmedAbsent' },
    ],
    sharedNoteKey: 'unidadEvalScoreJustifiedSharedNote',
  },
];

/** Default per-meeting scores when confirmation is NOT required (0–10, negatives allowed). */
export const ATTENDANCE_SCORE_WITHOUT_CONFIRMATION = {
  a_tiempo: 10,
  tarde: 7,
  ausente_justificada: 0,
  ausente_injustificada: -5,
};

/** Default per-meeting scores when confirmation IS required. */
export const ATTENDANCE_SCORE_WITH_CONFIRMATION = {
  confirmado_a_tiempo: 10,
  confirmado_tarde: 7,
  no_confirmado_a_tiempo: 8,
  no_confirmado_tarde: 5,
  ausente_justificada: 0,
  no_confirmado_ausente: -5,
  confirmado_ausente: -8,
};

const DEFAULT_SCORE_VALUES = {
  ...ATTENDANCE_SCORE_WITHOUT_CONFIRMATION,
  ...ATTENDANCE_SCORE_WITH_CONFIRMATION,
};

export const DEFAULT_UNIDAD_EVAL_CONFIG = Object.fromEntries([
  ...ATTENDANCE_SCORE_KEYS.flatMap(key => ([
    [`${key}_activa`, true],
    [`${key}_puntos`, DEFAULT_SCORE_VALUES[key] ?? 0],
  ])),
  ['cuota_activa', true],
  ['cuota_puntos', 1],
  ['confirmacion_activa', true],
  ['confirmacion_puntos', 10],
]);

const LEGACY_ATTENDANCE_CONFIG_FIELDS = [
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

export function parseScorePoints(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
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
    confirmacion_activa: config?.confirmacion_activa !== false,
    confirmacion_puntos: parseScorePoints(config?.confirmacion_puntos, 10),
  };

  for (const key of ATTENDANCE_SCORE_KEYS) {
    const activaKey = `${key}_activa`;
    const puntosKey = `${key}_puntos`;
    normalized[activaKey] = config?.[activaKey] !== false;
    normalized[puntosKey] = parseScorePoints(
      config?.[puntosKey],
      DEFAULT_SCORE_VALUES[key] ?? 0,
    );
  }

  return normalized;
}

export function getConfigScore(config, key) {
  const normalized = normalizeEvalConfig(config);
  if (!normalized[`${key}_activa`]) return 0;
  return normalized[`${key}_puntos`];
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
    if (!isEventoIncludedInUnidadEval(evento)) continue;

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

export function computeEventAttendanceScore(row, helpers, config = DEFAULT_UNIDAD_EVAL_CONFIG) {
  const evento = getEventoFromRow(row);
  if (!isEventoIncludedInUnidadEval(evento)) return null;

  const asistencia = helpers.getAsistenciaFromRow(row);
  const justificada = getAsistenciaJustificadaFromRow(row);
  const confirmacion = getConfirmacionFromRow(row);
  const requiresConfirmation = eventRequiresConfirmation(evento);
  const confirmed = confirmacion === 'confirmado';

  const isAbsent = !asistencia || asistencia === 'ausente';

  if (isAbsent && justificada) {
    return getConfigScore(config, 'ausente_justificada');
  }

  if (!requiresConfirmation) {
    if (asistencia === 'a_tiempo') return getConfigScore(config, 'a_tiempo');
    if (asistencia === 'tarde') return getConfigScore(config, 'tarde');
    return getConfigScore(config, 'ausente_injustificada');
  }

  if (asistencia === 'a_tiempo') {
    return confirmed
      ? getConfigScore(config, 'confirmado_a_tiempo')
      : getConfigScore(config, 'no_confirmado_a_tiempo');
  }

  if (asistencia === 'tarde') {
    return confirmed
      ? getConfigScore(config, 'confirmado_tarde')
      : getConfigScore(config, 'no_confirmado_tarde');
  }

  return confirmed
    ? getConfigScore(config, 'confirmado_ausente')
    : getConfigScore(config, 'no_confirmado_ausente');
}

export function computeMemberAttendanceScoreStats(memberRows, helpers, config = DEFAULT_UNIDAD_EVAL_CONFIG) {
  const normalizedConfig = normalizeEvalConfig(config);
  const seenEventIds = new Set();
  let total = 0;
  let count = 0;

  for (const row of memberRows || []) {
    const evento = getEventoFromRow(row);
    if (!isEventoIncludedInUnidadEval(evento)) continue;

    const eventoId = evento?.id;
    if (!eventoId || seenEventIds.has(eventoId)) continue;
    seenEventIds.add(eventoId);

    let score = computeEventAttendanceScore(row, helpers, normalizedConfig);
    if (score == null) continue;

    if (
      normalizedConfig.cuota_activa
      && evento?.cuota_aplica
      && helpers.memberAttendedEvent(row)
      && getCuotaPagadaFromRow(row)
    ) {
      score += normalizedConfig.cuota_puntos;
    }

    total += score;
    count += 1;
  }

  return {
    total,
    count,
    average: count > 0 ? total / count : null,
  };
}

export function computeMemberEvalAttendanceScore({
  memberRows,
  helpers,
  config = DEFAULT_UNIDAD_EVAL_CONFIG,
  validationStartDate = null,
}) {
  const validationActive = isUnidadValidationActive(validationStartDate);
  if (!validationActive) {
    return {
      average: null,
      total: 0,
      count: 0,
      validationActive: false,
    };
  }

  const evalRows = filterRowsForUnidadValidationPeriod(
    filterRowsForUnidadEvalStats(memberRows),
    validationStartDate,
  );
  const stats = computeMemberAttendanceScoreStats(evalRows, helpers, config);

  return {
    average: roundAttendanceScore(stats.average),
    total: stats.total,
    count: stats.count,
    validationActive: true,
  };
}

export function resolveEventScoreSituationKey(row, helpers) {
  const evento = getEventoFromRow(row);
  const asistencia = helpers.getAsistenciaFromRow(row);
  const justificada = getAsistenciaJustificadaFromRow(row);
  const confirmacion = getConfirmacionFromRow(row);
  const requiresConfirmation = eventRequiresConfirmation(evento);
  const confirmed = confirmacion === 'confirmado';
  const isAbsent = !asistencia || asistencia === 'ausente';

  if (isAbsent && justificada) return 'ausente_justificada';

  if (!requiresConfirmation) {
    if (asistencia === 'a_tiempo') return 'a_tiempo';
    if (asistencia === 'tarde') return 'tarde';
    return 'ausente_injustificada';
  }

  if (asistencia === 'a_tiempo') {
    return confirmed ? 'confirmado_a_tiempo' : 'no_confirmado_a_tiempo';
  }

  if (asistencia === 'tarde') {
    return confirmed ? 'confirmado_tarde' : 'no_confirmado_tarde';
  }

  return confirmed ? 'confirmado_ausente' : 'no_confirmado_ausente';
}

export function getScoreSituationLabelKey(situationKey) {
  for (const group of ATTENDANCE_SCORE_FIELD_GROUPS) {
    const field = group.fields.find(item => item.key === situationKey);
    if (field) return field.labelKey;
  }
  return situationKey;
}

function collectMemberEvalEventDetails(memberRows, helpers, config) {
  const normalizedConfig = normalizeEvalConfig(config);
  const breakdown = countMemberAttendanceBreakdown(memberRows, helpers);
  const events = [];
  const seenEventIds = new Set();

  for (const row of memberRows || []) {
    const evento = getEventoFromRow(row);
    const eventoId = evento?.id;
    if (!eventoId || seenEventIds.has(eventoId)) continue;
    seenEventIds.add(eventoId);

    const situationKey = resolveEventScoreSituationKey(row, helpers);
    let baseScore = computeEventAttendanceScore(row, helpers, normalizedConfig);
    if (baseScore == null) continue;

    let cuotaBonus = 0;
    if (
      normalizedConfig.cuota_activa
      && evento?.cuota_aplica
      && helpers.memberAttendedEvent(row)
      && getCuotaPagadaFromRow(row)
    ) {
      cuotaBonus = normalizedConfig.cuota_puntos;
    }

    events.push({
      eventId: eventoId,
      eventName: evento?.nombre || '',
      eventDate: evento?.fecha || '',
      eventTime: evento?.hora || '',
      situationKey,
      score: baseScore,
      cuotaBonus,
      totalScore: baseScore + cuotaBonus,
      evento,
      row,
    });
  }

  events.sort((a, b) => compareEventsByLocalDateTime(b.evento, a.evento));

  const stats = computeMemberAttendanceScoreStats(memberRows, helpers, normalizedConfig);

  return {
    breakdown,
    events,
    total: stats.total,
    count: stats.count,
    average: stats.average,
  };
}

export function buildMemberEvalScoreDetail({
  memberRows,
  helpers,
  config = DEFAULT_UNIDAD_EVAL_CONFIG,
  validationStartDate = null,
  skipValidationFilter = false,
}) {
  if (!skipValidationFilter && !isUnidadValidationActive(validationStartDate)) {
    return {
      validationActive: false,
      breakdown: createEmptyAttendanceBreakdown(),
      events: [],
      average: null,
      total: 0,
      count: 0,
    };
  }

  const evalRows = skipValidationFilter
    ? (memberRows || [])
    : filterRowsForUnidadValidationPeriod(
      filterRowsForUnidadEvalStats(memberRows),
      validationStartDate,
    );
  const detail = collectMemberEvalEventDetails(evalRows, helpers, config);

  return {
    validationActive: true,
    breakdown: detail.breakdown,
    events: detail.events,
    average: roundAttendanceScore(detail.average),
    total: detail.total,
    count: detail.count,
  };
}

export function buildUnidadEvalScoreDetail({
  unidad,
  memberEventRows,
  helpers,
  config = DEFAULT_UNIDAD_EVAL_CONFIG,
  membersById = {},
  memberDisplayNameFn = null,
}) {
  const memberIds = [...new Set(
    (unidad?.miembro_unidad || []).map(row => row.miembro_id).filter(Boolean)
  )];
  const validationStartDate = unidad?.evaluacion_inicio_fecha || null;
  const validationActive = isUnidadValidationActive(validationStartDate);

  if (!validationActive || !memberIds.length) {
    return {
      validationActive: false,
      unidadName: unidad?.nombre || '',
      breakdown: createEmptyAttendanceBreakdown(),
      attendanceByCategory: computeAttendancePoints(createEmptyAttendanceBreakdown(), config),
      members: [],
      evaluacionInicioFecha: validationStartDate,
    };
  }

  const baseRows = filterRowsForUnidadEvalStats(
    (memberEventRows || []).filter(row => memberIds.includes(row.miembro_id))
  );
  const relevantRows = filterRowsForUnidadValidationPeriod(baseRows, validationStartDate);
  const breakdown = createEmptyAttendanceBreakdown();
  const members = [];

  for (const memberId of memberIds) {
    const memberRows = relevantRows.filter(row => row.miembro_id === memberId);
    const memberDetail = collectMemberEvalEventDetails(memberRows, helpers, config);
    const assignment = (unidad?.miembro_unidad || []).find(row => row.miembro_id === memberId);
    const member = assignment?.miembros || membersById[memberId] || null;
    const memberName = memberDisplayNameFn && member
      ? memberDisplayNameFn(member)
      : (member?.nombre || memberId);

    for (const key of ATTENDANCE_EVAL_KEYS) {
      breakdown[key] += memberDetail.breakdown[key] || 0;
    }

    members.push({
      memberId,
      memberName,
      breakdown: memberDetail.breakdown,
      events: memberDetail.events,
      average: roundAttendanceScore(memberDetail.average),
      total: memberDetail.total,
      count: memberDetail.count,
    });
  }

  members.sort((a, b) => String(a.memberName).localeCompare(String(b.memberName), undefined, { sensitivity: 'base' }));

  return {
    validationActive: true,
    unidadName: unidad?.nombre || '',
    breakdown,
    attendanceByCategory: computeAttendancePoints(breakdown, config),
    members,
    evaluacionInicioFecha: validationStartDate,
  };
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
    if (!isEventoIncludedInUnidadEval(evento)) continue;

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
  penaltyPoints = 0,
}) {
  const ids = [...(memberIds || [])];
  const memberCount = ids.length;
  const otherPerMember = memberCount > 0 ? (otherPoints || 0) / memberCount : 0;
  const penaltyPerMember = memberCount > 0 ? (penaltyPoints || 0) / memberCount : 0;

  if (!memberCount) {
    return {
      memberCount: 0,
      attendanceScoreAverage: null,
      excellencePercent: null,
    };
  }

  let attendanceScoreTotal = 0;
  let attendanceMembers = 0;
  let excellenceTotal = 0;
  let excellenceMembers = 0;

  for (const memberId of ids) {
    const memberRows = relevantRows.filter(row => row.miembro_id === memberId);
    const scoreStats = computeMemberAttendanceScoreStats(memberRows, helpers, config);
    const opportunities = countMemberOpportunities(memberRows, helpers);

    if (scoreStats.average != null) {
      const netAverage = scoreStats.average - penaltyPerMember;
      attendanceScoreTotal += netAverage;
      attendanceMembers += 1;
    }

    const excellenceEarned = otherPerMember;
    const excellenceMax = otherPerMember > 0 ? otherPerMember : 0;
    const excellencePercent = toEvalPercent(excellenceEarned, excellenceMax);
    if (excellencePercent != null && opportunities.pastSlots >= 0) {
      if (excellenceMax > 0) {
        excellenceTotal += excellencePercent;
        excellenceMembers += 1;
      }
    }
  }

  return {
    memberCount,
    attendanceScoreAverage: attendanceMembers > 0
      ? roundAttendanceScore(attendanceScoreTotal / attendanceMembers)
      : null,
    excellencePercent: excellenceMembers > 0
      ? Math.round(excellenceTotal / excellenceMembers)
      : null,
  };
}

export function computeAttendanceScoreTotals(memberIds, relevantRows, helpers, config) {
  let total = 0;
  let count = 0;

  for (const memberId of memberIds || []) {
    const memberRows = (relevantRows || []).filter(row => row.miembro_id === memberId);
    const stats = computeMemberAttendanceScoreStats(memberRows, helpers, config);
    total += stats.total;
    count += stats.count;
  }

  return { total, count };
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
    if (!isEventoIncludedInUnidadEval(evento)) continue;
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
  reglamentoInfracciones = [],
  reglamentoNodosById = {},
}) {
  const normalizedConfig = normalizeEvalConfig(config);
  const memberIds = new Set(
    (unidad?.miembro_unidad || []).map(row => row.miembro_id).filter(Boolean)
  );

  const validationStartDate = unidad?.evaluacion_inicio_fecha || null;
  const validationActive = isUnidadValidationActive(validationStartDate);

  const baseRows = filterRowsForUnidadEvalStats(
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

  const attendanceScoreTotals = computeAttendanceScoreTotals(
    memberIds,
    relevantRows,
    helpers,
    normalizedConfig,
  );
  const attendanceByCategory = computeAttendancePoints(breakdown, normalizedConfig);
  const cuotaPoints = normalizedConfig.cuota_activa
    ? cuotaCount * normalizedConfig.cuota_puntos
    : 0;
  const otherPoints = validationActive
    ? computeOtherPointsForUnidad(unidad?.id, evalItems, cantidadMap)
    : 0;
  const relevantInfracciones = validationActive
    ? filterInfraccionesForValidationPeriod(reglamentoInfracciones, validationStartDate)
    : [];
  const penaltyPoints = validationActive
    ? computePenaltyPointsForUnidad(unidad?.id, relevantInfracciones, reglamentoNodosById)
    : 0;
  const percentages = computeUnidadPercentages({
    memberIds,
    relevantRows,
    helpers,
    config: normalizedConfig,
    otherPoints,
    penaltyPoints,
  });
  const attendancePoints = attendanceScoreTotals.total;
  const total = Math.max(
    0,
    attendancePoints + cuotaPoints + otherPoints - penaltyPoints,
  );

  return {
    unidadId: unidad?.id,
    memberCount: percentages.memberCount,
    breakdown,
    cuotaCount,
    attendanceByCategory,
    attendancePoints,
    attendanceEventCount: attendanceScoreTotals.count,
    attendanceScoreAverage: validationActive ? percentages.attendanceScoreAverage : null,
    cuotaPoints,
    otherPoints,
    penaltyPoints,
    total,
    efficiencyPercent: validationActive ? percentages.attendanceScoreAverage : null,
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
  reglamentoInfracciones = [],
  reglamentoNodos = [],
}) {
  const cantidadMap = buildCantidadMap(cantidades);
  const reglamentoNodosById = {};
  for (const nodo of reglamentoNodos || []) {
    if (nodo?.id) reglamentoNodosById[nodo.id] = nodo;
  }
  const scoresByUnidadId = {};

  for (const unidad of unidades || []) {
    if (!unidad?.id) continue;
    scoresByUnidadId[unidad.id] = computeUnidadEvaluation({
      unidad,
      memberEventRows,
      config,
      evalItems,
      cantidadMap,
      reglamentoInfracciones,
      reglamentoNodosById,
    });
  }

  return scoresByUnidadId;
}

export function formatEvalPercent(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `${Math.round(Number(value))}%`;
}

export function roundAttendanceScore(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Math.round(Number(value) * 10) / 10;
}

export function formatEvalScore(value, { scale = 10 } = {}) {
  const rounded = roundAttendanceScore(value);
  if (rounded == null) return '—';
  return `${formatEvalPoints(rounded)}/${scale}`;
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
