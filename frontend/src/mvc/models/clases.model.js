import { sb } from '../../services/supabase';

const SELECT_WITH_JOIN = 'id,nombre,tipo_id,estado,club_tipo,tipos_club(nombre)';
const SELECT_PLAIN = 'id,nombre,tipo_id,estado,club_tipo';
const SELECT_MINIMAL = 'id,nombre,estado,club_tipo';

function sortByNombre(rows) {
  return [...rows].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', undefined, { sensitivity: 'base' }));
}

export async function fetchClasesProgresivas({ showInactive = false } = {}) {
  let lastError = null;

  for (const select of [SELECT_WITH_JOIN, SELECT_PLAIN, SELECT_MINIMAL, '*']) {
    let query = sb.from('clases_progresivas').select(select);
    if (!showInactive) query = query.eq('estado', 'activo');

    const { data, error } = await query;
    if (!error) {
      return { data: sortByNombre(data || []), error: null };
    }
    lastError = error;
  }

  return { data: [], error: lastError };
}

export function filterClasesByTipo(clases, tipoId, tipos = []) {
  if (!tipoId) return clases;
  const tipo = tipos.find(t => t.id === tipoId);
  return clases.filter(c =>
    c.tipo_id === tipoId || (tipo?.nombre && c.club_tipo === tipo.nombre)
  );
}

export function filterClasesByTipos(clases, tipoIds = [], tipos = []) {
  if (!tipoIds.length) return clases;
  const tipoNames = tipos.filter(t => tipoIds.includes(t.id)).map(t => t.nombre);
  return clases.filter(c =>
    tipoIds.includes(c.tipo_id) || tipoNames.includes(c.club_tipo)
  );
}

export async function fetchTiposClub() {
  const { data, error } = await sb
    .from('tipos_club')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error) {
    const fallback = await sb.from('tipos_club').select('id, nombre');
    if (fallback.error) return fallback;
    return { data: sortByNombre(fallback.data || []), error: null };
  }

  return { data: data || [], error: null };
}

async function resolveClubTipoName(tipoId) {
  if (!tipoId) return null;
  const { data } = await sb.from('tipos_club').select('nombre').eq('id', tipoId).single();
  return data?.nombre || null;
}

export async function createClaseProgresiva({ nombre, tipo_id }) {
  const club_tipo = await resolveClubTipoName(tipo_id);
  return sb.from('clases_progresivas').insert([{
    nombre,
    tipo_id,
    club_tipo,
    estado: 'activo',
  }]);
}

export async function updateClaseProgresiva(id, { nombre, tipo_id }) {
  const club_tipo = await resolveClubTipoName(tipo_id);
  return sb.from('clases_progresivas').update({ nombre, tipo_id, club_tipo }).eq('id', id);
}

export async function updateClaseEstado(id, estado) {
  return sb.from('clases_progresivas').update({ estado }).eq('id', id);
}

export async function fetchRequisitosByClase(claseId) {
  return sb
    .from('clase_requisitos')
    .select('id, clase_id, descripcion')
    .eq('clase_id', claseId)
    .order('descripcion', { ascending: true });
}

export async function createClaseRequisito(claseId, descripcion) {
  return sb.from('clase_requisitos').insert([{ clase_id: claseId, descripcion: descripcion.trim() }]);
}

export async function deleteClaseRequisito(id) {
  return sb.from('clase_requisitos').delete().eq('id', id);
}

export async function fetchMiembroClases(miembroId) {
  const attempts = [
    'id, miembro_id, clase_progresiva_id, clases_progresivas(id,nombre,tipo_id,club_tipo,estado,tipos_club(nombre))',
    'id, miembro_id, clase_id, clases_progresivas(id,nombre,tipo_id,club_tipo,estado,tipos_club(nombre))',
    'id, miembro_id, clases_progresivas(*)',
  ];

  for (const select of attempts) {
    const { data, error } = await sb
      .from('miembro_clase_progresiva')
      .select(select)
      .eq('miembro_id', miembroId);
    if (!error) return { data: data || [], error: null };
  }

  return sb.from('miembro_clase_progresiva').select('*').eq('miembro_id', miembroId);
}

export async function assignClaseToMiembro(miembroId, claseId) {
  const rows = [
    { miembro_id: miembroId, clase_progresiva_id: claseId },
    { miembro_id: miembroId, clase_id: claseId },
  ];

  for (const row of rows) {
    const { error } = await sb.from('miembro_clase_progresiva').insert([row]);
    if (!error) return { error: null };
    if (isRlsError(error)) break;
    if (!/column|Could not find/i.test(error.message || '')) return { error };
  }

  const rpc = await sb.rpc('admin_assign_miembro_clase', {
    p_miembro_id: miembroId,
    p_clase_id: claseId,
  });

  if (!rpc.error) return { error: null };
  return { error: rpc.error };
}

export async function unassignClaseFromMiembro(linkId) {
  const direct = await sb.from('miembro_clase_progresiva').delete().eq('id', linkId);
  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;

  return sb.rpc('admin_unassign_miembro_clase', { p_link_id: linkId });
}

function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}

export async function fetchRequisitosForClases(claseIds) {
  if (!claseIds.length) return { data: [], error: null };
  return sb
    .from('clase_requisitos')
    .select('id, clase_id, descripcion')
    .in('clase_id', claseIds);
}
