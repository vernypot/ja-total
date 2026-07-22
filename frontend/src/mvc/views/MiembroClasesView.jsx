import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import MiembroClaseRequisitosList from '../../components/MiembroClaseRequisitosList';
import MiembroClaseAprobacionSolicitudesPanel from '../../components/MiembroClaseAprobacionSolicitudesPanel';
import MiembroClaseProgressModal from '../../components/MiembroClaseProgressModal';
import MiembroClaseHistorialModal from '../../components/MiembroClaseHistorialModal';
import MiembroClaseProgresoEstadoBadge from '../../components/MiembroClaseProgresoEstadoBadge';
import {
  resolveMiembroClaseProgresoEstado,
  resolveHistorialEstado,
  miembroClaseProgresoEstadoLabel,
  miembroClaseProgresoEstadoStyle,
} from '../../constants/miembroClaseProgresoEstado';
import { clubDisplayName } from '../../utils/club';
import ListPagination from '../../components/ListPagination';
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

function HistorialEstadoBadge({ row, t }) {
  const estado = resolveHistorialEstado(row);
  if (!estado) {
    return (
      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
        {t('memberClassStatusUnspecified')}
      </span>
    );
  }
  const style = miembroClaseProgresoEstadoStyle(estado);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        lineHeight: 1.3,
        backgroundColor: style.background,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {miembroClaseProgresoEstadoLabel(estado, t)}
    </span>
  );
}

function historialClubLabel(row) {
  if (row.clubes) return clubDisplayName(row.clubes);
  if (row.club_nombre) return row.club_nombre;
  return '';
}

