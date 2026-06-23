import { sb } from '../../services/supabase';
import * as EventosModel from './eventos.model';
import { clampSesiones, defaultSesionesEsperadas } from './clases.model';

function isMissingColumnError(error, column) {
  const msg = error?.message || '';
  return msg.includes(`${column} does not exist`)
    || msg.includes(`Could not find the '${column}' column`);
}

const MEETING_SELECTS = [
  'id, plan_id, numero, titulo, fecha, hora, lugar, notas, tipo_evento_id, evento_id, tipos_evento(id, nombre)',
  'id, plan_id, numero, titulo, fecha, notas, tipo_evento_id, tipos_evento(id, nombre)',
  'id, plan_id, numero, titulo, fecha, notas',
];

async function queryMeetings(buildQuery) {
  for (const select of MEETING_SELECTS) {
    const { data, error } = await buildQuery(select);
    if (!error) return { data: data || [], error: null };
    if (
      isMissingColumnError(error, 'tipo_evento_id')
      || isMissingColumnError(error, 'evento_id')
      || isMissingColumnError(error, 'hora')
      || isMissingColumnError(error, 'lugar')
    ) continue;
    return { data: [], error };
  }
  return { data: [], error: null };
}

async function updateMeetingRow(reunionId, payload) {
  const dbPayload = { ...payload };
  if (dbPayload.tipoEventoId !== undefined) {
    dbPayload.tipo_evento_id = dbPayload.tipoEventoId;
    delete dbPayload.tipoEventoId;
  }

  for (const select of MEETING_SELECTS) {
    const attemptPayload = { ...dbPayload };
    const columns = select.split(',').map(part => part.trim().split('(')[0].trim());
    for (const key of Object.keys(attemptPayload)) {
      if (!columns.includes(key)) delete attemptPayload[key];
    }

    const result = await sb
      .from('plan_reunion')
      .update(attemptPayload)
      .eq('id', reunionId)
      .select(select)
      .single();
    if (!result.error) return result;
    if (
      isMissingColumnError(result.error, 'tipo_evento_id')
      || isMissingColumnError(result.error, 'evento_id')
      || isMissingColumnError(result.error, 'hora')
      || isMissingColumnError(result.error, 'lugar')
    ) continue;
    return result;
  }

  return sb.from('plan_reunion').update(dbPayload).eq('id', reunionId).select().single();
}

export function normalizeMeetingHora(hora) {
  if (!hora) return '18:00';
  const value = String(hora);
  return value.length >= 5 ? value.slice(0, 5) : value;
}

export function isMeetingScheduled(reunion) {
  return Boolean(reunion?.evento_id);
}

export async function fetchPlansByClub(clubId, { showInactive = false } = {}) {
  if (!clubId) return { data: [], error: null };

  let query = sb
    .from('plan_periodo_trabajo')
    .select('id, club_id, nombre, fecha_inicio, fecha_fin, num_reuniones, notas, estado, created_at')
    .eq('club_id', clubId)
    .order('fecha_inicio', { ascending: false });

  if (!showInactive) query = query.eq('estado', 'activo');

  const { data, error } = await query;
  return { data: data || [], error };
}

export async function fetchPlanClasses(planId) {
  const { data, error } = await sb
    .from('plan_periodo_clase')
    .select('id, plan_id, clase_progresiva_id, clases_progresivas(id, nombre, tipo_id, club_tipo)')
    .eq('plan_id', planId);
  return { data: data || [], error };
}

export async function fetchPlanMeetings(planId) {
  return queryMeetings(select =>
    sb.from('plan_reunion').select(select).eq('plan_id', planId).order('numero', { ascending: true })
  );
}

