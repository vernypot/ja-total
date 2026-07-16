import { sb } from '../../services/supabase';

const SELECT_WITH_JOIN = 'id,nombre,tipo_id,estado,club_tipo,orden,tipos_club(nombre)';
const SELECT_PLAIN = 'id,nombre,tipo_id,estado,club_tipo,orden';
const SELECT_MINIMAL = 'id,nombre,estado,club_tipo';

function sortByNombre(rows) {
  return [...rows].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', undefined, { sensitivity: 'base' }));
}

export function sortClasesByOrden(rows) {
  return [...rows].sort((a, b) => {
    const ao = a.orden ?? Number.MAX_SAFE_INTEGER;
    const bo = b.orden ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return (a.nombre || '').localeCompare(b.nombre || '', undefined, { sensitivity: 'base' });
  });
}

export async function fetchClasesProgresivas({ showInactive = false } = {}) {
  let lastError = null;

  for (const select of [SELECT_WITH_JOIN, SELECT_PLAIN, SELECT_MINIMAL, '*']) {
    let query = sb.from('clases_progresivas').select(select);
    if (!showInactive) query = query.eq('estado', 'activo');

    const { data, error } = await query;
    if (!error) {
      return { data: sortClasesByOrden(data || []), error: null };
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

export async function nextClaseOrden(tipoId) {
  if (!tipoId) return 10;
  const { data } = await sb.from('clases_progresivas').select('orden').eq('tipo_id', tipoId);
  const max = Math.max(0, ...(data || []).map(r => Number(r.orden) || 0));
  return max + 10;
}

export async function reindexClasesProgresivas(orderedIds) {
  const updates = orderedIds.map((id, index) =>
    sb.from('clases_progresivas').update({ orden: (index + 1) * 10 }).eq('id', id),
  );
  const results = await Promise.all(updates);
  const error = results.find(r => r.error)?.error || null;
  return { error };
}

export async function createClaseProgresiva({ nombre, tipo_id }) {
  const club_tipo = await resolveClubTipoName(tipo_id);
  const orden = await nextClaseOrden(tipo_id);
  const payload = {
    nombre,
    tipo_id,
    club_tipo,
    estado: 'activo',
    orden,
  };
  const full = await sb.from('clases_progresivas').insert([payload]);
  if (!full.error) return full;
  if (isMissingColumnError(full.error, 'orden')) {
    delete payload.orden;
    return sb.from('clases_progresivas').insert([payload]);
  }
  return full;
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

export function enrichRequisitoRows(rows) {
  return (rows || []).map(row => ({
    ...row,
    numero: row.numero ?? null,
    orden: row.orden ?? 0,
    sesiones_esperadas: clampSesiones(row.sesiones_esperadas, 3),
    clase_requisito_secciones: row.clase_requisito_secciones || null,
  }));
}

export function clampSesiones(value, fallback = 3) {
  const n = Number(value);
  if (Number.isNaN(n)) return clampSesiones(fallback, 3);
  return Math.max(0, Math.min(10, Math.round(n)));
}

export function defaultSesionesEsperadas(req) {
  return clampSesiones(req?.sesiones_esperadas, 3);
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
  const catalogAlt = req?.texto_opcional?.trim();

  if (completion?.usar_texto_alternativo) {
    const memberText = completion?.texto_reemplazo?.trim();
    if (memberText) return memberText;
    if (catalogAlt) return catalogAlt;
    return original;
  }

  if (catalogAlt) return catalogAlt;

  return original;
}

export async function updateClaseRequisito(id, { descripcion, texto_opcional, seccion_id, numero, orden, sesiones_esperadas } = {}) {
  const payload = {};
  if (descripcion !== undefined) payload.descripcion = descripcion.trim();
  if (texto_opcional !== undefined) {
    payload.texto_opcional = texto_opcional?.trim() || null;
  }
  if (seccion_id !== undefined) payload.seccion_id = seccion_id || null;
  if (numero !== undefined) payload.numero = numero === '' || numero == null ? null : Number(numero);
  if (orden !== undefined) payload.orden = Number(orden) || 0;
  if (sesiones_esperadas !== undefined) payload.sesiones_esperadas = clampSesiones(sesiones_esperadas);
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
    'id, clase_id, seccion_id, numero, orden, descripcion, texto_opcional, sesiones_esperadas, clase_requisito_secciones(id, parte, numero_romano, nombre, orden)',
    'id, clase_id, seccion_id, numero, orden, descripcion, texto_opcional, clase_requisito_secciones(id, parte, numero_romano, nombre, orden)',
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
    if (isMissingColumnError(error, 'seccion_id') || isMissingColumnError(error, 'orden') || isMissingColumnError(error, 'texto_opcional') || isMissingColumnError(error, 'sesiones_esperadas')) continue;
    return { data: [], error };
  }

  return { data: [], error: null };
}

export async function createClaseRequisito(claseId, descripcion, { seccion_id, numero, orden, texto_opcional, sesiones_esperadas } = {}) {
  const payload = {
    clase_id: claseId,
    descripcion: descripcion.trim(),
    seccion_id: seccion_id || null,
    numero: numero ?? null,
    orden: orden ?? 0,
    texto_opcional: texto_opcional?.trim() || null,
    sesiones_esperadas: clampSesiones(sesiones_esperadas, 3),
  };

  const full = await sb.from('clase_requisitos').insert([payload]);
  if (!full.error) return full;
  if (isMissingColumnError(full.error, 'sesiones_esperadas')) {
    delete payload.sesiones_esperadas;
  }
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

// ---------------------------------------------------------------------------
// Requisito tags (free-form, shared across all clases progresivas)
// ---------------------------------------------------------------------------

export function normalizeClaseRequisitoTagName(name) {
  return (name || '').trim().replace(/\s+/g, ' ');
}

function isMissingTagSchemaError(error) {
  const msg = error?.message || '';
  return error?.code === '42P01'
    || msg.includes('clase_requisito_tags')
    || msg.includes('clase_requisito_tag_links');
}

export function dedupeClaseRequisitoTagsByName(tags = []) {
  const byName = new Map();
  for (const tag of tags) {
    const key = (tag.nombre || '').trim().toLowerCase();
    if (!key || byName.has(key)) continue;
    byName.set(key, { id: tag.id, nombre: tag.nombre });
  }
  return [...byName.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, undefined, { sensitivity: 'base' }),
  );
}

export async function fetchAllClaseRequisitoTags() {
  const { data, error } = await sb
    .from('clase_requisito_tags')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (isMissingTagSchemaError(error)) {
    return { data: [], error: null, missingSchema: true };
  }
  return {
    data: dedupeClaseRequisitoTagsByName(data || []),
    error,
    missingSchema: false,
  };
}

/** @deprecated Use fetchAllClaseRequisitoTags — tags are global, not per clase. */
export async function fetchClaseRequisitoTags() {
  return fetchAllClaseRequisitoTags();
}

export async function fetchClaseRequisitoTagLinksForClase(claseId) {
  const { data, error } = await sb
    .from('clase_requisito_tag_links')
    .select('requisito_id, tag_id, clase_requisitos!inner(clase_id), clase_requisito_tags(id, nombre)')
    .eq('clase_requisitos.clase_id', claseId);

  if (isMissingTagSchemaError(error)) {
    return { data: [], error: null, missingSchema: true };
  }
  return { data: data || [], error, missingSchema: false };
}

export function attachTagsToRequisitos(requisitos = [], links = []) {
  const byReq = {};
  for (const link of links) {
    const tag = link.clase_requisito_tags;
    if (!tag?.id) continue;
    if (!byReq[link.requisito_id]) byReq[link.requisito_id] = [];
    if (!byReq[link.requisito_id].some(t => t.id === tag.id)) {
      byReq[link.requisito_id].push({ id: tag.id, nombre: tag.nombre });
    }
  }

  return requisitos.map(row => ({
    ...row,
    tags: (byReq[row.id] || []).sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { sensitivity: 'base' })),
  }));
}

export async function findOrCreateClaseRequisitoTag(claseId, nombre) {
  const clean = normalizeClaseRequisitoTagName(nombre);
  if (!clean) return { data: null, error: new Error('Tag name required') };

  const { data: existing, error: fetchError } = await fetchAllClaseRequisitoTags();
  if (fetchError) return { data: null, error: fetchError };

  const found = (existing || []).find(
    tag => tag.nombre.toLowerCase() === clean.toLowerCase(),
  );
  if (found) return { data: found, error: null };

  let { data, error } = await sb
    .from('clase_requisito_tags')
    .insert([{ nombre: clean }])
    .select('id, nombre')
    .single();

  if (error && claseId && (error.code === '23502' || `${error.message || ''}`.toLowerCase().includes('clase_id'))) {
    ({ data, error } = await sb
      .from('clase_requisito_tags')
      .insert([{ clase_id: claseId, nombre: clean }])
      .select('id, nombre')
      .single());
  }

  return { data, error };
}

export async function createClaseRequisitoTagOnly(claseId, nombre) {
  return findOrCreateClaseRequisitoTag(claseId, nombre);
}

export async function assignClaseRequisitoTag(requisitoId, tagId) {
  return sb
    .from('clase_requisito_tag_links')
    .upsert([{ requisito_id: requisitoId, tag_id: tagId }], { onConflict: 'requisito_id,tag_id' });
}

export async function unassignClaseRequisitoTag(requisitoId, tagId) {
  return sb
    .from('clase_requisito_tag_links')
    .delete()
    .eq('requisito_id', requisitoId)
    .eq('tag_id', tagId);
}

export async function deleteClaseRequisitoTag(tagId) {
  return sb.from('clase_requisito_tags').delete().eq('id', tagId);
}

export async function fetchMiembroClases(miembroId) {
  const progressFields =
    'estado, estado_progreso, completado, fecha_completado, tiene_investidura, investidura_fecha, investidura_lugar, investidura_validado_por_nombre';
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

    if (isMissingColumnError(withEstado.error, 'completado') || isMissingColumnError(withEstado.error, 'clase_progresiva_id') || isMissingColumnError(withEstado.error, 'estado_progreso')) {
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
  estadoProgreso,
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
    p_estado_progreso: estadoProgreso,
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
    estado_progreso: estadoProgreso,
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
    { miembro_id: miembroId, clase_progresiva_id: claseId, estado: 'activo', estado_progreso: 'sin_iniciar' },
    { miembro_id: miembroId, clase_id: claseId, estado: 'activo', estado_progreso: 'sin_iniciar' },
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
    'id, clase_id, seccion_id, numero, orden, descripcion, texto_opcional, sesiones_esperadas, clase_requisito_secciones(id, parte, numero_romano, nombre, orden)',
    'id, clase_id, seccion_id, numero, orden, descripcion, texto_opcional, clase_requisito_secciones(id, parte, numero_romano, nombre, orden)',
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
    if (isMissingColumnError(error, 'seccion_id') || isMissingColumnError(error, 'texto_opcional') || isMissingColumnError(error, 'sesiones_esperadas')) continue;
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

export async function fetchMiembroClaseAssignmentsForMembers(miembroIds, claseId) {
  if (!miembroIds?.length || !claseId) return { data: [], error: null };

  const attempts = [
    {
      col: 'clase_progresiva_id',
      select: 'id, miembro_id, clase_progresiva_id, estado, estado_progreso, completado, tiene_investidura',
    },
    {
      col: 'clase_id',
      select: 'id, miembro_id, clase_id, estado, estado_progreso, completado, tiene_investidura',
    },
    {
      col: 'clase_progresiva_id',
      select: 'id, miembro_id, clase_progresiva_id, estado',
    },
    {
      col: 'clase_id',
      select: 'id, miembro_id, clase_id, estado',
    },
    {
      col: 'clase_progresiva_id',
      select: 'id, miembro_id, clase_progresiva_id',
    },
    {
      col: 'clase_id',
      select: 'id, miembro_id, clase_id',
    },
  ];

  let lastError = null;

  for (const { col, select } of attempts) {
    const withEstado = await sb
      .from('miembro_clase_progresiva')
      .select(select)
      .in('miembro_id', miembroIds)
      .eq(col, claseId)
      .eq('estado', 'activo');

    if (!withEstado.error) return { data: withEstado.data || [], error: null };

    lastError = withEstado.error;

    if (isMissingColumnError(withEstado.error, 'estado')) {
      const fallback = await sb
        .from('miembro_clase_progresiva')
        .select(select)
        .in('miembro_id', miembroIds)
        .eq(col, claseId);
      if (!fallback.error) return { data: fallback.data || [], error: null };
      lastError = fallback.error;
    }

    if (
      isMissingColumnError(withEstado.error, col)
      || isMissingColumnError(withEstado.error, 'completado')
      || isMissingColumnError(withEstado.error, 'estado_progreso')
      || isMissingColumnError(withEstado.error, 'tiene_investidura')
      || isMissingColumnError(withEstado.error, 'estado')
    ) {
      continue;
    }
  }

  const fallback = await sb
    .from('miembro_clase_progresiva')
    .select('*')
    .in('miembro_id', miembroIds)
    .eq('estado', 'activo');

  if (!fallback.error) {
    const rows = (fallback.data || []).filter(row => {
      const linkClaseId = row.clase_progresiva_id || row.clase_id;
      return linkClaseId === claseId;
    });
    return { data: rows, error: null };
  }

  if (isMissingColumnError(fallback.error, 'estado')) {
    const withoutEstado = await sb
      .from('miembro_clase_progresiva')
      .select('*')
      .in('miembro_id', miembroIds);

    if (!withoutEstado.error) {
      const rows = (withoutEstado.data || []).filter(row => {
        const linkClaseId = row.clase_progresiva_id || row.clase_id;
        const isActive = row.estado == null || row.estado === 'activo';
        return isActive && linkClaseId === claseId;
      });
      return { data: rows, error: null };
    }
    lastError = withoutEstado.error;
  }

  return { data: [], error: lastError };
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

const MIEMBRO_CLASE_HISTORIAL_SELECT =
  'id, miembro_id, nombre, clase_progresiva_id, club_id, club_nombre, estado_progreso, fecha_completado, tiene_investidura, investidura_fecha, investidura_lugar, investidura_validado_por_nombre, notas, created_at, updated_at, clubes(id, nombre, tipos_club(id, nombre)), clases_progresivas(id, nombre)';

export async function fetchMiembroClaseHistorial(miembroId) {
  const { data, error } = await sb
    .from('miembro_clase_historial')
    .select(MIEMBRO_CLASE_HISTORIAL_SELECT)
    .eq('miembro_id', miembroId)
    .order('nombre', { ascending: true });

  if (!error) return { data: data || [], error: null };

  const msg = error?.message || '';
  if (msg.includes('miembro_clase_historial') && (msg.includes('does not exist') || msg.includes('Could not find'))) {
    return { data: [], error: null };
  }

  return { data: [], error };
}

export function buildMiembroClaseHistorialPayload({
  nombre,
  claseProgresivaId = null,
  clubId = null,
  clubNombre = null,
  estadoProgreso = null,
  fechaCompletado = null,
  tieneInvestidura = false,
  investiduraFecha = null,
  investiduraLugar = null,
  investiduraValidadoPorNombre = null,
  notas = null,
}) {
  const payload = {
    nombre: nombre?.trim(),
    clase_progresiva_id: claseProgresivaId || null,
    club_id: clubId || null,
    club_nombre: clubNombre?.trim() || null,
    estado_progreso: estadoProgreso || null,
    fecha_completado: fechaCompletado || null,
    tiene_investidura: Boolean(tieneInvestidura),
    investidura_fecha: investiduraFecha || null,
    investidura_lugar: investiduraLugar?.trim() || null,
    investidura_validado_por_nombre: investiduraValidadoPorNombre?.trim() || null,
    notas: notas?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (!payload.estado_progreso) {
    payload.fecha_completado = null;
    payload.tiene_investidura = false;
    payload.investidura_fecha = null;
    payload.investidura_lugar = null;
    payload.investidura_validado_por_nombre = null;
  } else if (payload.estado_progreso !== 'investida') {
    payload.tiene_investidura = false;
    payload.investidura_fecha = null;
    payload.investidura_lugar = null;
    payload.investidura_validado_por_nombre = null;
  }

  return payload;
}

export async function createMiembroClaseHistorial(miembroId, fields) {
  const payload = buildMiembroClaseHistorialPayload(fields);
  return sb
    .from('miembro_clase_historial')
    .insert([{ miembro_id: miembroId, ...payload }])
    .select(MIEMBRO_CLASE_HISTORIAL_SELECT)
    .single();
}

export async function updateMiembroClaseHistorial(id, fields) {
  const payload = buildMiembroClaseHistorialPayload(fields);
  return sb
    .from('miembro_clase_historial')
    .update(payload)
    .eq('id', id)
    .select(MIEMBRO_CLASE_HISTORIAL_SELECT)
    .single();
}

export async function deleteMiembroClaseHistorial(id) {
  return sb.from('miembro_clase_historial').delete().eq('id', id);
}

export function mapSeccionesByClase(secciones = []) {
  const map = {};
  for (const seccion of secciones || []) {
    const claseId = seccion.clase_id;
    if (!claseId) continue;
    if (!map[claseId]) map[claseId] = [];
    map[claseId].push(seccion);
  }
  return map;
}

export function mapSolicitudesByAssignment(solicitudes = []) {
  const map = {};
  for (const row of solicitudes || []) {
    const assignmentId = row.miembro_clase_progresiva_id;
    if (!assignmentId) continue;
    if (!map[assignmentId]) map[assignmentId] = { clase: null, requisitos: {} };
    if (row.tipo === 'clase') {
      map[assignmentId].clase = row;
    } else if (row.clase_requisito_id) {
      map[assignmentId].requisitos[row.clase_requisito_id] = row;
    }
  }
  return map;
}

export function getSolicitudForRequisito(solicitudesMap, assignmentId, requisitoId) {
  return solicitudesMap?.[assignmentId]?.requisitos?.[requisitoId] || null;
}

export function getSolicitudForClase(solicitudesMap, assignmentId) {
  return solicitudesMap?.[assignmentId]?.clase || null;
}

export async function fetchMiembroClaseAprobacionSolicitudes(miembroId) {
  const { data, error } = await sb.rpc('fetch_miembro_clase_aprobacion_solicitudes', {
    p_miembro_id: miembroId,
  });
  if (error) {
    const msg = error.message || '';
    if (msg.includes('fetch_miembro_clase_aprobacion_solicitudes') || msg.includes('does not exist')) {
      return { data: [], error: null };
    }
    return { data: [], error };
  }
  const rows = typeof data === 'string' ? JSON.parse(data) : data;
  return { data: rows || [], error: null };
}

export async function reviewMiembroClaseAprobacionSolicitud({
  solicitudId,
  aprobar,
  comentarioLider = null,
  revisorUsuarioId = null,
  revisorNombre = null,
}) {
  return sb.rpc('review_miembro_clase_aprobacion_solicitud', {
    p_solicitud_id: solicitudId,
    p_aprobar: aprobar,
    p_comentario_lider: comentarioLider,
    p_revisor_usuario_id: revisorUsuarioId,
    p_revisor_nombre: revisorNombre,
  });
}
