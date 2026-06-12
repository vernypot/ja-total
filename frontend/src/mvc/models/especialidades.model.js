import { sb } from '../../services/supabase';

function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}
import { fetchTiposClub } from './clases.model';

function sortByNombre(rows) {
  return [...rows].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', undefined, { sensitivity: 'base' }));
}

function isMissingColumnError(error, column) {
  const msg = error?.message || '';
  return msg.includes(`${column} does not exist`) || msg.includes(`Could not find the '${column}' column`);
}

async function resolveClubTipoName(tipoId) {
  if (!tipoId) return null;
  const { data } = await sb.from('tipos_club').select('nombre').eq('id', tipoId).single();
  return data?.nombre || null;
}

function enrichEspecialidadRows(rows, tipos = []) {
  return (rows || []).map(row => {
    const tipoByName = tipos.find(t => t.nombre === row.club_tipo);
    const tipoById = row.tipo_id ? tipos.find(t => t.id === row.tipo_id) : null;
    const tipo = tipoById || tipoByName;
    return {
      ...row,
      estado: row.estado || 'activo',
      tipo_id: row.tipo_id || tipo?.id || '',
      tipos_club: row.tipos_club || { nombre: row.club_tipo || tipo?.nombre || '' },
    };
  });
}

export function filterEspecialidadesByTipo(especialidades, tipoId, tipos = []) {
  if (!tipoId) return especialidades;
  const tipo = tipos.find(t => t.id === tipoId);
  return especialidades.filter(e =>
    e.tipo_id === tipoId || (tipo?.nombre && e.club_tipo === tipo.nombre)
  );
}

export function filterEspecialidadesByTipos(especialidades, tipoIds = [], tipos = []) {
  if (!tipoIds.length) return especialidades;
  const tipoNames = tipos.filter(t => tipoIds.includes(t.id)).map(t => t.nombre);
  return especialidades.filter(e =>
    tipoIds.includes(e.tipo_id) || tipoNames.includes(e.club_tipo)
  );
}

export async function fetchEspecialidades({ showInactive = false } = {}) {
  let lastError = null;

  const selects = [
    'id,nombre,club_tipo,estado',
    'id,nombre,club_tipo',
    'id,nombre,tipo_id,club_tipo,estado,tipos_club(nombre)',
    'id,nombre,tipo_id,club_tipo,estado',
    'id,nombre,tipo_id,club_tipo',
    'id,nombre',
    '*',
  ];

  for (const select of selects) {
    let query = sb.from('especialidades').select(select).order('nombre', { ascending: true });
    if (!showInactive && select.includes('estado')) {
      query = query.eq('estado', 'activo');
    }

    const { data, error } = await query;
    if (!error) {
      const hasEstado = select.includes('estado') && data?.some(row => row.estado != null);
      return { data: data || [], error: null, hasEstado };
    }

    if (isMissingColumnError(error, 'estado') || isMissingColumnError(error, 'tipo_id')) {
      continue;
    }
    lastError = error;
  }

  return { data: [], error: lastError, hasEstado: false };
}

async function insertEspecialidad(payload) {
  const withEstado = await sb.from('especialidades').insert([{ ...payload, estado: 'activo' }]);
  if (!withEstado.error) return withEstado;
  if (isMissingColumnError(withEstado.error, 'estado')) {
    return sb.from('especialidades').insert([payload]);
  }
  return withEstado;
}

export async function createEspecialidad({ nombre, tipo_id }) {
  const club_tipo = await resolveClubTipoName(tipo_id);
  if (!club_tipo) {
    return { data: null, error: new Error('Club type is required') };
  }
  return insertEspecialidad({ nombre: nombre.trim(), club_tipo });
}

export async function updateEspecialidad(id, { nombre, tipo_id }) {
  const club_tipo = await resolveClubTipoName(tipo_id);
  if (!club_tipo) {
    return { data: null, error: new Error('Club type is required') };
  }
  return sb.from('especialidades').update({
    nombre: nombre.trim(),
    club_tipo,
  }).eq('id', id);
}

export async function updateEspecialidadEstado(id, estado) {
  const result = await sb.from('especialidades').update({ estado }).eq('id', id);
  if (result.error && isMissingColumnError(result.error, 'estado')) {
    return { data: null, error: null };
  }
  return result;
}

export async function fetchRequisitosByEspecialidad(especialidadId) {
  return sb
    .from('especialidad_requisitos')
    .select('id, especialidad_id, descripcion')
    .eq('especialidad_id', especialidadId)
    .order('descripcion', { ascending: true });
}

export async function createEspecialidadRequisito(especialidadId, descripcion) {
  return sb.from('especialidad_requisitos').insert([{
    especialidad_id: especialidadId,
    descripcion: descripcion.trim(),
  }]);
}

export async function deleteEspecialidadRequisito(id) {
  return sb.from('especialidad_requisitos').delete().eq('id', id);
}

export async function fetchMiembroEspecialidades(miembroId) {
  const attempts = [
    'id, miembro_id, especialidad_id, especialidades(id, nombre, club_tipo)',
    'id, miembro_id, especialidad_id, especialidades(id, nombre)',
    'id, miembro_id, especialidades(id, nombre, club_tipo)',
    'id, miembro_id, especialidades(id, nombre)',
    'id, miembro_id, especialidad_id, especialidades(id, nombre, tipo_id, club_tipo)',
    '*',
  ];

  for (const select of attempts) {
    const { data, error } = await sb
      .from('miembro_especialidad')
      .select(select)
      .eq('miembro_id', miembroId);
    if (!error) return { data: data || [], error: null };
  }

  return sb.from('miembro_especialidad').select('*').eq('miembro_id', miembroId);
}

export async function assignEspecialidadToMiembro(miembroId, especialidadId) {
  const { data: existing } = await sb
    .from('miembro_especialidad')
    .select('id')
    .eq('miembro_id', miembroId)
    .eq('especialidad_id', especialidadId)
    .maybeSingle();

  if (existing) return { error: null };

  const direct = await sb.from('miembro_especialidad').insert([{
    miembro_id: miembroId,
    especialidad_id: especialidadId,
  }]);

  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;

  return sb.rpc('admin_assign_miembro_especialidad', {
    p_miembro_id: miembroId,
    p_especialidad_id: especialidadId,
  });
}

export async function unassignEspecialidadFromMiembro(linkId) {
  const direct = await sb.from('miembro_especialidad').delete().eq('id', linkId);
  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;

  return sb.rpc('admin_unassign_miembro_especialidad', { p_link_id: linkId });
}

export async function fetchRequisitosForEspecialidades(especialidadIds) {
  if (!especialidadIds.length) return { data: [], error: null };
  return sb
    .from('especialidad_requisitos')
    .select('id, especialidad_id, descripcion')
    .in('especialidad_id', especialidadIds);
}

export async function fetchEspecialidadesCatalogSorted({ showInactive = false } = {}) {
  const [{ data, error, hasEstado }, { data: tipos }] = await Promise.all([
    fetchEspecialidades({ showInactive }),
    fetchTiposClub(),
  ]);

  if (error) return { data: [], error, hasEstado: false };

  return {
    data: sortByNombre(enrichEspecialidadRows(data, tipos)),
    error: null,
    hasEstado: Boolean(hasEstado),
  };
}

export async function fetchEspecialidadesByMiembro(miembroId) {
  return fetchMiembroEspecialidades(miembroId);
}

export { fetchTiposClub };
