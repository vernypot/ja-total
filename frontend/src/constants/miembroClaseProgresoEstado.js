export const MIEMBRO_CLASE_PROGRESO_ESTADOS = [
  'sin_iniciar',
  'en_progreso',
  'incompleta',
  'completada',
  'investida',
];

const STATUS_STYLES = {
  sin_iniciar: { background: '#f3f4f6', color: '#4b5563', border: '#d1d5db' },
  en_progreso: { background: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  incompleta: { background: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  completada: { background: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  investida: { background: '#eef2ff', color: '#4338ca', border: '#c7d2fe' },
};

export function resolveMiembroClaseProgresoEstado(assignment) {
  if (assignment?.estado_progreso && MIEMBRO_CLASE_PROGRESO_ESTADOS.includes(assignment.estado_progreso)) {
    return assignment.estado_progreso;
  }
  if (assignment?.tiene_investidura) return 'investida';
  if (assignment?.completado) return 'completada';
  return 'sin_iniciar';
}

export function miembroClaseProgresoEstadoLabel(estado, t) {
  const key = {
    sin_iniciar: 'memberClassStatusSinIniciar',
    en_progreso: 'memberClassStatusEnProgreso',
    incompleta: 'memberClassStatusIncompleta',
    completada: 'memberClassStatusCompletada',
    investida: 'memberClassStatusInvestida',
  }[estado];
  return key ? t(key) : estado;
}

export function miembroClaseProgresoEstadoStyle(estado) {
  return STATUS_STYLES[estado] || STATUS_STYLES.sin_iniciar;
}

export function buildMiembroClaseProgressDraft(assignment, defaultValidatorName = '') {
  const estadoProgreso = resolveMiembroClaseProgresoEstado(assignment);
  return {
    estado_progreso: estadoProgreso,
    completado: assignment?.completado || false,
    fecha_completado: assignment?.fecha_completado || '',
    tiene_investidura: assignment?.tiene_investidura || false,
    investidura_fecha: assignment?.investidura_fecha || '',
    investidura_lugar: assignment?.investidura_lugar || '',
    investidura_validado_por_nombre:
      assignment?.investidura_validado_por_nombre || defaultValidatorName || '',
  };
}

export function applyMiembroClaseProgresoEstadoToDraft(prev, estadoProgreso, defaultValidatorName = '') {
  const today = new Date().toISOString().slice(0, 10);
  const next = { ...prev, estado_progreso: estadoProgreso };

  if (estadoProgreso === 'investida') {
    return {
      ...next,
      completado: true,
      fecha_completado: prev.fecha_completado || today,
      tiene_investidura: true,
      investidura_fecha: prev.investidura_fecha || today,
      investidura_validado_por_nombre: prev.investidura_validado_por_nombre || defaultValidatorName,
    };
  }

  if (estadoProgreso === 'completada') {
    return {
      ...next,
      completado: true,
      fecha_completado: prev.fecha_completado || today,
      tiene_investidura: false,
      investidura_fecha: '',
      investidura_lugar: '',
      investidura_validado_por_nombre: '',
    };
  }

  return {
    ...next,
    completado: false,
    fecha_completado: '',
    tiene_investidura: false,
    investidura_fecha: '',
    investidura_lugar: '',
    investidura_validado_por_nombre: '',
  };
}

export function isMiembroClaseProgressDraftValid(draft) {
  if (!draft?.estado_progreso) return false;
  if (draft.estado_progreso === 'completada' && !draft.fecha_completado) return false;
  if (draft.estado_progreso === 'investida') {
    return Boolean(draft.fecha_completado && draft.investidura_fecha);
  }
  return true;
}

export function resolveHistorialEstado(row) {
  if (row?.estado_progreso && MIEMBRO_CLASE_PROGRESO_ESTADOS.includes(row.estado_progreso)) {
    return row.estado_progreso;
  }
  if (row?.tiene_investidura) return 'investida';
  return null;
}

export function buildHistorialDraft(row = null, defaultValidatorName = '') {
  const estadoProgreso = resolveHistorialEstado(row) || '';
  return {
    nombre: row?.nombre || '',
    clase_progresiva_id: row?.clase_progresiva_id || '',
    club_id: row?.club_id || '',
    club_nombre: row?.club_nombre || '',
    estado_progreso: estadoProgreso,
    fecha_completado: row?.fecha_completado || '',
    tiene_investidura: row?.tiene_investidura || false,
    investidura_fecha: row?.investidura_fecha || '',
    investidura_lugar: row?.investidura_lugar || '',
    investidura_validado_por_nombre:
      row?.investidura_validado_por_nombre || defaultValidatorName || '',
    notas: row?.notas || '',
  };
}

export function applyHistorialEstadoToDraft(prev, estadoProgreso, defaultValidatorName = '') {
  if (!estadoProgreso) {
    return {
      ...prev,
      estado_progreso: '',
      fecha_completado: '',
      tiene_investidura: false,
      investidura_fecha: '',
      investidura_lugar: '',
      investidura_validado_por_nombre: '',
    };
  }
  return applyMiembroClaseProgresoEstadoToDraft(
    { ...prev, estado_progreso: estadoProgreso },
    estadoProgreso,
    defaultValidatorName,
  );
}

export function isHistorialDraftValid(draft) {
  if (!draft?.nombre?.trim()) return false;
  if (!draft.estado_progreso) return true;
  return isMiembroClaseProgressDraftValid(draft);
}
