/**
 * Production site URL for Teofila on Netlify.
 * Netlify default subdomain: https://teofila.netlify.app
 * (Sites use *.netlify.app — configure a custom domain in Netlify if needed.)
 */
export const PRODUCTION_SITE_URL = 'https://teofila.netlify.app';

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
 * Always points at live/prod — never localhost — so users open links on the real site.
 */
export function getAuthRedirectOrigin() {
  const fromEnv = (import.meta.env.VITE_SITE_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return PRODUCTION_SITE_URL;
}

export function getPasswordResetRedirectUrl() {
  return `${getAuthRedirectOrigin()}/reset-password`;
}
