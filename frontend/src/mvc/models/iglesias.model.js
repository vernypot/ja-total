import { sb } from '../../services/supabase';
import { formatHierarchyPath } from './estructuraOrganizacional.model';
import { DEFAULT_CHURCH_COUNTRY, normalizeChurchCountry } from '../../utils/churchCountries';
import { DEFAULT_CHURCH_TIMEZONE, normalizeChurchTimezone } from '../../utils/churchTimezones';

const IGLESIA_SELECT = `
  id,
  nombre,
  estado,
  country,
  timezone,
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

const IGLESIA_BASIC_SELECT = 'id,nombre,estado,country,timezone,created_at';
const IGLESIA_LEGACY_SELECT = 'id,nombre,estado,created_at';

function withChurchDefaults(rows) {
  return (rows || []).map(row => ({
    ...row,
    country: normalizeChurchCountry(row.country),
    timezone: normalizeChurchTimezone(row.timezone),
  }));
}

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

function isMissingChurchSettingsColumnError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('timezone')
    || msg.includes('country')
    || msg.includes(`'timezone' column`)
    || msg.includes(`'country' column`);
}

async function fetchIglesiasBasic({ showInactive = false } = {}) {
  let query = sb.from('iglesias').select(IGLESIA_BASIC_SELECT).order('nombre', { ascending: true });
  if (!showInactive) query = query.eq('estado', 'activo');
  const result = await query;
  if (isMissingChurchSettingsColumnError(result.error)) {
    let legacyQuery = sb.from('iglesias').select(IGLESIA_LEGACY_SELECT).order('nombre', { ascending: true });
    if (!showInactive) legacyQuery = legacyQuery.eq('estado', 'activo');
    const legacy = await legacyQuery;
    return { ...legacy, data: withChurchDefaults(legacy.data), hasOrgStructure: false };
  }
  return { ...result, data: withChurchDefaults(result.data), hasOrgStructure: false };
}

export async function fetchIglesias({ showInactive = false, zonaId = null } = {}) {
  let query = sb.from('iglesias').select(IGLESIA_SELECT).order('nombre', { ascending: true });
  if (!showInactive) query = query.eq('estado', 'activo');
  if (zonaId) query = query.eq('zona_id', zonaId);

  const result = await query;
  if (isMissingChurchSettingsColumnError(result.error) || isMissingOrgSchemaError(result.error)) {
    return fetchIglesiasBasic({ showInactive });
  }

  return {
    ...result,
    data: withChurchDefaults(result.data),
    hasOrgStructure: !result.error,
  };
}

export async function fetchActiveIglesias() {
  const result = await sb.from('iglesias').select(`${IGLESIA_SELECT}`).eq('estado', 'activo').order('nombre');
  if (isMissingChurchSettingsColumnError(result.error) || isMissingOrgSchemaError(result.error)) {
    const fallback = await sb.from('iglesias').select('id, nombre').eq('estado', 'activo').order('nombre');
    return { ...fallback, data: withChurchDefaults(fallback.data) };
  }
  return { ...result, data: withChurchDefaults(result.data) };
}

export async function fetchIglesiaById(id) {
  const result = await sb.from('iglesias').select(IGLESIA_SELECT).eq('id', id).single();
  if (isMissingChurchSettingsColumnError(result.error) || isMissingOrgSchemaError(result.error)) {
    let fallback = await sb.from('iglesias').select(IGLESIA_BASIC_SELECT).eq('id', id).single();
    if (isMissingChurchSettingsColumnError(fallback.error)) {
      fallback = await sb.from('iglesias').select(IGLESIA_LEGACY_SELECT).eq('id', id).single();
    }
    if (fallback.data) {
      return { ...fallback, data: withChurchDefaults([fallback.data])[0] };
    }
    return fallback;
  }
  if (result.data) {
    return { ...result, data: withChurchDefaults([result.data])[0] };
  }
  return result;
}

export async function createIglesia({
  nombre,
  zona_id = null,
  country = DEFAULT_CHURCH_COUNTRY,
  timezone = DEFAULT_CHURCH_TIMEZONE,
}) {
  return sb.from('iglesias').insert([{
    nombre,
    zona_id: zona_id || null,
    country: normalizeChurchCountry(country),
    timezone: normalizeChurchTimezone(timezone),
    estado: 'activo',
  }]);
}

export async function updateIglesia(id, { nombre, zona_id, country, timezone }) {
  const payload = {};
  if (nombre !== undefined) payload.nombre = nombre;
  if (zona_id !== undefined) payload.zona_id = zona_id || null;
  if (country !== undefined) payload.country = normalizeChurchCountry(country);
  if (timezone !== undefined) payload.timezone = normalizeChurchTimezone(timezone);
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
    country: normalizeChurchCountry(iglesia?.country),
    timezone: normalizeChurchTimezone(iglesia?.timezone),
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
