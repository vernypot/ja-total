import { useEffect, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { usePageHelp } from '../context/PageHelpContext';
import { getDefaultPageHelpContent } from '../i18n/pageHelpContent';
import PageHelpEditorForm from './PageHelpEditorForm';
import '../styles/pageHelp.css';

function HelpSection({ title, children }) {
  if (!children) return null;
  return (
    <section className="page-help-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function PageHelpDialog({ pageId, onClose }) {
  const { language, t } = useLanguage();
  const {
    getContent,
    hasOverride,
    canEditHelp,
    saveContent,
    resetContent,
    tableMissing,
  } = usePageHelp();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  const content = getContent(pageId, language);
  const isCustom = hasOverride(pageId, language);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape' && !editing) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, editing]);

  if (!content) return null;

  async function handleSave(nextContent) {
    setSaving(true);
    setError('');
    const { error: saveError } = await saveContent(pageId, language, nextContent);
    setSaving(false);
    if (saveError) {
      setError(saveError.message || t('pageHelpSaveError'));
      return;
    }
    setEditing(false);
  }

  async function handleReset() {
    if (!window.confirm(t('pageHelpResetConfirm'))) return;
    setResetting(true);
    setError('');
    const { error: resetError } = await resetContent(pageId, language);
    setResetting(false);
    if (resetError) {
      setError(resetError.message || t('pageHelpSaveError'));
      return;
    }
    setEditing(false);
  }

  return (
    <div
      className="page-help-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`page-help-title-${pageId}`}
      onClick={() => { if (!editing) onClose(); }}
    >
      <div className="page-help-dialog" onClick={e => e.stopPropagation()}>
        <div className="page-help-dialog-head">
          <div className="page-help-dialog-title-wrap">
            <h2 id={`page-help-title-${pageId}`}>
              {editing ? t('pageHelpEditTitle') : content.title}
            </h2>
            {canEditHelp && isCustom && !editing && (
              <span className="page-help-custom-badge">{t('pageHelpCustomized')}</span>
            )}
          </div>
          <div className="page-help-dialog-actions">
            {canEditHelp && !editing && (
              <button
                type="button"
                className="page-help-edit-btn"
                onClick={() => setEditing(true)}
              >
                {t('pageHelpEdit')}
              </button>
            )}
            {canEditHelp && editing && (
              <button
                type="button"
                className="page-help-cancel-btn"
                onClick={() => setEditing(false)}
              >
                {t('cancel')}
              </button>
            )}
            <button type="button" className="page-help-close" onClick={onClose}>
              {t('pageHelpClose')}
            </button>
          </div>
        </div>
        <div className="page-help-body">
          {tableMissing && canEditHelp && (
            <div className="alert alert-warning" style={{ marginBottom: '12px' }}>
              {t('pageHelpTableMissing')}
            </div>
          )}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '12px' }}>
              {error}
            </div>
          )}

          {editing ? (
            <PageHelpEditorForm
              initialContent={content}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
              onReset={isCustom ? handleReset : null}
              canReset={isCustom}
              saving={saving}
              resetting={resetting}
              t={t}
            />
          ) : (
            <>
              <HelpSection title={t('pageHelpOverview')}>
                <p>{content.overview}</p>
              </HelpSection>

              {content.steps?.length > 0 && (
                <HelpSection title={t('pageHelpSteps')}>
                  <ol className="page-help-list">
                    {content.steps.map(step => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </HelpSection>
              )}

              {content.fields?.length > 0 && (
                <HelpSection title={t('pageHelpFields')}>
                  <div className="page-help-fields">
                    {content.fields.map(field => (
                      <div key={field.name} className="page-help-field">
                        <strong>{field.name}</strong>
                        <span>{field.description}</span>
                      </div>
                    ))}
                  </div>
                </HelpSection>
              )}

              {content.tips?.length > 0 && (
                <HelpSection title={t('pageHelpTips')}>
                  <ul className="page-help-list">
                    {content.tips.map(tip => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </HelpSection>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function PageHelpLink({ pageId, compact = false, className = '' }) {
  const { t } = useLanguage();
  const { getContent } = usePageHelp();
  const [open, setOpen] = useState(false);

  if (!getContent(pageId, 'es') && !getDefaultPageHelpContent(pageId, 'es')) return null;

  return (
    <>
      <button
        type="button"
        className={`page-help-link${compact ? ' page-help-link--compact' : ''} ${className}`.trim()}
        onClick={() => setOpen(true)}
        aria-label={t('pageHelpLink')}
        title={t('pageHelpLink')}
      >
        ❓ {t('pageHelpLink')}
      </button>
      {open && <PageHelpDialog pageId={pageId} onClose={() => setOpen(false)} />}
    </>
  );
}

export default PageHelpLink;
