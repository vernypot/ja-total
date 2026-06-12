import { sb } from '../../services/supabase';

export async function signIn(email, password) {
  return sb.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return sb.auth.signOut();
}

export async function getSession() {
  return sb.auth.getSession();
}

export function onAuthStateChange(callback) {
  return sb.auth.onAuthStateChange(callback);
}

export async function fetchUserByEmail(email) {
  return sb
    .from('usuarios')
    .select('id, email, nombre, apellido1, apellido2, telefono, rol, estado')
    .eq('email', email)
    .single();
}

export async function updateOwnPassword(newPassword) {
  return sb.auth.updateUser({ password: newPassword });
}

export async function verifyPassword(email, password) {
  return sb.auth.signInWithPassword({ email, password });
}
