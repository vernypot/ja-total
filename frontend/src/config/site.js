/**
 * Production site URL for Teofila on Netlify.
 * Netlify default subdomain: https://teofila.netlify.app
 * (Sites use *.netlify.app — configure a custom domain in Netlify if needed.)
 */
export const PRODUCTION_SITE_URL = 'https://teofila.netlify.app';

export function getSiteOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  const fromEnv = (import.meta.env.VITE_SITE_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (import.meta.env.PROD) return PRODUCTION_SITE_URL;
  return 'http://localhost:5173';
}

export function getPasswordResetRedirectUrl() {
  return `${getSiteOrigin()}/reset-password`;
}
