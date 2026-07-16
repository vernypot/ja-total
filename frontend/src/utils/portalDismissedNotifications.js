const STORAGE_KEY = 'portalDismissedNotifications';

const EMPTY = {
  classUpdates: [],
  announcements: [],
};

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getPortalDismissedNotifications(miembroId) {
  if (!miembroId) return { ...EMPTY };
  const stored = readAll()[miembroId];
  return {
    classUpdates: stored?.classUpdates || [],
    announcements: stored?.announcements || [],
  };
}

export function dismissPortalNotification(miembroId, category, id) {
  if (!miembroId || !id) return getPortalDismissedNotifications(miembroId);

  const all = readAll();
  const current = all[miembroId] || { ...EMPTY };
  const list = current[category] || [];
  if (!list.includes(id)) {
    current[category] = [...list, id];
  }
  all[miembroId] = current;
  writeAll(all);
  return getPortalDismissedNotifications(miembroId);
}

export function dismissAllPortalNotifications(miembroId, category) {
  if (!miembroId || !category) return getPortalDismissedNotifications(miembroId);

  const all = readAll();
  const current = all[miembroId] || { ...EMPTY };
  current[category] = ['*'];
  all[miembroId] = current;
  writeAll(all);
  return getPortalDismissedNotifications(miembroId);
}

export function isPortalNotificationDismissed(dismissed, category, id) {
  const list = dismissed?.[category] || [];
  if (list.includes('*')) return true;
  return list.includes(id);
}