export async function fetchPlanMeetingRequisitos(reunionIds) {
  if (!reunionIds.length) return { data: [], error: null };

  const selects = [
    `id, reunion_id, clase_requisito_id, orden, sesiones,
      clase_requisitos(id, clase_id, descripcion, numero, orden, texto_opcional, sesiones_esperadas,
        clases_progresivas(id, nombre))`,
    `id, reunion_id, clase_requisito_id, orden,
      clase_requisitos(id, clase_id, descripcion, numero, orden, texto_opcional,
        clases_progresivas(id, nombre))`,
  ];

  for (const select of selects) {
    const { data, error } = await sb
      .from('plan_reunion_requisito')
      .select(select)
      .in('reunion_id', reunionIds)
      .order('orden', { ascending: true });

    if (!error) {
      return {
        data: (data || []).map(row => ({
          ...row,
          sesiones: clampSesiones(row.sesiones, defaultSesionesEsperadas(row.clase_requisitos)),
        })),
        error: null,
      };
    }
    if (isMissingColumnError(error, 'sesiones') || isMissingColumnError(error, 'sesiones_esperadas')) continue;
    return { data: [], error };
  }

  return { data: [], error: null };
}

export async function fetchPlanDetail(planId) {
  const { data: plan, error: planError } = await sb
    .from('plan_periodo_trabajo')
    .select('id, club_id, nombre, fecha_inicio, fecha_fin, num_reuniones, notas, estado')
    .eq('id', planId)
    .maybeSingle();

  if (planError) return { plan: null, clases: [], reuniones: [], assignments: [], error: planError };
  if (!plan) return { plan: null, clases: [], reuniones: [], assignments: [], error: new Error('Plan not found') };

  const [{ data: clases, error: clasesError }, { data: reuniones, error: reunionesError }] = await Promise.all([
    fetchPlanClasses(planId),
    fetchPlanMeetings(planId),
  ]);

  if (clasesError || reunionesError) {
    return { plan, clases: [], reuniones: [], assignments: [], error: clasesError || reunionesError };
  }

  const reunionIds = (reuniones || []).map(r => r.id);
  const { data: assignments, error: assignError } = await fetchPlanMeetingRequisitos(reunionIds);

  return {
    plan,
    clases: clases || [],
    reuniones: reuniones || [],
    assignments: assignments || [],
    error: assignError,
  };
}

export async function createPlan({
  clubId,
  nombre,
  fechaInicio,
  fechaFin,
  numReuniones,
  notas,
  claseIds = [],
}) {
  const { data: plan, error } = await sb
    .from('plan_periodo_trabajo')
    .insert([{
      club_id: clubId,
      nombre: nombre.trim(),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      num_reuniones: numReuniones,
      notas: notas?.trim() || null,
    }])
    .select()
    .single();

  if (error) return { data: null, error };

  await syncPlanReuniones(plan.id, numReuniones);
  if (claseIds.length) {
    const linkError = await setPlanClasses(plan.id, claseIds);
    if (linkError) return { data: plan, error: linkError };
  }

  return { data: plan, error: null };
}

export async function updatePlan(planId, {
  nombre,
  fechaInicio,
  fechaFin,
  numReuniones,
  notas,
  estado,
}) {
  const payload = {};
  if (nombre !== undefined) payload.nombre = nombre.trim();
  if (fechaInicio !== undefined) payload.fecha_inicio = fechaInicio;
  if (fechaFin !== undefined) payload.fecha_fin = fechaFin;
  if (numReuniones !== undefined) payload.num_reuniones = numReuniones;
  if (notas !== undefined) payload.notas = notas?.trim() || null;
  if (estado !== undefined) payload.estado = estado;

  const { data, error } = await sb
    .from('plan_periodo_trabajo')
    .update(payload)
    .eq('id', planId)
    .select()
    .single();

  if (error) return { data: null, error };

  if (numReuniones !== undefined) {
    const sync = await syncPlanReuniones(planId, numReuniones);
    if (sync.error) return { data, error: sync.error };
  }

  return { data, error: null };
}

export async function deactivatePlan(planId) {
  return updatePlan(planId, { estado: 'inactivo' });
}

