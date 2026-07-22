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

export function isAuthEmailRateLimitError(error) {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  return (
    error.status === 429
    || error.code === 'over_email_send_rate_limit'
    || message.includes('rate limit')
    || message.includes('email rate')
    || message.includes('too many requests')
    || message.includes('over_email_send_rate_limit')
  );
}

export function formatAuthEmailError(error, t) {
  if (!error) return '';

  if (isAuthEmailRateLimitError(error)) {
    return t('passwordResetEmailRateLimited');
  }

  return error.message || t('passwordResetFailed');
}

export function isAuthPkceVerifierMissingError(error) {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  return (
    error.name === 'AuthPKCECodeVerifierMissingError'
    || error.code === 'pkce_code_verifier_not_found'
    || message.includes('pkce code verifier not found')
  );
}

export function formatAuthRecoveryError(error, t) {
  if (!error) return '';

  if (isAuthPkceVerifierMissingError(error)) {
    return t('passwordResetPkceHint');
  }

  const message = (error.message || '').toLowerCase();
  if (message.includes('expired') || message.includes('invalid')) {
    return t('passwordResetOtpExpired');
  }

  return error.message || t('passwordResetLinkInvalid');
}

export async function sendPasswordResetEmail(email) {
  const redirectTo = getPasswordResetRedirectUrl();
  return sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
}

export async function completePasswordRecoverySession() {
  const searchParams = new URLSearchParams(window.location.search);
  const tokenHash = searchParams.get('token_hash');
  const callbackType = searchParams.get('type');

  if (tokenHash && callbackType === 'recovery') {
    const { data, error } = await sb.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    });
    return { session: data.session, error, mode: 'otp' };
  }

  const code = searchParams.get('code');
  if (code) {
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (error && isAuthPkceVerifierMissingError(error)) {
      return { session: null, error, mode: 'pkce' };
    }
    return { session: data.session, error, mode: 'pkce' };
  }

  const hash = window.location.hash || '';
  if (hash.includes('access_token') && hash.includes('type=recovery')) {
    await new Promise(resolve => {
      window.setTimeout(resolve, 0);
    });
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