function ClaseApprovalRequestModal({
  claseNombre,
  comment,
  onCommentChange,
  submitting,
  t,
  onClose,
  onConfirm,
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#111827' }}>
          {t('requestClassApprovalConfirmTitle')}
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#4b5563', lineHeight: 1.5 }}>
          {t('requestClassApprovalConfirmMessage')}
        </p>
        <p style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
          {claseNombre}
        </p>
        <label style={{ display: 'grid', gap: '4px', marginBottom: '18px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{t('approvalRequestComment')}</span>
          <textarea
            value={comment}
            disabled={submitting}
            rows={3}
            placeholder={t('approvalRequestCommentPlaceholder')}
            onChange={e => onCommentChange(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb', resize: 'vertical', fontSize: '13px' }}
          />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            style={{ padding: '8px 14px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            style={{
              padding: '8px 14px',
              backgroundColor: '#4338ca',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: submitting ? 'wait' : 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {submitting ? t('submittingApprovalRequest') : t('requestClassApprovalConfirmSubmit')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MiembroClasesView({
  assigned,
  unassigned,
  requisitosByClase,
  seccionesByClase = {},
  completionsByAssignment,
  solicitudesByAssignment = {},
  memberTipos,
  error,
  loading,
  selectedClaseId,
  setSelectedClaseId,
  assignClase,
  unassignClase,
  saveRequisitoCompletion,
  saveAssignmentProgress,
  requestRequisitoApproval,
  requestClaseApproval,
  requestingKey = null,
  savingRequisitoKey,
  savingAssignmentId,
  canManage = false,
  defaultValidatorName = '',
  getClaseFromLink,
  getLinkClaseId,
  historial = [],
  catalogClases = [],
  memberClubs = [],
  saveHistorial,
  deleteHistorial,
  savingHistorialId = null,
  solicitudes = [],
  reviewSolicitud,
  reviewingSolicitudId = null,
  listPagination,
  unassignedListPagination,
}) {
  const { t } = useLanguage();
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });
  const [progressModalRow, setProgressModalRow] = useState(null);
  const [historialModalRow, setHistorialModalRow] = useState(undefined);
  const [expandedRequisitos, setExpandedRequisitos] = useState({});
  const [classApprovalModalRow, setClassApprovalModalRow] = useState(null);
  const [classApprovalModalComment, setClassApprovalModalComment] = useState('');

  function toggleRequisitos(assignmentId) {
    setExpandedRequisitos(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId],
    }));
  }

  function confirmDeactivateClass(linkId, claseNombre) {
    askConfirm({
      title: t('confirmDeactivateClassTitle'),
      message: t('confirmDeactivateClassMessage'),
      highlight: claseNombre,
      confirmLabel: t('deactivateClass'),
      onConfirm: async () => { await unassignClase(linkId); },
    });
  }

  function confirmDeleteHistorialRow(rowId, className) {
    askConfirm({
      title: t('confirmDeleteHistorialClassTitle'),
      message: t('deleteHistorialClassConfirm'),
      highlight: className,
      confirmLabel: t('delete'),
      onConfirm: async () => { await deleteHistorial(rowId); },
    });
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
        <ListPagination {...unassignedListPagination} />
      </div>
      )}

      {canManage && reviewSolicitud && (
        <MiembroClaseAprobacionSolicitudesPanel
          solicitudes={solicitudes}
          reviewingSolicitudId={reviewingSolicitudId}
          onReview={reviewSolicitud}
          t={t}
        />
      )}

      <h4>{t('assignedClasses')}</h4>
      <ListPagination {...listPagination} />
      {assigned.length === 0 ? (
        <p className="text-muted">{t('noAssignedClasses')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {assigned.map(row => {
            const clase = getClaseFromLink(row);
            const claseId = getLinkClaseId(row);
            const estadoProgreso = resolveMiembroClaseProgresoEstado(row);
            const classCompleted = estadoProgreso === 'completada' || estadoProgreso === 'investida';
            const requisitos = requisitosByClase[claseId] || [];
            const secciones = seccionesByClase[claseId] || [];
            const assignmentSolicitudes = solicitudesByAssignment[row.id]?.requisitos || {};
            const claseSolicitud = solicitudesByAssignment[row.id]?.clase || null;
            const clasePendingReview = claseSolicitud?.estado === 'pendiente';
            const requisitosExpanded = expandedRequisitos[row.id] ?? !canManage;
            return (
              <div key={row.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong
                        style={{
                          fontStyle: classCompleted ? 'italic' : 'normal',
                          color: classCompleted ? '#059669' : '#111827',
                        }}
                      >
                        {clase?.nombre || t('notAvailable')}
                      </strong>
                      <MiembroClaseProgresoEstadoBadge assignment={row} t={t} compact />
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
                    {!canManage && !classCompleted && (
                      <div style={{ marginTop: '8px' }}>
                        {clasePendingReview ? (
                          <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>
                            {t('approvalRequestPending')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!requestClaseApproval}
                            onClick={() => {
                              setClassApprovalModalComment('');
                              setClassApprovalModalRow(row);
                            }}
                            style={{
                              marginTop: '4px',
                              padding: '6px 12px',
                              backgroundColor: '#4338ca',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span aria-hidden="true">✉️</span>
                            {t('requestClassApproval')}
                          </button>
                        )}
                        {claseSolicitud?.estado === 'rechazado' && (
                          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#991b1b' }}>
                            {t('approvalRequestRejected')}
                            {claseSolicitud.comentario_lider ? `: ${claseSolicitud.comentario_lider}` : ''}
                          </p>
                        )}
                      </div>
                    )}
                    {(canManage || requisitos.length > 0) && (
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
                    )}
                    {requisitosExpanded && (
                      <MiembroClaseRequisitosList
                        requisitos={requisitos}
                        secciones={secciones}
                        completions={completionsByAssignment[row.id] || {}}
                        solicitudes={assignmentSolicitudes}
                        canManage={canManage}
                        savingRequisitoId={
                          savingRequisitoKey?.startsWith(`${row.id}:`)
                            ? savingRequisitoKey.split(':')[1]
                            : null
                        }
                        onSaveRequisito={(claseRequisitoId, draft) =>
                          saveRequisitoCompletion(row.id, claseRequisitoId, draft)
                        }
                        onRequestRequisitoApproval={
                          requestRequisitoApproval
                            ? (claseRequisitoId, comentario) =>
                                requestRequisitoApproval(row.id, claseRequisitoId, comentario)
                            : null
                        }
                        defaultValidatorName={defaultValidatorName}
                        t={t}
                      />
                    )}
                  </div>
                  {canManage && (
                  <button
                    type="button"
                    onClick={() => confirmDeactivateClass(row.id, clase?.nombre || t('notAvailable'))}
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
      {listPagination?.totalPages > 1 && <ListPagination {...listPagination} />}

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

      {classApprovalModalRow && (
        <ClaseApprovalRequestModal
          claseNombre={getClaseFromLink(classApprovalModalRow)?.nombre || t('notAvailable')}
          comment={classApprovalModalComment}
          onCommentChange={setClassApprovalModalComment}
          submitting={requestingKey === `${classApprovalModalRow.id}:clase`}
          t={t}
          onClose={() => {
            if (requestingKey === `${classApprovalModalRow.id}:clase`) return;
            setClassApprovalModalRow(null);
            setClassApprovalModalComment('');
          }}
          onConfirm={async () => {
            if (!requestClaseApproval) return;
            const ok = await requestClaseApproval(
              classApprovalModalRow.id,
              classApprovalModalComment.trim() || null
            );
            if (ok) {
              setClassApprovalModalRow(null);
              setClassApprovalModalComment('');
            }
          }}
        />
      )}

      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '28px 0 20px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div>
          <h4 style={{ margin: 0 }}>{t('historialClasses')}</h4>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {t('historialClassesHint')}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setHistorialModalRow(null)}
            style={{
              padding: '8px 14px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            ➕ {t('addHistorialClass')}
          </button>
        )}
      </div>

      {historial.length === 0 ? (
        <p className="text-muted">{t('noHistorialClasses')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {historial.map(row => {
            const clubLabel = historialClubLabel(row);
            const estado = resolveHistorialEstado(row);
            const completed = estado === 'completada' || estado === 'investida';
            return (
              <div key={row.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong
                        style={{
                          fontStyle: completed ? 'italic' : 'normal',
                          color: completed ? '#059669' : '#111827',
                        }}
                      >
                        {row.nombre}
                      </strong>
                      <HistorialEstadoBadge row={row} t={t} />
                      {completed && row.fecha_completado && (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          ({row.fecha_completado})
                        </span>
                      )}
                      <button
                        type="button"
                        title={t('editHistorialClass')}
                        aria-label={t('editHistorialClass')}
                        onClick={() => setHistorialModalRow(row)}
                        style={classActionBtnStyle(completed)}
                      >
                        ⋯
                      </button>
                    </div>
                    {clubLabel && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        {t('historialClub')}: {clubLabel}
                      </div>
                    )}
                    <InvestiduraSummary row={row} t={t} />
                    {row.notas && (
                      <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '6px' }}>
                        {row.notas}
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => confirmDeleteHistorialRow(row.id, row.nombre || t('notAvailable'))}
                      disabled={savingHistorialId === row.id}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: savingHistorialId === row.id ? 'wait' : 'pointer',
                        fontSize: '12px',
                        flexShrink: 0,
                        opacity: savingHistorialId === row.id ? 0.7 : 1,
                      }}
                    >
                      ✕ {t('delete')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {historialModalRow !== undefined && (
        <MiembroClaseHistorialModal
          row={historialModalRow}
          catalogClases={catalogClases}
          memberClubs={memberClubs}
          canManage={canManage}
          saving={savingHistorialId === (historialModalRow?.id || 'new')}
          defaultValidatorName={defaultValidatorName}
          t={t}
          onClose={() => setHistorialModalRow(undefined)}
          onSave={async draft => {
            const ok = await saveHistorial(historialModalRow?.id || null, draft);
            if (ok) setHistorialModalRow(undefined);
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}