export async function syncPlanReuniones(planId, numReuniones) {
  const rpc = await sb.rpc('sync_plan_reuniones', {
    p_plan_id: planId,
    p_num_reuniones: numReuniones,
  });
  if (!rpc.error) return { error: null };

  const msg = rpc.error?.message || '';
  if (!msg.includes('function') && !msg.includes('does not exist')) {
    return { error: rpc.error };
  }

  const { data: existing } = await sb
    .from('plan_reunion')
    .select('id, numero')
    .eq('plan_id', planId);

  const toDelete = (existing || []).filter(r => r.numero > numReuniones).map(r => r.id);
  if (toDelete.length) {
    await sb.from('plan_reunion').delete().in('id', toDelete);
  }

  for (let n = 1; n <= numReuniones; n += 1) {
    const found = (existing || []).find(r => r.numero === n);
    if (!found) {
      await sb.from('plan_reunion').insert([{
        plan_id: planId,
        numero: n,
        titulo: `Reunión ${n}`,
      }]);
    }
  }

  return { error: null };
}

export async function setPlanClasses(planId, claseIds) {
  const { error: delError } = await sb
    .from('plan_periodo_clase')
    .delete()
    .eq('plan_id', planId);
  if (delError) return delError;

  if (!claseIds.length) return null;

  const rows = claseIds.map(claseId => ({
    plan_id: planId,
    clase_progresiva_id: claseId,
  }));

  const { error } = await sb.from('plan_periodo_clase').insert(rows);
  return error;
}

export async function updateMeeting(reunionId, { titulo, fecha, notas, tipoEventoId, hora, lugar } = {}) {
  const payload = {};
  if (titulo !== undefined) payload.titulo = titulo?.trim() || null;
  if (fecha !== undefined) payload.fecha = fecha || null;
  if (notas !== undefined) payload.notas = notas?.trim() || null;
  if (tipoEventoId !== undefined) payload.tipoEventoId = tipoEventoId || null;
  if (hora !== undefined) payload.hora = hora ? normalizeMeetingHora(hora) : null;
  if (lugar !== undefined) payload.lugar = lugar?.trim() || null;

  return updateMeetingRow(reunionId, payload);
}

export async function setMeetingEventoId(reunionId, eventoId) {
  const result = await updateMeetingRow(reunionId, { evento_id: eventoId || null });
  if (!result.error) return result;
  if (isMissingColumnError(result.error, 'evento_id')) {
    return { data: null, error: null };
  }
  return result;
}

export async function unsyncMeetingFromClubAgenda(reunion) {
  if (!reunion?.evento_id) return { data: reunion, error: null };

  await EventosModel.setEventoEstado(reunion.evento_id, 'cancelado');
  return setMeetingEventoId(reunion.id, null);
}

export async function syncMeetingToClubAgenda({ reunion, clubId, clubName = '' }) {
  if (!reunion?.fecha || !clubId) {
    return { data: null, error: new Error('Meeting date and club are required') };
  }

  const nombre = reunion.titulo?.trim() || `Reunión ${reunion.numero}`;
  const hora = normalizeMeetingHora(reunion.hora);
  const lugar = reunion.lugar?.trim() || clubName?.trim() || 'Por definir';
  const tipoEventoId = reunion.tipo_evento_id || null;

  if (reunion.evento_id) {
    const { error: updateError } = await EventosModel.updateEvento(reunion.evento_id, {
      nombre,
      fecha: reunion.fecha,
      hora,
      lugar,
      tipoEventoId,
    });
    if (updateError) return { data: null, error: updateError };

    await EventosModel.setEventoEstado(reunion.evento_id, 'activo');
    return { data: { evento_id: reunion.evento_id }, error: null };
  }

  const { data, error: createError } = await EventosModel.createEvento({
    clubId,
    nombre,
    fecha: reunion.fecha,
    hora,
    lugar,
    tipoEventoId,
    requiereConfirmacion: false,
    miembroIds: [],
  });
  if (createError) return { data: null, error: createError };

  const link = await setMeetingEventoId(reunion.id, data?.id);
  if (link.error) return { data: null, error: link.error };

  return { data: { evento_id: data?.id, reunion: link.data }, error: null };
}

