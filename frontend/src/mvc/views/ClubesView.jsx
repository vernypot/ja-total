import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import { clubDisplayName } from '../../utils/club';
import ListSearchInput from '../../components/ListSearchInput';
import '../../styles/form.css';

export default function ClubesView({
  data,
  searchQuery,
  setSearchQuery,
  iglesiasData,
  activeIglesiaData,
  canSelectIglesia = true,
  canManage = true,
  iglesiaScopeReady = true,
  activeClub,
  showInactive,
  setShowInactive,
  error,
  loading,
  showForm,
  setShowForm,
  clubForm,
  setClubForm,
  tipos,
  addClub,
  toggleEstado,
  navigateToMiembros,
  selectClub,
}) {
  const { t } = useLanguage();
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>🎯 {t('clubs')}</h1>
          {activeIglesiaData && (
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
              {t('churchLabel')}: <strong>{activeIglesiaData.nombre}</strong>
            </p>
          )}
          {activeClub && (
            <p style={{ margin: '4px 0 0 0', color: '#2563eb', fontSize: '14px' }}>
              {t('activeClub')}: <strong>{clubDisplayName(activeClub)}</strong>
            </p>
          )}
        </div>
        {canManage && (
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
            {showForm ? `✕ ${t('cancel')}` : `➕ ${t('newClub')}`}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!iglesiaScopeReady && (
        <div className="alert alert-error">{t('noActiveIglesiaAssignment')}</div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" onChange={e => setShowInactive(e.target.checked)} />
            {t('showInactive')}
          </label>
          <ListSearchInput value={searchQuery} onChange={setSearchQuery} />
        </div>

        {showForm && canManage && (
          <div style={{ padding: '15px', backgroundColor: '#f0f9ff', border: '2px solid #0891b2', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0 }}>{t('addNewClub')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('name')}</label>
                <input type="text" value={clubForm.nombre} onChange={e => setClubForm({ ...clubForm, nombre: e.target.value })} placeholder={t('clubName')} className="form-input" style={{ margin: 0 }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('church')}</label>
                {canSelectIglesia ? (
                  <select value={clubForm.iglesia_id} onChange={e => setClubForm({ ...clubForm, iglesia_id: e.target.value })} className="form-input" style={{ margin: 0 }}>
                    <option value="">{t('selectChurch')}</option>
                    {iglesiasData.map(iglesia => (
                      <option key={iglesia.id} value={iglesia.id}>{iglesia.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <div className="form-input" style={{ margin: 0, backgroundColor: '#f3f4f6' }}>
                    {activeIglesiaData?.nombre || '—'}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t('clubType')}</label>
                <select value={clubForm.tipo_id} onChange={e => setClubForm({ ...clubForm, tipo_id: e.target.value })} className="form-input" style={{ margin: 0 }}>
                  <option value="">{t('selectType')}</option>
                  {tipos.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={addClub} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                ✓ {t('save')}
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                ✕ {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">{t('loadingClubs')}</div>
        ) : data.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
            {isSearching ? t('noSearchResults') : t('noClubs')}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {data.map(c => {
              const isActive = activeClub?.id === c.id;
              const tipoNombre = c.tipos_club?.nombre;

              return (
                <div
                  key={c.id}
                  style={{
                    padding: '15px',
                    border: isActive ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: isActive ? '#dbeafe' : '#fff',
                    transition: 'all 0.2s',
                  }}
                  className="hover-shadow"
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <strong>{c.nombre}</strong>
                      {tipoNombre && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          backgroundColor: '#e0e7ff',
                          color: '#3730a3',
                        }}>
                          {tipoNombre}
                        </span>
                      )}
                    </div>
                    <span className={`badge badge-${c.estado}`} style={{ marginTop: '8px', display: 'inline-block' }}>
                      {estadoLabel(c.estado, t)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => selectClub(c)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: isActive ? '#1e40af' : '#0891b2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      ★ {t('select')}
                    </button>
                    <button onClick={() => navigateToMiembros(c.id)} className="btn btn-sm btn-edit">👥 {t('membersBtn')}</button>
                    {canManage && (
                      <button onClick={() => toggleEstado(c)} className={`btn btn-sm ${c.estado === 'activo' ? 'btn-danger' : 'btn-success'}`}>
                        {c.estado === 'activo' ? `❌ ${t('deactivate')}` : `✓ ${t('activate')}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
