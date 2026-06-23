import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import ListSearchInput from '../../components/ListSearchInput';
import NoticiaHtml from '../../components/NoticiaHtml';
import NoticiaHtmlEditor from '../../components/NoticiaHtmlEditor';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';

export default function NoticiasView({
  effectiveIglesiaId,
  iglesiaNombre,
  items,
  showForm,
  showInactive,
  setShowInactive,
  editingId,
  form,
  setForm,
  searchQuery,
  setSearchQuery,
  loading,
  saving,
  error,
  canManage,
  openCreateForm,
  closeForm,
  startEdit,
  save,
  toggleEstado,
  remove,
  formatDate,
}) {
  const { t } = useLanguage();

  if (!effectiveIglesiaId) {
    return (
      <div className="container">
        <div className="alert" style={{ backgroundColor: '#fef3c7', color: '#854d0e' }}>
          {t('homeSelectChurch')}
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="container">
        <div className="alert alert-error">{t('noticiasNoPermission')}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>📰 {t('noticiasTitle')} <PageHelpLink pageId="news" /></h1>
          {iglesiaNombre && (
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
              {t('churchLabel')}: <strong>{iglesiaNombre}</strong>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={showForm ? closeForm : openCreateForm}
          style={{
            padding: '10px 15px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {showForm ? `✕ ${t('cancel')}` : `➕ ${t('noticiasNew')}`}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? t('noticiasEdit') : t('noticiasNew')}</h3>
          <div style={{ display: 'grid', gap: '16px', maxWidth: '900px' }}>
            <NoticiaHtmlEditor
              label={t('noticiasFieldTitle')}
              hint={t('noticiasEditorHintTitle')}
              value={form.titulo}
              onChange={value => setForm(f => ({ ...f, titulo: value }))}
              variant="title"
              editorKey={`titulo-${editingId || 'new'}`}
            />
            <NoticiaHtmlEditor
              label={t('noticiasFieldSummary')}
              hint={t('noticiasEditorHintSummary')}
              value={form.resumen}
              onChange={value => setForm(f => ({ ...f, resumen: value }))}
              variant="summary"
              editorKey={`resumen-${editingId || 'new'}`}
            />
            <NoticiaHtmlEditor
              label={t('noticiasFieldContent')}
              hint={t('noticiasEditorHintContent')}
              value={form.contenido}
              onChange={value => setForm(f => ({ ...f, contenido: value }))}
              variant="content"
              editorKey={`contenido-${editingId || 'new'}`}
            />
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 'bold' }}>{t('noticiasFieldDate')}</span>
                <input
                  type="date"
                  className="form-input"
                  value={form.publicado_en}
                  onChange={e => setForm(f => ({ ...f, publicado_en: e.target.value }))}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 'bold' }}>{t('status')}</span>
                <select
                  className="form-input"
                  value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                >
                  <option value="activo">{estadoLabel('activo', t)}</option>
                  <option value="inactivo">{estadoLabel('inactivo', t)}</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {saving ? t('saving') : t('save')}
              </button>
              <button type="button" onClick={closeForm} className="form-input" style={{ width: 'auto' }}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            {t('showInactive')}
          </label>
          <ListSearchInput value={searchQuery} onChange={setSearchQuery} />
        </div>

        {loading ? (
          <p>{t('loading')}</p>
        ) : !items.length ? (
          <p>{t('noticiasEmpty')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map(item => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '14px',
                  backgroundColor: item.estado === 'activo' ? '#fff' : '#f9fafb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                      {formatDate(item.publicado_en)} · {estadoLabel(item.estado, t)}
                    </div>
                    <NoticiaHtml
                      html={item.titulo}
                      variant="title"
                      as="strong"
                      className="noticia-html--title"
                      style={{ fontSize: '16px', display: 'block' }}
                    />
                    {item.resumen && (
                      <NoticiaHtml
                        html={item.resumen}
                        variant="summary"
                        className="noticia-html--summary"
                        style={{ margin: '6px 0 0' }}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <button type="button" onClick={() => startEdit(item)} style={{ padding: '6px 10px' }}>
                      {t('edit')}
                    </button>
                    <button type="button" onClick={() => toggleEstado(item)} style={{ padding: '6px 10px' }}>
                      {item.estado === 'activo' ? t('deactivate') : t('activate')}
                    </button>
                    <button type="button" onClick={() => remove(item)} style={{ padding: '6px 10px', color: '#dc2626' }}>
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
