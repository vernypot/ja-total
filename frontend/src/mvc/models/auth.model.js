import { sb } from '../../services/supabase';
import { getPasswordResetRedirectUrl } from '../../config/site';

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
    .select('id, email, nombre, apellido1, apellido2, telefono, rol, estado, ui_theme')
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

export function parseAuthCallbackError() {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash?.replace(/^#/, '') || '';
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const error = params.get('error');
  if (!error) return null;

  return {
    error,
    errorCode: params.get('error_code') || '',
    errorDescription: (params.get('error_description') || '').replace(/\+/g, ' '),
  };
}

export function formatAuthCallbackError(callbackError, t) {
  if (!callbackError) return '';

  if (callbackError.errorCode === 'otp_expired') {
    return t('passwordResetOtpExpired');
  }

  if (callbackError.errorDescription) {
    return callbackError.errorDescription;
  }

  return t('passwordResetLinkInvalid');
}

export async function sendPasswordResetEmail(email) {
  const redirectTo = getPasswordResetRedirectUrl();
  return sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
}

export async function completePasswordRecoverySession() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (code) {
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    return { session: data.session, error, mode: 'pkce' };
  }

  const hash = window.location.hash || '';
  if (hash.includes('access_token') && hash.includes('type=recovery')) {
    const { data, error } = await sb.auth.getSession();
    return { session: data.session, error, mode: 'hash' };
  }

  const { data, error } = await sb.auth.getSession();
  return { session: data.session, error, mode: 'session' };
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
