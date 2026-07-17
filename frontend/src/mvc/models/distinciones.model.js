import { sb } from '../../services/supabase';

function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}

function isMissingTableError(error) {
  const msg = error?.message || '';
  return msg.includes('does not exist') || msg.includes('Could not find the table');
}

export async function fetchDistincionesCatalog({ showInactive = false } = {}) {
  let query = sb
    .from('distinciones')
    .select('id, nombre, descripcion, orden, estado, created_at')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });

  if (!showInactive) query = query.eq('estado', 'activo');

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) {
      return { data: [], error: null, hasTable: false };
    }
    return { data: [], error, hasTable: true };
  }

  return { data: data || [], error: null, hasTable: true };
}

export async function createDistincion({ nombre, descripcion, orden = 0 }) {
  return sb.from('distinciones').insert([{
    nombre: nombre.trim(),
    descripcion: descripcion?.trim() || null,
    orden: Number(orden) || 0,
    estado: 'activo',
  }]).select('id').single();
}

export async function updateDistincion(id, { nombre, descripcion, orden, estado }) {
  const payload = { updated_at: new Date().toISOString() };
  if (nombre !== undefined) payload.nombre = nombre.trim();
  if (descripcion !== undefined) payload.descripcion = descripcion?.trim() || null;
  if (orden !== undefined) payload.orden = Number(orden) || 0;
  if (estado !== undefined) payload.estado = estado;
  return sb.from('distinciones').update(payload).eq('id', id);
}

export async function toggleDistincionEstado(item) {
  const next = item.estado === 'activo' ? 'inactivo' : 'activo';
  return updateDistincion(item.id, { estado: next });
}

const MIEMBRO_DISTINCION_SELECTS = [
  `id, miembro_id, distincion_id, club_id, fecha_otorgada, notas, estado, created_at,
   distinciones ( id, nombre, descripcion, orden, estado ),
   clubes ( id, nombre )`,
  `id, miembro_id, distincion_id, club_id, fecha_otorgada, notas, estado, created_at,
   distinciones ( id, nombre, descripcion, orden, estado )`,
  '*',
];

export async function fetchMiembroDistinciones(miembroId) {
  for (const select of MIEMBRO_DISTINCION_SELECTS) {
    const { data, error } = await sb
      .from('miembro_distincion')
      .select(select)
      .eq('miembro_id', miembroId)
      .order('fecha_otorgada', { ascending: false });
    if (!error) return { data: data || [], error: null };
    if (isMissingTableError(error)) {
      return { data: [], error: null, hasTable: false };
    }
  }
  return { data: [], error: null, hasTable: true };
}

export function getDistincionFromRow(row) {
  return row?.distinciones || null;
}

export function getDistincionIdFromRow(row) {
  return row?.distincion_id || row?.distinciones?.id || null;
}

export async function assignDistincionToMiembro({
  miembroId,
  distincionId,
  clubId = null,
  fechaOtorgada = null,
  notas = null,
}) {
  const payload = {
    miembro_id: miembroId,
    distincion_id: distincionId,
    club_id: clubId || null,
    fecha_otorgada: fechaOtorgada || new Date().toISOString().slice(0, 10),
    notas: notas?.trim() || null,
    estado: 'activo',
  };

  const direct = await sb.from('miembro_distincion').upsert(payload, {
    onConflict: 'miembro_id,distincion_id',
  });

  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;

  return sb.rpc('admin_assign_miembro_distincion', {
    p_miembro_id: miembroId,
    p_distincion_id: distincionId,
    p_club_id: clubId || null,
    p_fecha_otorgada: payload.fecha_otorgada,
    p_notas: payload.notas,
  });
}

export async function unassignDistincionFromMiembro(linkId) {
  const direct = await sb.from('miembro_distincion').delete().eq('id', linkId);
  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;

  return sb.rpc('admin_unassign_miembro_distincion', { p_link_id: linkId });
}
