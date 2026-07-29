import { sb } from '../../services/supabase';
import { sanitizeNoticiaFields, stripHtmlTags } from '../../utils/sanitizeHtml';
import {
  validateImageFile,
  extensionForImageFile,
  isRlsError,
} from '../../utils/assets';
import { DEFAULT_NOTICIA_PLACEMENTS, normalizePlacements, NOTICIA_PLACEMENT_IDS, hasPublicNoticiaSurface } from '../../constants/noticiaPlacements';
import {
  NOTICIA_FEATURED_VARIANTS,
  noticiaFeaturedImageColumn,
  noticiaFeaturedStorageStem,
} from '../../constants/noticiaFeaturedImage';
import {
  DEFAULT_NOTICIA_AUDIENCE,
  normalizeAudience,
  audienceRequiresClub,
  filterNoticiasByAudience,
} from '../../constants/noticiaAudience';

const NOTICIA_IMAGES_BUCKET = 'noticia-imagenes';

const NOTICIA_SELECT_WITH_IMAGE = 'id,iglesia_id,club_id,titulo,resumen,contenido,publicado_en,expira_en,estado,categoria,placements,audience,imagen_destacada_url,imagen_destacada_mobile_url,created_at,updated_at,iglesias(nombre),clubes(id,nombre,tipos_club(id,nombre))';
const NOTICIA_SELECT_WITH_EXPIRA = 'id,iglesia_id,club_id,titulo,resumen,contenido,publicado_en,expira_en,estado,categoria,placements,audience,created_at,updated_at,clubes(id,nombre,tipos_club(id,nombre))';
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

function normalizePlacementsForSave(placements) {
  if (!Array.isArray(placements)) return [...DEFAULT_NOTICIA_PLACEMENTS];
  return placements.filter(p => NOTICIA_PLACEMENT_IDS.includes(p));
}

function normalizeNoticiaRow(row) {
  if (!row) return row;
  return {
    ...row,
    expira_en: normalizeExpiraEn(row.expira_en),
    placements: normalizePlacements(row.placements, { allowEmpty: true }),
    audience: normalizeAudience(row.audience),
    iglesia_nombre: row.iglesias?.nombre || row.iglesia_nombre || '',
    club_nombre: row.clubes?.nombre || row.club_nombre || '',
    imagen_destacada_url: row.imagen_destacada_url || '',
    imagen_destacada_mobile_url: row.imagen_destacada_mobile_url || '',
  };
}

