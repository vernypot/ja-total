import { sb } from '../../services/supabase';

function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}

const EVENTO_SELECT = 'id,club_id,nombre,fecha,hora,lugar,estado,created_at,clubes(id,nombre)';

export async function fetchEventosByClub(clubId, { showInactive = false } = {}) {
  let query = sb.from('eventos').select(EVENTO_SELECT).eq('club_id', clubId).order('fecha', { ascending: false });
  if (!showInactive) query = query.eq('estado', 'activo');
  return query;
}

export async function fetchMiembroEventos(miembroId) {
  return sb
    .from('evento_miembro')
    .select(`
      id,
      evento_id,
      miembro_id,
      eventos (
        id,
        club_id,
        nombre,
        fecha,
        hora,
        lugar,
        estado,
        clubes ( id, nombre )
      ),
      evento_asistencia (
        id,
        estado,
        updated_at
      )
    `)
    .eq('miembro_id', miembroId)
    .order('created_at', { ascending: false });
}

export async function fetchEventoAssignments(eventoId) {
  return sb
    .from('evento_miembro')
    .select(`
      id,
      miembro_id,
      miembros ( id, nombre, apellido1, apellido2, estado ),
      evento_asistencia ( id, estado, updated_at )
    `)
    .eq('evento_id', eventoId);
}

export async function createEvento({ clubId, nombre, fecha, hora, lugar, miembroIds = [] }) {
  const direct = await sb.from('eventos').insert([{
    club_id: clubId,
    nombre: nombre?.trim() || null,
    fecha,
    hora,
    lugar: lugar.trim(),
  }]).select('id').single();

  if (!direct.error && direct.data?.id) {
    if (miembroIds.length) {
      const rows = miembroIds.map(miembroId => ({
        evento_id: direct.data.id,
        miembro_id: miembroId,
      }));
      const assign = await sb.from('evento_miembro').insert(rows);
      if (assign.error && isRlsError(assign.error)) {
        await sb.rpc('admin_assign_evento_miembros', {
          p_evento_id: direct.data.id,
          p_miembro_ids: miembroIds,
        });
      }
    }
    return { data: direct.data, error: null };
  }

  if (!isRlsError(direct.error)) return direct;

  const rpc = await sb.rpc('admin_create_evento', {
    p_club_id: clubId,
    p_fecha: fecha,
    p_hora: hora,
    p_lugar: lugar.trim(),
    p_nombre: nombre?.trim() || null,
    p_miembro_ids: miembroIds,
  });

  return { data: rpc.data, error: rpc.error };
}

export async function setEventoAsistencia(eventoMiembroId, estado) {
  const existing = await sb
    .from('evento_asistencia')
    .select('id')
    .eq('evento_miembro_id', eventoMiembroId)
    .maybeSingle();

  if (existing.data?.id) {
    const direct = await sb
      .from('evento_asistencia')
      .update({ estado })
      .eq('id', existing.data.id);
    if (!direct.error) return direct;
    if (!isRlsError(direct.error)) return direct;
  } else {
    const direct = await sb.from('evento_asistencia').insert([{
      evento_miembro_id: eventoMiembroId,
      estado,
    }]);
    if (!direct.error) return direct;
    if (!isRlsError(direct.error)) return direct;
  }

  return sb.rpc('admin_set_evento_asistencia', {
    p_evento_miembro_id: eventoMiembroId,
    p_estado: estado,
  });
}

export async function assignMiembrosToEvento(eventoId, miembroIds) {
  if (!miembroIds.length) return { error: null };

  const rows = miembroIds.map(miembroId => ({
    evento_id: eventoId,
    miembro_id: miembroId,
  }));

  const direct = await sb.from('evento_miembro').insert(rows);
  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;

  return sb.rpc('admin_assign_evento_miembros', {
    p_evento_id: eventoId,
    p_miembro_ids: miembroIds,
  });
}

export async function unassignMiembroFromEvento(eventoMiembroId) {
  return sb.from('evento_miembro').delete().eq('id', eventoMiembroId);
}

export async function syncEventoAttendees(eventoId, miembroIds) {
  const { data: current, error: loadError } = await fetchEventoAssignments(eventoId);
  if (loadError) return { error: loadError };

  const currentRows = current || [];
  const nextIds = new Set(miembroIds);
  const toRemove = currentRows.filter(row => !nextIds.has(row.miembro_id));
  const currentMemberIds = new Set(currentRows.map(row => row.miembro_id));
  const toAdd = miembroIds.filter(id => !currentMemberIds.has(id));

  for (const row of toRemove) {
    const { error } = await unassignMiembroFromEvento(row.id);
    if (error) return { error };
  }

  if (toAdd.length) {
    const { error } = await assignMiembrosToEvento(eventoId, toAdd);
    if (error) return { error };
  }

  return { error: null };
}

export function isEventInFuture(evento) {
  if (!evento?.fecha) return false;

  const hora = evento.hora ? String(evento.hora).slice(0, 8) : '23:59:59';
  const eventDate = new Date(`${evento.fecha}T${hora}`);
  if (!Number.isNaN(eventDate.getTime())) {
    return eventDate > new Date();
  }

  const today = new Date().toISOString().slice(0, 10);
  return evento.fecha >= today;
}

export function getAsistenciaFromRow(row) {
  const nested = row?.evento_asistencia;
  if (Array.isArray(nested)) return nested[0]?.estado || null;
  return nested?.estado || null;
}

export function getEventoFromRow(row) {
  return row?.eventos || null;
}

export function memberDisplayName(m) {
  if (!m) return '';
  return [m.nombre, m.apellido1, m.apellido2].filter(Boolean).join(' ');
}
