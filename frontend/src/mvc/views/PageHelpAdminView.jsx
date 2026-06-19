import { useLanguage } from '../../hooks/useLanguage';
import PageHelpEditorForm from '../../components/PageHelpEditorForm';
import '../../styles/form.css';

export default function PageHelpAdminView({
  pages,
  selectedPageId,
  setSelectedPageId,
  editLanguage,
  setEditLanguage,
  selectedContent,
  isCustom,
  saving,
  resetting,
  error,
  message,
  tableMissing,
  handleSave,
  handleReset,
  reload,
}) {
  const { t } = useLanguage();

  const selectedPage = pages.find(page => page.id === selectedPageId);
  const pageLabel = editLanguage === 'en'
    ? selectedPage?.labelEn
    : selectedPage?.labelEs;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>❓ {t('pageHelpAdminTitle')}</h1>
          <p style={{ margin: '8px 0 0', color: '#666', fontSize: '14px' }}>
            {t('pageHelpAdminHint')}
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          ↻ {t('pageHelpRefresh')}
        </button>
      </div>

      <div className="card" style={{ padding: '16px' }}>
        {tableMissing && (
          <div className="alert alert-warning" style={{ marginBottom: '12px' }}>
            {t('pageHelpTableMissing')}
          </div>
        )}
        {error && <div className="alert alert-error" style={{ marginBottom: '12px' }}>{error}</div>}
        {message === 'saved' && (
          <div className="alert" style={{ marginBottom: '12px', background: '#dcfce7', color: '#166534' }}>
            {t('pageHelpSaved')}
          </div>
        )}
        {message === 'reset' && (
          <div className="alert" style={{ marginBottom: '12px', background: '#eff6ff', color: '#1d4ed8' }}>
            {t('pageHelpResetDone')}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              {t('pageHelpSelectPage')}
            </label>
            <select
              value={selectedPageId}
              onChange={e => setSelectedPageId(e.target.value)}
              className="form-input"
              style={{ width: '100%', marginBottom: '12px' }}
            >
              {pages.map(page => (
                <option key={page.id} value={page.id}>
                  {editLanguage === 'en' ? page.labelEn : page.labelEs} ({page.id})
                </option>
              ))}
            </select>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              {t('pageHelpAdminLanguage')}
            </label>
            <select
              value={editLanguage}
              onChange={e => setEditLanguage(e.target.value)}
              className="form-input"
              style={{ width: '100%' }}
            >
              <option value="es">{t('spanish')}</option>
              <option value="en">{t('english')}</option>
            </select>

            {isCustom && (
              <p style={{ marginTop: '12px', fontSize: '12px', color: '#1d4ed8' }}>
                {t('pageHelpCustomized')}
              </p>
            )}
          </div>

          <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '16px' }}>
            {selectedContent ? (
              <>
                <h3 style={{ marginTop: 0 }}>{pageLabel || selectedPageId}</h3>
                <PageHelpEditorForm
                  key={`${selectedPageId}-${editLanguage}-${isCustom ? 'custom' : 'default'}`}
                  initialContent={selectedContent}
                  onSave={handleSave}
                  onReset={isCustom ? handleReset : null}
                  canReset={isCustom}
                  saving={saving}
                  resetting={resetting}
                  t={t}
                />
              </>
            ) : (
              <p className="text-muted">{t('pageHelpNoContent')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
