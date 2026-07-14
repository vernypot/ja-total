import { useLanguage } from '../hooks/useLanguage';

export default function ThemeColorOverridesPanel({
  themes,
  activeThemeId,
  setActiveThemeId,
  fields,
  defaults,
  mergedValues,
  draft,
  loading,
  saving,
  error,
  success,
  missingTable,
  handleFieldChange,
  handleResetField,
  handleSave,
  handleResetTheme,
  handlePreview,
}) {
  const { t } = useLanguage();

  if (loading) {
    return <div className="loading">{t('themeColorOverridesLoading')}</div>;
  }

  return (
    <div className="theme-color-overrides">
      <div className="theme-color-overrides__head">
        <div>
          <h2>{t('themeColorOverridesTitle')}</h2>
          <p className="text-muted">{t('themeColorOverridesHint')}</p>
        </div>
        <div className="theme-color-overrides__actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={handlePreview} disabled={saving}>
            {t('themeColorOverridesPreview')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetTheme} disabled={saving}>
            {t('themeColorOverridesResetTheme')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? t('themeColorOverridesSaving') : t('save')}
          </button>
        </div>
      </div>

      {missingTable && (
        <div className="alert alert-error">{t('themeColorOverridesMissingTable')}</div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {success === 'saved' && <div className="alert alert-success">{t('themeColorOverridesSaved')}</div>}
      {success === 'reset' && <div className="alert alert-success">{t('themeColorOverridesResetDone')}</div>}

      <div className="theme-color-overrides__tabs" role="tablist" aria-label={t('themeColorOverridesTitle')}>
        {themes.map(theme => (
          <button
            key={theme.id}
            type="button"
            role="tab"
            aria-selected={activeThemeId === theme.id}
            className={`theme-color-overrides__tab${activeThemeId === theme.id ? ' is-active' : ''}`}
            onClick={() => setActiveThemeId(theme.id)}
          >
            <span aria-hidden="true">{theme.icon}</span> {t(theme.labelKey)}
          </button>
        ))}
      </div>

      <div className="theme-color-overrides__grid">
        {fields.map(field => {
          const defaultValue = defaults[field.key];
          const currentValue = mergedValues[field.key];
          const isOverridden = Boolean(draft[field.key]);

          return (
            <div key={field.key} className="theme-color-overrides__field">
              <label htmlFor={`theme-color-${activeThemeId}-${field.key}`}>
                {t(field.labelKey)}
              </label>
              <div className="theme-color-overrides__field-row">
                <input
                  id={`theme-color-${activeThemeId}-${field.key}`}
                  type="color"
                  value={currentValue}
                  onChange={e => handleFieldChange(field.key, e.target.value)}
                  aria-label={t(field.labelKey)}
                />
                <input
                  type="text"
                  className="form-input theme-color-overrides__hex"
                  value={currentValue}
                  onChange={e => {
                    const v = e.target.value.trim();
                    if (/^#([0-9a-fA-F]{0,6})$/.test(v)) {
                      if (v.length === 4 || v.length === 7) handleFieldChange(field.key, v);
                    }
                  }}
                  placeholder={defaultValue}
                />
                {isOverridden && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleResetField(field.key)}
                    title={t('themeColorOverridesUseDefault')}
                  >
                    ↺
                  </button>
                )}
              </div>
              <span className="theme-color-overrides__default text-muted">
                {t('themeColorOverridesDefault')}: {defaultValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
