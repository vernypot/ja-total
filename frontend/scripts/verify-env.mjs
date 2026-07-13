/**
 * Fail the production build if required Vite env vars are missing or unsafe.
 * Run automatically via `npm run build`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"'))
      || (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnv(envPath);

const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_KEY'];

function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isServiceRoleKey(key) {
  const payload = decodeJwtPayload(key);
  return payload?.role === 'service_role';
}

function isPlaceholder(value) {
  const v = (value || '').trim().toLowerCase();
  return !v
    || v.includes('your-project')
    || v.includes('your-anon')
    || v.includes('your-publishable')
    || v === 'changeme';
}

const missing = REQUIRED.filter(name => isPlaceholder(process.env[name]));
const netlifyContext = process.env.CONTEXT || process.env.NETLIFY_CONTEXT || 'unknown';

if (missing.length) {
  console.error('\n[build] Missing or placeholder environment variables:');
  for (const name of missing) console.error(`  - ${name}`);
  console.error(`\nNetlify build context: ${netlifyContext}`);
  console.error('\nLocal: copy frontend/.env.example → frontend/.env');
  console.error('Netlify: Site configuration → Environment variables');
  console.error('  1. Add VITE_SUPABASE_URL and VITE_SUPABASE_KEY (anon/publishable key only)');
  console.error('  2. Set scope to "All scopes" (or include Deploy previews + Production)');
  console.error('  3. Redeploy after saving\n');
  process.exit(1);
}

const url = process.env.VITE_SUPABASE_URL.trim();
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
  console.warn('[build] Warning: VITE_SUPABASE_URL does not look like a Supabase project URL:', url);
}

const key = process.env.VITE_SUPABASE_KEY.trim();
if (isServiceRoleKey(key)) {
  console.error('\n[build] REFUSED: VITE_SUPABASE_KEY appears to be a service_role key.');
  console.error('Use the anon / publishable key only. Never expose service_role in the frontend.\n');
  process.exit(1);
}

const siteUrl = (process.env.VITE_SITE_URL || '').trim();
if (siteUrl && /localhost|127\.0\.0\.1/i.test(siteUrl)) {
  if (netlifyContext === 'production') {
    console.error('\n[build] REFUSED: VITE_SITE_URL must not be localhost on production.');
    console.error('Set VITE_SITE_URL=https://teofila.netlify.app in Netlify environment variables.\n');
    process.exit(1);
  }
  console.warn('[build] Warning: VITE_SITE_URL is localhost; auth emails will use https://teofila.netlify.app instead.');
}

if (netlifyContext === 'production' && !siteUrl) {
  console.log('[build] VITE_SITE_URL not set; using https://teofila.netlify.app for auth redirects (see netlify.toml).');
}

console.log('[build] Environment variables OK');
