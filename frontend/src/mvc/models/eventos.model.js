import { sb } from '../../services/supabase';

function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}

function isMissingColumnError(error, column) {
  const msg = error?.message || '';
  return msg.includes(`${column} does not exist`) || msg.includes(`Could not find the '${column}' column`);
}

const EVENTO_SELECTS = [
  'id,club_id,nombre,fecha,hora,lugar,estado,tipo_evento_id,requiere_confirmacion,created_at,clubes(id,nombre),tipos_evento(id,nombre)',
  'id,club_id,nombre,fecha,hora,lugar,estado,tipo_evento_id,requiere_confirmacion,created_at,clubes(id,nombre)',
  'id,club_id,nombre,fecha,hora,lugar,estado,created_at,clubes(id,nombre)',
];

const EVENTO_MIEMBRO_SELECTS = [
  `id, evento_id, miembro_id, confirmacion_estado, confirmado_at,
   miembros ( id, nombre, apellido1, apellido2, estado ),
   evento_asistencia ( id, estado, updated_at, checked_in_at )`,
  `id, evento_id, miembro_id,
   miembros ( id, nombre, apellido1, apellido2, estado ),
   evento_asistencia ( id, estado, updated_at, checked_in_at )`,
];

async function queryEventos(buildQuery) {
  for (const select of EVENTO_SELECTS) {
    const { data, error } = await buildQuery(select);
    if (!error) return { data: data || [], error: null };
    if (isMissingColumnError(error, 'tipo_evento_id') || isMissingColumnError(error, 'requiere_confirmacion')) {
      continue;
    }
    return { data: [], error };
  }
  return { data: [], error: null };
}

export async function fetchEventosByClub(clubId, { showInactive = false } = {}) {
  return queryEventos(select => {
    let query = sb.from('eventos').select(select).eq('club_id', clubId).order('fecha', { ascending: false });
    if (!showInactive) query = query.eq('estado', 'activo');
    return query;
  });
}

export async function fetchMiembroEventos(miembroId) {
  const selects = [
    `id, evento_id, miembro_id, confirmacion_estado, confirmado_at,
     eventos ( id, club_id, nombre, fecha, hora, lugar, estado, requiere_confirmacion, tipo_evento_id,
       clubes ( id, nombre ), tipos_evento ( id, nombre ) ),
     evento_asistencia ( id, estado, updated_at, checked_in_at )`,
    `id, evento_id, miembro_id,
     eventos ( id, club_id, nombre, fecha, hora, lugar, estado, clubes ( id, nombre ) ),
     evento_asistencia ( id, estado, updated_at, checked_in_at )`,
  ];

  for (const select of selects) {
    const { data, error } = await sb
      .from('evento_miembro')
      .select(select)
      .eq('miembro_id', miembroId)
      .order('created_at', { ascending: false });
    if (!error) return { data: data || [], error: null };
    if (isMissingColumnError(error, 'confirmacion_estado') || isMissingColumnError(error, 'requiere_confirmacion')) {
      continue;
    }
    return { data: [], error };
  }

  return sb.from('evento_miembro').select('*').eq('miembro_id', miembroId);
}

export async function fetchEventoAssignments(eventoId) {
  for (const select of EVENTO_MIEMBRO_SELECTS) {
    const { data, error } = await sb
      .from('evento_miembro')
      .select(select)
      .eq('evento_id', eventoId);
    if (!error) return { data: data || [], error: null };
    if (isMissingColumnError(error, 'confirmacion_estado')) continue;
    return { data: [], error };
  }
  return { data: [], error: null };
}

function groupAssignmentsByEvento(rows) {
  const grouped = {};
  for (const row of rows || []) {
    const eventoId = row.evento_id;
    if (!eventoId) continue;
    if (!grouped[eventoId]) grouped[eventoId] = [];
    grouped[eventoId].push(row);
  }
  return grouped;
}

export async function fetchAssignmentsForEventIds(eventoIds) {
  if (!eventoIds?.length) return { data: {}, error: null };

  for (const select of EVENTO_MIEMBRO_SELECTS) {
    const { data, error } = await sb
      .from('evento_miembro')
      .select(select)
      .in('evento_id', eventoIds);
    if (!error) return { data: groupAssignmentsByEvento(data), error: null };
    if (isMissingColumnError(error, 'confirmacion_estado')) continue;
    return { data: {}, error };
  }

  return { data: {}, error: null };
}

function buildConfirmacionEstado(requiereConfirmacion) {
  return requiereConfirmacion ? 'pendiente' : 'confirmado';
}

async function resolveCreateMemberIds(clubId, requiereConfirmacion, miembroIds) {
  if (!requiereConfirmacion) return [];
  if (miembroIds.length) return miembroIds;
  return fetchActiveClubMemberIds(clubId);
}

