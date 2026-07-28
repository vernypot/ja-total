export const LOGIN_ENTRY_KEY = 'teofila_dashboard_login_entry';
export const VIEW_MODE_KEY = 'teofila_dashboard_view_mode';

export const VIEW_MODES = {
  MEMBER: 'member',
  ADMIN: 'admin',
};

export const LOGIN_ENTRIES = {
  PORTAL: 'portal',
  STAFF: 'staff',
};

export function getStoredLoginEntry() {
  try {
    const value = sessionStorage.getItem(LOGIN_ENTRY_KEY);
    return value === LOGIN_ENTRIES.PORTAL || value === LOGIN_ENTRIES.STAFF ? value : null;
  } catch {
    return null;
  }
}

export function setStoredLoginEntry(entry) {
  try {
    if (entry) sessionStorage.setItem(LOGIN_ENTRY_KEY, entry);
    else sessionStorage.removeItem(LOGIN_ENTRY_KEY);
  } catch {
    // ignore storage errors
  }
}

export function getStoredViewMode() {
  try {
    const value = sessionStorage.getItem(VIEW_MODE_KEY);
    return value === VIEW_MODES.MEMBER || value === VIEW_MODES.ADMIN ? value : null;
  } catch {
    return null;
  }
}

export function setStoredViewMode(mode) {
  try {
    sessionStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // ignore storage errors
  }
}

export function clearStoredDashboardViewMode() {
  try {
    sessionStorage.removeItem(VIEW_MODE_KEY);
    sessionStorage.removeItem(LOGIN_ENTRY_KEY);
  } catch {
    // ignore storage errors
  }
}

export function getDefaultViewMode(loginEntry) {
  return loginEntry === LOGIN_ENTRIES.STAFF ? VIEW_MODES.ADMIN : VIEW_MODES.MEMBER;
}

export function resolveInitialViewMode({ isStaff, isPortalSession }) {
  const stored = getStoredViewMode();
  if (stored) return stored;

  const loginEntry = getStoredLoginEntry();
  if (loginEntry) return getDefaultViewMode(loginEntry);

  if (isPortalSession && !isStaff) return VIEW_MODES.MEMBER;
  if (isStaff) return VIEW_MODES.ADMIN;
  return VIEW_MODES.MEMBER;
}
