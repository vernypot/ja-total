import { sb } from '../../services/supabase';
import { sanitizeNoticiaFields, stripHtmlTags } from '../../utils/sanitizeHtml';

function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}

const NOTICIA_SELECT = 'id,iglesia_id,titulo,resumen,contenido,publicado_en,estado,created_at,updated_at';

export async function fetchNoticiasByIglesia(iglesiaId, { showInactive = false, limit } = {}) {
  if (!iglesiaId) return { data: [], error: null };

  let query = sb
    .from('noticias')
    .select(NOTICIA_SELECT)
    .eq('iglesia_id', iglesiaId)
    .order('publicado_en', { ascending: false })
    .order('created_at', { ascending: false });

  if (!showInactive) query = query.eq('estado', 'activo');
  if (limit) query = query.limit(limit);

  return query;
}

export async function fetchNoticiaById(id) {
  return sb.from('noticias').select(NOTICIA_SELECT).eq('id', id).maybeSingle();
}

export async function saveNoticia({
  id,
  iglesiaId,
  titulo,
  resumen,
  contenido,
  publicadoEn,
  estado = 'activo',
}) {
  const clean = sanitizeNoticiaFields({ titulo, resumen, contenido });
  if (!stripHtmlTags(clean.titulo) || !stripHtmlTags(clean.contenido)) {
    return { data: null, error: new Error('Title and content are required.') };
  }

  const payload = {
    iglesia_id: iglesiaId,
    titulo: clean.titulo,
    resumen: clean.resumen || null,
    contenido: clean.contenido,
    publicado_en: publicadoEn || new Date().toISOString().slice(0, 10),
    estado,
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
