import { sb } from '../../services/supabase';

export async function fetchIglesias({ showInactive = false } = {}) {
  let query = sb.from('iglesias').select('id,nombre,estado,created_at').order('nombre', { ascending: true });
  if (!showInactive) query = query.eq('estado', 'activo');
  return query;
}

export async function fetchActiveIglesias() {
  return sb.from('iglesias').select('id, nombre').eq('estado', 'activo');
}

export async function fetchIglesiaById(id) {
  return sb.from('iglesias').select('id,nombre').eq('id', id).single();
}

export async function createIglesia(nombre) {
  return sb.from('iglesias').insert([{ nombre, estado: 'activo' }]);
}

export async function updateIglesia(id, { nombre }) {
  return sb.from('iglesias').update({ nombre }).eq('id', id);
}

export async function updateIglesiaEstado(id, estado) {
  return sb.from('iglesias').update({ estado }).eq('id', id);
}

export async function hasActiveClubes(iglesiaId) {
  return sb.from('clubes').select('id').eq('iglesia_id', iglesiaId).eq('estado', 'activo').limit(1);
}
