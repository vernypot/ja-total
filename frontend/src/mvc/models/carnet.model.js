import { sb } from '../../services/supabase';

export function memberFullName(m) {
  if (!m) return '';
  return [m.nombre, m.apellido1, m.apellido2].filter(Boolean).join(' ');
}

export function formatBloodType(tipoSangre, factorRh) {
  const type = (tipoSangre || '').trim();
  const rh = (factorRh || '').trim();
  if (!type && !rh) return null;
  return `${type}${rh}`.trim();
}

export function addOneYear(fromDate = new Date()) {
  const d = new Date(fromDate);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

export function formatCarnetExpirationDate(date, language = 'es') {
  if (!date) return '';
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function getOrCreateProfileToken(miembroId) {
  return sb.rpc('get_or_create_miembro_profile_token', { p_miembro_id: miembroId });
}

export function buildCheckinQrUrl(token) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/dashboard/checkin?t=${encodeURIComponent(token)}`;
}

export function parseTokenFromQrPayload(raw) {
  if (!raw) return null;
  const text = raw.trim();
  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get('t') || url.searchParams.get('m');
    if (fromQuery) return fromQuery;
  } catch {
    // not a URL
  }
  if (/^[a-f0-9]{32}$/i.test(text)) return text;
  return text;
}

export async function checkinEventoByToken(eventoId, token) {
  return sb.rpc('admin_checkin_evento', {
    p_evento_id: eventoId,
    p_token: token,
  });
}

export async function resolveMiembroFromToken(token) {
  return sb.rpc('resolve_miembro_from_token', { p_token: token });
}
