import {
  EMPTY_THEME_COLOR_OVERRIDES,
  normalizeThemeColorOverrides,
  THEME_COLOR_FIELDS,
} from '../constants/uiThemeColors';
import { UI_THEME_IDS } from '../constants/uiThemes';

const STYLE_ID = 'teofila-theme-color-overrides';

function themeSelector(themeId) {
  return themeId === 'default' ? 'html:not([data-ui-theme])' : `html[data-ui-theme='${themeId}']`;
}

function solidGradient(color) {
  return `linear-gradient(180deg, ${color} 0%, ${color} 100%)`;
}

function appendVars(lines, cssVars, value, { asGradient = false } = {}) {
  const resolved = asGradient ? solidGradient(value) : value;
  for (const cssVar of cssVars) {
    lines.push(`${cssVar}: ${resolved};`);
  }
}

function buildThemeRule(themeId, overrides) {
  if (!overrides || !Object.keys(overrides).length) return '';

  const lines = [];

  for (const field of THEME_COLOR_FIELDS) {
    const value = overrides[field.key];
    if (!isValidOverrideValue(value)) continue;

    appendVars(lines, field.cssVars, value, { asGradient: field.asGradient });

    if (themeId !== 'default' && field.blixVars) {
      appendVars(lines, field.blixVars, value, { asGradient: field.asGradient });
    }
  }

  if (overrides.header) {
    lines.push(`--theme-header-bg: ${overrides.header};`);
  }

  if (!lines.length) return '';

  const selector = themeSelector(themeId);
  const extra = [];

  if (overrides.header) {
    extra.push(`${selector} .topbar { background: ${overrides.header}; }`);
    extra.push(`${selector} .topbar--portal { background: ${overrides.header}; }`);
  }

  if (overrides.sidebar && themeId !== 'default') {
    extra.push(`${selector} .sidebar { background: ${overrides.sidebar}; }`);
    if (themeId === 'clear' || themeId === 'dark') {
      extra.push(`${selector} .layout .sidebar { background: ${overrides.sidebar}; }`);
    }
  }

  return `${selector} { ${lines.join(' ')} }\n${extra.join('\n')}`;
}

function isValidOverrideValue(value) {
  return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

export function buildThemeColorOverrideCss(overridesByTheme) {
  return UI_THEME_IDS
    .map(themeId => buildThemeRule(themeId, overridesByTheme[themeId]))
    .filter(Boolean)
    .join('\n');
}

let cachedOverrides = { ...EMPTY_THEME_COLOR_OVERRIDES };

export function getCachedThemeColorOverrides() {
  return cachedOverrides;
}

export function applyThemeColorOverrides(overridesByTheme) {
  cachedOverrides = normalizeThemeColorOverrides(overridesByTheme);

  let styleEl = document.getElementById(STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = buildThemeColorOverrideCss(cachedOverrides);
}

export function clearThemeColorOverrideStyles() {
  const styleEl = document.getElementById(STYLE_ID);
  if (styleEl) styleEl.textContent = '';
  cachedOverrides = { ...EMPTY_THEME_COLOR_OVERRIDES };
}
