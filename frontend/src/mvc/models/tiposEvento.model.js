import { sb } from '../../services/supabase';

function isMissingColumnError(error, column) {
  const msg = error?.message || '';
  return msg.includes(`${column} does not exist`) || msg.includes(`Could not find the '${column}' column`);
}

export async function fetchTiposEvento({ showInactive = false } = {}) {
  let query = sb
    .from('tipos_evento')
    .select('id, nombre, descripcion, orden, estado, created_at')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });

  if (!showInactive) query = query.eq('estado', 'activo');

  const { data, error } = await query;
  if (error) {
    const msg = error?.message || '';
    if (msg.includes('does not exist') || msg.includes('Could not find the table')) {
      return { data: [], error: null, hasTable: false };
    }
    return { data: [], error, hasTable: true };
  }

  return { data: data || [], error: null, hasTable: true };
}

export async function createTipoEvento({ nombre, descripcion, orden = 0 }) {
  const payload = {
    nombre: nombre.trim(),
    descripcion: descripcion?.trim() || null,
    orden: Number(orden) || 0,
    estado: 'activo',
  };

  const result = await sb.from('tipos_evento').insert([payload]).select('id').single();
  if (result.error && isMissingColumnError(result.error, 'descripcion')) {
    const { descripcion: _d, ...rest } = payload;
    return sb.from('tipos_evento').insert([rest]).select('id').single();
  }
  return result;
}

export async function updateTipoEvento(id, { nombre, descripcion, orden, estado }) {
  const payload = {};
  if (nombre !== undefined) payload.nombre = nombre.trim();
  if (descripcion !== undefined) payload.descripcion = descripcion?.trim() || null;
  if (orden !== undefined) payload.orden = Number(orden) || 0;
  if (estado !== undefined) payload.estado = estado;
  payload.updated_at = new Date().toISOString();

  return sb.from('tipos_evento').update(payload).eq('id', id);
}

export async function toggleTipoEventoEstado(item) {
  const next = item.estado === 'activo' ? 'inactivo' : 'activo';
  return updateTipoEvento(item.id, { estado: next });
}
