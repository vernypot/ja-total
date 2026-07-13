import { sb } from '../../services/supabase';
import { sanitizeNoticiaFields, stripHtmlTags } from '../../utils/sanitizeHtml';
import { DEFAULT_NOTICIA_PLACEMENTS, normalizePlacements } from '../../constants/noticiaPlacements';
import {
  DEFAULT_NOTICIA_AUDIENCE,
  normalizeAudience,
  audienceRequiresClub,
  filterNoticiasByAudience,
} from '../../constants/noticiaAudience';

function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}

const NOTICIA_SELECT = 'id,iglesia_id,club_id,titulo,resumen,contenido,publicado_en,expira_en,estado,categoria,placements,audience,created_at,updated_at,clubes(id,nombre)';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function isNoticiaVisible(noticia, { referenceDate } = {}) {
  if (!noticia || noticia.estado !== 'activo') return false;
  const today = referenceDate || todayIso();
  if (noticia.publicado_en && noticia.publicado_en > today) return false;
  if (noticia.expira_en && noticia.expira_en < today) return false;
  return true;
}

export function isNoticiaExpired(noticia, referenceDate) {
  const today = referenceDate || todayIso();
  return Boolean(noticia?.expira_en && noticia.expira_en < today);
}

function normalizeNoticiaRow(row) {
  if (!row) return row;
  return {
    ...row,
    placements: normalizePlacements(row.placements),
    audience: normalizeAudience(row.audience),
    club_nombre: row.clubes?.nombre || row.club_nombre || '',
  };
}

function applyPlacementsFilter(query, placements) {
  if (!placements?.length) return query;
  return query.overlaps('placements', placements);
}

export async function fetchNoticiasByIglesia(iglesiaId, { showInactive = false, limit, placements } = {}) {
  if (!iglesiaId) return { data: [], error: null };

  let query = sb
    .from('noticias')
    .select(NOTICIA_SELECT)
    .eq('iglesia_id', iglesiaId)
    .order('publicado_en', { ascending: false })
    .order('created_at', { ascending: false });

  if (!showInactive) query = query.eq('estado', 'activo');
  query = applyPlacementsFilter(query, placements);
  if (limit) query = query.limit(limit);

  const result = await query;
  if (result.data) {
    result.data = result.data.map(normalizeNoticiaRow);
  }
  return result;
}

export async function fetchDashboardNoticias({
  iglesiaId,
  clubId,
  placements = ['dashboard'],
  limit = 10,
} = {}) {
  if (!iglesiaId) return { data: [], error: null };

  const rpc = await sb.rpc('fetch_dashboard_noticias', {
    p_iglesia_id: iglesiaId,
    p_club_id: clubId || null,
    p_placements: placements,
    p_limit: limit,
  });

  if (!rpc.error) {
    return {
      data: (rpc.data || []).map(normalizeNoticiaRow),
      error: null,
    };
  }

  const fallback = await fetchNoticiasByIglesia(iglesiaId, { placements, limit: limit * 3 });
  if (fallback.error) return fallback;

  return {
    data: filterNoticiasByAudience(fallback.data, { iglesiaId, clubId })
      .filter(isNoticiaVisible)
      .slice(0, limit),
    error: null,
  };
}

export async function fetchPublicNoticias({ placements, limit = 10 } = {}) {
  if (!placements?.length) return { data: [], error: null };

  const rpc = await sb.rpc('fetch_public_noticias', {
    p_placements: placements,
    p_limit: limit,
  });

  if (!rpc.error) {
    return {
      data: (rpc.data || []).map(normalizeNoticiaRow),
      error: null,
    };
  }

  if (!isRlsError(rpc.error) && !rpc.error.message?.includes('fetch_public_noticias')) {
    return rpc;
  }

  let query = sb
    .from('noticias')
    .select(NOTICIA_SELECT)
    .eq('estado', 'activo')
    .eq('audience', 'general')
    .lte('publicado_en', new Date().toISOString().slice(0, 10))
    .order('publicado_en', { ascending: false })
    .order('created_at', { ascending: false });

  query = applyPlacementsFilter(query, placements);
  if (limit) query = query.limit(limit);

  const fallback = await query;
  if (fallback.data) {
    fallback.data = fallback.data
      .map(normalizeNoticiaRow)
      .filter(isNoticiaVisible);
  }
  return fallback;
}

