import { DEFAULT_UI_THEME, normalizeUiTheme } from '../constants/uiThemes';

const STORAGE_KEY = 'teofila-ui-theme';
const STORAGE_USER_PREFIX = 'teofila-ui-theme:user:';

export function applyUiTheme(themeId) {
  const theme = normalizeUiTheme(themeId);
  const root = document.documentElement;

  if (theme === DEFAULT_UI_THEME) {
    root.removeAttribute('data-ui-theme');
  } else {
    root.setAttribute('data-ui-theme', theme);
  }

  root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#0f172a' : theme === 'clear' ? '#ffffff' : '#0f766e');
  }
}

export function readCachedUiTheme(userId) {
  if (userId) {
    try {
      const perUser = localStorage.getItem(`${STORAGE_USER_PREFIX}${userId}`);
      if (perUser) return normalizeUiTheme(perUser);
    } catch {
      /* ignore */
    }
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return normalizeUiTheme(cached);
  } catch {
    /* ignore */
  }

  return DEFAULT_UI_THEME;
}

export function cacheUiTheme(themeId, userId) {
  const theme = normalizeUiTheme(themeId);

  try {
    localStorage.setItem(STORAGE_KEY, theme);
    if (userId) {
      localStorage.setItem(`${STORAGE_USER_PREFIX}${userId}`, theme);
    }
  } catch {
    /* ignore */
  }
}

export function clearCachedUiTheme(userId) {
  try {
    if (userId) {
      localStorage.removeItem(`${STORAGE_USER_PREFIX}${userId}`);
    }
    localStorage.setItem(STORAGE_KEY, DEFAULT_UI_THEME);
  } catch {
    /* ignore */
  }
}
