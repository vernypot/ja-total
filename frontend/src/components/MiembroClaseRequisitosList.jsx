import { useEffect, useMemo, useState } from 'react';
import { groupRequisitosBySeccion, getRequisitoDisplayText } from '../mvc/models/clases.model';

function sectionTitle(seccion) {
  const roman = seccion.numero_romano ? `${seccion.numero_romano}. ` : '';
  return `${roman}${seccion.nombre}`;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildDraft(completion, defaultValidatorName) {
  return {
    completado: completion?.completado || false,
    fecha_completado: completion?.fecha_completado || '',
    validado_por_nombre: completion?.validado_por_nombre || defaultValidatorName || '',
    comentarios: completion?.comentarios || '',
    texto_reemplazo: completion?.texto_reemplazo || '',
    usar_texto_alternativo: completion?.usar_texto_alternativo || false,
  };
}

const actionBtnStyle = (completed) => ({
  padding: '3px 9px',
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
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
});

const memberRequisitoBtnStyle = (variant) => ({
  padding: '4px 10px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  backgroundColor: variant === 'completed' ? '#ecfdf5' : variant === 'pending' ? '#fffbeb' : '#4338ca',
  color: variant === 'completed' ? '#059669' : variant === 'pending' ? '#b45309' : '#ffffff',
  border: `1px solid ${variant === 'completed' ? '#a7f3d0' : variant === 'pending' ? '#fcd34d' : '#3730a3'}`,
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
  flexShrink: 0,
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
});

function RequisitoTextSection({ req, draft, setDraft, canManage, saving, t }) {
  const catalogAlt = req.texto_opcional?.trim();
  const hasCustomText = draft.usar_texto_alternativo || draft.texto_reemplazo?.trim();
  const activeText = getRequisitoDisplayText(req, draft);

  if (!canManage) {
    if (!draft.usar_texto_alternativo) return null;
    return (
      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: 'var(--color-text-muted)' }}>
        <span>{t('requirementActiveText')}: </span>
        <span style={{ color: '#374151' }}>{activeText}</span>
      </div>
    );
  }

  return (
    <details
      open={hasCustomText || undefined}
      style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}
    >
      <summary style={{ fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
        {t('requirementTextCustomization')}
      </summary>
      <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={draft.usar_texto_alternativo}
            disabled={saving}
            onChange={e => setDraft(prev => ({ ...prev, usar_texto_alternativo: e.target.checked }))}
          />
          <span>{t('requirementUseAlternativeText')}</span>
        </label>
        {catalogAlt && (
          <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>
            {t('requirementOptionalText')}: {catalogAlt}
          </p>
        )}
        <label style={{ display: 'grid', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{t('requirementMemberReplacement')}</span>
          <textarea
            value={draft.texto_reemplazo}
            disabled={saving || !draft.usar_texto_alternativo}
            rows={2}
            placeholder={t('requirementMemberReplacementPlaceholder')}
            onChange={e => setDraft(prev => ({ ...prev, texto_reemplazo: e.target.value }))}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb', resize: 'vertical', fontSize: '12px' }}
          />
        </label>
      </div>
    </details>
  );
}

function RequisitoCompletionModal({
  req,
  completion,
  canManage,
  saving,
  defaultValidatorName,
  solicitud = null,
  onRequestApproval,
  t,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(() => buildDraft(completion, defaultValidatorName));
  const [requestComment, setRequestComment] = useState('');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setDraft(buildDraft(completion, defaultValidatorName));
  }, [completion, defaultValidatorName]);

  const readOnly = !canManage;
  const pendingReview = solicitud?.estado === 'pendiente';
  const rejected = solicitud?.estado === 'rechazado';
  const canRequest = readOnly && !draft.completado && !pendingReview && onRequestApproval;

  async function handleRequestApproval() {
    if (!onRequestApproval) return;
    setRequesting(true);
    const ok = await onRequestApproval(requestComment.trim() || null);
    setRequesting(false);
    if (ok) onClose();
  }

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
          maxWidth: '420px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.18)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#111827' }}>{t('requirementDetails')}</h3>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#4b5563', lineHeight: 1.45 }}>
              {req.numero != null && <strong>{req.numero}. </strong>}
              {getRequisitoDisplayText(req, completion)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('cancel')}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}>
          {readOnly ? (
            <>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>{t('requirementCompleted')}: </span>
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
              {draft.comentarios && (
                <div>
                  <span style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>{t('requirementComments')}</span>
                  <p style={{ margin: 0, color: '#374151', whiteSpace: 'pre-wrap' }}>{draft.comentarios}</p>
                </div>
              )}
              {pendingReview && (
                <div style={{ padding: '10px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fcd34d', fontSize: '12px', color: '#92400e' }}>
                  {t('approvalRequestPending')}
                  {solicitud.comentario_miembro && (
                    <p style={{ margin: '6px 0 0', color: '#78350f' }}>{solicitud.comentario_miembro}</p>
                  )}
                </div>
              )}
              {rejected && (
                <div style={{ padding: '10px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '12px', color: '#991b1b' }}>
                  {t('approvalRequestRejected')}
                  {solicitud.comentario_lider && (
                    <p style={{ margin: '6px 0 0' }}>{solicitud.comentario_lider}</p>
                  )}
                </div>
              )}
              {canRequest && (
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{t('approvalRequestComment')}</span>
                  <textarea
                    value={requestComment}
                    disabled={requesting}
                    rows={2}
                    placeholder={t('approvalRequestCommentPlaceholder')}
                    onChange={e => setRequestComment(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb', resize: 'vertical', fontSize: '12px' }}
                  />
                </label>
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
                <span>{t('requirementCompleted')}</span>
              </label>
              <label style={{ display: 'grid', gap: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{t('dateCompleted')}</span>
                <input
                  type="date"
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
                  placeholder={t('requirementCommentsPlaceholder')}
                  onChange={e => setDraft(prev => ({ ...prev, comentarios: e.target.value }))}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb', resize: 'vertical' }}
                />
              </label>
            </>
          )}

          <RequisitoTextSection
            req={req}
            draft={draft}
            setDraft={setDraft}
            canManage={canManage}
            saving={saving}
            t={t}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px', flexWrap: 'wrap' }}>
          {!canManage && canRequest && (
            <button
              type="button"
              disabled={requesting}
              onClick={handleRequestApproval}
              style={{
                padding: '8px 14px',
                backgroundColor: '#4338ca',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: requesting ? 'wait' : 'pointer',
                fontSize: '13px',
                marginRight: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span aria-hidden="true">✉️</span>
              {requesting ? t('submittingApprovalRequest') : t('requestApproval')}
            </button>
          )}
          {!canManage && (
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
            >
              {t('close')}
            </button>
          )}
          {canManage && (
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
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? t('saving') : t('save')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RequisitoRow({
  req,
  completion,
  solicitud,
  saving,
  canManage,
  onOpen,
  t,
}) {
  const completed = completion?.completado;
  const pendingReview = solicitud?.estado === 'pendiente';
  const usingAlt = completion?.usar_texto_alternativo;
  const displayText = getRequisitoDisplayText(req, completion);
  const title = completed ? t('requirementCompleted') : t('requirementDetails');

  let buttonLabel;
  let buttonIcon;
  let ariaLabel;

  if (canManage) {
    buttonLabel = null;
    buttonIcon = '⋯';
    ariaLabel = title;
  } else if (completed) {
    buttonIcon = '👁';
    buttonLabel = t('viewRequirement');
    ariaLabel = t('viewRequirement');
  } else if (pendingReview) {
    buttonIcon = '⏳';
    buttonLabel = t('approvalRequestPendingShort');
    ariaLabel = t('approvalRequestPending');
  } else {
    buttonIcon = '✉️';
    buttonLabel = t('requestApproval');
    ariaLabel = t('requestApproval');
  }

  const memberVariant = completed ? 'completed' : pendingReview ? 'pending' : 'request';

  return (
    <li style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
      <span
        style={{
          flex: 1,
          fontStyle: completed ? 'italic' : 'normal',
          color: completed ? '#059669' : 'inherit',
        }}
      >
        {completed && (
          <span style={{ marginRight: '5px', fontStyle: 'normal', fontWeight: 700 }} aria-hidden="true">
            ✓
          </span>
        )}
        {req.numero != null && <strong style={{ fontStyle: 'normal' }}>{req.numero}. </strong>}
        {displayText}
        {pendingReview && (
          <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 600, color: '#b45309', fontStyle: 'normal' }}>
            ({t('approvalRequestPendingShort')})
          </span>
        )}
        {usingAlt && (
          <span
            title={t('requirementAlternativeText')}
            style={{
              marginLeft: '6px',
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              fontStyle: 'normal',
            }}
          >
            ({t('requirementOptionalTextShort')})
          </span>
        )}
      </span>
      <button
        type="button"
        title={ariaLabel}
        aria-label={ariaLabel}
        disabled={saving}
        onClick={() => onOpen(req)}
        style={canManage ? actionBtnStyle(completed) : memberRequisitoBtnStyle(memberVariant)}
      >
        {canManage ? (
          buttonIcon
        ) : (
          <>
            <span aria-hidden="true">{buttonIcon}</span>
            <span>{buttonLabel}</span>
          </>
        )}
      </button>
    </li>
  );
}

export default function MiembroClaseRequisitosList({
  requisitos = [],
  secciones = [],
  completions = {},
  solicitudes = {},
  canManage = false,
  savingRequisitoId = null,
  onSaveRequisito,
  onRequestRequisitoApproval,
  defaultValidatorName = '',
  t,
  compact = true,
}) {
  const [modalReq, setModalReq] = useState(null);
  const { grouped, ungrouped } = groupRequisitosBySeccion(requisitos, secciones);

  const sortedUngrouped = useMemo(
    () => [...ungrouped].sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999)),
    [ungrouped]
  );

  if (!grouped.length && !sortedUngrouped.length) {
    return (
      <p style={{ margin: '8px 0', fontSize: compact ? '12px' : '13px', color: 'var(--color-text-muted)' }}>
        {t('noRequirements')}
      </p>
    );
  }

  let lastParte = null;
  const fontSize = compact ? '12px' : '13px';

  async function handleSave(draft) {
    if (!modalReq) return;
    const ok = await onSaveRequisito(modalReq.id, draft);
    if (ok) setModalReq(null);
  }

  return (
    <>
      <div style={{ display: 'grid', gap: compact ? '10px' : '14px', marginTop: compact ? '6px' : '8px' }}>
        {grouped.map(({ seccion, requisitos: sectionReqs }) => {
          const showParte = seccion.parte && seccion.parte !== lastParte;
          lastParte = seccion.parte;
          return (
            <div key={seccion.id}>
              {showParte && (
                <div style={{
                  fontSize: compact ? '11px' : '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#4338ca',
                  marginBottom: '6px',
                }}>
                  {seccion.parte === 'avanzado' ? t('classReqPartAdvanced') : t('classReqPartBasic')}
                </div>
              )}
              <div style={{ fontWeight: 600, fontSize: compact ? '12px' : '13px', color: '#374151', marginBottom: '4px' }}>
                {sectionTitle(seccion)}
              </div>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize, color: '#4b5563' }}>
                {sectionReqs.map(req => (
                  <RequisitoRow
                    key={req.id}
                    req={req}
                    completion={completions[req.id]}
                    solicitud={solicitudes[req.id]}
                    saving={savingRequisitoId === req.id}
                    canManage={canManage}
                    onOpen={setModalReq}
                    t={t}
                  />
                ))}
              </ol>
            </div>
          );
        })}

        {sortedUngrouped.length > 0 && (
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize, color: '#4b5563' }}>
            {sortedUngrouped.map(req => (
              <RequisitoRow
                key={req.id}
                req={req}
                completion={completions[req.id]}
                solicitud={solicitudes[req.id]}
                saving={savingRequisitoId === req.id}
                canManage={canManage}
                onOpen={setModalReq}
                t={t}
              />
            ))}
          </ol>
        )}
      </div>

      {modalReq && (
        <RequisitoCompletionModal
          req={modalReq}
          completion={completions[modalReq.id]}
          solicitud={solicitudes[modalReq.id]}
          canManage={canManage}
          saving={savingRequisitoId === modalReq.id}
          defaultValidatorName={defaultValidatorName}
          onRequestApproval={
            onRequestRequisitoApproval
              ? comentario => onRequestRequisitoApproval(modalReq.id, comentario)
              : null
          }
          t={t}
          onClose={() => setModalReq(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