export async function assignRequisitoToMeeting(reunionId, claseRequisitoId, orden = 0, sesiones = 3) {
  const { data: existing } = await sb
    .from('plan_reunion_requisito')
    .select('id, reunion_id')
    .eq('clase_requisito_id', claseRequisitoId);

  if (existing?.length) {
    const other = existing.find(r => r.reunion_id !== reunionId);
    if (other) {
      await sb.from('plan_reunion_requisito').delete().eq('id', other.id);
    }
  }

  const payload = {
    reunion_id: reunionId,
    clase_requisito_id: claseRequisitoId,
    orden,
    sesiones: clampSesiones(sesiones),
  };

  const result = await sb
    .from('plan_reunion_requisito')
    .upsert([payload], { onConflict: 'reunion_id,clase_requisito_id' })
    .select()
    .single();

  if (result.error && isMissingColumnError(result.error, 'sesiones')) {
    delete payload.sesiones;
    return sb
      .from('plan_reunion_requisito')
      .upsert([payload], { onConflict: 'reunion_id,clase_requisito_id' })
      .select()
      .single();
  }

  return result;
}

export async function updatePlanRequisitoSesiones(reunionId, claseRequisitoId, sesiones) {
  const payload = { sesiones: clampSesiones(sesiones) };
  const result = await sb
    .from('plan_reunion_requisito')
    .update(payload)
    .eq('reunion_id', reunionId)
    .eq('clase_requisito_id', claseRequisitoId)
    .select()
    .single();

  if (result.error && isMissingColumnError(result.error, 'sesiones')) {
    return { data: null, error: null };
  }

  return result;
}

export async function removeRequisitoFromMeeting(reunionId, claseRequisitoId) {
  return sb
    .from('plan_reunion_requisito')
    .delete()
    .eq('reunion_id', reunionId)
    .eq('clase_requisito_id', claseRequisitoId);
}

export function mapAssignmentsByMeeting(rows = []) {
  const map = {};
  for (const row of rows) {
    if (!map[row.reunion_id]) map[row.reunion_id] = [];
    map[row.reunion_id].push(row);
  }
  for (const id of Object.keys(map)) {
    map[id].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }
  return map;
}

export function getAssignedRequisitoIds(assignments = []) {
  return new Set(assignments.map(a => a.clase_requisito_id));
}

export function countAssignedRequisitos(assignmentsByMeeting = {}) {
  return Object.values(assignmentsByMeeting).reduce((sum, list) => sum + list.length, 0);
}

export function assignmentSesiones(row) {
  return clampSesiones(row.sesiones, defaultSesionesEsperadas(row.clase_requisitos));
}

export function countAssignedSessions(assignmentsByMeeting = {}) {
  return Object.values(assignmentsByMeeting).reduce(
    (sum, list) => sum + (list || []).reduce((meetingSum, row) => meetingSum + assignmentSesiones(row), 0),
    0
  );
}

export function summarizePlanSessions(assignmentsByMeeting = {}, reuniones = []) {
  const byMeeting = reuniones.map(reunion => {
    const items = assignmentsByMeeting[reunion.id] || [];
    const sesiones = items.reduce((sum, row) => sum + assignmentSesiones(row), 0);
    return {
      reunionId: reunion.id,
      numero: reunion.numero,
      titulo: reunion.titulo?.trim() || '',
      fecha: reunion.fecha,
      reqCount: items.length,
      sesiones,
    };
  });

  return {
    totalSesiones: byMeeting.reduce((sum, meeting) => sum + meeting.sesiones, 0),
    totalReqs: countAssignedRequisitos(assignmentsByMeeting),
    byMeeting,
  };
}

export function getAssignedRequisitoIdsFromMap(assignmentsByMeeting = {}) {
  const ids = new Set();
  for (const list of Object.values(assignmentsByMeeting)) {
    for (const row of list) {
      if (row.clase_requisito_id) ids.add(row.clase_requisito_id);
    }
  }
  return ids;
}

export function buildLocalAssignment(reunionId, requisito, orden, serverRow = null, sesiones = null) {
  const sesionesValue = clampSesiones(
    sesiones ?? serverRow?.sesiones ?? defaultSesionesEsperadas(requisito),
    3
  );

  if (serverRow) {
    return {
      ...serverRow,
      sesiones: sesionesValue,
      clase_requisitos: serverRow.clase_requisitos || requisito,
    };
  }

  return {
    id: `local-${requisito.id}-${reunionId}`,
    reunion_id: reunionId,
    clase_requisito_id: requisito.id,
    orden,
    sesiones: sesionesValue,
    clase_requisitos: {
      id: requisito.id,
      clase_id: requisito.clase_id,
      descripcion: requisito.descripcion,
      numero: requisito.numero,
      orden: requisito.orden,
      texto_opcional: requisito.texto_opcional,
      sesiones_esperadas: requisito.sesiones_esperadas ?? 3,
      clases_progresivas: requisito.clases_progresivas,
      clase_requisito_secciones: requisito.clase_requisito_secciones,
    },
  };
}