export async function fetchNoticiaById(id) {
  const result = await sb.from('noticias').select(NOTICIA_SELECT).eq('id', id).maybeSingle();
  if (result.data) {
    result.data = normalizeNoticiaRow(result.data);
  }
  return result;
}

export function noticiaPlainText(html, maxLength = 220) {
  const text = stripHtmlTags(html || '').replace(/\s+/g, ' ').trim();
  if (!maxLength || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

export function mapNoticiaToLandingCard(noticia, language = 'es') {
  return {
    id: noticia.id,
    date: noticia.publicado_en,
    category: noticia.categoria || '',
    title: noticiaPlainText(noticia.titulo, 120),
    excerpt: noticiaPlainText(noticia.resumen || noticia.contenido, 220),
    fromNoticia: true,
    language,
  };
}

export function mapNoticiaToHeroSlide(noticia) {
  return {
    id: `noticia-${noticia.id}`,
    eyebrow: noticia.categoria || '',
    title: noticiaPlainText(noticia.titulo, 100),
    text: noticiaPlainText(noticia.resumen || noticia.contenido, 260),
    accent: 'teal',
    screenshot: 'members',
    fromNoticia: true,
  };
}

export async function saveNoticia({
  id,
  iglesiaId,
  titulo,
  resumen,
  contenido,
  publicadoEn,
  expiraEn = null,
  estado = 'activo',
  categoria = '',
  placements = DEFAULT_NOTICIA_PLACEMENTS,
  audience = DEFAULT_NOTICIA_AUDIENCE,
  clubId = null,
}) {
  const clean = sanitizeNoticiaFields({ titulo, resumen, contenido });
  if (!stripHtmlTags(clean.titulo) || !stripHtmlTags(clean.contenido)) {
    return { data: null, error: new Error('Title and content are required.') };
  }

  const normalizedPlacements = normalizePlacements(placements);
  const normalizedAudience = normalizeAudience(audience);

  if (audienceRequiresClub(normalizedAudience) && !clubId) {
    return { data: null, error: new Error('Club is required for club-only news.') };
  }

  const payload = {
    iglesia_id: iglesiaId,
    titulo: clean.titulo,
    resumen: clean.resumen || null,
    contenido: clean.contenido,
    publicado_en: publicadoEn || todayIso(),
    expira_en: expiraEn || null,
    estado,
    categoria: categoria?.trim() || null,
    placements: normalizedPlacements,
    audience: normalizedAudience,
    club_id: audienceRequiresClub(normalizedAudience) ? clubId : null,
  };

  if (id) {
    const direct = await sb.from('noticias').update(payload).eq('id', id).select('id').single();
    if (!direct.error) return direct;
    if (!isRlsError(direct.error)) return direct;
  } else {
    const direct = await sb.from('noticias').insert([payload]).select('id').single();
    if (!direct.error) return direct;
    if (!isRlsError(direct.error)) return direct;
  }

  return sb.rpc('admin_save_noticia', {
    p_id: id || null,
    p_iglesia_id: iglesiaId,
    p_titulo: clean.titulo,
    p_resumen: clean.resumen || '',
    p_contenido: clean.contenido,
    p_publicado_en: publicadoEn || null,
    p_estado: estado,
    p_categoria: categoria?.trim() || null,
    p_placements: normalizedPlacements,
    p_audience: normalizedAudience,
    p_club_id: audienceRequiresClub(normalizedAudience) ? clubId : null,
    p_expira_en: expiraEn || null,
  });
}

export async function deleteNoticia(id) {
  const direct = await sb.from('noticias').delete().eq('id', id);
  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;
  return sb.rpc('admin_delete_noticia', { p_id: id });
}

export async function setNoticiaEstado(id, estado) {
  const direct = await sb.from('noticias').update({ estado }).eq('id', id);
  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;

  const { data: row } = await fetchNoticiaById(id);
  if (!row) return { error: new Error('Noticia not found') };

  return sb.rpc('admin_save_noticia', {
    p_id: id,
    p_iglesia_id: row.iglesia_id,
    p_titulo: row.titulo,
    p_resumen: row.resumen || '',
    p_contenido: row.contenido,
    p_publicado_en: row.publicado_en,
    p_estado: estado,
    p_categoria: row.categoria || null,
    p_placements: normalizePlacements(row.placements),
    p_audience: normalizeAudience(row.audience),
    p_club_id: row.club_id || null,
    p_expira_en: row.expira_en || null,
  });
}

export function formatNoticiaDate(dateStr, language = 'es') {
  if (!dateStr) return '';
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
