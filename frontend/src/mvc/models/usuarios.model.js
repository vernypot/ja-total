import { sb } from '../../services/supabase';

export async function fetchUsuarios() {
  return sb.from('usuarios').select('*').order('created_at', { ascending: false });
}

export async function fetchUsuarioByEmail(email) {
  return sb
    .from('usuarios')
    .select('id, email, nombre, apellido1, apellido2, telefono, rol, estado')
    .eq('email', email)
    .single();
}

export async function createUsuario(usuario) {
  return sb.from('usuarios').insert([usuario]);
}

export async function updateUsuario(id, fields) {
  return sb.from('usuarios').update({ ...fields, updated_at: new Date() }).eq('id', id);
}

export async function deleteUsuario(id) {
  return sb.from('usuarios').delete().eq('id', id);
}

export async function assignUsuarioIglesia({ usuario_id, iglesia_id, rol_iglesia }) {
  return sb.from('usuario_iglesia').insert([{ usuario_id, iglesia_id, rol_iglesia }]);
}

export async function updateProfile(id, { nombre, apellido1, apellido2, telefono }) {
  return sb.from('usuarios').update({
    nombre,
    apellido1,
    apellido2,
    telefono,
    updated_at: new Date(),
  }).eq('id', id);
}
