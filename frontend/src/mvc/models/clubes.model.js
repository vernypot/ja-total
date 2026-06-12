import { sb } from '../../services/supabase';

export async function fetchClubes({ iglesiaId, showInactive = false } = {}) {
  let query = sb
    .from('clubes')
    .select('id,nombre,iglesia_id,tipo_id,estado,created_at,iglesias(id,nombre),tipos_club(id,nombre)')
    .order('nombre', { ascending: true });

  if (iglesiaId) query = query.eq('iglesia_id', iglesiaId);
  if (!showInactive) query = query.eq('estado', 'activo');
  return query;
}

export async function fetchClubesByIglesia(iglesiaId) {
  return sb
    .from('clubes')
    .select('id, nombre, iglesia_id, tipo_id, tipos_club(id, nombre)')
    .eq('iglesia_id', iglesiaId)
    .eq('estado', 'activo')
    .order('nombre', { ascending: true });
}

export async function fetchClubById(clubId) {
  return sb
    .from('clubes')
    .select('id, nombre, iglesia_id, tipo_id, tipos_club(id, nombre)')
    .eq('id', clubId)
    .single();
}

export async function fetchTiposClub() {
  return sb.from('tipos_club').select('id, nombre');
}

export async function createClub({ nombre, iglesia_id, tipo_id }) {
  return sb.from('clubes').insert([{
    nombre,
    iglesia_id,
    tipo_id: tipo_id || null,
    estado: 'activo',
  }]);
}

export async function updateClubEstado(id, estado) {
  return sb.from('clubes').update({ estado }).eq('id', id);
}

export async function hasMembers(clubId) {
  return sb.from('miembro_club').select('id').eq('club_id', clubId).limit(1);
}