export async function createEvento({
  clubId,
  nombre,
  fecha,
  hora,
  lugar,
  tipoEventoId,
  requiereConfirmacion = true,
  miembroIds = [],
}) {
  const payload = {
    club_id: clubId,
    nombre: nombre?.trim() || null,
    fecha,
    hora,
    lugar: lugar.trim(),
  };
  if (tipoEventoId) payload.tipo_evento_id = tipoEventoId;
  if (requiereConfirmacion !== undefined) payload.requiere_confirmacion = Boolean(requiereConfirmacion);

  const assignIds = await resolveCreateMemberIds(clubId, Boolean(requiereConfirmacion), miembroIds);

  const direct = await sb.from('eventos').insert([payload]).select('id').single();

  if (!direct.error && direct.data?.id) {
    if (assignIds.length) {
      await assignMiembrosToEvento(direct.data.id, assignIds, { requiereConfirmacion });
    }
    return { data: direct.data, error: null };
  }

  if (!isRlsError(direct.error)) {
    if (isMissingColumnError(direct.error, 'tipo_evento_id') || isMissingColumnError(direct.error, 'requiere_confirmacion')) {
      const { tipo_evento_id, requiere_confirmacion, ...base } = payload;
      const retry = await sb.from('eventos').insert([base]).select('id').single();
      if (!retry.error && retry.data?.id) {
        if (assignIds.length) await assignMiembrosToEvento(retry.data.id, assignIds, { requiereConfirmacion });
        return { data: retry.data, error: null };
      }
      if (!isRlsError(retry.error)) return retry;
    } else {
      return direct;
    }
  }

  const rpc = await sb.rpc('admin_create_evento', {
    p_club_id: clubId,
    p_fecha: fecha,
    p_hora: hora,
    p_lugar: lugar.trim(),
    p_nombre: nombre?.trim() || null,
    p_miembro_ids: requiereConfirmacion ? (assignIds.length ? assignIds : null) : [],
    p_tipo_evento_id: tipoEventoId || null,
    p_requiere_confirmacion: Boolean(requiereConfirmacion),
  });

  return { data: rpc.data, error: rpc.error };
}

export async function updateEvento(eventoId, {
  nombre,
  fecha,
  hora,
  lugar,
  tipoEventoId,
}) {
  const payload = { updated_at: new Date().toISOString() };
  if (nombre !== undefined) payload.nombre = nombre?.trim() || null;
  if (fecha !== undefined) payload.fecha = fecha;
  if (hora !== undefined) payload.hora = hora;
  if (lugar !== undefined) payload.lugar = lugar.trim();
  if (tipoEventoId !== undefined) payload.tipo_evento_id = tipoEventoId || null;

  const direct = await sb.from('eventos').update(payload).eq('id', eventoId);
  if (!direct.error) return direct;
  if (isMissingColumnError(direct.error, 'tipo_evento_id')) {
    const { tipo_evento_id, ...base } = payload;
    return sb.from('eventos').update(base).eq('id', eventoId);
  }
  return direct;
}

export async function setEventoEstado(eventoId, estado) {
  return sb.from('eventos').update({
    estado,
    updated_at: new Date().toISOString(),
  }).eq('id', eventoId);
}

async function fetchActiveClubMemberIds(clubId) {
  const { data, error } = await sb
    .from('miembro_club')
    .select('miembro_id, miembros(id, estado)')
    .eq('club_id', clubId);

  if (error) return [];
  return (data || [])
    .map(row => row.miembros)
    .filter(m => m && (m.estado || 'activo') === 'activo')
    .map(m => m.id);
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

export async function setEventoConfirmacion(eventoMiembroId, confirmacionEstado) {
  const payload = {
    confirmacion_estado: confirmacionEstado,
    confirmado_at: ['confirmado', 'rechazado'].includes(confirmacionEstado)
      ? new Date().toISOString()
      : null,
  };

  const direct = await sb
    .from('evento_miembro')
    .update(payload)
    .eq('id', eventoMiembroId);

  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) {
    if (isMissingColumnError(direct.error, 'confirmacion_estado')) {
      return { error: null };
    }
    return direct;
  }

  return sb.rpc('admin_set_evento_confirmacion', {
    p_evento_miembro_id: eventoMiembroId,
    p_confirmacion_estado: confirmacionEstado,
  });
}

export async function assignMiembrosToEvento(eventoId, miembroIds, { requiereConfirmacion = true } = {}) {
  if (!miembroIds.length) return { error: null };

  const confirmacionEstado = buildConfirmacionEstado(requiereConfirmacion);
  const rows = miembroIds.map(miembroId => ({
    evento_id: eventoId,
    miembro_id: miembroId,
    confirmacion_estado: confirmacionEstado,
  }));

  const direct = await sb.from('evento_miembro').insert(rows);
  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) {
    if (isMissingColumnError(direct.error, 'confirmacion_estado')) {
      const fallbackRows = miembroIds.map(miembroId => ({
        evento_id: eventoId,
        miembro_id: miembroId,
      }));
      const retry = await sb.from('evento_miembro').insert(fallbackRows);
      if (!retry.error) return retry;
      if (!isRlsError(retry.error)) return retry;
    } else {
      return direct;
    }
  }

  return sb.rpc('admin_assign_evento_miembros', {
    p_evento_id: eventoId,
    p_miembro_ids: miembroIds,
  });
}

