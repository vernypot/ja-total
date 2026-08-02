import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { estadoLabel } from '../../i18n/helpers';
import { clubDisplayName } from '../../utils/club';
import { PageHelpLink } from '../../components/PageHelp';
import ListSearchInput from '../../components/ListSearchInput';
import ListPagination from '../../components/ListPagination';
import FormField from '../../components/FormField';
import FormModal from '../../components/FormModal';
import ClubListActionsModal, { ClubListOverflowTrigger } from '../../components/ClubListActionsModal';
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
  showEditForm,
  clubForm,
  setClubForm,
  tipos,
  addClub,
  startEditClub,
  saveEditClub,
  resetEditForm,
  toggleEstado,
  navigateToMiembros,
  navigateToEventos,
  navigateToDirectiva,
  navigateToUnidades,
  navigateToDetalle,
  selectClub,
  clubStats = {},
  listPagination,
}) {
  const { t } = useLanguage();
  const isSearching = searchQuery.trim().length > 0;
  const [menuClub, setMenuClub] = useState(null);
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });

  function handleToggleEstado(club) {
    if (club.estado === 'activo') {
      askConfirm({
        title: t('confirmDeactivateClubTitle'),
        message: t('confirmDeactivateClubMessage'),
        highlight: clubDisplayName(club),
        confirmLabel: t('deactivate'),
        onConfirm: () => toggleEstado(club),
      });
      return;
    }
    toggleEstado(club);
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>🎯 {t('clubs')} <PageHelpLink pageId="clubs" /></h1>
          {activeIglesiaData && (
            <div style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
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

      {error && !showEditForm && <div className="alert alert-error">{error}</div>}
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

        <ListPagination {...listPagination} />

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
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', backgroundColor: 'var(--color-btn-neutral)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                ✕ {t('cancel')}
              </button>
            </div>
          </div>
        )}

        <FormModal
          open={showEditForm && canManage}
          title={t('editClub')}
          onClose={resetEditForm}
        >
          {error && <div className="alert alert-error">{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <FormField label={t('name')} htmlFor="edit-club-nombre" error={fieldErrors.nombre} required>
              <input
                id="edit-club-nombre"
                type="text"
                value={clubForm.nombre}
                onChange={e => setClubForm({ ...clubForm, nombre: e.target.value })}
                placeholder={t('clubName')}
                className="form-input"
                style={{ margin: 0 }}
                aria-invalid={Boolean(fieldErrors.nombre)}
              />
            </FormField>
            <FormField label={t('church')} htmlFor="edit-club-iglesia" error={fieldErrors.iglesia_id} required>
              {canSelectIglesia ? (
                <select
                  id="edit-club-iglesia"
                  value={clubForm.iglesia_id}
                  onChange={e => setClubForm({ ...clubForm, iglesia_id: e.target.value })}
                  className="form-input"
                  style={{ margin: 0 }}
                  aria-invalid={Boolean(fieldErrors.iglesia_id)}
                >
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
            <FormField label={t('clubType')} htmlFor="edit-club-tipo">
              <select
                id="edit-club-tipo"
                value={clubForm.tipo_id}
                onChange={e => setClubForm({ ...clubForm, tipo_id: e.target.value })}
                className="form-input"
                style={{ margin: 0 }}
              >
                <option value="">{t('selectType')}</option>
                {tipos.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="form-modal__actions">
            <button type="button" className="btn btn-primary" onClick={saveEditClub}>
              {t('save')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetEditForm}>
              {t('cancel')}
            </button>
          </div>
        </FormModal>

        <ClubListActionsModal
          open={Boolean(menuClub)}
          club={menuClub}
          onClose={() => setMenuClub(null)}
          t={t}
          canManage={canManage}
          onEdit={startEditClub}
          onDetalles={navigateToDetalle}
          onMiembros={navigateToMiembros}
          onUnidades={navigateToUnidades}
          onDirectiva={navigateToDirectiva}
          onEventos={navigateToEventos}
          onToggleEstado={handleToggleEstado}
        />

        {confirmDialog}

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
              const stats = clubStats[c.id] || { memberCount: 0, boardCount: 0 };
              const memberCountLabel = t('clubMemberCount').replace('{{count}}', String(stats.memberCount));
              const boardCountLabel = t('clubBoardCount').replace('{{count}}', String(stats.boardCount));

              return (
                <div key={c.id} className="club-list-row">
                  <div
                    role="button"
                    tabIndex={0}
                    className={`club-list-item club-list-item--selectable${isActive ? ' club-list-item--active' : ''}`}
                    onClick={() => selectClub(c)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        selectClub(c);
                      }
                    }}
                    aria-pressed={isActive}
                    aria-label={`${t('select')}: ${c.nombre}`}
                  >
                    <div className="club-list-item__meta">
                      <div className="club-list-item__title-row">
                        <strong>{c.nombre}</strong>
                        {tipoNombre && (
                          <span className="club-list-item__type-badge">
                            {tipoNombre}
                          </span>
                        )}
                      </div>
                      <span className={`badge badge-${c.estado}`} style={{ marginTop: '8px', display: 'inline-block' }}>
                        {estadoLabel(c.estado, t)}
                      </span>
                    </div>
                    <div className="club-row-footer">
                      <span>{memberCountLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{boardCountLabel}</span>
                      <span aria-hidden="true" className="club-list-item__select-sep">·</span>
                      <span
                        className={`club-list-item__select-label${isActive ? ' club-list-item__select-label--active' : ''}`}
                      >
                        {isActive ? `★ ${t('select')}` : t('select')}
                      </span>
                    </div>
                  </div>
                  <div className="club-list-row__actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-edit club-list-row__action"
                      onClick={() => navigateToMiembros(c.id)}
                    >
                      👥 {t('membersBtn')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-edit club-list-row__action"
                      onClick={() => navigateToUnidades(c.id)}
                    >
                      🧩 {t('unidadBtn')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-edit club-list-row__action"
                      onClick={() => navigateToDirectiva(c.id)}
                    >
                      🎖️ {t('directivaBtn')}
                    </button>
                    <ClubListOverflowTrigger onClick={() => setMenuClub(c)} t={t} />
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
