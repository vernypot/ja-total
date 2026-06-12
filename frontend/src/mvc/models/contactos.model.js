import { sb } from '../../services/supabase';

const SELECT_FIELDS = 'id, miembro_id, nombre, telefono, relacion, estado';

function isMissingColumnError(error, column) {
  const msg = error?.message || '';
  return msg.includes(`${column} does not exist`) || msg.includes(`Could not find the '${column}' column`);
}

function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}

function sortByNombre(rows) {
  return [...rows].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', undefined, { sensitivity: 'base' }));
}

async function queryContactos(miembroId, showInactive) {
  let query = sb.from('miembro_contactos').select(SELECT_FIELDS).eq('miembro_id', miembroId);

  if (!showInactive) {
    const active = await query.eq('estado', 'activo');
    if (!active.error) return active;
    if (!isMissingColumnError(active.error, 'estado')) return active;
  }

  return sb.from('miembro_contactos').select(SELECT_FIELDS).eq('miembro_id', miembroId);
}

export async function fetchContactosByMiembro(miembroId, { showInactive = false } = {}) {
  let { data, error } = await queryContactos(miembroId, showInactive);

  if (error && isMissingColumnError(error, 'estado')) {
    ({ data, error } = await sb
      .from('miembro_contactos')
      .select('id, miembro_id, nombre, telefono, relacion')
      .eq('miembro_id', miembroId));
  }

  if (error) return { data: [], error };

  return {
    data: sortByNombre((data || []).map(row => ({ ...row, estado: row.estado || 'activo' }))),
    error: null,
  };
}

function buildPayload(miembroId, { nombre, telefono, relacion }, { includeEstado = true } = {}) {
  const payload = {
    miembro_id: miembroId,
    nombre: nombre.trim(),
    telefono: telefono.trim(),
    relacion: relacion.trim() || null,
  };
  if (includeEstado) payload.estado = 'activo';
  return payload;
}

export async function createMiembroContacto(miembroId, contact) {
  const withEstado = await sb.from('miembro_contactos').insert([buildPayload(miembroId, contact)]);
  if (!withEstado.error) return withEstado;

  if (isMissingColumnError(withEstado.error, 'estado')) {
    const withoutEstado = await sb.from('miembro_contactos').insert([buildPayload(miembroId, contact, { includeEstado: false })]);
    if (!withoutEstado.error) return withoutEstado;
    if (!isRlsError(withoutEstado.error)) return withoutEstado;
  } else if (!isRlsError(withEstado.error)) {
    return withEstado;
  }

  return sb.rpc('admin_save_miembro_contacto', {
    p_miembro_id: miembroId,
    p_nombre: contact.nombre,
    p_telefono: contact.telefono,
    p_relacion: contact.relacion || '',
    p_contacto_id: null,
  });
}

export async function updateMiembroContacto(id, miembroId, { nombre, telefono, relacion }) {
  const direct = await sb.from('miembro_contactos').update({
    nombre: nombre.trim(),
    telefono: telefono.trim(),
    relacion: relacion.trim() || null,
  }).eq('id', id);

  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;

  return sb.rpc('admin_save_miembro_contacto', {
    p_miembro_id: miembroId,
    p_nombre: nombre,
    p_telefono: telefono,
    p_relacion: relacion || '',
    p_contacto_id: id,
  });
}

export async function updateMiembroContactoEstado(id, estado) {
  const direct = await sb.from('miembro_contactos').update({ estado }).eq('id', id);
  if (!direct.error) return direct;
  if (isMissingColumnError(direct.error, 'estado')) {
    return { data: null, error: new Error('Contact status cannot be updated') };
  }
  if (!isRlsError(direct.error)) return direct;

  return sb.rpc('admin_set_miembro_contacto_estado', {
    p_contacto_id: id,
    p_estado: estado,
  });
}
