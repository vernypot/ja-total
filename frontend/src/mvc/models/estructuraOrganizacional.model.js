import { sb } from '../../services/supabase';

const TABLES = {
  division: 'divisiones',
  union: 'uniones',
  campo: 'campos',
  zona: 'zonas',
};

const PARENT_KEYS = {
  union: 'division_id',
  campo: 'union_id',
  zona: 'campo_id',
};

function orderQuery(table) {
  return sb.from(table).select('*').order('nombre', { ascending: true });
}

export async function fetchDivisiones({ showInactive = false } = {}) {
  let query = orderQuery(TABLES.division);
  if (!showInactive) query = query.eq('estado', 'activo');
  const result = await query;
  return { ...result, hasTable: !isMissingTableError(result.error) };
}

export async function fetchUniones({ divisionId, showInactive = false } = {}) {
  let query = orderQuery(TABLES.union);
  if (divisionId) query = query.eq('division_id', divisionId);
  if (!showInactive) query = query.eq('estado', 'activo');
  const result = await query;
  return { ...result, hasTable: !isMissingTableError(result.error) };
}

export async function fetchCampos({ unionId, showInactive = false } = {}) {
  let query = orderQuery(TABLES.campo);
  if (unionId) query = query.eq('union_id', unionId);
  if (!showInactive) query = query.eq('estado', 'activo');
  const result = await query;
  return { ...result, hasTable: !isMissingTableError(result.error) };
}

export async function fetchZonas({ campoId, showInactive = false } = {}) {
  let query = orderQuery(TABLES.zona);
  if (campoId) query = query.eq('campo_id', campoId);
  if (!showInactive) query = query.eq('estado', 'activo');
  const result = await query;
  return { ...result, hasTable: !isMissingTableError(result.error) };
}

export async function fetchDivisionById(id) {
  return sb.from(TABLES.division).select('*').eq('id', id).single();
}

export async function fetchUnionById(id) {
  return sb.from(TABLES.union).select('*, divisiones(id, codigo, nombre)').eq('id', id).single();
}

export async function fetchCampoById(id) {
  return sb.from(TABLES.campo).select('*, uniones(id, nombre, division_id, divisiones(id, codigo, nombre))').eq('id', id).single();
}

export async function fetchZonaById(id) {
  return sb.from(TABLES.zona).select(`
    *,
    campos(
      id, nombre, tipo_campo, union_id,
      uniones(id, nombre, division_id, divisiones(id, codigo, nombre))
    )
  `).eq('id', id).single();
}

export async function createDivision(payload) {
  return sb.from(TABLES.division).insert([payload]).select().single();
}

export async function createUnion(payload) {
  return sb.from(TABLES.union).insert([payload]).select().single();
}

export async function createCampo(payload) {
  return sb.from(TABLES.campo).insert([payload]).select().single();
}

export async function createZona(payload) {
  return sb.from(TABLES.zona).insert([payload]).select().single();
}

export async function updateDivision(id, payload) {
  return sb.from(TABLES.division).update(payload).eq('id', id);
}

export async function updateUnion(id, payload) {
  return sb.from(TABLES.union).update(payload).eq('id', id);
}

export async function updateCampo(id, payload) {
  return sb.from(TABLES.campo).update(payload).eq('id', id);
}

export async function updateZona(id, payload) {
  return sb.from(TABLES.zona).update(payload).eq('id', id);
}

export async function toggleEstado(level, id, estado) {
  const table = TABLES[level];
  if (!table) return { error: { message: 'Invalid level' } };
  return sb.from(table).update({ estado }).eq('id', id);
}

export async function hasActiveChildren(level, id) {
  const childMap = {
    division: { table: TABLES.union, key: 'division_id' },
    union: { table: TABLES.campo, key: 'union_id' },
    campo: { table: TABLES.zona, key: 'campo_id' },
    zona: { table: 'iglesias', key: 'zona_id' },
  };
  const child = childMap[level];
  if (!child) return { data: [] };
  return sb.from(child.table).select('id').eq(child.key, id).eq('estado', 'activo').limit(1);
}

export function formatHierarchyPath(zona) {
  if (!zona) return '';
  const campo = zona.campos;
  const union = campo?.uniones;
  const division = union?.divisiones;
  const parts = [
    division?.codigo || division?.nombre,
    union?.nombre,
    campo?.nombre ? `${campoTipoLabel(campo.tipo_campo)} ${campo.nombre}` : null,
    zona.nombre,
  ].filter(Boolean);
  return parts.join(' › ');
}

export function campoTipoLabel(tipo) {
  if (tipo === 'asociacion') return 'Asoc.';
  if (tipo === 'mision') return 'Mis.';
  return '';
}

export function buildZonaHierarchyLabel(zonaRow) {
  if (!zonaRow) return '';
  if (typeof zonaRow === 'string') return zonaRow;
  return formatHierarchyPath(zonaRow);
}

function isMissingTableError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('schema cache') || error.code === '42P01';
}

export { TABLES, PARENT_KEYS };