async function queryNoticias(buildQuery) {
  for (const select of [NOTICIA_SELECT_WITH_IMAGE, NOTICIA_SELECT_WITH_EXPIRA, NOTICIA_SELECT_LEGACY]) {
    const result = await buildQuery(select);
    if (!result.error) {
      if (result.data) {
        result.data = Array.isArray(result.data)
          ? result.data.map(normalizeNoticiaRow)
          : normalizeNoticiaRow(result.data);
      }
      return result;
    }
    if (
      !isMissingColumnError(result.error, 'expira_en')
      && !isMissingColumnError(result.error, 'imagen_destacada_url')
      && !isMissingColumnError(result.error, 'imagen_destacada_mobile_url')
    ) {
      return result;
    }
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

/** Superadmin listing: selected church news plus platform-wide general audience items. */
export async function fetchSuperadminNoticiasByIglesia(iglesiaId, { showInactive = false } = {}) {
  if (!iglesiaId) return { data: [], error: null };

  return queryNoticias(select => {
    let query = sb
      .from('noticias')
      .select(select)
      .or(`iglesia_id.eq.${iglesiaId},audience.eq.general`)
      .order('publicado_en', { ascending: false })
      .order('created_at', { ascending: false });

    if (!showInactive) query = query.eq('estado', 'activo');
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

export function isPublicNoticia(noticia) {
  if (!noticia || !isNoticiaVisible(noticia)) return false;
  if (normalizeAudience(noticia.audience) !== 'general') return false;
  return hasPublicNoticiaSurface(noticia.placements);
}

export async function fetchPublicNoticiaById(id) {
  if (!id) return { data: null, error: null };

  const rpc = await sb.rpc('fetch_public_noticia_by_id', { p_id: id });

  if (!rpc.error) {
    const row = normalizeNoticiaRow(rpc.data);
    return {
      data: isPublicNoticia(row) ? row : null,
      error: null,
    };
  }

  const msg = rpc.error?.message || '';
  if (!isRlsError(rpc.error) && !msg.includes('fetch_public_noticia_by_id')) {
    return { data: null, error: rpc.error };
  }

  const fallback = await fetchNoticiaById(id);
  if (fallback.error) return { data: null, error: fallback.error };

  const row = fallback.data;
  return {
    data: isPublicNoticia(row) ? row : null,
    error: null,
  };
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
    desktopUrl: noticia.imagen_destacada_url || '',
    mobileUrl: noticia.imagen_destacada_mobile_url || '',
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
  imagenDestacadaUrl = null,
  imagenDestacadaMobileUrl = null,
}) {
  const clean = sanitizeNoticiaFields({ titulo, resumen, contenido });
  if (!stripHtmlTags(clean.titulo) || !stripHtmlTags(clean.contenido)) {
    return { data: null, error: new Error('Title and content are required.') };
  }

  const normalizedPlacements = normalizePlacementsForSave(placements);
  const normalizedAudience = normalizeAudience(audience);

  if (audienceRequiresClub(normalizedAudience) && !clubId) {
    return { data: null, error: new Error('Club is required for club-only news.') };
  }

  const normalizedExpira = normalizeExpiraEn(expiraEn);
  const normalizedImageUrl = imagenDestacadaUrl?.trim() || null;
  const normalizedMobileImageUrl = imagenDestacadaMobileUrl?.trim() || null;

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
    imagen_destacada_url: normalizedImageUrl,
    imagen_destacada_mobile_url: normalizedMobileImageUrl,
  };

  const saveDirect = async (body) => {
    if (id) {
      return sb.from('noticias').update(body).eq('id', id).select('id').single();
    }
    return sb.from('noticias').insert([body]).select('id').single();
  };

  let direct = await saveDirect(payload);
  if (!direct.error) return direct;
  if (isMissingColumnError(direct.error, 'expira_en') || isMissingColumnError(direct.error, 'imagen_destacada_url') || isMissingColumnError(direct.error, 'imagen_destacada_mobile_url')) {
    const {
      expira_en: _expira,
      imagen_destacada_url: _img,
      imagen_destacada_mobile_url: _mobileImg,
      ...legacyPayload
    } = payload;
    direct = await saveDirect(legacyPayload);
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
    p_imagen_destacada_url: normalizedImageUrl,
    p_imagen_destacada_mobile_url: normalizedMobileImageUrl,
  };

  const rpc = await sb.rpc('admin_save_noticia', rpcArgs);
  if (!rpc.error) return { data: { id: rpc.data }, error: null };

  const rpcMsg = rpc.error?.message || '';
  if (rpcMsg.includes('p_expira_en') || rpcMsg.includes('p_imagen_destacada_url') || rpcMsg.includes('p_imagen_destacada_mobile_url') || rpcMsg.includes('admin_save_noticia')) {
    const {
      p_expira_en: _expira,
      p_imagen_destacada_url: _img,
      p_imagen_destacada_mobile_url: _mobileImg,
      ...legacyRpcArgs
    } = rpcArgs;
    const legacyRpc = await sb.rpc('admin_save_noticia', legacyRpcArgs);
    if (!legacyRpc.error) return { data: { id: legacyRpc.data }, error: null };
    return legacyRpc;
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
    p_placements: normalizePlacements(row.placements, { allowEmpty: true }),
    p_audience: normalizeAudience(row.audience),
    p_club_id: row.club_id || null,
    p_expira_en: row.expira_en || null,
    p_imagen_destacada_url: row.imagen_destacada_url || null,
    p_imagen_destacada_mobile_url: row.imagen_destacada_mobile_url || null,
  });
}

async function uploadFeaturedImageToStorage(path, file) {
  let { error } = await sb.storage
    .from(NOTICIA_IMAGES_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error && isRlsError(error)) {
    ({ error } = await sb.storage
      .from(NOTICIA_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type }));
  }

  return error;
}

function publicUrlForFeaturedImage(path) {
  const { data } = sb.storage.from(NOTICIA_IMAGES_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

async function setNoticiaFeaturedImageUrl(noticiaId, variant, imageUrl) {
  const column = noticiaFeaturedImageColumn(variant);
  const rpc = await sb.rpc('admin_update_noticia_featured_image', {
    p_noticia_id: noticiaId,
    p_variant: variant,
    p_image_url: imageUrl,
  });
  if (!rpc.error) return rpc;

  const direct = await sb.from('noticias').update({ [column]: imageUrl }).eq('id', noticiaId);
  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;
  return rpc;
}

function featuredImageResponseKey(variant) {
  return variant === NOTICIA_FEATURED_VARIANTS.MOBILE
    ? 'imagen_destacada_mobile_url'
    : 'imagen_destacada_url';
}

export async function uploadNoticiaFeaturedImage(noticiaId, file, variant = NOTICIA_FEATURED_VARIANTS.DESKTOP) {
  const validationError = validateImageFile(file);
  if (validationError) return { data: null, error: new Error(validationError) };

  const ext = extensionForImageFile(file);
  const path = `noticias/${noticiaId}/${noticiaFeaturedStorageStem(variant)}.${ext}`;
  const uploadError = await uploadFeaturedImageToStorage(path, file);
  if (uploadError) return { data: null, error: uploadError, errorStage: 'storage' };

  const imageUrl = publicUrlForFeaturedImage(path);
  if (!imageUrl) return { data: null, error: new Error('Unable to resolve image URL'), errorStage: 'storage' };

  const updateResult = await setNoticiaFeaturedImageUrl(noticiaId, variant, imageUrl);
  if (updateResult.error) {
    return { data: null, error: updateResult.error, errorStage: 'database' };
  }

  return { data: { [featuredImageResponseKey(variant)]: imageUrl }, error: null };
}

export async function removeNoticiaFeaturedImage(noticiaId, currentImageUrl, variant = NOTICIA_FEATURED_VARIANTS.DESKTOP) {
  if (currentImageUrl) {
    try {
      const marker = '/noticia-imagenes/';
      const idx = currentImageUrl.indexOf(marker);
      if (idx >= 0) {
        const storagePath = currentImageUrl.slice(idx + marker.length).split('?')[0];
        if (storagePath) {
          await sb.storage.from(NOTICIA_IMAGES_BUCKET).remove([storagePath]);
        }
      }
    } catch {
      // ignore storage cleanup errors
    }
  }

  return setNoticiaFeaturedImageUrl(noticiaId, variant, null);
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
