import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import ListSearchInput from '../../components/ListSearchInput';
import ListPagination from '../../components/ListPagination';
import FormField from '../../components/FormField';
import ChurchOrgFields, { ChurchOrgFilters, ChurchOrgPath } from '../../components/ChurchOrgFields';
import ChurchCountrySelect from '../../components/ChurchCountrySelect';
import ChurchTimezoneSelect from '../../components/ChurchTimezoneSelect';
import { churchCountryLabel } from '../../utils/churchCountries';
import { churchTimezoneLabel } from '../../utils/churchTimezones';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/form.css';

function NoZoneBadge({ t }) {
  return (
    <span
      className="badge"
      style={{ marginLeft: '8px', backgroundColor: '#fef3c7', color: '#92400e', fontSize: '11px' }}
    >
      ⚠ {t('churchNoZone')}
    </span>
  );
}

export default function IglesiasView({
  data,
  totalCount,
  searchQuery,
  setSearchQuery,
  iglesiaData,
  activeIglesia,
  churchForm,
  setChurchFormField,
  orgFilters,
  setOrgFilter,
  clearOrgFilters,
  divisiones,
  uniones,
  campos,
  zonas,
  filterUniones,
  filterCampos,
  filterZonas,
  hasOrgStructure,
  showForm,
  setShowForm,
  showInactive,
  setShowInactive,
  error,
  fieldErrors = {},
  loading,
  editingId,
  canCreate,
  canManage,
  canEditOrg,
  canToggleEstado,
  canSelectChurch,
  save,
  startEdit,
  saveEdit,
  cancelEdit,
  toggleEstado,
  selectIglesia,
  navigateToClubes,
  resetChurchForm,
  iglesiaHierarchyLabel,
  listPagination,
}) {
  const { t } = useLanguage();
  const isSearching = searchQuery.trim().length > 0;
  const isEditing = Boolean(editingId);
  const showOrgForm = hasOrgStructure && canEditOrg;
  const activeHierarchy = iglesiaData ? iglesiaHierarchyLabel(iglesiaData) : '';

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>⛪ {canSelectChurch ? t('churches') : t('myChurch')} <PageHelpLink pageId="churches" /></h1>
          {iglesiaData && (
            <div style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              <div>
                {t('activeChurch')}: <strong>{iglesiaData.nombre}</strong>
              </div>
              {activeHierarchy && <ChurchOrgPath label={activeHierarchy} />}
              {iglesiaData?.country && (
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  {t('churchCountry')}: {churchCountryLabel(iglesiaData.country, t)}
                </div>
              )}
              {iglesiaData?.timezone && (
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  {t('churchTimezone')}: {churchTimezoneLabel(iglesiaData.timezone, t)}
                </div>
              )}
              {hasOrgStructure && !activeHierarchy && (
                <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px' }}>
                  ⚠ {t('churchNoZoneHint')}
                </div>
              )}
            </div>
          )}
        </div>
        {canCreate && !isEditing && (
          <button
            type="button"
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

      {!canSelectChurch && iglesiaData && hasOrgStructure && !isEditing && (
        <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '15px' }}>{t('churchOrgPlacement')}</h3>
          {activeHierarchy ? (
            <ChurchOrgPath label={activeHierarchy} />
          ) : (
            <p style={{ margin: 0, color: '#b45309', fontSize: '13px' }}>{t('churchNoZoneHint')}</p>
          )}
          {canManage && !activeHierarchy && (
            <button
              type="button"
              className="btn btn-sm btn-edit"
              style={{ marginTop: '10px' }}
              onClick={() => startEdit(iglesiaData)}
            >
              ✏️ {t('assignZone')}
            </button>
          )}
        </div>
      )}

      <div className="card">
        {canSelectChurch && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
              {t('showInactive')}
            </label>
            <ListSearchInput value={searchQuery} onChange={setSearchQuery} />
          </div>
        )}

        {canSelectChurch && hasOrgStructure && (
          <ChurchOrgFilters
            t={t}
            filters={orgFilters}
            setFilter={setOrgFilter}
            divisiones={divisiones}
            uniones={filterUniones}
            campos={filterCampos}
            zonas={filterZonas}
            onClear={clearOrgFilters}
          />
        )}

        {canSelectChurch && hasOrgStructure && (
          <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {t('showing')} {data.length} {t('of')} {listPagination?.totalItems ?? totalCount} {t('churches').toLowerCase()}
          </p>
        )}

        {showForm && canCreate && !isEditing && (
          <div style={{
            padding: '15px',
            backgroundColor: '#f0f9ff',
            border: '2px solid #0891b2',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <h4 style={{ marginTop: 0 }}>{t('addNewChurch')}</h4>
            {showOrgForm && (
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--color-text-muted)' }}>{t('churchOrgFormHint')}</p>
            )}
            <FormField label={t('name')} htmlFor="iglesia-nombre" error={fieldErrors.nombre} required>
              <input
                id="iglesia-nombre"
                type="text"
                value={churchForm.nombre}
                onChange={e => setChurchFormField('nombre', e.target.value)}
                placeholder={t('churchName')}
                className="form-input"
                onKeyDown={e => e.key === 'Enter' && save()}
                style={{ margin: 0 }}
                aria-invalid={Boolean(fieldErrors.nombre)}
              />
            </FormField>
            <ChurchCountrySelect
              t={t}
              value={churchForm.country}
              onChange={value => setChurchFormField('country', value)}
              htmlId="iglesia-country"
              error={fieldErrors.country}
            />
            <ChurchTimezoneSelect
              t={t}
              value={churchForm.timezone}
              onChange={value => setChurchFormField('timezone', value)}
              htmlId="iglesia-timezone"
              error={fieldErrors.timezone}
            />
            {showOrgForm && (
              <ChurchOrgFields
                t={t}
                churchForm={churchForm}
                setChurchFormField={setChurchFormField}
                divisiones={divisiones}
                uniones={uniones}
                campos={campos}
                zonas={zonas}
                fieldErrors={fieldErrors}
              />
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button type="button" onClick={save} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                ✓ {t('save')}
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetChurchForm(); }} style={{ padding: '10px 20px', backgroundColor: 'var(--color-btn-neutral)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                ✕ {t('cancel')}
              </button>
            </div>
          </div>
        )}

        <ListPagination {...listPagination} />

        {loading ? (
          <div className="loading">{t('loadingChurches')}</div>
        ) : data.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
            {isSearching || orgFilters.division_id ? t('noSearchResults') : t('noChurches')}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {data.map(i => {
              const hierarchy = iglesiaHierarchyLabel(i);
              const missingZone = hasOrgStructure && !hierarchy;

              return (
                <div key={i.id} style={{
                  padding: '15px',
                  border: activeIglesia === i.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                  flexWrap: 'wrap',
                  backgroundColor: activeIglesia === i.id ? '#dbeafe' : '#fff',
                  transition: 'all 0.2s',
                }} className="hover-shadow">
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    {editingId === i.id ? (
                      <div>
                        <FormField label={t('name')} htmlFor={`edit-iglesia-${i.id}`} error={fieldErrors.nombre} required>
                          <input
                            id={`edit-iglesia-${i.id}`}
                            type="text"
                            value={churchForm.nombre}
                            onChange={e => setChurchFormField('nombre', e.target.value)}
                            className="form-input"
                          />
                        </FormField>
                        <ChurchCountrySelect
                          t={t}
                          value={churchForm.country}
                          onChange={value => setChurchFormField('country', value)}
                          htmlId={`edit-iglesia-country-${i.id}`}
                          error={fieldErrors.country}
                        />
                        <ChurchTimezoneSelect
                          t={t}
                          value={churchForm.timezone}
                          onChange={value => setChurchFormField('timezone', value)}
                          htmlId={`edit-iglesia-timezone-${i.id}`}
                          error={fieldErrors.timezone}
                        />
                        {showOrgForm && (
                          <ChurchOrgFields
                            t={t}
                            churchForm={churchForm}
                            setChurchFormField={setChurchFormField}
                            divisiones={divisiones}
                            uniones={uniones}
                            campos={campos}
                            zonas={zonas}
                            fieldErrors={fieldErrors}
                          />
                        )}
                      </div>
                    ) : (
                      <>
                        <strong>{i.nombre}</strong>
                        {hierarchy && <ChurchOrgPath label={hierarchy} />}
                        {i.country && (
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            {t('churchCountry')}: {churchCountryLabel(i.country, t)}
                          </div>
                        )}
                        {i.timezone && (
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            {t('churchTimezone')}: {churchTimezoneLabel(i.timezone, t)}
                          </div>
                        )}
                        {missingZone && <NoZoneBadge t={t} />}
                      </>
                    )}
                    <span
                      className={`badge badge-${i.estado}`}
                      style={{ marginTop: '8px', display: 'inline-block' }}
                    >
                      {estadoLabel(i.estado, t)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {editingId === i.id ? (
                      <>
                        <button type="button" onClick={saveEdit} className="btn btn-sm btn-success">✓ {t('save')}</button>
                        <button type="button" onClick={cancelEdit} className="btn btn-sm btn-secondary">✕ {t('cancel')}</button>
                      </>
                    ) : (
                      <>
                        {canSelectChurch && (
                          <button type="button" onClick={() => selectIglesia(i)} style={{ padding: '6px 12px', backgroundColor: activeIglesia === i.id ? '#1e40af' : '#0891b2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            ★ {t('select')}
                          </button>
                        )}
                        {canManage && (
                          <button type="button" onClick={() => startEdit(i)} className="btn btn-sm btn-edit">✏️ {t('edit')}</button>
                        )}
                        <button type="button" onClick={() => navigateToClubes(i.id)} className="btn btn-sm btn-edit">🎯 {t('clubs')}</button>
                        {canToggleEstado && (
                          <button type="button" onClick={() => toggleEstado(i)} className={`btn btn-sm ${i.estado === 'activo' ? 'btn-danger' : 'btn-success'}`}>
                            {i.estado === 'activo' ? `❌ ${t('deactivate')}` : `✓ ${t('activate')}`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {listPagination?.totalPages > 1 && <ListPagination {...listPagination} />}
      </div>
    </div>
  );
}
