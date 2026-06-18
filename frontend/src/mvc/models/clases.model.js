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

function isMissingColumnError(error, column) {
  const msg = error?.message || '';
  return msg.includes(`${column} does not exist`)
    || msg.includes(`Could not find the '${column}' column`)
    || msg.includes(`'${column}' column`);
}

function missingColumnFromError(error) {
  const match = (error?.message || '').match(/Could not find the '([^']+)' column/);
  return match?.[1] || null;
}

function enrichRequisitoRows(rows) {
  return (rows || []).map(row => ({
    ...row,
    numero: row.numero ?? null,
    orden: row.orden ?? 0,
    clase_requisito_secciones: row.clase_requisito_secciones || null,
  }));
}

export function groupRequisitosBySeccion(requisitos = [], secciones = [], { includeEmptySections = false } = {}) {
  const bySeccionId = {};
  const ungrouped = [];

  for (const req of requisitos) {
    const seccionId = req.seccion_id || req.clase_requisito_secciones?.id;
    if (!seccionId) {
      ungrouped.push(req);
      continue;
    }
    if (!bySeccionId[seccionId]) bySeccionId[seccionId] = [];
    bySeccionId[seccionId].push(req);
  }

  const sortReqs = list => [...list].sort((a, b) => {
    const ao = a.orden ?? a.numero ?? 0;
    const bo = b.orden ?? b.numero ?? 0;
    return ao - bo || (a.numero ?? 0) - (b.numero ?? 0);
  });

  const grouped = (secciones.length ? secciones : [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || (a.parte === b.parte ? 0 : a.parte === 'basico' ? -1 : 1))
    .map(seccion => ({
      seccion,
      requisitos: sortReqs(bySeccionId[seccion.id] || []),
    }))
    .filter(group => includeEmptySections || group.requisitos.length > 0);

  if (!secciones.length) {
    const seen = new Set();
    for (const req of requisitos) {
      const seccion = req.clase_requisito_secciones;
      if (!seccion?.id || seen.has(seccion.id)) continue;
      seen.add(seccion.id);
      grouped.push({
        seccion,
        requisitos: sortReqs(bySeccionId[seccion.id] || []),
      });
    }
    grouped.sort((a, b) => (a.seccion.orden ?? 0) - (b.seccion.orden ?? 0));
  }

  return { grouped, ungrouped: sortReqs(ungrouped) };
}

export function groupRequisitosByClaseAndSeccion(requisitos = [], planClases = []) {
  const byClaseId = {};
  for (const req of requisitos) {
    const claseId = req.clase_id || req.clases_progresivas?.id;
    if (!claseId) continue;
    if (!byClaseId[claseId]) byClaseId[claseId] = [];
    byClaseId[claseId].push(req);
  }

  const claseEntries = [];
  const seen = new Set();

  for (const link of planClases) {
    const id = link.clase_progresiva_id || link.clases_progresivas?.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    claseEntries.push({
      id,
      nombre: link.clases_progresivas?.nombre || '',
    });
  }

  for (const claseId of Object.keys(byClaseId)) {
    if (seen.has(claseId)) continue;
    const sample = byClaseId[claseId][0];
    claseEntries.push({
      id: claseId,
      nombre: sample?.clases_progresivas?.nombre || '',
    });
  }

  return claseEntries
    .map(clase => {
      const { grouped, ungrouped } = groupRequisitosBySeccion(byClaseId[clase.id] || []);
      const total = grouped.reduce((sum, group) => sum + group.requisitos.length, 0) + ungrouped.length;
      return { clase, sections: grouped, ungrouped, total };
    })
    .filter(group => group.total > 0);
}

export function nextRequisitoNumero(requisitos = [], seccionId) {
  if (!seccionId) return 1;
  const inSection = requisitos.filter(
    r => r.seccion_id === seccionId || r.clase_requisito_secciones?.id === seccionId
  );
  const max = Math.max(0, ...inSection.map(r => Number(r.numero) || 0));
  return max + 1;
}

export function nextSeccionOrden(secciones = []) {
  if (!secciones.length) return 1;
  return Math.max(0, ...secciones.map(s => Number(s.orden) || 0)) + 1;
}

export function computeRequisitoOrden(seccionOrden, numero) {
  return (Number(seccionOrden) || 0) * 100 + (Number(numero) || 0);
}

function slugifySeccion(nombre) {
  return (nombre || 'seccion')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function createClaseRequisitoSeccion(claseId, { parte = 'basico', numero_romano, nombre, orden, slug } = {}) {
  const payload = {
    clase_id: claseId,
    parte: parte || 'basico',
    numero_romano: numero_romano?.trim() || null,
    nombre: nombre.trim(),
    slug: slug || `${slugifySeccion(nombre)}-${Date.now()}`,
    orden: Number(orden) || 0,
  };
  return sb.from('clase_requisito_secciones').insert([payload]);
}

export async function updateClaseRequisitoSeccion(id, { parte, numero_romano, nombre, orden } = {}) {
  const payload = {};
  if (parte !== undefined) payload.parte = parte;
  if (numero_romano !== undefined) payload.numero_romano = numero_romano?.trim() || null;
  if (nombre !== undefined) payload.nombre = nombre.trim();
  if (orden !== undefined) payload.orden = Number(orden) || 0;
  payload.updated_at = new Date().toISOString();
  return sb.from('clase_requisito_secciones').update(payload).eq('id', id);
}

export async function deleteClaseRequisitoSeccion(id) {
  return sb.from('clase_requisito_secciones').delete().eq('id', id);
}

export function getRequisitoDisplayText(req, completion = null) {
  const original = req?.descripcion || '';
  if (!completion?.usar_texto_alternativo) return original;

  const memberText = completion?.texto_reemplazo?.trim();
  if (memberText) return memberText;

  const catalogAlt = req?.texto_opcional?.trim();
  if (catalogAlt) return catalogAlt;

  return original;
}

export async function updateClaseRequisito(id, { descripcion, texto_opcional, seccion_id, numero, orden } = {}) {
  const payload = {};
  if (descripcion !== undefined) payload.descripcion = descripcion.trim();
  if (texto_opcional !== undefined) {
    payload.texto_opcional = texto_opcional?.trim() || null;
  }
  if (seccion_id !== undefined) payload.seccion_id = seccion_id || null;
  if (numero !== undefined) payload.numero = numero === '' || numero == null ? null : Number(numero);
  if (orden !== undefined) payload.orden = Number(orden) || 0;
  return sb.from('clase_requisitos').update(payload).eq('id', id);
}

export async function fetchRequisitoSeccionesByClase(claseId) {
  const { data, error } = await sb
    .from('clase_requisito_secciones')
    .select('id, clase_id, parte, numero_romano, nombre, slug, orden')
    .eq('clase_id', claseId)
    .order('orden', { ascending: true });

  if (error && isMissingColumnError(error, 'parte')) {
    return { data: [], error: null };
  }
  return { data: data || [], error };
}

export async function fetchRequisitosByClase(claseId) {
  const selects = [
    'id, clase_id, seccion_id, numero, orden, descripcion, texto_opcional, clase_requisito_secciones(id, parte, numero_romano, nombre, orden)',
    'id, clase_id, seccion_id, numero, orden, descripcion, clase_requisito_secciones(id, parte, numero_romano, nombre, orden)',
    'id, clase_id, descripcion',
  ];

  for (const select of selects) {
    let query = sb
      .from('clase_requisitos')
      .select(select)
      .eq('clase_id', claseId);

    if (select.includes('orden')) {
      query = query.order('orden', { ascending: true });
    } else {
      query = query.order('descripcion', { ascending: true });
    }

    const { data, error } = await query;
    if (!error) {
      return { data: enrichRequisitoRows(data), error: null };
    }
    if (isMissingColumnError(error, 'seccion_id') || isMissingColumnError(error, 'orden') || isMissingColumnError(error, 'texto_opcional')) continue;
    return { data: [], error };
  }

  return { data: [], error: null };
}

export async function createClaseRequisito(claseId, descripcion, { seccion_id, numero, orden, texto_opcional } = {}) {
  const payload = {
    clase_id: claseId,
    descripcion: descripcion.trim(),
    seccion_id: seccion_id || null,
    numero: numero ?? null,
    orden: orden ?? 0,
    texto_opcional: texto_opcional?.trim() || null,
  };

  const full = await sb.from('clase_requisitos').insert([payload]);
  if (!full.error) return full;
  if (isMissingColumnError(full.error, 'texto_opcional')) {
    delete payload.texto_opcional;
    const retry = await sb.from('clase_requisitos').insert([payload]);
    if (!retry.error) return retry;
  }
  if (isMissingColumnError(full.error, 'seccion_id')) {
    return sb.from('clase_requisitos').insert([{ clase_id: claseId, descripcion: descripcion.trim() }]);
  }
  return full;
}

export async function deleteClaseRequisito(id) {
  return sb.from('clase_requisitos').delete().eq('id', id);
}

export async function fetchMiembroClases(miembroId) {
  const progressFields =
    'estado, completado, fecha_completado, tiene_investidura, investidura_fecha, investidura_lugar, investidura_validado_por_nombre';
  const claseJoin = 'clases_progresivas(id,nombre,tipo_id,club_tipo,estado,tipos_club(nombre))';
  const attempts = [
    `id, miembro_id, clase_progresiva_id, ${progressFields}, ${claseJoin}`,
    `id, miembro_id, clase_id, ${progressFields}, ${claseJoin}`,
    'id, miembro_id, clase_progresiva_id, clases_progresivas(id,nombre,tipo_id,club_tipo,estado,tipos_club(nombre))',
    'id, miembro_id, clase_id, clases_progresivas(id,nombre,tipo_id,club_tipo,estado,tipos_club(nombre))',
    'id, miembro_id, clases_progresivas(*)',
  ];

  for (const select of attempts) {
    const withEstado = await sb
      .from('miembro_clase_progresiva')
      .select(select)
      .eq('miembro_id', miembroId)
      .eq('estado', 'activo');
    if (!withEstado.error) return { data: withEstado.data || [], error: null };

    if (isMissingColumnError(withEstado.error, 'estado')) {
      const { data, error } = await sb
        .from('miembro_clase_progresiva')
        .select(select)
        .eq('miembro_id', miembroId);
      if (!error) return { data: data || [], error: null };
    }

    if (isMissingColumnError(withEstado.error, 'completado') || isMissingColumnError(withEstado.error, 'clase_progresiva_id')) {
      continue;
    }
  }

  const fallback = await sb
    .from('miembro_clase_progresiva')
    .select('*')
    .eq('miembro_id', miembroId)
    .eq('estado', 'activo');
  if (!fallback.error) return fallback;
  if (isMissingColumnError(fallback.error, 'estado')) {
    return sb.from('miembro_clase_progresiva').select('*').eq('miembro_id', miembroId);
  }
  return fallback;
}

export async function updateMiembroClaseProgresiva(linkId, {
  completado,
  fechaCompletado,
  tieneInvestidura,
  investiduraFecha,
  investiduraLugar,
  investiduraValidadoPorUsuarioId,
  investiduraValidadoPorNombre,
}) {
  const rpc = await sb.rpc('update_miembro_clase_progresiva_progress', {
    p_assignment_id: linkId,
    p_completado: completado,
    p_fecha_completado: fechaCompletado,
    p_tiene_investidura: tieneInvestidura,
    p_investidura_fecha: investiduraFecha,
    p_investidura_lugar: investiduraLugar,
    p_investidura_validado_por_usuario_id: investiduraValidadoPorUsuarioId,
    p_investidura_validado_por_nombre: investiduraValidadoPorNombre,
  });

  if (!rpc.error) {
    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    return { data: row, error: null };
  }

  const rpcMsg = rpc.error?.message || '';
  if (!isMissingColumnError(rpc.error, 'completado') && !isRlsError(rpc.error) && !rpcMsg.includes('function') && !rpcMsg.includes('does not exist')) {
    return rpc;
  }

  const payload = {
    completado,
    fecha_completado: fechaCompletado,
    tiene_investidura: tieneInvestidura,
    investidura_fecha: investiduraFecha,
    investidura_lugar: investiduraLugar,
    investidura_validado_por_usuario_id: investiduraValidadoPorUsuarioId,
    investidura_validado_por_nombre: investiduraValidadoPorNombre,
  };

  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key];
  }

  let current = { ...payload };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const direct = await sb
      .from('miembro_clase_progresiva')
      .update(current)
      .eq('id', linkId)
      .select()
      .single();

    if (!direct.error) return direct;

    const missingColumn = missingColumnFromError(direct.error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(current, missingColumn)) {
      delete current[missingColumn];
      continue;
    }

    if (isMissingColumnError(direct.error, 'completado')) {
      return {
        data: null,
        error: new Error(
          'Class progress columns missing — run MIEMBRO_CLASE_PROGRESIVA_COMPLETION_SCHEMA.sql in Supabase SQL Editor.'
        ),
      };
    }

    return direct;
  }

  return {
    data: null,
    error: new Error(
      'Class progress columns missing — run MIEMBRO_CLASE_PROGRESIVA_COMPLETION_SCHEMA.sql in Supabase SQL Editor.'
    ),
  };
}

