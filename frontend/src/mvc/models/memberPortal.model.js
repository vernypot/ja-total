import { sb } from '../../services/supabase';
import { memberDisplayName } from '../../utils/memberDisplayName';
import { getEventoFromRow, getEventoIdFromRow, getEventoMiembroRowId } from './eventos.model';
import { normalizeEventDate, normalizeEventHora } from '../../utils/eventTimezone';
import { isValidDateKey } from '../../utils/calendar';

const PORTAL_SESSION_KEY = 'memberPortalSession';

function parsePortalLoginPayload(data) {
  const payload = typeof data === 'string' ? JSON.parse(data) : data;
  return {
    sessionToken: payload.session_token,
    miembroId: payload.miembro_id,
    memberName: memberDisplayName(payload),
    expiresAt: payload.expires_at,
  };
}

export function getStoredPortalSession() {
  try {
    const raw = localStorage.getItem(PORTAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.sessionToken) return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(PORTAL_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function storePortalSession(session) {
  if (!session?.sessionToken) {
    localStorage.removeItem(PORTAL_SESSION_KEY);
    return;
  }
  localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify({
    sessionToken: session.sessionToken,
    miembroId: session.miembroId,
    memberName: session.memberName,
    expiresAt: session.expiresAt,
  }));
}

export function clearPortalSession() {
  localStorage.removeItem(PORTAL_SESSION_KEY);
}

export function isValidPortalPin(pin) {
  return /^\d{4}$/.test(String(pin || '').trim());
}

export async function resolvePortalToken(token) {
  const { data, error } = await sb.rpc('member_portal_resolve_token', { p_token: token });
  if (error) return { data: null, error };
  const row = Array.isArray(data) ? data[0] : data;
  const hasPin = row?.has_pin === true;
  const needsPinSetup = row?.needs_pin_setup === true || !hasPin;
  const portalActivated = row?.portal_activated === true;
  return {
    data: row ? {
      miembroId: row.miembro_id,
      memberName: memberDisplayName(row),
      hasPin,
      needsPinSetup,
      needsPin: row?.needs_pin !== false,
      portalActivated,
    } : null,
    error: null,
  };
}

export async function loginPortal(token, pin) {
  const { data, error } = await sb.rpc('member_portal_login', {
    p_token: token,
    p_pin: pin,
  });
  if (error) return { data: null, error };
  return { data: parsePortalLoginPayload(data), error: null };
}

export async function loginPortalQr(token) {
  const { data, error } = await sb.rpc('member_portal_login_qr', { p_token: token });
  if (error) return { data: null, error };
  return { data: parsePortalLoginPayload(data), error: null };
}

export async function verifyPortalSession(sessionToken) {
  const { data, error } = await sb.rpc('member_portal_verify_session', {
    p_session_token: sessionToken,
  });
  if (error) return { data: null, error };
  return { data: data || null, error: null };
}

export async function fetchPortalProfile(sessionToken) {
  const { data, error } = await sb.rpc('member_portal_get_profile', {
    p_session_token: sessionToken,
  });
  if (error) return { data: null, error };
  const profile = typeof data === 'string' ? JSON.parse(data) : data;
  return { data: profile, error: null };
}

function parsePortalJsonPayload(data) {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
}

export async function fetchPortalTab(sessionToken, tab) {
  const { data, error } = await sb.rpc('member_portal_fetch_tab', {
    p_session_token: sessionToken,
    p_tab: tab,
  });
  if (error) return { data: null, error };
  return { data: parsePortalJsonPayload(data), error: null };
}

export async function requestPortalRequisitoApproval(sessionToken, assignmentId, claseRequisitoId, comentario = null) {
  return sb.rpc('member_portal_request_requisito_approval', {
    p_session_token: sessionToken,
    p_assignment_id: assignmentId,
    p_clase_requisito_id: claseRequisitoId,
    p_comentario: comentario,
  });
}

export async function requestPortalClaseApproval(sessionToken, assignmentId, comentario = null) {
  return sb.rpc('member_portal_request_clase_approval', {
    p_session_token: sessionToken,
    p_assignment_id: assignmentId,
    p_comentario: comentario,
  });
}

function isRpcSignatureMismatch(error) {
  const msg = String(error?.message || '');
  return msg.includes('Could not find the function')
    || msg.includes('does not exist')
    || msg.includes('PGRST202')
    || msg.includes('schema cache');
}

export function patchPortalEventRowConfirmation(rows, {
  eventoMiembroId = null,
  eventoId = null,
  confirmacionEstado,
  savedRow = null,
} = {}) {
  const savedAssignmentId = savedRow?.id ?? eventoMiembroId ?? null;
  const savedEventoId = savedRow?.evento_id ?? eventoId ?? null;
  const nextEstado = savedRow?.confirmacion_estado ?? confirmacionEstado;
  const nextConfirmadoAt = savedRow?.confirmado_at ?? (
    nextEstado === 'pendiente' ? null : new Date().toISOString()
  );

  return (rows || []).map(row => {
    const rowAssignmentId = getEventoMiembroRowId(row);
    const rowEventoId = getEventoIdFromRow(row);
    const matchesAssignment = savedAssignmentId && rowAssignmentId === savedAssignmentId;
    const matchesEvento = savedEventoId && rowEventoId === savedEventoId;
    if (!matchesAssignment && !matchesEvento) return row;

    return {
      ...row,
      id: savedAssignmentId ?? row.id,
      evento_id: savedEventoId ?? row.evento_id,
      confirmacion_estado: nextEstado,
      confirmado_at: nextConfirmadoAt,
    };
  });
}

export function patchPortalEventMapConfirmation(map, options) {
  const rows = Object.values(map || {});
  const patched = patchPortalEventRowConfirmation(rows, options);
  const nextMap = { ...(map || {}) };
  for (const row of patched) {
    const eventoId = getEventoIdFromRow(row);
    if (eventoId) nextMap[eventoId] = row;
  }
  return nextMap;
}

export async function setPortalEventConfirmation(
  sessionToken,
  confirmacionEstado,
  { eventoMiembroId = null, eventoId = null } = {}
) {
  if (!eventoMiembroId && !eventoId) {
    return { data: null, error: { message: 'event reference required' } };
  }

  const params = {
    p_session_token: sessionToken,
    p_confirmacion_estado: confirmacionEstado,
  };

  if (eventoMiembroId) {
    params.p_evento_miembro_id = eventoMiembroId;
  } else {
    params.p_evento_id = eventoId;
  }

  const result = await sb.rpc('member_portal_set_evento_confirmacion', params);

  if (!result.error || !eventoMiembroId || !isRpcSignatureMismatch(result.error)) {
    return result;
  }

  return sb.rpc('member_portal_set_evento_confirmacion', {
    p_session_token: sessionToken,
    p_evento_miembro_id: eventoMiembroId,
    p_confirmacion_estado: confirmacionEstado,
  });
}

export async function logoutPortal(sessionToken) {
  if (!sessionToken) {
    clearPortalSession();
    return { error: null };
  }
  const { error } = await sb.rpc('member_portal_logout', {
    p_session_token: sessionToken,
  });
  clearPortalSession();
  return { error };
}

export async function resetPortalPin(miembroId) {
  return sb.rpc('admin_reset_miembro_portal_pin', { p_miembro_id: miembroId });
}

export async function regenerateProfileToken(miembroId) {
  return sb.rpc('admin_regenerate_miembro_profile_token', { p_miembro_id: miembroId });
}

export async function getPortalStatus(miembroId) {
  const { data, error } = await sb.rpc('admin_get_miembro_portal_status', {
    p_miembro_id: miembroId,
  });
  if (error) return { data: null, error };

  const status = typeof data === 'string' ? JSON.parse(data) : data;
  return {
    data: {
      hasPin: Boolean(status?.has_pin),
      portalActivated: Boolean(status?.portal_activated),
    },
    error: null,
  };
}

export async function getPortalPinStatus(miembroId) {
  const { data, error } = await getPortalStatus(miembroId);
  if (error) return { data: false, error };
  return { data: Boolean(data?.hasPin), error: null };
}

export async function setPortalPin(miembroId, pin) {
  return sb.rpc('admin_set_miembro_portal_pin', {
    p_miembro_id: miembroId,
    p_pin: pin,
  });
}

export async function fetchPortalNoticias(sessionToken, { placements = ['dashboard'], limit = 20 } = {}) {
  const { data, error } = await sb.rpc('member_portal_fetch_noticias', {
    p_session_token: sessionToken,
    p_placements: placements,
    p_limit: limit,
  });
  if (error) return { data: [], error };
  return { data: data || [], error: null };
}

function normalizePortalEventRow(row) {
  if (!row || typeof row !== 'object') return row;

  const evento = getEventoFromRow(row);
  if (!evento) return row;

  const fecha = normalizeEventDate(evento.fecha);
  const hora = normalizeEventHora(evento.hora);
  const normalizedEvento = {
    ...evento,
    fecha: fecha || null,
    hora,
  };

  if (row.eventos) {
    return { ...row, eventos: normalizedEvento };
  }

  return normalizedEvento;
}

function normalizePortalEventRows(rows) {
  return (rows || []).map(normalizePortalEventRow);
}

export async function fetchPortalEvents(sessionToken) {
  const { data, error } = await sb.rpc('member_portal_fetch_events', {
    p_session_token: sessionToken,
  });
  if (error) return { data: [], error };
  return { data: normalizePortalEventRows(parsePortalJsonRows(data)), error: null };
}

function parsePortalJsonRows(data) {
  let payload = data;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return [];
    }
  }
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') return [payload];
  return [];
}