export function moveAssignmentLocal(assignmentsByMeeting, { requisitoId, toReunionId, assignmentRow }) {
  const next = {};
  for (const [meetingId, list] of Object.entries(assignmentsByMeeting)) {
    next[meetingId] = (list || []).filter(row => row.clase_requisito_id !== requisitoId);
  }

  if (toReunionId && assignmentRow) {
    next[toReunionId] = [...(next[toReunionId] || []), assignmentRow];
    next[toReunionId].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }

  return next;
}

export function buildPlanPrintTimeline(detail, otherEventos = []) {
  const assignmentsByMeeting = mapAssignmentsByMeeting(detail?.assignments || []);

  const meetingItems = (detail?.reuniones || [])
    .filter(reunion => reunion.fecha)
    .map(reunion => {
      const hora = normalizeMeetingHora(reunion.hora);
      return {
        kind: 'meeting',
        date: reunion.fecha,
        time: hora,
        sortKey: `${reunion.fecha}T${hora || '00:00'}`,
        title: reunion.titulo?.trim() || '',
        meetingNumero: reunion.numero,
        subtitle: reunion.tipos_evento?.nombre || '',
        description: reunion.notas?.trim() || '',
        requisitos: (assignmentsByMeeting[reunion.id] || []).map(row => {
          const req = row.clase_requisitos || {};
          return {
            numero: req.numero,
            descripcion: req.descripcion,
            clase: req.clases_progresivas?.nombre || '',
            sesiones: row.sesiones ?? defaultSesionesEsperadas(req),
          };
        }),
      };
    });

  const eventItems = (otherEventos || []).map(evento => {
    const hora = String(evento.hora || '').slice(0, 5);
    return {
      kind: 'event',
      date: evento.fecha,
      time: hora,
      sortKey: `${evento.fecha}T${hora || '00:00'}`,
      title: evento.nombre || '',
      subtitle: evento.tipos_evento?.nombre || '',
      description: evento.lugar?.trim() || '',
      requisitos: [],
    };
  });

  return [...meetingItems, ...eventItems].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export function groupTimelineByDate(timeline = []) {
  const groups = [];
  const byDate = new Map();

  for (const item of timeline) {
    if (!byDate.has(item.date)) {
      const group = { date: item.date, items: [] };
      byDate.set(item.date, group);
      groups.push(group);
    }
    byDate.get(item.date).items.push(item);
  }

  return groups;
}

export async function fetchPlanPrintPayload(planId, clubId) {
  const detail = await fetchPlanDetail(planId);
  if (detail.error) return { error: detail.error };
  if (!detail.plan) return { error: new Error('Plan not found') };

  const linkedEventoIds = new Set(
    (detail.reuniones || []).map(reunion => reunion.evento_id).filter(Boolean)
  );

  let otherEventos = [];
  if (clubId && detail.plan.fecha_inicio && detail.plan.fecha_fin) {
    const { data, error: eventsError } = await EventosModel.fetchEventosByClubInRange(
      clubId,
      detail.plan.fecha_inicio,
      detail.plan.fecha_fin
    );
    if (eventsError) return { error: eventsError };
    otherEventos = (data || []).filter(evento => !linkedEventoIds.has(evento.id));
  }

  const timeline = buildPlanPrintTimeline(detail, otherEventos);
  const assignmentsByMeeting = mapAssignmentsByMeeting(detail.assignments || []);

  return {
    plan: detail.plan,
    timeline,
    groupedTimeline: groupTimelineByDate(timeline),
    sessionsSummary: summarizePlanSessions(assignmentsByMeeting, detail.reuniones || []),
    error: null,
  };
}
