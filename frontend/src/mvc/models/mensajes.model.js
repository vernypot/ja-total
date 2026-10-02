import { sb } from '../../services/supabase';
import { sanitizeNoticiaContentHtml, stripHtmlTags } from '../../utils/sanitizeHtml';

export const MENSAJE_MAX_FILE_BYTES = 1073741824;
const MENSAJE_ARCHIVOS_BUCKET = 'mensaje-archivos';

function parseJsonList(data) {
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonObject(data) {
  if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export async function fetchClubBirthdays(clubId, { sessionToken } = {}) {
  if (!clubId) return { data: { enabled: false, members: [] }, error: null };

  if (sessionToken) {
    const { data, error } = await sb.rpc('member_portal_list_club_birthdays', {
      p_session_token: sessionToken,
      p_club_id: clubId,
    });
    if (error) return { data: null, error };
    const payload = parseJsonObject(data);
    return {
      data: {
        enabled: payload.enabled !== false,
        members: parseJsonList(payload.members),
      },
      error: null,
    };
  }

  const { data, error } = await sb.rpc('admin_list_club_birthdays', { p_club_id: clubId });
  if (error) return { data: null, error };
  return { data: { enabled: true, members: parseJsonList(data) }, error: null };
}

export async function fetchMessageDirectory(clubId, { sessionToken } = {}) {
  if (!clubId) return { data: [], error: null };

  if (sessionToken) {
    const { data, error } = await sb.rpc('member_portal_list_club_directory', {
      p_session_token: sessionToken,
      p_club_id: clubId,
    });
    if (error) return { data: null, error };
    return { data: parseJsonList(data), error: null };
  }

  const { data, error } = await sb.rpc('admin_list_club_message_directory', { p_club_id: clubId });
  if (error) return { data: null, error };
  return { data: parseJsonList(data), error: null };
}

export async function fetchMensajes({ sessionToken } = {}) {
  if (sessionToken) {
    const { data, error } = await sb.rpc('member_portal_list_mensajes', {
      p_session_token: sessionToken,
    });
    if (error) return { data: null, error };
    return { data: parseJsonList(data), error: null };
  }

  const { data, error } = await sb.rpc('admin_list_mensajes');
  if (error) {
    if (/does not exist|Could not find/i.test(error.message || '')) {
      return { data: [], error: null, schemaAvailable: false };
    }
    return { data: null, error };
  }
  return { data: parseJsonList(data), error: null, schemaAvailable: true };
}

export async function fetchUnreadMensajeCount({ sessionToken } = {}) {
  if (sessionToken) {
    const { data, error } = await sb.rpc('member_portal_unread_mensaje_count', {
      p_session_token: sessionToken,
    });
    if (error) return { data: 0, error };
    return { data: Number(data) || 0, error: null };
  }

  const { data, error } = await sb.rpc('admin_unread_mensaje_count');
  if (error) {
    if (/does not exist|Could not find/i.test(error.message || '')) {
      return { data: 0, error: null };
    }
    return { data: 0, error };
  }
  return { data: Number(data) || 0, error: null };
}

export async function sendMensaje({
  clubId,
  destinatarioMiembroId = null,
  destinatarioUsuarioId = null,
  tipo = 'general',
  asunto,
  cuerpo,
  sessionToken,
}) {
  if (sessionToken) {
    const { data, error } = await sb.rpc('member_portal_send_mensaje', {
      p_session_token: sessionToken,
      p_club_id: clubId,
      p_destinatario_miembro_id: destinatarioMiembroId,
      p_destinatario_usuario_id: destinatarioUsuarioId,
      p_tipo: tipo,
      p_asunto: asunto,
      p_cuerpo: cuerpo,
    });
    if (error) return { data: null, error };
    return { data: { id: data }, error: null };
  }

  const { data, error } = await sb.rpc('admin_send_mensaje', {
    p_club_id: clubId,
    p_destinatario_miembro_id: destinatarioMiembroId,
    p_destinatario_usuario_id: destinatarioUsuarioId,
    p_tipo: tipo,
    p_asunto: asunto,
    p_cuerpo: cuerpo,
  });
  if (error) return { data: null, error };
  return { data: { id: data }, error: null };
}

export async function markMensajeLeido(mensajeId, { sessionToken } = {}) {
  if (!mensajeId) return { error: null };

  if (sessionToken) {
    const { error } = await sb.rpc('member_portal_mark_mensaje_leido', {
      p_session_token: sessionToken,
      p_mensaje_id: mensajeId,
    });
    return { error };
  }

  const { error } = await sb.rpc('admin_mark_mensaje_leido', { p_mensaje_id: mensajeId });
  return { error };
}

export function partyDisplayName(party) {
  if (!party) return '';
  return [party.nombre, party.apellido1].filter(Boolean).join(' ').trim();
}

export function sanitizeMensajeHtml(html) {
  return sanitizeNoticiaContentHtml(html);
}

export function mensajeHasBody(html) {
  if (stripHtmlTags(html)) return true;
  return /<img\b/i.test(html || '');
}

export function sanitizeMensajeFileName(name) {
  return String(name || 'file').replace(/[\\/\0]+/g, '_').slice(0, 180) || 'file';
}

export function validateMensajeFile(file) {
  if (!file) return 'mensajeFileRequired';
  if (file.size > MENSAJE_MAX_FILE_BYTES) return 'mensajeFileTooLarge';
  return null;
}

export function formatMensajeFileSize(bytes, language = 'es') {
  const size = Number(bytes) || 0;
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(size / 1024) + ' KB';
  }
  if (size < 1024 * 1024 * 1024) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(size / (1024 * 1024)) + ' MB';
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(size / (1024 * 1024 * 1024)) + ' GB';
}

export function collectImageSources(html) {
  const sources = [];
  const re = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;
  let match = re.exec(html || '');
  while (match) {
    sources.push(match[1]);
    match = re.exec(html || '');
  }
  return [...new Set(sources)];
}

async function dataUrlToFile(dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const subtype = (blob.type.split('/')[1] || 'png').split(';')[0] || 'png';
  return new File([blob], `image.${subtype}`, { type: blob.type || 'image/png' });
}

export async function collectInlineFiles(html, inlineFiles = []) {
  const known = new Map(inlineFiles.map(item => [item.url, item.file]));
  const files = [];
  for (const src of collectImageSources(html)) {
    if (src.startsWith('blob:') && known.has(src)) {
      files.push({ src, file: known.get(src) });
    } else if (src.startsWith('data:')) {
      files.push({ src, file: await dataUrlToFile(src) });
    }
  }
  return files;
}

export function replaceHtmlSources(html, replacements) {
  let next = html || '';
  for (const [from, to] of replacements) {
    if (!from || !to) continue;
    next = next.split(from).join(to);
  }
  return next;
}

export async function updateMensajeCuerpo(mensajeId, cuerpo, { sessionToken } = {}) {
  if (!mensajeId) return { error: new Error('missing message') };

  if (sessionToken) {
    const { error } = await sb.rpc('member_portal_update_mensaje_cuerpo', {
      p_session_token: sessionToken,
      p_mensaje_id: mensajeId,
      p_cuerpo: cuerpo,
    });
    return { error };
  }

  const { error } = await sb.rpc('admin_update_mensaje_cuerpo', {
    p_mensaje_id: mensajeId,
    p_cuerpo: cuerpo,
  });
  return { error };
}

function parsePreparedAdjunto(data) {
  const row = typeof data === 'string' ? JSON.parse(data) : data;
  return {
    id: row?.id,
    path: row?.path,
  };
}

export async function uploadMensajeAdjunto(mensajeId, file, { sessionToken } = {}) {
  const validation = validateMensajeFile(file);
  if (validation) return { data: null, error: new Error(validation) };

  const nombre = sanitizeMensajeFileName(file.name);
  const prepare = sessionToken
    ? await sb.rpc('member_portal_prepare_mensaje_adjunto', {
      p_session_token: sessionToken,
      p_mensaje_id: mensajeId,
      p_nombre: nombre,
      p_mime_type: file.type || null,
      p_tamano: file.size || 0,
    })
    : await sb.rpc('admin_prepare_mensaje_adjunto', {
      p_mensaje_id: mensajeId,
      p_nombre: nombre,
      p_mime_type: file.type || null,
      p_tamano: file.size || 0,
    });

  if (prepare.error) return { data: null, error: prepare.error };

  const prepared = parsePreparedAdjunto(prepare.data);
  if (!prepared.id || !prepared.path) {
    return { data: null, error: new Error('Could not prepare attachment') };
  }

  const { error: uploadError } = await sb.storage
    .from(MENSAJE_ARCHIVOS_BUCKET)
    .upload(prepared.path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) return { data: null, error: uploadError };

  const { data: urlData } = sb.storage.from(MENSAJE_ARCHIVOS_BUCKET).getPublicUrl(prepared.path);
  const url = urlData?.publicUrl || null;
  if (!url) return { data: null, error: new Error('Unable to resolve file URL') };

  const finalize = sessionToken
    ? await sb.rpc('member_portal_finalize_mensaje_adjunto', {
      p_session_token: sessionToken,
      p_adjunto_id: prepared.id,
      p_url: url,
    })
    : await sb.rpc('admin_finalize_mensaje_adjunto', {
      p_adjunto_id: prepared.id,
      p_url: url,
    });

  if (finalize.error) return { data: null, error: finalize.error };
  return { data: { id: prepared.id, url, nombre }, error: null };
}
