import { sb } from '../../services/supabase';
import { memberDisplayName } from '../../utils/memberDisplayName';
import { SORTEO_TIPO } from '../../constants/sorteoTypes';

function parseRpcJson(data) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
}

function isMissingRpc(error, rpcName) {
  const msg = error?.message || '';
  return msg.includes(rpcName) || msg.includes('does not exist');
}

export function sorteoParticipantName(row) {
  return memberDisplayName(row);
}

export async function fetchSorteosByIglesia(iglesiaId) {
  if (!iglesiaId) return { data: [], error: null };

  const rpc = await sb.rpc('admin_list_sorteos', { p_iglesia_id: iglesiaId });
  if (!rpc.error) {
    const parsed = parseRpcJson(rpc.data);
    return { data: Array.isArray(parsed) ? parsed : [], error: null };
  }

  if (isMissingRpc(rpc.error, 'admin_list_sorteos')) {
    return {
      data: [],
      error: { message: 'Run SORTEOS_SCHEMA.sql in Supabase to enable raffles.' },
    };
  }

  return { data: [], error: rpc.error };
}

export async function fetchSorteoById(sorteoId) {
  if (!sorteoId) return { data: null, error: null };

  const rpc = await sb.rpc('admin_get_sorteo', { p_sorteo_id: sorteoId });
  if (!rpc.error) {
    return { data: parseRpcJson(rpc.data), error: null };
  }

  if (isMissingRpc(rpc.error, 'admin_get_sorteo')) {
    return { data: null, error: { message: 'Run SORTEOS_SCHEMA.sql in Supabase to enable raffles.' } };
  }

  return { data: null, error: rpc.error };
}

export async function previewSorteoParticipantes({
  tipo,
  iglesiaId,
  eventoId = null,
  loginDesde = null,
  loginHasta = null,
  noticiaId = null,
  manualIds = [],
}) {
  const rpc = await sb.rpc('admin_preview_sorteo_participantes', {
    p_tipo: tipo,
    p_iglesia_id: iglesiaId,
    p_evento_id: eventoId || null,
    p_login_desde: loginDesde || null,
    p_login_hasta: loginHasta || null,
    p_noticia_id: noticiaId || null,
    p_manual_ids: manualIds?.length ? manualIds : null,
  });

  if (!rpc.error) {
    const parsed = parseRpcJson(rpc.data) || { count: 0, participantes: [] };
    return {
      data: {
        count: parsed.count ?? 0,
        participantes: parsed.participantes || [],
      },
      error: null,
    };
  }

  if (isMissingRpc(rpc.error, 'admin_preview_sorteo_participantes')) {
    return { data: { count: 0, participantes: [] }, error: rpc.error };
  }

  return { data: { count: 0, participantes: [] }, error: rpc.error };
}

export async function saveSorteo({
  id = null,
  iglesiaId,
  titulo,
  descripcion,
  tipo,
  cantidadGanadores = 1,
  eventoId = null,
  loginDesde = null,
  loginHasta = null,
  noticiaId = null,
  clubId = null,
  manualIds = [],
}) {
  const rpc = await sb.rpc('admin_save_sorteo', {
    p_id: id,
    p_iglesia_id: iglesiaId,
    p_titulo: titulo,
    p_descripcion: descripcion || null,
    p_tipo: tipo,
    p_cantidad_ganadores: cantidadGanadores,
    p_evento_id: eventoId || null,
    p_login_desde: loginDesde || null,
    p_login_hasta: loginHasta || null,
    p_noticia_id: noticiaId || null,
    p_club_id: clubId || null,
    p_manual_ids: manualIds?.length ? manualIds : null,
  });

  if (!rpc.error) return { data: rpc.data, error: null };
  if (isMissingRpc(rpc.error, 'admin_save_sorteo')) {
    return { data: null, error: { message: 'Run SORTEOS_SCHEMA.sql in Supabase to enable raffles.' } };
  }
  return { data: null, error: rpc.error };
}

export async function closeSorteo({
  sorteoId,
  comentarios = '',
  ganadorIds = [],
}) {
  const rpc = await sb.rpc('admin_close_sorteo', {
    p_sorteo_id: sorteoId,
    p_comentarios: comentarios || null,
    p_ganador_ids: ganadorIds?.length ? ganadorIds : [],
  });

  if (!rpc.error) return { data: true, error: null };
  return { data: false, error: rpc.error };
}

export async function markNoticiaLeida(sessionToken, noticiaId) {
  const rpc = await sb.rpc('member_portal_mark_noticia_leida', {
    p_session_token: sessionToken,
    p_noticia_id: noticiaId,
  });

  if (!rpc.error) return { data: true, error: null };
  if (isMissingRpc(rpc.error, 'member_portal_mark_noticia_leida')) {
    return { data: false, error: null };
  }
  return { data: false, error: rpc.error };
}

export function formatParticipantListForExport(participantes, nameFn = sorteoParticipantName) {
  return (participantes || [])
    .map(row => nameFn(row))
    .filter(Boolean)
    .join('\n');
}

export function sorteoRequiresEvento(tipo) {
  return tipo === SORTEO_TIPO.ASISTENCIA_EVENTO;
}

export function sorteoRequiresLoginPeriod(tipo) {
  return tipo === SORTEO_TIPO.LOGIN_PERIODO;
}

export function sorteoRequiresNoticia(tipo) {
  return tipo === SORTEO_TIPO.NOTICIA_LEIDA;
}

export function sorteoIsCustom(tipo) {
  return tipo === SORTEO_TIPO.PERSONALIZADO;
}
