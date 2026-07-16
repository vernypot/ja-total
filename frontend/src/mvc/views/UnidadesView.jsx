import { useLanguage } from '../../hooks/useLanguage';
import BackLink from '../../components/BackLink';
import ListSearchInput from '../../components/ListSearchInput';
import UnidadesBoard from '../../components/UnidadesBoard';
import { PageHelpLink } from '../../components/PageHelp';
import { clubDisplayName } from '../../utils/club';
import '../../styles/form.css';
import '../../styles/unidades.css';

function UnidadesListTable({
  unidades,
  membersById,
  genderLabel,
  roleLabel,
  getCaptainName,
  memberDisplayName,
  onEditUnidad,
  t,
}) {
  if (!unidades.length) return null;

  return (
    <div className="card unidades-table-card">
      <h2 className="unidades-table-title">{t('unidadSummaryTitle')}</h2>
      <div className="unidades-table-wrap">
        <table className="unidades-table">
          <thead>
            <tr>
              <th>{t('unidadName')}</th>
              <th>{t('unidadGender')}</th>
              <th>{t('unidadMembersCount')}</th>
              <th>{t('unidadRole_capitan')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {unidades.map(unidad => {
              const assignments = unidad.miembro_unidad || [];
              const captain = getCaptainName(unidad);
              return (
                <tr key={unidad.id}>
                  <td>
                    <strong>{unidad.nombre}</strong>
                    {unidad.descripcion && (
                      <div className="unidades-table-sub">{unidad.descripcion}</div>
                    )}
                  </td>
                  <td>{genderLabel(unidad.genero)}</td>
                  <td>{assignments.length}</td>
                  <td>{captain || '—'}</td>
                  <td>
                    <button type="button" className="home-link-btn" onClick={() => onEditUnidad(unidad)}>
                      {t('edit')}
                    </button>
                    {assignments.length > 0 && (
                      <div className="unidades-table-members">
                        {assignments.map(row => {
                          const member = row.miembros || membersById[row.miembro_id];
                          if (!member) return null;
                          return (
                            <span key={row.id} className="unidades-table-member-tag">
                              {memberDisplayName(member)}
                              {row.rol && row.rol !== 'miembro' ? ` (${roleLabel(row.rol)})` : ''}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UnidadesView({
  canManage,
  clubId,
  club,
  clubs,
  setClubId,
  unidades,
  poolMembers,
  membersById,
  loading,
  error,
  message,
  searchQuery,
  setSearchQuery,
  showForm,
  setShowForm,
  form,
  setForm,
  editingUnidadId,
  savingUnidadId,
  assigningKey,
  saveUnidad,
  resetForm,
  startEditUnidad,
  removeUnidad,
  addMemberToUnidad,
  removeMemberFromUnidad,
  updateMemberRole,
  iglesiaScopeReady,
  memberDisplayName,
  genderLabel,
  roleLabel,
  roles,
  getCaptainName,
}) {
  const { t } = useLanguage();

  if (!canManage) {
    return (
      <div className="form-container">
        <p>{t('accessDenied')}</p>
      </div>
    );
  }

  return (
    <div className="form-container">
      <BackLink />
      <div className="form-header">
        <div>
          <h1>{t('unidadesTitle')} <PageHelpLink pageId="unidades" /></h1>
          {club && (
            <p className="unidades-club-label">
              {t('clubLabel')}: <strong>{clubDisplayName(club)}</strong>
            </p>
          )}
        </div>
        {clubId && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + {t('unidadNew')}
          </button>
        )}
      </div>

      <p className="unidades-intro">{t('unidadesIntro')}</p>

      {!iglesiaScopeReady && (
        <div className="alert alert-error">{t('noActiveIglesiaAssignment')}</div>
      )}

      <div className="card" style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>{t('selectClub')}</label>
        <select
          value={clubId}
          onChange={e => setClubId(e.target.value)}
          className="form-input"
          style={{ maxWidth: '400px' }}
        >
          <option value="">{t('selectClub')}</option>
          {clubs.map(item => (
            <option key={item.id} value={item.id}>{clubDisplayName(item)}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="alert alert-error">
          <div>{error}</div>
          {(error.includes('does not exist') || error.includes('admin_list_unidades')) && (
            <div style={{ marginTop: '8px', fontSize: '13px' }}>{t('unidadSchemaHint')}</div>
          )}
        </div>
      )}
      {message && <div className="alert alert-success">{message}</div>}

      {!clubId ? (
        <p className="text-muted">{t('selectClubForUnidades')}</p>
      ) : (
        <>
          {showForm && (
            <div className="card unidades-form-card">
              <h2 style={{ marginTop: 0 }}>{editingUnidadId ? t('unidadEdit') : t('unidadNew')}</h2>
              <div className="unidades-form-grid">
                <label className="unidades-field">
                  <span className="unidades-field__label">{t('unidadName')}</span>
                  <input
                    className="form-input"
                    value={form.nombre}
                    onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  />
                </label>
                <label className="unidades-field">
                  <span className="unidades-field__label">{t('unidadGender')}</span>
                  <select
                    className="form-input"
                    value={form.genero}
                    onChange={e => setForm(prev => ({ ...prev, genero: e.target.value }))}
                  >
                    <option value="M">{t('unidadGenderMale')}</option>
                    <option value="F">{t('unidadGenderFemale')}</option>
                  </select>
                </label>
                <label className="unidades-field unidades-field--full">
                  <span className="unidades-field__label">{t('unidadDescription')}</span>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={form.descripcion}
                    onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                </label>
              </div>
              <div className="unidades-form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={Boolean(savingUnidadId)}
                  onClick={saveUnidad}
                >
                  {savingUnidadId ? t('saving') : t('save')}
                </button>
              </div>
            </div>
          )}

          {loading && unidades.length === 0 ? (
            <p>{t('loading')}</p>
          ) : (
            <>
              <UnidadesListTable
                unidades={unidades}
                membersById={membersById}
                genderLabel={genderLabel}
                roleLabel={roleLabel}
                getCaptainName={getCaptainName}
                memberDisplayName={memberDisplayName}
                onEditUnidad={startEditUnidad}
                t={t}
              />

              <div style={{ marginBottom: '16px', maxWidth: '400px' }}>
                <ListSearchInput value={searchQuery} onChange={setSearchQuery} />
              </div>

              <UnidadesBoard
                canManage={canManage}
                poolMembers={poolMembers}
                unidades={unidades}
                membersById={membersById}
                memberDisplayName={memberDisplayName}
                genderLabel={genderLabel}
                roleLabel={roleLabel}
                roles={roles}
                onEditUnidad={startEditUnidad}
                onRemoveUnidad={removeUnidad}
                addMemberToUnidad={addMemberToUnidad}
                removeMemberFromUnidad={removeMemberFromUnidad}
                updateMemberRole={updateMemberRole}
                savingUnidadId={savingUnidadId}
                assigningKey={assigningKey}
                t={t}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
