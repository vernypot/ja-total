export const UI_THEMES = [
  {
    id: 'default',
    labelKey: 'uiThemeDefault',
    hintKey: 'uiThemeDefaultHint',
    icon: '🎨',
  },
  {
    id: 'clear',
    labelKey: 'uiThemeClear',
    hintKey: 'uiThemeClearHint',
    icon: '◻️',
  },
  {
    id: 'dark',
    labelKey: 'uiThemeDark',
    hintKey: 'uiThemeDarkHint',
    icon: '🌙',
  },
];

export const DEFAULT_UI_THEME = 'default';

export const UI_THEME_IDS = UI_THEMES.map(t => t.id);

export function normalizeUiTheme(value) {
  return UI_THEME_IDS.includes(value) ? value : DEFAULT_UI_THEME;
}

/** Clear & dark themes share Blix layout, icons, and mobile shell */
export function isBlixLayoutTheme(theme) {
  return theme === 'clear' || theme === 'dark';
}
