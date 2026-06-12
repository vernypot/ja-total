import { sb } from '../../services/supabase';

export async function fetchMiembrosByClub(clubId) {
  let query = sb.from('miembro_club').select('miembros(id,nombre,apellido1,apellido2,estado)');
  if (clubId) query = query.eq('club_id', clubId);
  return query;
}

export async function fetchMiembroById(id) {
  return sb
    .from('miembros')
    .select('nombre,apellido1,apellido2,fecha_nacimiento,direccion,telefono,ciudad,foto_url,documento,genero,celular')
    .eq('id', id)
    .single();
}

export async function updateMiembroEstado(id, estado) {
  return sb.from('miembros').update({ estado }).eq('id', id);
}

export async function createMiembro(miembro) {
  return sb.from('miembros').insert([miembro]);
}

export async function updateMiembro(id, miembro) {
  return sb.from('miembros').update(miembro).eq('id', id);
}

export async function deleteMiembro(id) {
  return sb.from('miembros').delete().eq('id', id);
}
