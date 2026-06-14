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

function enrichEspecialidadRows(rows, tipos = [], secciones = []) {
  return (rows || []).map(row => {
    const tipoByName = tipos.find(t => t.nombre === row.club_tipo);
    const tipoById = row.tipo_id ? tipos.find(t => t.id === row.tipo_id) : null;
    const tipo = tipoById || tipoByName;
    const seccion = row.especialidad_secciones
      || secciones.find(s => s.id === row.seccion_id)
      || null;
    return {
      ...row,
      estado: row.estado || 'activo',
      tipo_id: row.tipo_id || tipo?.id || '',
      tipos_club: row.tipos_club || { nombre: row.club_tipo || tipo?.nombre || '' },
      seccion_id: row.seccion_id || seccion?.id || '',
      especialidad_secciones: seccion,
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

export function countActiveRequisitos(requisitos = []) {
  return (requisitos || []).filter(r => (r.estado || 'activo') === 'activo').length;
}

export function isEspecialidadAssignable(especialidad, requisitos = []) {
  if (!especialidad) return false;
  if ((especialidad.estado || 'activo') !== 'activo') return false;
  return countActiveRequisitos(requisitos) > 0;
}

export function filterAssignableEspecialidades(especialidades, requisitosByEsp = {}) {
  return (especialidades || []).filter(e =>
    isEspecialidadAssignable(e, requisitosByEsp[e.id])
  );
}

export async function fetchEspecialidadSecciones({ showInactive = false } = {}) {
  let query = sb
    .from('especialidad_secciones')
    .select('id, slug, nombre, orden, estado')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });

  if (!showInactive) query = query.eq('estado', 'activo');

  const { data, error } = await query;
  if (error) {
    const msg = error?.message || '';
    if (msg.includes('does not exist') || msg.includes('Could not find the table')) {
      return { data: [], error: null, hasSecciones: false };
    }
    return { data: [], error, hasSecciones: false };
  }
  return { data: data || [], error: null, hasSecciones: true };
}

export function groupEspecialidadesBySeccion(especialidades, secciones = []) {
  const byId = new Map(secciones.map(s => [s.id, s]));
  const groups = new Map();

  for (const row of especialidades) {
    const seccion = row.especialidad_secciones || byId.get(row.seccion_id);
    const key = seccion?.id || '__sin_seccion__';
    if (!groups.has(key)) {
      groups.set(key, {
        seccion: seccion || { id: '', nombre: '', orden: 9999 },
        especialidades: [],
      });
    }
    groups.get(key).especialidades.push(row);
  }

  return [...groups.values()]
    .sort((a, b) => {
      const ao = a.seccion.orden ?? 9999;
      const bo = b.seccion.orden ?? 9999;
      if (ao !== bo) return ao - bo;
      return (a.seccion.nombre || '').localeCompare(b.seccion.nombre || '', undefined, { sensitivity: 'base' });
    })
    .map(group => ({
      ...group,
      especialidades: sortByNombre(group.especialidades),
    }));
}

export async function fetchEspecialidades({ showInactive = false } = {}) {
  let lastError = null;

  const selects = [
    'id,nombre,club_tipo,estado,seccion_id,especialidad_secciones(id,slug,nombre,orden)',
    'id,nombre,club_tipo,estado,seccion_id',
    'id,nombre,club_tipo,estado',
    'id,nombre,club_tipo',
    'id,nombre,tipo_id,club_tipo,estado,seccion_id,tipos_club(nombre),especialidad_secciones(id,slug,nombre,orden)',
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

    if (isMissingColumnError(error, 'estado') || isMissingColumnError(error, 'tipo_id') || isMissingColumnError(error, 'seccion_id')) {
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
    const { estado, ...rest } = payload;
    const retry = await sb.from('especialidades').insert([rest]);
    if (!retry.error) return retry;
    if (isMissingColumnError(retry.error, 'seccion_id')) {
      const { seccion_id, ...base } = rest;
      return sb.from('especialidades').insert([base]);
    }
    return retry;
  }
  if (isMissingColumnError(withEstado.error, 'seccion_id')) {
    const { seccion_id, ...rest } = payload;
    return insertEspecialidad({ ...rest, estado: payload.estado });
  }
  return withEstado;
}

export async function createEspecialidad({ nombre, tipo_id, seccion_id }) {
  const club_tipo = await resolveClubTipoName(tipo_id);
  if (!club_tipo) {
    return { data: null, error: new Error('Club type is required') };
  }
  const payload = { nombre: nombre.trim(), club_tipo };
  if (seccion_id) payload.seccion_id = seccion_id;
  return insertEspecialidad(payload);
}

export async function updateEspecialidad(id, { nombre, tipo_id, seccion_id }) {
  const club_tipo = await resolveClubTipoName(tipo_id);
  if (!club_tipo) {
    return { data: null, error: new Error('Club type is required') };
  }
  const payload = {
    nombre: nombre.trim(),
    club_tipo,
    seccion_id: seccion_id || null,
  };
  return sb.from('especialidades').update(payload).eq('id', id);
}

export async function updateEspecialidadEstado(id, estado) {
  const result = await sb.from('especialidades').update({ estado }).eq('id', id);
  if (result.error && isMissingColumnError(result.error, 'estado')) {
    return { data: null, error: null };
  }
  return result;
}

export async function fetchRequisitosByEspecialidad(especialidadId, { showInactive = true } = {}) {
  const selects = [
    'id, especialidad_id, descripcion, estado',
    'id, especialidad_id, descripcion',
  ];

  for (const select of selects) {
    let query = sb
      .from('especialidad_requisitos')
      .select(select)
      .eq('especialidad_id', especialidadId)
      .order('descripcion', { ascending: true });

    if (!showInactive && select.includes('estado')) {
      query = query.eq('estado', 'activo');
    }

    const { data, error } = await query;
    if (!error) {
      return {
        data: (data || []).map(row => ({ ...row, estado: row.estado || 'activo' })),
        error: null,
      };
    }
    if (isMissingColumnError(error, 'estado')) continue;
    return { data: [], error };
  }

  return { data: [], error: null };
}

export async function createEspecialidadRequisito(especialidadId, descripcion) {
  const payload = {
    especialidad_id: especialidadId,
    descripcion: descripcion.trim(),
    estado: 'activo',
  };

  const withEstado = await sb.from('especialidad_requisitos').insert([payload]);
  if (!withEstado.error) return withEstado;
  if (isMissingColumnError(withEstado.error, 'estado')) {
    const { estado, ...rest } = payload;
    return sb.from('especialidad_requisitos').insert([rest]);
  }
  return withEstado;
}

export async function setEspecialidadRequisitoEstado(id, estado) {
  const result = await sb.from('especialidad_requisitos').update({ estado }).eq('id', id);
  if (result.error && isMissingColumnError(result.error, 'estado')) {
    return { data: null, error: null };
  }
  return result;
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

  const [{ data: especialidad }, { data: requisitos }] = await Promise.all([
    sb.from('especialidades').select('id, estado').eq('id', especialidadId).maybeSingle(),
    fetchRequisitosByEspecialidad(especialidadId, { showInactive: false }),
  ]);

  if (!isEspecialidadAssignable(especialidad, requisitos)) {
    return {
      error: new Error('Honor is not assignable: it must be active and have at least one active requirement.'),
    };
  }

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

export async function fetchRequisitosForEspecialidades(especialidadIds, { showInactive = false } = {}) {
  if (!especialidadIds.length) return { data: [], error: null };

  const selects = [
    'id, especialidad_id, descripcion, estado',
    'id, especialidad_id, descripcion',
  ];

  for (const select of selects) {
    let query = sb
      .from('especialidad_requisitos')
      .select(select)
      .in('especialidad_id', especialidadIds);

    if (!showInactive && select.includes('estado')) {
      query = query.eq('estado', 'activo');
    }

    const { data, error } = await query;
    if (!error) {
      return {
        data: (data || []).map(row => ({ ...row, estado: row.estado || 'activo' })),
        error: null,
      };
    }
    if (isMissingColumnError(error, 'estado')) continue;
    return { data: [], error };
  }

  return { data: [], error: null };
}

export async function fetchEspecialidadesCatalogSorted({ showInactive = false } = {}) {
  const [{ data, error, hasEstado }, { data: tipos }, { data: secciones }] = await Promise.all([
    fetchEspecialidades({ showInactive }),
    fetchTiposClub(),
    fetchEspecialidadSecciones({ showInactive }),
  ]);

  if (error) return { data: [], error, hasEstado: false, secciones: [] };

  return {
    data: sortByNombre(enrichEspecialidadRows(data, tipos, secciones)),
    error: null,
    hasEstado: Boolean(hasEstado),
    secciones: secciones || [],
  };
}

export async function fetchEspecialidadesByMiembro(miembroId) {
  return fetchMiembroEspecialidades(miembroId);
}

export { fetchTiposClub };
