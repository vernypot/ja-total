import { sb } from '../../services/supabase';
import { memberDisplayName, MIEMBRO_NAME_FIELDS } from '../../utils/memberDisplayName';
import { formatSolicitudTarget } from './clases.model';

export function formatApprovalSolicitudTarget(row, t) {
  return formatSolicitudTarget(row, t);
}

export function isPendingApprovalSolicitud(row) {
  const estado = String(row?.estado || '').trim().toLowerCase();
  return Boolean(row?.id) && estado === 'pendiente';
}

export function filterVisiblePendingApprovals(rows) {
  return (rows || []).filter(isPendingApprovalSolicitud);
}

function isMissingColumnError(error, column) {
  const msg = error?.message || '';
  return msg.includes(`${column} does not exist`) || msg.includes(`Could not find the '${column}' column`);
}

function isMissingRelationError(error, relation) {
  const msg = error?.message || '';
  return msg.includes(relation) && (msg.includes('does not exist') || msg.includes('Could not find'));
}

const MEMBER_ID_CHUNK_SIZE = 80;

export async function fetchIglesiaMemberIds(iglesiaId) {
  if (!iglesiaId) return { data: [], error: null };

  const { data: clubs, error: clubsError } = await sb
    .from('clubes')
    .select('id')
    .eq('iglesia_id', iglesiaId)
    .eq('estado', 'activo');

  if (clubsError) return { data: [], error: clubsError };
  if (!clubs?.length) return { data: [], error: null };

  const clubIds = clubs.map(c => c.id);
  const { data: rows, error } = await sb
    .from('miembro_club')
    .select('miembro_id')
    .in('club_id', clubIds);

  if (error) return { data: [], error };

  const memberIds = [...new Set((rows || []).map(row => row.miembro_id).filter(Boolean))];
  return { data: memberIds, error: null };
}

async function fetchPendingSolicitudesForMemberIds(memberIds, select) {
  if (!memberIds.length) return [];

  const rowsById = new Map();

  for (let index = 0; index < memberIds.length; index += MEMBER_ID_CHUNK_SIZE) {
    const chunk = memberIds.slice(index, index + MEMBER_ID_CHUNK_SIZE);
    const { data, error } = await sb
      .from('miembro_clase_aprobacion_solicitud')
      .select(select)
      .eq('estado', 'pendiente')
      .in('miembro_id', chunk)
      .order('solicitado_at', { ascending: false });

    if (error) throw error;

    for (const row of data || []) {
      rowsById.set(row.id, row);
    }
  }

  return Array.from(rowsById.values()).sort(
    (a, b) => new Date(b.solicitado_at).getTime() - new Date(a.solicitado_at).getTime()
  );
}

export async function fetchPendingApprovalSolicitudesByIglesia(iglesiaId, { limit } = {}) {
  if (!iglesiaId) return { data: [], error: null };

  const { data: memberIds, error: memberError } = await fetchIglesiaMemberIds(iglesiaId);
  if (memberError) return { data: [], error: memberError };
  if (!memberIds.length) return { data: [], error: null };

  const selectAttempts = [
    `id, miembro_id, tipo, estado, solicitado_at, comentario_miembro,
      miembros ( id, ${MIEMBRO_NAME_FIELDS} ),
      miembro_clase_progresiva ( clase_progresiva_id, clases_progresivas ( id, nombre ) ),
      clase_requisitos ( id, numero, descripcion, texto_opcional )`,
    `id, miembro_id, tipo, estado, solicitado_at, comentario_miembro,
      miembros ( id, ${MIEMBRO_NAME_FIELDS} ),
      miembro_clase_progresiva ( clase_id, clases_progresivas ( id, nombre ) ),
      clase_requisitos ( id, numero, descripcion, texto_opcional )`,
    `id, miembro_id, tipo, estado, solicitado_at, comentario_miembro,
      miembros ( id, ${MIEMBRO_NAME_FIELDS} ),
      clase_requisitos ( id, numero, descripcion, texto_opcional )`,
  ];

  for (const select of selectAttempts) {
    try {
      const rows = await fetchPendingSolicitudesForMemberIds(memberIds, select);
      const normalized = filterVisiblePendingApprovals(rows.map(row => ({
        ...row,
        clases_progresivas: row.miembro_clase_progresiva?.clases_progresivas || row.clases_progresivas || null,
      })));
      const data = typeof limit === 'number' ? normalized.slice(0, limit) : normalized;
      return { data, error: null };
    } catch (error) {
      if (
        isMissingRelationError(error, 'miembro_clase_aprobacion_solicitud')
        || isMissingColumnError(error, 'clase_progresiva_id')
        || isMissingColumnError(error, 'clase_id')
      ) {
        continue;
      }

      return { data: [], error };
    }
  }

  return { data: [], error: null };
}