export async function unassignMiembroFromEvento(eventoMiembroId) {
  return sb.from('evento_miembro').delete().eq('id', eventoMiembroId);
}

export async function syncEventoAttendees(eventoId, miembroIds, { requiereConfirmacion = true } = {}) {
  if (!requiereConfirmacion) {
    return { error: new Error('Member assignments are only available when attendance confirmation is enabled.') };
  }

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
    const { error } = await assignMiembrosToEvento(eventoId, toAdd, { requiereConfirmacion });
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

export function isEventInPast(evento) {
  return Boolean(evento?.fecha) && !isEventInFuture(evento);
}

export function memberAttendedEvent(asistencia) {
  return asistencia === 'a_tiempo' || asistencia === 'tarde';
}

export function computeMemberAttendanceStats(rows, helpers) {
  const {
    getEventoFromRow,
    getAsistenciaFromRow,
    getConfirmacionFromRow,
    eventRequiresConfirmation,
  } = helpers;

  const stats = {
    assigned: rows.length,
    upcoming: 0,
    pastAssigned: 0,
    attended: 0,
    onTime: 0,
    late: 0,
    misses: 0,
    failedConfirmations: 0,
    confirmed: 0,
    pendingConfirmation: 0,
    attendanceRate: null,
  };

  for (const row of rows) {
    const evento = getEventoFromRow(row);
    if (!evento) continue;

    const isFuture = isEventInFuture(evento);
    const asistencia = getAsistenciaFromRow(row);
    const confirmacion = getConfirmacionFromRow(row);
    const needsConfirmation = eventRequiresConfirmation(evento);

    if (needsConfirmation) {
      if (confirmacion === 'rechazado') stats.failedConfirmations += 1;
      else if (confirmacion === 'confirmado') stats.confirmed += 1;
      else stats.pendingConfirmation += 1;
    }

    if (isFuture) {
      stats.upcoming += 1;
      continue;
    }

    stats.pastAssigned += 1;

    if (asistencia === 'a_tiempo') {
      stats.onTime += 1;
      stats.attended += 1;
    } else if (asistencia === 'tarde') {
      stats.late += 1;
      stats.attended += 1;
    } else if (asistencia === 'ausente') {
      stats.misses += 1;
    } else {
      stats.misses += 1;
    }
  }

  if (stats.pastAssigned > 0) {
    stats.attendanceRate = Math.round((stats.attended / stats.pastAssigned) * 100);
  }

  return stats;
}

export async function checkinEventoByToken(eventoId, token) {
  return sb.rpc('admin_checkin_evento', {
    p_evento_id: eventoId,
    p_token: token,
  });
}

export function getCheckedInAtFromRow(row) {
  const nested = row?.evento_asistencia;
  if (Array.isArray(nested)) return nested[0]?.checked_in_at || null;
  return nested?.checked_in_at || null;
}

export function getAsistenciaFromRow(row) {
  const nested = row?.evento_asistencia;
  if (Array.isArray(nested)) return nested[0]?.estado || null;
  return nested?.estado || null;
}

export function getConfirmacionFromRow(row) {
  return row?.confirmacion_estado || 'pendiente';
}

export function eventRequiresConfirmation(evento) {
  return evento?.requiere_confirmacion !== false;
}

export async function fetchUpcomingEventosByIglesia(iglesiaId, limit = 4) {
  if (!iglesiaId) return { data: [], error: null };

  const { data: clubs, error: clubsError } = await sb
    .from('clubes')
    .select('id')
    .eq('iglesia_id', iglesiaId)
    .eq('estado', 'activo');

  if (clubsError) return { data: [], error: clubsError };
  if (!clubs?.length) return { data: [], error: null };

  const clubIds = clubs.map(c => c.id);
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await queryEventos(select =>
    sb.from('eventos')
      .select(select)
      .in('club_id', clubIds)
      .eq('estado', 'activo')
      .gte('fecha', today)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true })
      .limit(Math.max(limit * 2, limit))
  );

  if (error) return { data: [], error };

  const upcoming = (data || [])
    .filter(isEventInFuture)
    .slice(0, limit);

  return { data: upcoming, error: null };
}

export function getEventoFromRow(row) {
  return row?.eventos || null;
}

export function memberDisplayName(m) {
  if (!m) return '';
  return [m.nombre, m.apellido1, m.apellido2].filter(Boolean).join(' ');
}

export function getTipoEventoNombre(evento) {
  return evento?.tipos_evento?.nombre || '';
}