export async function assignClaseToMiembro(miembroId, claseId) {
  const rpc = await sb.rpc('admin_assign_miembro_clase', {
    p_miembro_id: miembroId,
    p_clase_id: claseId,
  });
  if (!rpc.error) return { error: null, data: rpc.data };

  const reactivateAttempts = [
    { col: 'clase_progresiva_id', val: claseId },
    { col: 'clase_id', val: claseId },
  ];

  for (const { col, val } of reactivateAttempts) {
    const { data, error } = await sb
      .from('miembro_clase_progresiva')
      .update({ estado: 'activo' })
      .eq('miembro_id', miembroId)
      .eq(col, val)
      .eq('estado', 'inactivo')
      .select()
      .maybeSingle();
    if (!error && data) return { error: null, data };
    if (error && !isMissingColumnError(error, col) && !isMissingColumnError(error, 'estado')) {
      if (!isRlsError(error)) return { error };
    }
  }

  const rows = [
    { miembro_id: miembroId, clase_progresiva_id: claseId, estado: 'activo' },
    { miembro_id: miembroId, clase_id: claseId, estado: 'activo' },
    { miembro_id: miembroId, clase_progresiva_id: claseId },
    { miembro_id: miembroId, clase_id: claseId },
  ];

  for (const row of rows) {
    const { error } = await sb.from('miembro_clase_progresiva').insert([row]);
    if (!error) return { error: null };
    if (isRlsError(error)) break;
    if (!/column|Could not find|duplicate/i.test(error.message || '')) return { error };
  }

  return { error: rpc.error };
}

