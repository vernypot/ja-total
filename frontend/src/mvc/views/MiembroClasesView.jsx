import { useLanguage } from '../../hooks/useLanguage';

function RequirementsList({ requisitos, t }) {
  if (!requisitos?.length) {
    return <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>{t('noRequirements')}</p>;
  }
  return (
    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '12px', color: '#4b5563' }}>
      {requisitos.map(r => (
        <li key={r.id}>{r.descripcion}</li>
      ))}
    </ul>
  );
}

export default function MiembroClasesView({
  assigned,
  unassigned,
  requisitosByClase,
  memberTipos,
  error,
  loading,
  selectedClaseId,
  setSelectedClaseId,
  assignClase,
  unassignClase,
  canManage = false,
  getClaseFromLink,
  getLinkClaseId,
}) {
  const { t } = useLanguage();

  if (loading) {
    return <p>{t('loadingClasses')}</p>;
  }

  return (
    <div>
      <h3>{t('tabClasses')}</h3>
      {error && <div className="alert alert-error">{error}</div>}

      {memberTipos.length === 0 && (
        <p style={{ color: '#b45309', fontSize: '14px' }}>{t('memberNoClubsForClasses')}</p>
      )}

      {canManage && (
      <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px' }}>
          {t('assignClass')}
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedClaseId}
            onChange={e => setSelectedClaseId(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
            disabled={unassigned.length === 0}
          >
            <option value="">{t('selectClass')}</option>
            {unassigned.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={assignClase}
            disabled={!selectedClaseId}
            style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: selectedClaseId ? 'pointer' : 'not-allowed', opacity: selectedClaseId ? 1 : 0.6 }}
          >
            ➕ {t('add')}
          </button>
        </div>
      </div>
      )}

      <h4>{t('assignedClasses')}</h4>
      {assigned.length === 0 ? (
        <p className="text-muted">{t('noAssignedClasses')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {assigned.map(row => {
            const clase = getClaseFromLink(row);
            const claseId = getLinkClaseId(row);
            return (
              <div key={row.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <strong>{clase?.nombre || t('notAvailable')}</strong>
                    {clase?.club_tipo && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        {t('clubType')}: {clase.club_tipo}
                      </div>
                    )}
                    <RequirementsList requisitos={requisitosByClase[claseId]} t={t} />
                  </div>
                  {canManage && (
                  <button
                    type="button"
                    onClick={() => unassignClase(row.id)}
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
