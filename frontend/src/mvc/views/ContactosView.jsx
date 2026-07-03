import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import ListSearchInput from '../../components/ListSearchInput';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';

export default function ContactosView({
  data,
  searchQuery,
  setSearchQuery,
  showInactive,
  setShowInactive,
  error,
  loading,
  showForm,
  editingId,
  form,
  setForm,
  canManage,
  save,
  startEdit,
  toggleEstado,
  cancelForm,
  toggleForm,
  miembroId,
}) {
  const { t } = useLanguage();
  const isSearching = searchQuery.trim().length > 0;

  if (!miembroId) {
    return <p className="text-muted">{t('noMemberData')}</p>;
  }

  if (loading) {
    return <div className="loading">{t('loadingData')}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        <h3 style={{ margin: 0 }}>{t('tabContacts')} <PageHelpLink pageId="memberContacts" compact /></h3>
        {canManage && (
          <button
            type="button"
            onClick={toggleForm}
            style={{
              padding: '8px 14px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {showForm && !editingId ? `✕ ${t('cancel')}` : `➕ ${t('newContact')}`}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && canManage && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f0f9ff',
          border: '2px solid #0891b2',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <h4 style={{ marginTop: 0 }}>{editingId ? t('editContact') : t('newContact')}</h4>
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('phone')} *</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                className="form-input"
                style={{ margin: 0 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('relationship')}</label>
              <input
                value={form.relacion}
                onChange={e => setForm({ ...form, relacion: e.target.value })}
                placeholder={t('relationshipPlaceholder')}
                className="form-input"
                style={{ margin: 0 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={save}
              style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
            >
              ✓ {t('save')}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              style={{ padding: '10px 20px', backgroundColor: 'var(--color-btn-neutral)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
            >
              ✕ {t('cancel')}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          {t('showInactive')}
        </label>
        <ListSearchInput value={searchQuery} onChange={setSearchQuery} />
      </div>

      {data.length === 0 ? (
        <p className="text-muted">{isSearching ? t('noSearchResults') : t('noContacts')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {data.map(contacto => (
            <div
              key={contacto.id}
              style={{
                padding: '15px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                backgroundColor: contacto.estado === 'inactivo' ? '#f9fafb' : '#fff',
              }}
            >
              <div>
                <strong>{contacto.nombre || '—'}</strong>
                <div style={{ marginTop: '6px', fontSize: '14px', color: '#374151' }}>
                  <div>{t('phone')}: {contacto.telefono || '—'}</div>
                  <div>{t('relationship')}: {contacto.relacion || '—'}</div>
                </div>
                <span className={`badge badge-${contacto.estado}`} style={{ marginTop: '8px', display: 'inline-block' }}>
                  {estadoLabel(contacto.estado, t)}
                </span>
              </div>
              {canManage && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => startEdit(contacto)} className="btn btn-sm btn-edit">
                    ✏️ {t('edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleEstado(contacto)}
                    className={`btn btn-sm ${contacto.estado === 'activo' ? 'btn-danger' : 'btn-success'}`}
                  >
                    {contacto.estado === 'activo' ? `❌ ${t('deactivate')}` : `✓ ${t('activate')}`}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
