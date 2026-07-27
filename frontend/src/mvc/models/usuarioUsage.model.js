import { sb } from '../../services/supabase';

const SESSION_STORAGE_KEY = 'teofila_staff_app_session_id';

function parseRpcJson(data) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return Array.isArray(data) ? data : (data || []);
}

function isMissingRpc(error, rpcName) {
  const msg = error?.message || '';
  return msg.includes(rpcName) || msg.includes('does not exist');
}

export function getStoredStaffSessionId() {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeStaffSessionId(sessionId) {
  try {
    if (sessionId) sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    else sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function startStaffAppSession() {
  const rpc = await sb.rpc('record_usuario_app_session_start', {
    p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  });

  if (!rpc.error) {
    storeStaffSessionId(rpc.data);
    return { data: rpc.data, error: null };
  }

  if (isMissingRpc(rpc.error, 'record_usuario_app_session_start')) {
    return {
      data: null,
      error: { message: 'Run USUARIO_APP_USAGE.sql in Supabase to enable usage tracking.' },
    };
  }

  return rpc;
}

export async function recordStaffAppHeartbeat(sessionId) {
  if (!sessionId) return { data: false, error: null };

  const rpc = await sb.rpc('record_usuario_app_heartbeat', { p_session_id: sessionId });
  if (!rpc.error) return rpc;

  if (isMissingRpc(rpc.error, 'record_usuario_app_heartbeat')) {
    return { data: false, error: null };
  }

  return rpc;
}

export async function endStaffAppSession(sessionId) {
  if (!sessionId) return { data: false, error: null };

  const rpc = await sb.rpc('record_usuario_app_session_end', { p_session_id: sessionId });
  storeStaffSessionId(null);

  if (!rpc.error) return rpc;
  if (isMissingRpc(rpc.error, 'record_usuario_app_session_end')) {
    return { data: false, error: null };
  }

  return rpc;
}

export async function fetchStaffUsageStats(days = 30) {
  const rpc = await sb.rpc('admin_list_usuario_usage_stats', { p_days: days });

  if (!rpc.error) {
    return { data: parseRpcJson(rpc.data), error: null };
  }

  if (isMissingRpc(rpc.error, 'admin_list_usuario_usage_stats')) {
    return {
      data: [],
      error: { message: 'Run USUARIO_APP_USAGE.sql in Supabase to enable usage stats.' },
    };
  }

  return { data: [], error: rpc.error };
}

export async function fetchMemberPortalUsageStats(days = 30) {
  const rpc = await sb.rpc('admin_list_miembro_portal_usage_stats', { p_days: days });

  if (!rpc.error) {
    return { data: parseRpcJson(rpc.data), error: null };
  }

  if (isMissingRpc(rpc.error, 'admin_list_miembro_portal_usage_stats')) {
    return {
      data: [],
      error: { message: 'Run USUARIO_APP_USAGE.sql in Supabase to enable usage stats.' },
    };
  }

  return { data: [], error: rpc.error };
}

export function formatUsageDuration(totalSeconds, t) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  if (seconds < 60) {
    return t('usageDurationSeconds').replace('{count}', String(seconds));
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return t('usageDurationMinutes').replace('{count}', String(minutes));
  }

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (remMinutes === 0) {
    return t('usageDurationHours').replace('{count}', String(hours));
  }

  return t('usageDurationHoursMinutes')
    .replace('{hours}', String(hours))
    .replace('{minutes}', String(remMinutes));
}

export function formatUsageTimestamp(iso, language) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleString(language);
}

export function staffDisplayName(row) {
  return [row?.nombre, row?.apellido1, row?.apellido2].filter(Boolean).join(' ') || row?.email || '—';
}

export function memberDisplayName(row) {
  return [row?.nombre, row?.apellido1, row?.apellido2].filter(Boolean).join(' ') || '—';
}
