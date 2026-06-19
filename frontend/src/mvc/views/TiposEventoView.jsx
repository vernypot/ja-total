import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import ListSearchInput from '../../components/ListSearchInput';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';

export default function TiposEventoView({
  items,
  showInactive,
  setShowInactive,
  showForm,
  editingId,
  form,
  setForm,
  searchQuery,
  setSearchQuery,
  loading,
  error,
  canManage,
  hasTable,
  openCreateForm,
  closeForm,
  startEdit,
  save,
  toggleEstado,
}) {
  const { t } = useLanguage();

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>🏷️ {t('eventTypes')} <PageHelpLink pageId="eventTypes" /></h1>
          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '13px' }}>
            {t('eventTypesHint')}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => (showForm ? closeForm() : openCreateForm())}
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
            {showForm ? `✕ ${t('cancel')}` : `➕ ${t('newEventType')}`}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!hasTable && (
        <div className="alert alert-error">{t('eventTypesSchemaMissing')}</div>
      )}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            {t('showInactiveEventTypes')}
          </label>
          <ListSearchInput value={searchQuery} onChange={setSearchQuery} />
        </div>

        {showForm && canManage && (
          <div style={{ padding: '15px', backgroundColor: '#f0f9ff', border: '2px solid #0891b2', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0 }}>{editingId ? t('editEventType') : t('newEventType')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('name')} *</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('order')}</label>
                <input
                  type="number"
                  value={form.orden}
                  onChange={e => setForm({ ...form, orden: e.target.value })}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('description')}</label>
                <input
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={save} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                ✓ {t('save')}
              </button>
              <button onClick={closeForm} style={{ padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                ✕ {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">{t('loadingData')}</div>
        ) : items.length === 0 ? (
          <p className="text-muted">{t('noEventTypes')}</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {items.map(item => (
              <div key={item.id} style={{ padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <strong>{item.nombre}</strong>
                  {item.descripcion && (
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{item.descripcion}</div>
                  )}
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
                    {t('order')}: {item.orden ?? 0}
                    {item.estado && (
                      <span className={`badge badge-${item.estado}`} style={{ marginLeft: '8px' }}>
                        {estadoLabel(item.estado, t)}
                      </span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => startEdit(item)} style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      ✏️ {t('edit')}
                    </button>
                    <button type="button" onClick={() => toggleEstado(item)} style={{ padding: '6px 12px', backgroundColor: item.estado === 'activo' ? '#dc2626' : '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      {item.estado === 'activo' ? `❌ ${t('deactivate')}` : `✓ ${t('activate')}`}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
