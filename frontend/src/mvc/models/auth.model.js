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

async function restoreSession(session) {
  if (!session?.access_token || !session?.refresh_token) return;
  await sb.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}

export async function signUpAuthUser({ email, password, metadata = {} }) {
  const { data: sessionData } = await sb.auth.getSession();
  const adminSession = sessionData?.session;

  const result = await sb.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: metadata },
  });

  await restoreSession(adminSession);
  return result;
}

export async function sendPasswordResetEmail(email) {
  const redirectTo = `${window.location.origin}/`;
  return sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
}

export async function adminSetUserPassword(email, password) {
  return sb.rpc('admin_set_usuario_password', {
    p_email: email.trim().toLowerCase(),
    p_password: password,
  });
}

export async function adminCreateUsuarioAuth({
  email,
  password,
  nombre,
  apellido1,
  apellido2,
  rol,
  estado,
  telefono,
}) {
  return sb.rpc('admin_create_usuario_auth', {
    p_email: email.trim().toLowerCase(),
    p_password: password,
    p_nombre: nombre.trim(),
    p_apellido1: apellido1 || '',
    p_apellido2: apellido2 || '',
    p_rol: rol || 'user',
    p_estado: estado || 'activo',
    p_telefono: telefono || '',
  });
}
