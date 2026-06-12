import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import ListSearchInput from '../../components/ListSearchInput';
import '../../styles/form.css';

export default function IglesiasView({
  data,
  searchQuery,
  setSearchQuery,
  iglesiaData,
  activeIglesia,
  nombre,
  setNombre,
  showForm,
  setShowForm,
  showInactive,
  setShowInactive,
  error,
  loading,
  editingId,
  setEditingId,
  editingNombre,
  setEditingNombre,
  canCreate,
  canManage,
  canToggleEstado,
  canSelectChurch,
  save,
  startEdit,
  saveEdit,
  toggleEstado,
  selectIglesia,
  navigateToClubes,
}) {
  const { t } = useLanguage();
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>⛪ {canSelectChurch ? t('churches') : t('myChurch')}</h1>
          {iglesiaData && (
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
              {t('activeChurch')}: <strong>{iglesiaData.nombre}</strong>
            </p>
          )}
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
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
            {showForm ? `✕ ${t('cancel')}` : `➕ ${t('newChurch')}`}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        {canSelectChurch && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" onChange={e => setShowInactive(e.target.checked)} />
            {t('showInactive')}
          </label>
        )}
        {canSelectChurch && (
          <ListSearchInput value={searchQuery} onChange={setSearchQuery} />
        )}
        </div>

        {showForm && canCreate && (
          <div style={{
            padding: '15px',
            backgroundColor: '#f0f9ff',
            border: '2px solid #0891b2',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <h4 style={{ marginTop: 0 }}>{t('addNewChurch')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '15px', marginBottom: '15px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('name')}</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder={t('churchName')}
                  className="form-input"
                  onKeyPress={e => e.key === 'Enter' && save()}
                  style={{ margin: 0 }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={save} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                ✓ {t('save')}
              </button>
              <button onClick={() => { setShowForm(false); setNombre(''); }} style={{ padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                ✕ {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">{t('loadingChurches')}</div>
        ) : data.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
            {isSearching ? t('noSearchResults') : t('noChurches')}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {data.map(i => (
              <div key={i.id} style={{
                padding: '15px',
                border: activeIglesia === i.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: activeIglesia === i.id ? '#dbeafe' : '#fff',
                transition: 'all 0.2s',
              }} className="hover-shadow">
                <div style={{ flex: 1 }}>
                  {editingId === i.id ? (
                    <input
                      type="text"
                      value={editingNombre}
                      onChange={e => setEditingNombre(e.target.value)}
                      className="form-input"
                      style={{ marginBottom: '8px' }}
                    />
                  ) : (
                    <strong>{i.nombre}</strong>
                  )}
                  <span className={`badge badge-${i.estado}`} style={{ marginLeft: '10px' }}>
                    {estadoLabel(i.estado, t)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {editingId === i.id ? (
                    <>
                      <button onClick={saveEdit} className="btn btn-sm btn-success">✓ {t('save')}</button>
                      <button onClick={() => setEditingId(null)} className="btn btn-sm btn-secondary">✕ {t('cancel')}</button>
                    </>
                  ) : (
                    <>
                      {canSelectChurch && (
                        <button onClick={() => selectIglesia(i)} style={{ padding: '6px 12px', backgroundColor: activeIglesia === i.id ? '#1e40af' : '#0891b2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          ★ {t('select')}
                        </button>
                      )}
                      {canManage && (
                        <button onClick={() => startEdit(i)} className="btn btn-sm btn-edit">✏️ {t('edit')}</button>
                      )}
                      <button onClick={() => navigateToClubes(i.id)} className="btn btn-sm btn-edit">🎯 {t('clubs')}</button>
                      {canToggleEstado && (
                        <button onClick={() => toggleEstado(i)} className={`btn btn-sm ${i.estado === 'activo' ? 'btn-danger' : 'btn-success'}`}>
                          {i.estado === 'activo' ? `❌ ${t('deactivate')}` : `✓ ${t('activate')}`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
