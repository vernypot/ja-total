import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import ListSearchInput from '../../components/ListSearchInput';
import NoticiaHtml from '../../components/NoticiaHtml';
import NoticiaHtmlEditor from '../../components/NoticiaHtmlEditor';
import NoticiaPlacementsField, { NoticiaPlacementBadges } from '../../components/NoticiaPlacementsField';
import NoticiaAudienceField, { NoticiaAudienceBadge } from '../../components/NoticiaAudienceField';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';
import '../../styles/noticias.css';

export default function NoticiasView({
  effectiveIglesiaId,
  iglesiaNombre,
  clubs,
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
        <div className="alert alert-warning">{t('homeSelectChurch')}</div>
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
            <p style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              {t('churchLabel')}: <strong>{iglesiaNombre}</strong>
            </p>
          )}
        </div>
        <div className="noticia-page-header-actions">
          <button
            type="button"
            className={showForm ? 'btn btn-secondary' : 'btn btn-primary'}
            onClick={showForm ? closeForm : openCreateForm}
          >
            {showForm ? `✕ ${t('cancel')}` : `➕ ${t('noticiasNew')}`}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? t('noticiasEdit') : t('noticiasNew')}</h3>
          <div className="noticia-form-grid">
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
            <NoticiaPlacementsField
              value={form.placements}
              onChange={placements => setForm(f => ({ ...f, placements }))}
            />
            <NoticiaAudienceField
              value={form.audience}
              clubId={form.club_id}
              clubs={clubs}
              onChange={({ audience, clubId }) => setForm(f => ({
                ...f,
                audience,
                club_id: clubId ?? f.club_id,
              }))}
            />
            <div className="noticia-form-fields-row">
              <label>
                <span>{t('noticiasFieldCategory')}</span>
                <input
                  type="text"
                  className="form-input"
                  value={form.categoria}
                  onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  placeholder={t('noticiasFieldCategoryPlaceholder')}
                />
              </label>
              <label>
                <span>{t('noticiasFieldDate')}</span>
                <input
                  type="date"
                  className="form-input"
                  value={form.publicado_en}
                  onChange={e => setForm(f => ({ ...f, publicado_en: e.target.value }))}
                />
              </label>
              <label>
                <span>{t('status')}</span>
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
            <div className="noticia-form-actions">
              <button
                type="button"
                className="btn btn-success"
                onClick={save}
                disabled={saving}
              >
                {saving ? t('saving') : t('save')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeForm}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="noticia-list-toolbar">
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
          <div className="noticia-list">
            {items.map(item => (
              <div
                key={item.id}
                className={`noticia-item${item.estado === 'activo' ? '' : ' is-inactive'}`}
              >
                <div className="noticia-list-item-row">
                  <div className="noticia-list-item-body">
                    <div className="noticia-item-meta">
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
                    <div className="noticia-item-badges">
                      <NoticiaAudienceBadge
                        audience={item.audience}
                        clubName={item.club_nombre}
                        t={t}
                      />
                      <NoticiaPlacementBadges placements={item.placements} t={t} />
                    </div>
                  </div>
                  <div className="noticia-item-actions">
                    <button type="button" className="btn btn-sm btn-edit" onClick={() => startEdit(item)}>
                      {t('edit')}
                    </button>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => toggleEstado(item)}>
                      {item.estado === 'activo' ? t('deactivate') : t('activate')}
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(item)}>
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