function normalizePortalCalendarEvent(event) {
  if (!event || typeof event !== 'object') return null;

  const fecha = normalizeEventDate(event.fecha);
  if (!fecha) return null;

  return {
    ...event,
    fecha,
    hora: normalizeEventHora(event.hora),
  };
}

function normalizePortalCalendarEvents(rows) {
  return (rows || [])
    .map(row => normalizePortalCalendarEvent(row))
    .filter(Boolean);
}

function filterPortalEventsByClubAndRange(rows, clubId, startDate, endDate) {
  return normalizePortalCalendarEvents(
    (rows || [])
      .map(row => getEventoFromRow(row))
      .filter(Boolean)
      .filter(event => event.club_id === clubId)
      .filter(event => {
        const fecha = normalizeEventDate(event.fecha);
        return fecha && fecha >= startDate && fecha <= endDate;
      })
  );
}

export async function fetchPortalCalendarEvents(sessionToken, clubId, startDate, endDate) {
  const start = normalizeEventDate(startDate);
  const end = normalizeEventDate(endDate);

  if (!sessionToken || !clubId) {
    return { data: [], error: null };
  }

  if (!isValidDateKey(start) || !isValidDateKey(end)) {
    return {
      data: [],
      error: { message: 'Invalid calendar date range' },
    };
  }

  const { data, error } = await sb.rpc('member_portal_fetch_calendar_events', {
    p_session_token: sessionToken,
    p_club_id: clubId,
    p_start_date: start,
    p_end_date: end,
  });

  if (!error) {
    const rows = parsePortalJsonRows(data);
    return { data: normalizePortalCalendarEvents(rows), error: null };
  }

  const { data: memberRows, error: memberError } = await fetchPortalEvents(sessionToken);
  if (memberError) {
    return { data: [], error };
  }

  const fallbackEvents = filterPortalEventsByClubAndRange(
    parsePortalJsonRows(memberRows),
    clubId,
    start,
    end
  );

  if (fallbackEvents.length) {
    return {
      data: fallbackEvents,
      error: null,
      warning: error.message,
    };
  }

  return { data: [], error };
}