export async function unassignClaseFromMiembro(linkId) {
  const deactivate = await sb
    .from('miembro_clase_progresiva')
    .update({ estado: 'inactivo' })
    .eq('id', linkId)
    .select()
    .maybeSingle();

  if (!deactivate.error) return deactivate;
  if (!isMissingColumnError(deactivate.error, 'estado') && !isRlsError(deactivate.error)) {
    return deactivate;
  }

  const rpc = await sb.rpc('admin_unassign_miembro_clase', { p_link_id: linkId });
  if (!rpc.error) return { data: rpc.data, error: null };

  if (isMissingColumnError(deactivate.error, 'estado')) {
    return sb.from('miembro_clase_progresiva').delete().eq('id', linkId);
  }

  return rpc;
}

function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}

export async function fetchRequisitosForClases(claseIds) {
  if (!claseIds.length) return { data: [], error: null };

  const selects = [
    'id, clase_id, seccion_id, numero, orden, descripcion, texto_opcional, clase_requisito_secciones(id, parte, numero_romano, nombre, orden)',
    'id, clase_id, seccion_id, numero, orden, descripcion, clase_requisito_secciones(id, parte, numero_romano, nombre, orden)',
    'id, clase_id, descripcion',
  ];

  for (const select of selects) {
    const { data, error } = await sb
      .from('clase_requisitos')
      .select(select)
      .in('clase_id', claseIds);
    if (!error) {
      return { data: enrichRequisitoRows(data), error: null };
    }
    if (isMissingColumnError(error, 'seccion_id') || isMissingColumnError(error, 'texto_opcional')) continue;
    return { data: [], error };
  }

  return { data: [], error: null };
}

