import { useMemo, useState } from 'react';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { getRequisitoDisplayText } from '../mvc/models/clases.model';

function formatSolicitudTarget(row, t) {
  if (row.tipo === 'clase') {
    return row.clases_progresivas?.nombre || t('classProgress');
  }
  const req = row.clase_requisitos;
  if (!req) return t('approvalRequestTypeRequisito');
  const text = getRequisitoDisplayText(req, null);
  return req.numero != null ? `${req.numero}. ${text}` : text;
}

function SolicitudReviewModal({ row, saving, t, onClose, onReview, onRejectRequest }) {
  const [comentario, setComentario] = useState('');

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
          maxWidth: '460px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>{formatSolicitudTarget(row, t)}</h3>
        <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          {row.tipo === 'clase' ? t('approvalRequestTypeClase') : t('approvalRequestTypeRequisito')}
        </p>
        {row.comentario_miembro && (
          <div style={{ marginBottom: '12px', fontSize: '13px' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>{t('approvalRequestMemberComment')}: </span>
            <span style={{ whiteSpace: 'pre-wrap' }}>{row.comentario_miembro}</span>
          </div>
        )}
        <label style={{ display: 'grid', gap: '4px', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{t('approvalRequestLeaderComment')}</span>
          <textarea
            value={comentario}
            disabled={saving}
            rows={3}
            onChange={e => setComentario(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb', resize: 'vertical', fontSize: '13px' }}
          />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{ padding: '8px 14px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onRejectRequest(comentario)}
            style={{ padding: '8px 14px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'wait' : 'pointer', fontSize: '13px' }}
          >
            {t('approvalRequestReject')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onReview(true, comentario)}
            style={{ padding: '8px 14px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'wait' : 'pointer', fontSize: '13px' }}
          >
            {saving ? t('saving') : t('approvalRequestApprove')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MiembroClaseAprobacionSolicitudesPanel({
  solicitudes = [],
  reviewingSolicitudId = null,
  onReview,
  t,
}) {
  const [activeRow, setActiveRow] = useState(null);
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });

  const pending = useMemo(
    () => (solicitudes || []).filter(row => row.estado === 'pendiente'),
    [solicitudes]
  );

  function requestReject(comentario) {
    if (!activeRow) return;
    askConfirm({
      title: t('confirmRejectApprovalTitle'),
      message: t('confirmRejectApprovalMessage'),
      highlight: formatSolicitudTarget(activeRow, t),
      confirmLabel: t('approvalRequestReject'),
      onConfirm: async () => {
        const ok = await onReview(activeRow.id, false, comentario);
        if (ok) setActiveRow(null);
      },
    });
  }

  if (!pending.length) return null;

  return (
    <>
      <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#92400e' }}>
          {t('approvalRequestsTitle')} ({pending.length})
        </h4>
        <div style={{ display: 'grid', gap: '8px' }}>
          {pending.map(row => (
            <div
              key={row.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '10px',
                backgroundColor: 'white',
                borderRadius: '6px',
                border: '1px solid #fde68a',
                fontSize: '13px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#111827' }}>
                  {row.clases_progresivas?.nombre || t('notAvailable')}
                </div>
                <div style={{ color: '#4b5563', marginTop: '2px' }}>{formatSolicitudTarget(row, t)}</div>
                {row.comentario_miembro && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {row.comentario_miembro}
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={reviewingSolicitudId === row.id}
                onClick={() => setActiveRow(row)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: reviewingSolicitudId === row.id ? 'wait' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {t('approvalRequestReview')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {activeRow && (
        <SolicitudReviewModal
          row={activeRow}
          saving={reviewingSolicitudId === activeRow.id}
          t={t}
          onClose={() => {
            if (reviewingSolicitudId === activeRow.id) return;
            setActiveRow(null);
          }}
          onRejectRequest={requestReject}
          onReview={async (aprobar, comentario) => {
            const ok = await onReview(activeRow.id, aprobar, comentario);
            if (ok) setActiveRow(null);
          }}
        />
      )}
      {confirmDialog}
    </>
  );
}
