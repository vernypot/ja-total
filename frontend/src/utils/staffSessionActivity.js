export const STAFF_SESSION_INACTIVITY_MS = 30 * 60 * 1000;

export const STAFF_LAST_ACTIVITY_KEY = 'teofila_staff_last_activity_at';

export function getStaffLastActivityAt() {
  try {
    const raw = localStorage.getItem(STAFF_LAST_ACTIVITY_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : Date.now();
  } catch {
    return Date.now();
  }
}

export function touchStaffActivity(at = Date.now()) {
  try {
    localStorage.setItem(STAFF_LAST_ACTIVITY_KEY, String(at));
  } catch {
    /* ignore storage errors */
  }
}

export function clearStaffActivity() {
  try {
    localStorage.removeItem(STAFF_LAST_ACTIVITY_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export function isStaffSessionIdle(at = Date.now()) {
  return at - getStaffLastActivityAt() >= STAFF_SESSION_INACTIVITY_MS;
}
