import { useEffect, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ListPagination from '../../components/ListPagination';
import { PageHelpLink } from '../../components/PageHelp';
import DatePickerInput from '../../components/DatePickerInput';
import MiembroClaseRequisitosList from '../../components/MiembroClaseRequisitosList';
import MiembroClaseAprobacionSolicitudesPanel from '../../components/MiembroClaseAprobacionSolicitudesPanel';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const honorActionBtnStyle = (completed) => ({
  padding: '4px 10px',
  minWidth: '30px',
  backgroundColor: completed ? '#059669' : '#2563eb',
  color: '#ffffff',
  border: `1px solid ${completed ? '#047857' : '#1d4ed8'}`,
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 700,
  flexShrink: 0,
  lineHeight: 1.3,
});

function HonorCompletionModal({
  honorNombre,
  assignment,
  canManage,
  saving,
  defaultValidatorName,
  t,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(() => ({
    completado: assignment?.completado || false,
    fecha_completado: assignment?.fecha_completado || '',
    validado_por_nombre: assignment?.validado_por_nombre || defaultValidatorName || '',
    comentarios: assignment?.comentarios || '',
  }));

  useEffect(() => {
    setDraft({
      completado: assignment?.completado || false,
      fecha_completado: assignment?.fecha_completado || '',
      validado_por_nombre: assignment?.validado_por_nombre || defaultValidatorName || '',
      comentarios: assignment?.comentarios || '',
    });
  }, [assignment, defaultValidatorName]);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#111827' }}>{t('honorProgress')}</h3>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#4b5563' }}>{honorNombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}>
          {!canManage ? (
            <>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>{t('honorCompleted')}: </span>
                <strong style={{ color: draft.completado ? '#059669' : '#6b7280' }}>
                  {draft.completado ? '✓' : t('requirementPending')}
                </strong>
              </div>
              {draft.completado && draft.fecha_completado && (
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>{t('dateCompleted')}: </span>
                  <strong>{draft.fecha_completado}</strong>
                </div>
              )}
              {draft.validado_por_nombre && (
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>{t('validatedBy')}: </span>
                  <strong>{draft.validado_por_nombre}</strong>
                </div>
              )}
            </>
          ) : (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={draft.completado}
                  disabled={saving}
                  onChange={e => {
                    const checked = e.target.checked;
                    setDraft(prev => ({
                      ...prev,
                      completado: checked,
                      fecha_completado: checked ? (prev.fecha_completado || todayIsoDate()) : '',
                    }));
                  }}
                />
                <span>{t('honorCompleted')}</span>
              </label>
              <label style={{ display: 'grid', gap: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{t('dateCompleted')}</span>
                <DatePickerInput
                  value={draft.fecha_completado}
                  disabled={saving || !draft.completado}
                  onChange={e => setDraft(prev => ({ ...prev, fecha_completado: e.target.value }))}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              </label>
              <label style={{ display: 'grid', gap: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{t('validatedBy')}</span>
                <input
                  type="text"
                  value={draft.validado_por_nombre}
                  disabled={saving}
                  placeholder={t('validatedByPlaceholder')}
                  onChange={e => setDraft(prev => ({ ...prev, validado_por_nombre: e.target.value }))}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              </label>
              <label style={{ display: 'grid', gap: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{t('requirementComments')}</span>
                <textarea
                  value={draft.comentarios}
                  disabled={saving}
                  rows={3}
                  onChange={e => setDraft(prev => ({ ...prev, comentarios: e.target.value }))}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb', resize: 'vertical' }}
                />
              </label>
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
          {canManage ? (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '8px 14px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={saving || (draft.completado && !draft.fecha_completado)}
                onClick={() => onSave(draft)}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: saving ? 'wait' : 'pointer',
                  fontSize: '13px',
                }}
              >
                {saving ? t('saving') : t('save')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
            >
              {t('close')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HonorApprovalRequestModal({
  honorNombre,
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
          {t('requestHonorApprovalConfirmTitle')}
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#4b5563', lineHeight: 1.5 }}>
          {t('requestHonorApprovalConfirmMessage')}
        </p>
        <p style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
          {honorNombre}
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

export default function MiembroEspecialidadesView({
  assigned,
  unassigned,
  unassignedGrouped,
  requisitosByEsp,
  completionsByAssignment = {},
  solicitudes = [],
  solicitudesByAssignment = {},
  reviewSolicitud,
  reviewingSolicitudId = null,
  requestRequisitoApproval,
  requestEspecialidadApproval,
  saveRequisitoCompletion,
  saveAssignmentProgress,
  savingRequisitoKey = null,
  savingAssignmentId = null,
  requestingKey = null,
  memberTipos,
  error,
  loading,
  selectedEspecialidadId,
  setSelectedEspecialidadId,
  assignEspecialidad,
  unassignEspecialidad,
  canManage = false,
  canRequestApproval = false,
  defaultValidatorName = '',
  getEspecialidadFromLink,
  getLinkEspecialidadId,
  listPagination,
  unassignedListPagination,
}) {
  const { t } = useLanguage();
  const [expandedRequisitos, setExpandedRequisitos] = useState({});
  const [progressRow, setProgressRow] = useState(null);
  const [honorApprovalRow, setHonorApprovalRow] = useState(null);
  const [honorApprovalComment, setHonorApprovalComment] = useState('');
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });

  function toggleRequisitos(assignmentId) {
    setExpandedRequisitos(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId],
    }));
  }

  function confirmUnassignSpecialty(linkId, specialtyName) {
    askConfirm({
      title: t('confirmUnassignSpecialtyTitle'),
      message: t('confirmUnassignSpecialtyMessage'),
      highlight: specialtyName,
      confirmLabel: t('remove'),
      onConfirm: async () => { await unassignEspecialidad(linkId); },
    });
  }

  if (loading) {
    return <p>{t('loadingData')}</p>;
  }

  return (
    <div>
      <h3>{t('tabSpecialties')} <PageHelpLink pageId="memberSpecialties" compact /></h3>
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
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {t('noAssignableHonors')}
          </p>
        )}
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

      <h4>{t('assignedSpecialties')}</h4>
      <ListPagination {...listPagination} />
      {assigned.length === 0 ? (
        <p className="text-muted">{t('noAssignedSpecialties')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {assigned.map(row => {
            const esp = getEspecialidadFromLink(row);
            const espId = getLinkEspecialidadId(row);
            const honorCompleted = Boolean(row.completado);
            const requisitos = (requisitosByEsp[espId] || [])
              .filter(r => (r.estado || 'activo') === 'activo')
              .map((r, index) => ({ ...r, numero: index + 1 }));
            const assignmentSolicitudes = solicitudesByAssignment[row.id]?.requisitos || {};
            const honorSolicitud = solicitudesByAssignment[row.id]?.especialidad || null;
            const honorPendingReview = honorSolicitud?.estado === 'pendiente';
            const requisitosExpanded = Boolean(expandedRequisitos[row.id]);
            const completedCount = requisitos.filter(r => completionsByAssignment[row.id]?.[r.id]?.completado).length;
            return (
              <div key={row.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong
                        style={{
                          fontStyle: honorCompleted ? 'italic' : 'normal',
                          color: honorCompleted ? '#059669' : '#111827',
                        }}
                      >
                        {esp?.nombre || t('notAvailable')}
                      </strong>
                      {honorCompleted && (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>
                          ✓ {t('honorCompleted')}
                          {row.fecha_completado ? ` (${row.fecha_completado})` : ''}
                        </span>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          title={t('honorProgress')}
                          aria-label={t('honorProgress')}
                          onClick={() => setProgressRow(row)}
                          style={honorActionBtnStyle(honorCompleted)}
                        >
                          {honorCompleted ? '✓' : '⋯'}
                        </button>
                      )}
                    </div>
                    {esp?.club_tipo && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        {t('clubType')}: {esp.club_tipo}
                      </div>
                    )}
                    {!canManage && canRequestApproval && !honorCompleted && (
                      <div style={{ marginTop: '8px' }}>
                        {honorPendingReview ? (
                          <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>
                            {t('approvalRequestPending')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!requestEspecialidadApproval}
                            onClick={() => {
                              setHonorApprovalComment('');
                              setHonorApprovalRow(row);
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
                            {t('requestHonorApproval')}
                          </button>
                        )}
                        {honorSolicitud?.estado === 'rechazado' && (
                          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#991b1b' }}>
                            {t('approvalRequestRejected')}
                            {honorSolicitud.comentario_lider ? `: ${honorSolicitud.comentario_lider}` : ''}
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
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
                            {' '}({completedCount}/{requisitos.length})
                          </span>
                        )}
                      </button>
                    )}
                    {requisitosExpanded && (
                      <MiembroClaseRequisitosList
                        requisitos={requisitos}
                        completions={completionsByAssignment[row.id] || {}}
                        solicitudes={assignmentSolicitudes}
                        canManage={canManage}
                        allowTextCustomization={false}
                        savingRequisitoId={
                          savingRequisitoKey?.startsWith(`${row.id}:`)
                            ? savingRequisitoKey.split(':')[1]
                            : null
                        }
                        onSaveRequisito={(especialidadRequisitoId, draft) =>
                          saveRequisitoCompletion?.(row.id, especialidadRequisitoId, draft)
                        }
                        onRequestRequisitoApproval={
                          requestRequisitoApproval
                            ? (especialidadRequisitoId, comentario) =>
                                requestRequisitoApproval(row.id, especialidadRequisitoId, comentario)
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
                    onClick={() => confirmUnassignSpecialty(row.id, esp?.nombre || t('notAvailable'))}
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
      {listPagination?.totalPages > 1 && <ListPagination {...listPagination} />}

      {progressRow && (
        <HonorCompletionModal
          honorNombre={getEspecialidadFromLink(progressRow)?.nombre || t('notAvailable')}
          assignment={progressRow}
          canManage={canManage}
          saving={savingAssignmentId === progressRow.id}
          defaultValidatorName={defaultValidatorName}
          t={t}
          onClose={() => setProgressRow(null)}
          onSave={async draft => {
            const ok = await saveAssignmentProgress?.(progressRow.id, draft);
            if (ok) setProgressRow(null);
          }}
        />
      )}

      {honorApprovalRow && (
        <HonorApprovalRequestModal
          honorNombre={getEspecialidadFromLink(honorApprovalRow)?.nombre || t('notAvailable')}
          comment={honorApprovalComment}
          onCommentChange={setHonorApprovalComment}
          submitting={requestingKey === `${honorApprovalRow.id}:especialidad`}
          t={t}
          onClose={() => setHonorApprovalRow(null)}
          onConfirm={async () => {
            const ok = await requestEspecialidadApproval?.(honorApprovalRow.id, honorApprovalComment.trim() || null);
            if (ok) setHonorApprovalRow(null);
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}