export async function fetchMiembroClaseRequisitos(assignmentIds) {
  if (!assignmentIds.length) return { data: [], error: null };

  const selects = [
    'id, miembro_clase_progresiva_id, clase_requisito_id, completado, fecha_completado, validado_por_usuario_id, validado_por_nombre, comentarios, texto_reemplazo, usar_texto_alternativo',
    'id, miembro_clase_progresiva_id, clase_requisito_id, completado, fecha_completado, validado_por_usuario_id, validado_por_nombre, comentarios',
  ];

  for (const select of selects) {
    const { data, error } = await sb
      .from('miembro_clase_requisito')
      .select(select)
      .in('miembro_clase_progresiva_id', assignmentIds);
    if (!error) return { data: data || [], error: null };
    if (isMissingColumnError(error, 'texto_reemplazo') || isMissingColumnError(error, 'usar_texto_alternativo')) continue;
    return { data: [], error };
  }

  return { data: [], error: null };
}

export function mapCompletionsByAssignment(rows = []) {
  const map = {};
  for (const row of rows) {
    const assignmentId = row.miembro_clase_progresiva_id;
    if (!map[assignmentId]) map[assignmentId] = {};
    map[assignmentId][row.clase_requisito_id] = row;
  }
  return map;
}

export async function initMiembroClaseRequisitos(assignmentId) {
  if (!assignmentId) return { data: null, error: null };
  return sb.rpc('init_miembro_clase_requisitos', { p_assignment_id: assignmentId });
}

export async function upsertMiembroClaseRequisito({
  assignmentId,
  claseRequisitoId,
  completado,
  fechaCompletado = null,
  validadoPorUsuarioId = null,
  validadoPorNombre = null,
  comentarios = null,
  textoReemplazo = null,
  usarTextoAlternativo = false,
}) {
  return sb.rpc('upsert_miembro_clase_requisito', {
    p_assignment_id: assignmentId,
    p_clase_requisito_id: claseRequisitoId,
    p_completado: completado,
    p_fecha_completado: fechaCompletado,
    p_validado_por_usuario_id: validadoPorUsuarioId,
    p_validado_por_nombre: validadoPorNombre,
    p_comentarios: comentarios,
    p_texto_reemplazo: textoReemplazo,
    p_usar_texto_alternativo: usarTextoAlternativo,
  });
}
