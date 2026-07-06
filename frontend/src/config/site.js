/**
 * Production site URL for Teofila on Netlify.
 * Netlify default subdomain: https://teofila.netlify.app
 * (Sites use *.netlify.app — configure a custom domain in Netlify if needed.)
 */
export const PRODUCTION_SITE_URL = 'https://teofila.netlify.app';

function isLocalOrigin(url) {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

function normalizePublicOrigin(url) {
  const trimmed = (url || '').trim().replace(/\/$/, '');
  if (!trimmed || isLocalOrigin(trimmed)) return PRODUCTION_SITE_URL;
  return trimmed;
}

/** Current browser origin (previews, local dev UI). */
export function getSiteOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  const fromEnv = (import.meta.env.VITE_SITE_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (import.meta.env.PROD) return PRODUCTION_SITE_URL;
  return 'http://localhost:5173';
}

/**
 * Public URL used in Supabase auth emails (password reset, etc.).
 * Always points at live/prod — never localhost.
 */
export function getAuthRedirectOrigin() {
  const fromEnv = import.meta.env.VITE_SITE_URL;
  return normalizePublicOrigin(fromEnv || PRODUCTION_SITE_URL);
}

export function getPasswordResetRedirectUrl() {
  return `${getAuthRedirectOrigin()}/reset-password`;
}
