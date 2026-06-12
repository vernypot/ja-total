import { sb } from '../../services/supabase';

export async function fetchClasesProgresivas({ showInactive = false } = {}) {
  let query = sb
    .from('clases_progresivas')
    .select('id,nombre,tipo_id,estado,created_at,tipos_club(nombre)');
  if (!showInactive) query = query.eq('estado', 'activo');
  return query;
}

export async function fetchTiposClub() {
  return sb.from('tipos_club').select('id,nombre');
}

export async function createClaseProgresiva({ nombre, tipo_id, club_tipo }) {
  return sb.from('clases_progresivas').insert([{
    nombre,
    tipo_id,
    club_tipo,
    estado: 'activo',
  }]);
}

export async function updateClaseProgresiva(id, { nombre, tipo_id, club_tipo }) {
  return sb.from('clases_progresivas').update({ nombre, tipo_id, club_tipo }).eq('id', id);
}

export async function updateClaseEstado(id, estado) {
  return sb.from('clases_progresivas').update({ estado }).eq('id', id);
}
