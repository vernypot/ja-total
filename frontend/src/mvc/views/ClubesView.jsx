import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import { clubDisplayName } from '../../utils/club';
import { PageHelpLink } from '../../components/PageHelp';
import ListSearchInput from '../../components/ListSearchInput';
import LogoAssetField from '../../components/LogoAssetField';
import FormField from '../../components/FormField';
import { ChurchOrgPath } from '../../components/ChurchOrgFields';
import { iglesiaHierarchyLabel } from '../../mvc/models/iglesias.model';
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
  fieldErrors = {},
  loading,
  showForm,
  setShowForm,
  clubForm,
  setClubForm,
  tipos,
  addClub,
  toggleEstado,
  navigateToMiembros,
  navigateToEventos,
  selectClub,
  logoUploading,
  handleClubLogoUpload,
  handleClubLogoRemove,
  handleTipoLogoUpload,
  handleTipoLogoRemove,
}) {
  const { t } = useLanguage();
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>🎯 {t('clubs')} <PageHelpLink pageId="clubs" /></h1>
          {activeIglesiaData && (
            <div style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
              <div>
                {t('churchLabel')}: <strong>{activeIglesiaData.nombre}</strong>
              </div>
              <ChurchOrgPath label={iglesiaHierarchyLabel(activeIglesiaData)} />
            </div>
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
              <FormField label={t('name')} htmlFor="club-nombre" error={fieldErrors.nombre} required>
                <input id="club-nombre" type="text" value={clubForm.nombre} onChange={e => setClubForm({ ...clubForm, nombre: e.target.value })} placeholder={t('clubName')} className="form-input" style={{ margin: 0 }} aria-invalid={Boolean(fieldErrors.nombre)} />
              </FormField>
              <FormField label={t('church')} htmlFor="club-iglesia" error={fieldErrors.iglesia_id} required>
                {canSelectIglesia ? (
                  <select id="club-iglesia" value={clubForm.iglesia_id} onChange={e => setClubForm({ ...clubForm, iglesia_id: e.target.value })} className="form-input" style={{ margin: 0 }} aria-invalid={Boolean(fieldErrors.iglesia_id)}>
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
              </FormField>
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
                    alignItems: 'flex-start',
                    gap: '16px',
                    backgroundColor: isActive ? '#dbeafe' : '#fff',
                    transition: 'all 0.2s',
                    flexWrap: 'wrap',
                  }}
                  className="hover-shadow"
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                      <LogoAssetField
                        label={tipoNombre
                          ? t('clubTypeLogoNamed').replace('{type}', tipoNombre)
                          : t('clubTypeLogo')}
                        logoUrl={c.tipos_club?.logo_url}
                        canManage={canManage && Boolean(c.tipo_id)}
                        uploading={logoUploading.clubId === c.id && logoUploading.kind === 'tipo'}
                        onUpload={file => handleTipoLogoUpload(c, file)}
                        onRemove={() => handleTipoLogoRemove(c)}
                        uploadLabel={t('uploadLogo')}
                        changeLabel={t('changeLogo')}
                        removeLabel={t('removeLogo')}
                        emptyLabel={t('noLogo')}
                        hint={c.tipo_id ? t('clubTypeLogoHint') : t('clubTypeLogoMissing')}
                      />
                      <LogoAssetField
                        label={t('clubLocalLogo')}
                        logoUrl={c.logo_url}
                        canManage={canManage}
                        uploading={logoUploading.clubId === c.id && logoUploading.kind === 'club'}
                        onUpload={file => handleClubLogoUpload(c.id, file)}
                        onRemove={() => handleClubLogoRemove(c)}
                        uploadLabel={t('uploadLogo')}
                        changeLabel={t('changeLogo')}
                        removeLabel={t('removeLogo')}
                        emptyLabel={t('noLogo')}
                        hint={t('clubLocalLogoHint')}
                      />
                    </div>
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
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
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
                    <button onClick={() => navigateToEventos(c.id)} className="btn btn-sm btn-edit">📅 {t('eventsBtn')}</button>
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
