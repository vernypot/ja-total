import { useLanguage } from '../../hooks/useLanguage';

function RequirementsList({ requisitos, t }) {
  const active = (requisitos || []).filter(r => (r.estado || 'activo') === 'activo');
  if (!active.length) {
    return <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>{t('noRequirements')}</p>;
  }
  return (
    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '12px', color: '#4b5563' }}>
      {active.map(r => (
        <li key={r.id}>{r.descripcion}</li>
      ))}
    </ul>
  );
}

export default function MiembroEspecialidadesView({
  assigned,
  unassigned,
  unassignedGrouped,
  requisitosByEsp,
  memberTipos,
  error,
  loading,
  selectedEspecialidadId,
  setSelectedEspecialidadId,
  assignEspecialidad,
  unassignEspecialidad,
  canManage = false,
  getEspecialidadFromLink,
  getLinkEspecialidadId,
}) {
  const { t } = useLanguage();

  if (loading) {
    return <p>{t('loadingData')}</p>;
  }

  return (
    <div>
      <h3>{t('tabSpecialties')}</h3>
      {error && <div className="alert alert-error">{error}</div>}

      {memberTipos.length === 0 && (
        <p style={{ color: '#b45309', fontSize: '14px' }}>{t('memberNoClubsForClasses')}</p>
      )}

      {canManage && (
      <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px' }}>
          {t('assignSpecialty')}
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedEspecialidadId}
            onChange={e => setSelectedEspecialidadId(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
            disabled={unassigned.length === 0}
          >
            <option value="">{t('selectSpecialty')}</option>
            {unassignedGrouped ? (
              unassignedGrouped.map(group => {
                const label = group.seccion?.nombre || t('uncategorized');
                return (
                  <optgroup key={group.seccion?.id || 'uncategorized'} label={label}>
                    {group.especialidades.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}{e.club_tipo ? ` (${e.club_tipo})` : ''}
                      </option>
                    ))}
                  </optgroup>
                );
              })
            ) : (
              unassigned.map(e => (
                <option key={e.id} value={e.id}>
                  {e.nombre}{e.club_tipo ? ` (${e.club_tipo})` : ''}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={assignEspecialidad}
            disabled={!selectedEspecialidadId}
            style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: selectedEspecialidadId ? 'pointer' : 'not-allowed', opacity: selectedEspecialidadId ? 1 : 0.6 }}
          >
            ➕ {t('add')}
          </button>
        </div>
        {memberTipos.length > 0 && unassigned.length === 0 && (
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#6b7280' }}>
            {t('noAssignableHonors')}
          </p>
        )}
      </div>
      )}

      <h4>{t('assignedSpecialties')}</h4>
      {assigned.length === 0 ? (
        <p className="text-muted">{t('noAssignedSpecialties')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {assigned.map(row => {
            const esp = getEspecialidadFromLink(row);
            const espId = getLinkEspecialidadId(row);
            return (
              <div key={row.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <strong>{esp?.nombre || t('notAvailable')}</strong>
                    {esp?.club_tipo && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        {t('clubType')}: {esp.club_tipo}
                      </div>
                    )}
                    <RequirementsList requisitos={requisitosByEsp[espId]} t={t} />
                  </div>
                  {canManage && (
                  <button
                    type="button"
                    onClick={() => unassignEspecialidad(row.id)}
                    style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}
                  >
                    ✕ {t('remove')}
                  </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
