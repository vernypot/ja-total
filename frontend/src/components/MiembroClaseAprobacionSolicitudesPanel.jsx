import { useMemo, useState } from 'react';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { formatSolicitudTarget } from '../mvc/models/clases.model';
import ApprovalSolicitudReviewModal from './ApprovalSolicitudReviewModal';

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
        <ApprovalSolicitudReviewModal
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
