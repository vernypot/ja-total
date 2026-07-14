import { UI_THEME_IDS } from './uiThemes';

/** Editable color tokens per appearance theme */
export const THEME_COLOR_FIELDS = [
  { key: 'primary', cssVars: ['--brand-primary', '--primary'], labelKey: 'themeColorPrimary', blixVars: ['--blix-primary-lighter', '--blix-primary'] },
  { key: 'primaryDark', cssVars: ['--brand-primary-dark', '--primary-dark'], labelKey: 'themeColorPrimaryDark', blixVars: ['--blix-primary-dark'] },
  { key: 'accent', cssVars: ['--brand-turquoise', '--gradient-brand'], labelKey: 'themeColorAccent', blixVars: ['--blix-accent', '--gradient-brand'] },
  { key: 'background', cssVars: ['--brand-bg', '--gray-50'], labelKey: 'themeColorBackground', blixVars: ['--blix-chrome'] },
  { key: 'surface', cssVars: ['--brand-base', '--white'], labelKey: 'themeColorSurface', blixVars: ['--blix-chrome-elevated', '--blix-surface'] },
  { key: 'textPrimary', cssVars: ['--color-text-primary', '--brand-neutral'], labelKey: 'themeColorTextPrimary', blixVars: ['--blix-text'] },
  { key: 'textSecondary', cssVars: ['--color-text-secondary'], labelKey: 'themeColorTextSecondary', blixVars: ['--blix-link'] },
  { key: 'sidebar', cssVars: ['--gradient-sidebar'], labelKey: 'themeColorSidebar', blixVars: ['--gradient-sidebar'], asGradient: true },
  { key: 'header', cssVars: ['--theme-header-bg'], labelKey: 'themeColorHeader', blixVars: ['--blix-chrome'], mapsToTopbar: true },
  { key: 'border', cssVars: ['--gray-200'], labelKey: 'themeColorBorder', blixVars: ['--blix-border'] },
  { key: 'link', cssVars: ['--color-link', '--brand-trust'], labelKey: 'themeColorLink', blixVars: ['--blix-primary-lighter'] },
];

export const THEME_COLOR_DEFAULTS = {
  default: {
    primary: '#0f766e',
    primaryDark: '#0d5e58',
    accent: '#14b8a6',
    background: '#e7edf2',
    surface: '#ffffff',
    textPrimary: '#0d1b2a',
    textSecondary: '#334155',
    sidebar: '#0d1b2a',
    header: '#ffffff',
    border: '#cdd6de',
    link: '#0d5e58',
  },
  clear: {
    primary: '#445cfd',
    primaryDark: '#4155db',
    accent: '#0be0af',
    background: '#ffffff',
    surface: '#ffffff',
    textPrimary: '#232323',
    textSecondary: '#484848',
    sidebar: '#445cfd',
    header: '#445cfd',
    border: '#e6e6e6',
    link: '#445cfd',
  },
  dark: {
    primary: '#7586fe',
    primaryDark: '#556afb',
    accent: '#0be0af',
    background: '#0f172a',
    surface: '#1e293b',
    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1',
    sidebar: '#0f172a',
    header: '#0f172a',
    border: '#334155',
    link: '#7586fe',
  },
};

export const EMPTY_THEME_COLOR_OVERRIDES = Object.fromEntries(
  UI_THEME_IDS.map(id => [id, {}])
);

export function isValidHexColor(value) {
  if (!value || typeof value !== 'string') return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

export function normalizeThemeColorOverrides(raw) {
  const result = { ...EMPTY_THEME_COLOR_OVERRIDES };

  if (!raw || typeof raw !== 'object') return result;

  for (const themeId of UI_THEME_IDS) {
    const themeRaw = raw[themeId];
    if (!themeRaw || typeof themeRaw !== 'object') continue;

    const cleaned = {};
    for (const field of THEME_COLOR_FIELDS) {
      const value = themeRaw[field.key];
      if (isValidHexColor(value)) {
        cleaned[field.key] = value.trim().toLowerCase();
      }
    }
    result[themeId] = cleaned;
  }

  return result;
}

export function mergeThemeColorValues(themeId, overrides = {}) {
  return {
    ...THEME_COLOR_DEFAULTS[themeId],
    ...overrides,
  };
}
