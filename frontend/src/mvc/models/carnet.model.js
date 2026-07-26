import { sb } from '../../services/supabase';
import { memberDisplayName, memberLegalFullName, MIEMBRO_NAME_FIELDS } from '../../utils/memberDisplayName';

/** Legal full name for printed carnets, medical forms, and other documents. */
export function memberFullName(m) {
  return memberLegalFullName(m);
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

export function getCarnetAssetUrl(url) {
  if (!url) return null;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}t=${Date.now()}`;
}

function waitForPrintImages(container, timeoutMs = 8000) {
  if (!container) return Promise.resolve();
  const images = Array.from(container.querySelectorAll('img'));
  if (!images.length) return Promise.resolve();

  return Promise.all(images.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(resolve => {
      const done = () => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
        resolve();
      };
      img.addEventListener('load', done);
      img.addEventListener('error', done);
      window.setTimeout(done, timeoutMs);
    });
  }));
}

export async function triggerCarnetPrint(onBeforePrint, { batch = false } = {}) {
  if (onBeforePrint) onBeforePrint();
  document.body.classList.add('carnet-printing');
  if (batch) document.body.classList.add('carnet-printing--batch');
  const cleanup = () => {
    document.body.classList.remove('carnet-printing', 'carnet-printing--batch');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.setTimeout(cleanup, 10000);

  await new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  await waitForPrintImages(document.querySelector('.carnet-print-area'));
  window.print();
}

/** Front+back pairs per landscape letter sheet (2 columns × 2 rows). */
export const CARNETS_PER_COMBINED_SHEET = 4;

/** @deprecated Use CARNETS_PER_COMBINED_SHEET */
export const CARNETS_PER_LETTER_PAGE = CARNETS_PER_COMBINED_SHEET;

export function chunkMembersForCombinedSheets(members, perPage = CARNETS_PER_COMBINED_SHEET) {
  const pages = [];
  for (let i = 0; i < members.length; i += perPage) {
    pages.push(members.slice(i, i + perPage));
  }
  return pages;
}

export function chunkMembersForLetterPages(members, perPage = CARNETS_PER_COMBINED_SHEET) {
  return chunkMembersForCombinedSheets(members, perPage);
}

export function buildCombinedSheetSlots(pageMembers, perPage = CARNETS_PER_COMBINED_SHEET) {
  const slots = pageMembers.slice(0, perPage);
  while (slots.length < perPage) slots.push(null);
  return slots;
}

export function buildLetterPageSlots(pageMembers, perPage = CARNETS_PER_COMBINED_SHEET) {
  return buildCombinedSheetSlots(pageMembers, perPage);
}

export async function getOrCreateProfileToken(miembroId) {
  return sb.rpc('get_or_create_miembro_profile_token', { p_miembro_id: miembroId });
}

export async function fetchActiveClubCarnetMembers(clubId) {
  const { data: rows, error } = await sb
    .from('miembro_club')
    .select(`miembros(id, ${MIEMBRO_NAME_FIELDS}, estado, foto_url, miembro_datos_medicos(tipo_sangre, factor_rh))`)
    .eq('club_id', clubId);

  if (error) return { data: [], error };

  const members = (rows || [])
    .map(row => {
      const m = row.miembros;
      if (!m) return null;
      const medicalRaw = m.miembro_datos_medicos;
      const medical = Array.isArray(medicalRaw) ? medicalRaw[0] : medicalRaw;
      return {
        id: m.id,
        nombre: m.nombre,
        apellido1: m.apellido1,
        apellido2: m.apellido2,
        nombre_opcional: m.nombre_opcional,
        apellido_opcional: m.apellido_opcional,
        estado: m.estado,
        foto_url: m.foto_url,
        medical: medical || null,
      };
    })
    .filter(m => m && m.estado === 'activo' && m.foto_url?.trim())
    .sort((a, b) => memberFullName(a).localeCompare(memberFullName(b), undefined, { sensitivity: 'base' }));

  return { data: members, error: null };
}

export async function fetchCarnetMembersForSelection(memberIds, clubId) {
  const uniqueIds = [...new Set((memberIds || []).filter(Boolean))];
  if (!uniqueIds.length || !clubId) {
    return { data: [], skipped: uniqueIds, error: null };
  }

  const { data: rows, error } = await sb
    .from('miembro_club')
    .select(`miembros(id, ${MIEMBRO_NAME_FIELDS}, estado, foto_url, miembro_datos_medicos(tipo_sangre, factor_rh))`)
    .eq('club_id', clubId)
    .in('miembro_id', uniqueIds);

  if (error) return { data: [], skipped: uniqueIds, error };

  const membersById = new Map();
  for (const row of rows || []) {
    const m = row.miembros;
    if (!m?.id) continue;
    const medicalRaw = m.miembro_datos_medicos;
    const medical = Array.isArray(medicalRaw) ? medicalRaw[0] : medicalRaw;
    membersById.set(m.id, {
      id: m.id,
      nombre: m.nombre,
      apellido1: m.apellido1,
      apellido2: m.apellido2,
      nombre_opcional: m.nombre_opcional,
      apellido_opcional: m.apellido_opcional,
      estado: m.estado,
      foto_url: m.foto_url,
      medical: medical || null,
    });
  }

  const data = [];
  const skipped = [];
  for (const id of uniqueIds) {
    const m = membersById.get(id);
    if (!m || m.estado !== 'activo' || !m.foto_url?.trim()) {
      skipped.push(id);
      continue;
    }
    data.push(m);
  }

  data.sort((a, b) => memberFullName(a).localeCompare(memberFullName(b), undefined, { sensitivity: 'base' }));
  return { data, skipped, error: null };
}

export async function loadCarnetTokensForMembers(memberIds) {
  const tokens = {};
  if (!memberIds.length) return tokens;

  const results = await Promise.all(
    memberIds.map(async id => {
      const { data, error } = await getOrCreateProfileToken(id);
      return { id, token: error ? null : (data || null) };
    })
  );

  for (const result of results) {
    tokens[result.id] = result.token;
  }

  return tokens;
}

export function buildMemberPortalQrUrl(token) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/portal?t=${encodeURIComponent(token)}`;
}

export function buildCheckinQrUrl(token) {
  return buildMemberPortalQrUrl(token);
}

export function buildEventCheckinSessionUrl(eventoId, { started = false } = {}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({ evento: eventoId });
  if (started) params.set('started', '1');
  return `${origin}/dashboard/checkin?${params.toString()}`;
}

export function memberNameFromTokenRow(rows) {
  const row = Array.isArray(rows) ? rows[0] : rows;
  return memberDisplayName(row);
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
