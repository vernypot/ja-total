import { sb } from '../../services/supabase';
import { formatHierarchyPath } from './estructuraOrganizacional.model';

const IGLESIA_SELECT = `
  id,
  nombre,
  estado,
  created_at,
  zona_id,
  zonas(
    id,
    nombre,
    codigo,
    campos(
      id,
      nombre,
      tipo_campo,
      union_id,
      uniones(
        id,
        nombre,
        division_id,
        divisiones(id, codigo, nombre)
      )
    )
  )
`;

const IGLESIA_BASIC_SELECT = 'id,nombre,estado,created_at';

export function extractOrgIdsFromIglesia(iglesia) {
  const z = iglesia?.zonas;
  const campo = z?.campos;
  const union = campo?.uniones;
  const division = union?.divisiones;
  return {
    division_id: division?.id || '',
    union_id: union?.id || '',
    campo_id: campo?.id || '',
    zona_id: z?.id || iglesia?.zona_id || '',
  };
}

export function iglesiaHierarchyLabel(row) {
  if (!row?.zonas) return '';
  return formatHierarchyPath(row.zonas);
}

export function iglesiaMatchesOrgFilter(iglesia, filters = {}) {
  if (!filters.division_id && !filters.union_id && !filters.campo_id && !filters.zona_id) {
    return true;
  }
  const ids = extractOrgIdsFromIglesia(iglesia);
  if (filters.zona_id) return ids.zona_id === filters.zona_id;
  if (filters.campo_id) return ids.campo_id === filters.campo_id;
  if (filters.union_id) return ids.union_id === filters.union_id;
  if (filters.division_id) return ids.division_id === filters.division_id;
  return true;
}

async function fetchIglesiasBasic({ showInactive = false } = {}) {
  let query = sb.from('iglesias').select(IGLESIA_BASIC_SELECT).order('nombre', { ascending: true });
  if (!showInactive) query = query.eq('estado', 'activo');
  const result = await query;
  return { ...result, hasOrgStructure: false };
}

export async function fetchIglesias({ showInactive = false, zonaId = null } = {}) {
  let query = sb.from('iglesias').select(IGLESIA_SELECT).order('nombre', { ascending: true });
  if (!showInactive) query = query.eq('estado', 'activo');
  if (zonaId) query = query.eq('zona_id', zonaId);

  const result = await query;
  if (isMissingOrgSchemaError(result.error)) {
    return fetchIglesiasBasic({ showInactive });
  }

  return {
    ...result,
    hasOrgStructure: !result.error,
  };
}

export async function fetchActiveIglesias() {
  const result = await sb.from('iglesias').select(`${IGLESIA_SELECT}`).eq('estado', 'activo').order('nombre');
  if (isMissingOrgSchemaError(result.error)) {
    return sb.from('iglesias').select('id, nombre').eq('estado', 'activo').order('nombre');
  }
  return result;
}

export async function fetchIglesiaById(id) {
  const result = await sb.from('iglesias').select(IGLESIA_SELECT).eq('id', id).single();
  if (isMissingOrgSchemaError(result.error)) {
    return sb.from('iglesias').select(IGLESIA_BASIC_SELECT).eq('id', id).single();
  }
  return result;
}

export async function createIglesia({ nombre, zona_id = null }) {
  return sb.from('iglesias').insert([{ nombre, zona_id: zona_id || null, estado: 'activo' }]);
}

export async function updateIglesia(id, { nombre, zona_id }) {
  const payload = {};
  if (nombre !== undefined) payload.nombre = nombre;
  if (zona_id !== undefined) payload.zona_id = zona_id || null;
  return sb.from('iglesias').update(payload).eq('id', id);
}

export async function updateIglesiaEstado(id, estado) {
  return sb.from('iglesias').update({ estado }).eq('id', id);
}

export async function hasActiveClubes(iglesiaId) {
  return sb.from('clubes').select('id').eq('iglesia_id', iglesiaId).eq('estado', 'activo').limit(1);
}

export function churchFormFromIglesia(iglesia) {
  const org = extractOrgIdsFromIglesia(iglesia);
  return {
    nombre: iglesia?.nombre || '',
    ...org,
  };
}

function isMissingOrgSchemaError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('zona_id')
    || msg.includes('zonas')
    || msg.includes('does not exist')
    || msg.includes('schema cache')
    || error.code === '42P01'
  );
}
