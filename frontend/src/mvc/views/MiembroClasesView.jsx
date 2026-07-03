import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import MiembroClaseRequisitosList from '../../components/MiembroClaseRequisitosList';
import MiembroClaseProgressModal from '../../components/MiembroClaseProgressModal';
import { PageHelpLink } from '../../components/PageHelp';

const classActionBtnStyle = (completed) => ({
  padding: '2px 7px',
  minWidth: '26px',
  backgroundColor: completed ? '#ecfdf5' : '#f9fafb',
  color: completed ? '#059669' : '#6b7280',
  border: `1px solid ${completed ? '#a7f3d0' : '#e5e7eb'}`,
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  flexShrink: 0,
  lineHeight: 1.4,
});

function InvestiduraSummary({ row, t }) {
  if (!row.tiene_investidura) return null;

  const parts = [];
  if (row.investidura_fecha) parts.push(row.investidura_fecha);
  if (row.investidura_lugar) parts.push(row.investidura_lugar);
  if (row.investidura_validado_por_nombre) {
    parts.push(`${t('validatedBy')}: ${row.investidura_validado_por_nombre}`);
  }

  return (
    <div style={{ fontSize: '12px', color: '#4338ca', marginTop: '6px' }}>
      <strong>{t('investidura')}:</strong>{' '}
      {parts.length > 0 ? parts.join(' · ') : t('hadInvestidura')}
    </div>
  );
}

export default function MiembroClasesView({
  assigned,
  unassigned,
  requisitosByClase,
  completionsByAssignment,
  memberTipos,
  error,
  loading,
  selectedClaseId,
  setSelectedClaseId,
  assignClase,
  unassignClase,
  saveRequisitoCompletion,
  saveAssignmentProgress,
  savingRequisitoKey,
  savingAssignmentId,
  canManage = false,
  defaultValidatorName = '',
  getClaseFromLink,
  getLinkClaseId,
}) {
  const { t } = useLanguage();
  const [progressModalRow, setProgressModalRow] = useState(null);
  const [expandedRequisitos, setExpandedRequisitos] = useState({});

  function toggleRequisitos(assignmentId) {
    setExpandedRequisitos(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId],
    }));
  }

  if (loading) {
    return <p>{t('loadingClasses')}</p>;
  }

  return (
    <div>
      <h3>{t('tabClasses')} <PageHelpLink pageId="memberClasses" compact /></h3>
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
            const classCompleted = row.completado;
            const requisitos = requisitosByClase[claseId] || [];
            const requisitosExpanded = expandedRequisitos[row.id] ?? false;
            return (
              <div key={row.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {classCompleted && (
                        <span style={{ color: '#059669', fontWeight: 700 }} aria-hidden="true">✓</span>
                      )}
                      <strong
                        style={{
                          fontStyle: classCompleted ? 'italic' : 'normal',
                          color: classCompleted ? '#059669' : '#111827',
                        }}
                      >
                        {clase?.nombre || t('notAvailable')}
                      </strong>
                      {classCompleted && row.fecha_completado && (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          ({row.fecha_completado})
                        </span>
                      )}
                      <button
                        type="button"
                        title={t('classProgress')}
                        aria-label={t('classProgress')}
                        onClick={() => setProgressModalRow(row)}
                        style={classActionBtnStyle(classCompleted)}
                      >
                        ⋯
                      </button>
                    </div>
                    {clase?.club_tipo && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        {t('clubType')}: {clase.club_tipo}
                      </div>
                    )}
                    <InvestiduraSummary row={row} t={t} />
                    <button
                      type="button"
                      onClick={() => toggleRequisitos(row.id)}
                      style={{
                        marginTop: '8px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#4338ca',
                        backgroundColor: requisitosExpanded ? '#eef2ff' : '#f9fafb',
                        border: '1px solid #c7d2fe',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {requisitosExpanded ? '▾' : '▸'}{' '}
                      {requisitosExpanded ? t('hideRequirements') : t('showRequirements')}
                      {requisitos.length > 0 && (
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}> ({requisitos.length})</span>
                      )}
                    </button>
                    {requisitosExpanded && (
                      <MiembroClaseRequisitosList
                        requisitos={requisitos}
                        completions={completionsByAssignment[row.id] || {}}
                        canManage={canManage}
                        savingRequisitoId={
                          savingRequisitoKey?.startsWith(`${row.id}:`)
                            ? savingRequisitoKey.split(':')[1]
                            : null
                        }
                        onSaveRequisito={(claseRequisitoId, draft) =>
                          saveRequisitoCompletion(row.id, claseRequisitoId, draft)
                        }
                        defaultValidatorName={defaultValidatorName}
                        t={t}
                      />
                    )}
                  </div>
                  {canManage && (
                  <button
                    type="button"
                    onClick={() => unassignClase(row.id)}
                    style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}
                  >
                    ✕ {t('deactivateClass')}
                  </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {progressModalRow && (
        <MiembroClaseProgressModal
          claseNombre={getClaseFromLink(progressModalRow)?.nombre || t('notAvailable')}
          assignment={progressModalRow}
          canManage={canManage}
          saving={savingAssignmentId === progressModalRow.id}
          defaultValidatorName={defaultValidatorName}
          t={t}
          onClose={() => setProgressModalRow(null)}
          onSave={async draft => {
            const ok = await saveAssignmentProgress(progressModalRow.id, draft);
            if (ok) setProgressModalRow(null);
          }}
        />
      )}
    </div>
  );
}
