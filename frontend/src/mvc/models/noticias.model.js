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

const NOTICIA_SELECT_WITH_EXPIRA = 'id,iglesia_id,club_id,titulo,resumen,contenido,publicado_en,expira_en,estado,categoria,placements,audience,created_at,updated_at,clubes(id,nombre)';
const NOTICIA_SELECT_LEGACY = 'id,iglesia_id,club_id,titulo,resumen,contenido,publicado_en,estado,categoria,placements,audience,created_at,updated_at,clubes(id,nombre)';

function isMissingColumnError(error, column) {
  const msg = error?.message || '';
  return msg.includes(`${column} does not exist`) || msg.includes(`Could not find the '${column}' column`);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeExpiraEn(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

export function isNoticiaVisible(noticia, { referenceDate } = {}) {
  if (!noticia || noticia.estado !== 'activo') return false;
  const today = referenceDate || todayIso();
  if (noticia.publicado_en && noticia.publicado_en > today) return false;
  const expiraEn = normalizeExpiraEn(noticia.expira_en);
  if (expiraEn && expiraEn < today) return false;
  return true;
}

export function isNoticiaExpired(noticia, referenceDate) {
  const today = referenceDate || todayIso();
  const expiraEn = normalizeExpiraEn(noticia?.expira_en);
  return Boolean(expiraEn && expiraEn < today);
}

function normalizeNoticiaRow(row) {
  if (!row) return row;
  return {
    ...row,
    expira_en: normalizeExpiraEn(row.expira_en),
    placements: normalizePlacements(row.placements),
    audience: normalizeAudience(row.audience),
    club_nombre: row.clubes?.nombre || row.club_nombre || '',
  };
}

async function queryNoticias(buildQuery) {
  for (const select of [NOTICIA_SELECT_WITH_EXPIRA, NOTICIA_SELECT_LEGACY]) {
    const result = await buildQuery(select);
    if (!result.error) {
      if (result.data) {
        result.data = Array.isArray(result.data)
          ? result.data.map(normalizeNoticiaRow)
          : normalizeNoticiaRow(result.data);
      }
      return result;
    }
    if (!isMissingColumnError(result.error, 'expira_en')) return result;
  }
  return { data: [], error: null };
}

function applyPlacementsFilter(query, placements) {
  if (!placements?.length) return query;
  return query.overlaps('placements', placements);
}

export async function fetchNoticiasByIglesia(iglesiaId, { showInactive = false, limit, placements } = {}) {
  if (!iglesiaId) return { data: [], error: null };

  return queryNoticias(select => {
    let query = sb
      .from('noticias')
      .select(select)
      .eq('iglesia_id', iglesiaId)
      .order('publicado_en', { ascending: false })
      .order('created_at', { ascending: false });

    if (!showInactive) query = query.eq('estado', 'activo');
    query = applyPlacementsFilter(query, placements);
    if (limit) query = query.limit(limit);
    return query;
  });
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
      data: (rpc.data || []).map(normalizeNoticiaRow).filter(isNoticiaVisible),
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
      data: (rpc.data || []).map(normalizeNoticiaRow).filter(isNoticiaVisible),
      error: null,
    };
  }

  if (!isRlsError(rpc.error) && !rpc.error.message?.includes('fetch_public_noticias')) {
    return rpc;
  }

  const today = todayIso();
  const fallback = await queryNoticias(select => {
    let query = sb
      .from('noticias')
      .select(select)
      .eq('estado', 'activo')
      .eq('audience', 'general')
      .lte('publicado_en', today)
      .order('publicado_en', { ascending: false })
      .order('created_at', { ascending: false });

    query = applyPlacementsFilter(query, placements);
    if (limit) query = query.limit(limit);
    return query;
  });

  if (fallback.data) {
    fallback.data = fallback.data.filter(isNoticiaVisible);
  }
  return fallback;
}

export async function fetchNoticiaById(id) {
  return queryNoticias(select =>
    sb.from('noticias').select(select).eq('id', id).maybeSingle()
  );
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

  const normalizedExpira = normalizeExpiraEn(expiraEn);

  const payload = {
    iglesia_id: iglesiaId,
    titulo: clean.titulo,
    resumen: clean.resumen || null,
    contenido: clean.contenido,
    publicado_en: publicadoEn || todayIso(),
    expira_en: normalizedExpira,
    estado,
    categoria: categoria?.trim() || null,
    placements: normalizedPlacements,
    audience: normalizedAudience,
    club_id: audienceRequiresClub(normalizedAudience) ? clubId : null,
  };

  const saveDirect = async (body) => {
    if (id) {
      return sb.from('noticias').update(body).eq('id', id).select('id').single();
    }
    return sb.from('noticias').insert([body]).select('id').single();
  };

  let direct = await saveDirect(payload);
  if (!direct.error) return direct;
  if (isMissingColumnError(direct.error, 'expira_en')) {
    const { expira_en: _ignored, ...withoutExpira } = payload;
    direct = await saveDirect(withoutExpira);
    if (!direct.error) return direct;
  }
  if (!isRlsError(direct.error)) return direct;

  const rpcArgs = {
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
    p_expira_en: normalizedExpira,
  };

  const rpc = await sb.rpc('admin_save_noticia', rpcArgs);
  if (!rpc.error) return rpc;

  const rpcMsg = rpc.error?.message || '';
  if (rpcMsg.includes('p_expira_en') || rpcMsg.includes('admin_save_noticia')) {
    const { p_expira_en: _ignored, ...legacyRpcArgs } = rpcArgs;
    return sb.rpc('admin_save_noticia', legacyRpcArgs);
  }

  return rpc;
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