export function memberFullName(m) {
  return memberDisplayName(m);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function nextBirthdayDate(fechaNacimiento, refDate = new Date()) {
  if (!fechaNacimiento) return null;
  const parts = fechaNacimiento.split('-').map(Number);
  if (parts.length < 3 || !parts[1] || !parts[2]) return null;

  const [, month, day] = parts;
  const ref = startOfDay(refDate);
  let candidate = new Date(ref.getFullYear(), month - 1, day);
  candidate = startOfDay(candidate);

  if (candidate < ref) {
    candidate = startOfDay(new Date(ref.getFullYear() + 1, month - 1, day));
  }

  return candidate;
}

export function daysUntilBirthday(fechaNacimiento, refDate = new Date()) {
  const next = nextBirthdayDate(fechaNacimiento, refDate);
  if (!next) return null;
  const ref = startOfDay(refDate);
  return Math.round((next - ref) / (1000 * 60 * 60 * 24));
}

export function formatBirthdayShort(fechaNacimiento, language = 'es') {
  if (!fechaNacimiento) return '';
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  return new Date(`${fechaNacimiento}T12:00:00`).toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
  });
}

export async function fetchUpcomingBirthdaysByIglesia(iglesiaId, { days = 30 } = {}) {
  if (!iglesiaId) return { data: [], error: null };

  const { data: clubs, error: clubsError } = await sb
    .from('clubes')
    .select('id')
    .eq('iglesia_id', iglesiaId)
    .eq('estado', 'activo');

  if (clubsError) return { data: [], error: clubsError };
  if (!clubs?.length) return { data: [], error: null };

  const clubIds = clubs.map(c => c.id);
  const { data: rows, error } = await sb
    .from('miembro_club')
    .select(`miembros(id,${MIEMBRO_NAME_FIELDS},fecha_nacimiento,estado,foto_url)`)
    .in('club_id', clubIds);

  if (error) return { data: [], error };

  const today = startOfDay(new Date());
  const byMember = new Map();

  for (const row of rows || []) {
    const m = row.miembros;
    if (!m || m.estado !== 'activo' || !m.fecha_nacimiento) continue;

    const daysUntil = daysUntilBirthday(m.fecha_nacimiento, today);
    if (daysUntil === null || daysUntil > days) continue;

    const existing = byMember.get(m.id);
    if (!existing || daysUntil < existing.daysUntil) {
      byMember.set(m.id, {
        id: m.id,
        nombre: m.nombre,
        apellido1: m.apellido1,
        apellido2: m.apellido2,
        nombre_opcional: m.nombre_opcional,
        apellido_opcional: m.apellido_opcional,
        fecha_nacimiento: m.fecha_nacimiento,
        foto_url: m.foto_url,
        daysUntil,
        nextDate: nextBirthdayDate(m.fecha_nacimiento, today),
      });
    }
  }

  const birthdays = Array.from(byMember.values()).sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return memberFullName(a).localeCompare(memberFullName(b), undefined, { sensitivity: 'base' });
  });

  return { data: birthdays, error: null };
}
