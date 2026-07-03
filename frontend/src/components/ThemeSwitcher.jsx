import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { UI_THEMES } from '../constants/uiThemes';
import '../styles/theme-switcher.css';

export default function ThemeSwitcher({ variant = 'cards', showHint = true }) {
  const { t } = useLanguage();
  const { theme, setTheme, saving, error } = useTheme();

  if (variant === 'compact') {
    return (
      <div className="theme-switcher theme-switcher--compact" role="group" aria-label={t('uiThemeTitle')}>
        {UI_THEMES.map(option => (
          <button
            key={option.id}
            type="button"
            className={`theme-switcher-btn${theme === option.id ? ' is-active' : ''}`}
            onClick={() => setTheme(option.id)}
            disabled={saving}
            title={t(option.labelKey)}
            aria-pressed={theme === option.id}
          >
            <span aria-hidden="true">{option.icon}</span>
            <span className="theme-switcher-btn-label">{t(option.labelKey)}</span>
          </button>
        ))}
        {error && <span className="theme-switcher-error">{error}</span>}
      </div>
    );
  }

  return (
    <div className="theme-switcher">
      <div className="theme-switcher-head">
        <h3 style={{ margin: 0 }}>{t('uiThemeTitle')}</h3>
        {showHint && <p className="theme-switcher-hint">{t('uiThemeHint')}</p>}
      </div>
      <div className="theme-switcher-grid" role="radiogroup" aria-label={t('uiThemeTitle')}>
        {UI_THEMES.map(option => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={theme === option.id}
            className={`theme-switcher-card${theme === option.id ? ' is-selected' : ''}`}
            onClick={() => setTheme(option.id)}
            disabled={saving}
          >
            <span className="theme-switcher-card-icon" aria-hidden="true">{option.icon}</span>
            <strong className="theme-switcher-card-title">{t(option.labelKey)}</strong>
            <span className="theme-switcher-card-desc">{t(option.hintKey)}</span>
          </button>
        ))}
      </div>
      {saving && <p className="theme-switcher-status">{t('uiThemeSaving')}</p>}
      {error && <p className="theme-switcher-error">{error}</p>}
    </div>
  );
}
