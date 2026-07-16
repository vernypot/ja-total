import { sb } from '../../services/supabase';
import * as EventosModel from './eventos.model';

function isMissingColumnError(error, column) {
  const msg = error?.message || '';
  return msg.includes(`${column} does not exist`)
    || msg.includes(`Could not find the '${column}' column`)
    || msg.includes(`'${column}' column`);
}

function chunkArray(items, size = 150) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function fetchAssignmentsForClase(claseId) {
  if (!claseId) return { data: [], error: null };

  const attempts = [
    { col: 'clase_progresiva_id', select: 'id, miembro_id, clase_progresiva_id, estado' },
    { col: 'clase_id', select: 'id, miembro_id, clase_id, estado' },
    { col: 'clase_progresiva_id', select: 'id, miembro_id, clase_progresiva_id' },
    { col: 'clase_id', select: 'id, miembro_id, clase_id' },
  ];

  let lastError = null;

  for (const { col, select } of attempts) {
    const withEstado = await sb
      .from('miembro_clase_progresiva')
      .select(select)
      .eq(col, claseId)
      .eq('estado', 'activo');

    if (!withEstado.error) return { data: withEstado.data || [], error: null };

    lastError = withEstado.error;

    if (isMissingColumnError(withEstado.error, 'estado')) {
      const fallback = await sb
        .from('miembro_clase_progresiva')
        .select(select)
        .eq(col, claseId);
      if (!fallback.error) {
        const rows = (fallback.data || []).filter(row => row.estado == null || row.estado === 'activo');
        return { data: rows, error: null };
      }
      lastError = fallback.error;
    }

    if (isMissingColumnError(withEstado.error, col) || isMissingColumnError(withEstado.error, 'estado')) {
      continue;
    }
  }

  const wildcard = await sb
    .from('miembro_clase_progresiva')
    .select('*')
    .eq('estado', 'activo');

  if (!wildcard.error) {
    const rows = (wildcard.data || []).filter(row => {
      const linkClaseId = row.clase_progresiva_id || row.clase_id;
      return linkClaseId === claseId;
    });
    return { data: rows, error: null };
  }

  return { data: [], error: lastError };
}

export async function fetchMemberIdsAssignedToClase(claseId) {
  const { data, error } = await fetchAssignmentsForClase(claseId);
  if (error) return { memberIds: [], error };

  const memberIds = [...new Set((data || []).map(row => row.miembro_id).filter(Boolean))];
  return { memberIds, error: null };
}

export async function fetchMemberIdsWithCompletedRequisito(claseId, requisitoId) {
  if (!claseId || !requisitoId) return { memberIds: [], error: null };

  const { data: assignments, error: assignmentError } = await fetchAssignmentsForClase(claseId);
  if (assignmentError) return { memberIds: [], error: assignmentError };
  if (!assignments?.length) return { memberIds: [], error: null };

  const assignmentById = {};
  for (const row of assignments) {
    if (row.id && row.miembro_id) assignmentById[row.id] = row.miembro_id;
  }

  const assignmentIds = Object.keys(assignmentById);
  const completedMemberIds = new Set();

  for (const chunk of chunkArray(assignmentIds)) {
    const selects = [
      'miembro_clase_progresiva_id, clase_requisito_id, completado',
      'miembro_clase_progresiva_id, completado',
    ];

    let rows = [];
    let chunkError = null;

    for (const select of selects) {
      let query = sb
        .from('miembro_clase_requisito')
        .select(select)
        .in('miembro_clase_progresiva_id', chunk)
        .eq('clase_requisito_id', requisitoId)
        .eq('completado', true);

      const { data, error } = await query;
      if (!error) {
        rows = data || [];
        chunkError = null;
        break;
      }
      chunkError = error;
      if (isMissingColumnError(error, 'clase_requisito_id') || isMissingColumnError(error, 'completado')) {
        continue;
      }
      return { memberIds: [], error };
    }

    if (chunkError) return { memberIds: [], error: chunkError };

    for (const row of rows) {
      const miembroId = assignmentById[row.miembro_clase_progresiva_id];
      if (miembroId) completedMemberIds.add(miembroId);
    }
  }

  return { memberIds: [...completedMemberIds], error: null };
}

export async function fetchMemberIdsWithEspecialidad(especialidadId) {
  if (!especialidadId) return { memberIds: [], error: null };

  const attempts = [
    'miembro_id, especialidad_id',
    'miembro_id',
    '*',
  ];

  for (const select of attempts) {
    const { data, error } = await sb
      .from('miembro_especialidad')
      .select(select)
      .eq('especialidad_id', especialidadId);
    if (!error) {
      const memberIds = [...new Set((data || []).map(row => row.miembro_id).filter(Boolean))];
      return { memberIds, error: null };
    }
    if (isMissingColumnError(error, 'especialidad_id')) continue;
    return { memberIds: [], error };
  }

  return { memberIds: [], error: null };
}

export async function fetchMemberIdsAttendedEvento(eventoId) {
  if (!eventoId) return { memberIds: [], error: null };

  const { data, error } = await EventosModel.fetchEventoAssignments(eventoId);
  if (error) return { memberIds: [], error };

  const memberIds = [...new Set(
    (data || [])
      .filter(row => EventosModel.memberAttendedEvent(row))
      .map(row => row.miembro_id)
      .filter(Boolean),
  )];

  return { memberIds, error: null };
}

export function memberAgeYears(fechaNacimiento, refDate = new Date()) {
  if (!fechaNacimiento) return null;
  const birth = new Date(fechaNacimiento);
  if (Number.isNaN(birth.getTime())) return null;

  let age = refDate.getFullYear() - birth.getFullYear();
  const monthDelta = refDate.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && refDate.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function memberMatchesAgeRange(member, minAge, maxAge) {
  const hasMin = minAge !== '' && minAge != null;
  const hasMax = maxAge !== '' && maxAge != null;
  if (!hasMin && !hasMax) return true;

  const age = memberAgeYears(member?.fecha_nacimiento);
  if (age == null) return false;
  if (hasMin && age < Number(minAge)) return false;
  if (hasMax && age > Number(maxAge)) return false;
  return true;
}

export function hasActiveMemberFilters(filters = {}) {
  return Boolean(
    filters.claseId
    || filters.requisitoId
    || filters.especialidadId
    || filters.eventoId
    || filters.minAge !== '' && filters.minAge != null
    || filters.maxAge !== '' && filters.maxAge != null,
  );
}

export const EMPTY_MEMBER_FILTERS = {
  claseId: '',
  requisitoId: '',
  minAge: '',
  maxAge: '',
  especialidadId: '',
  eventoId: '',
};
