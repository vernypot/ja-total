import { useState } from 'react';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { formatSolicitudTarget } from '../mvc/models/clases.model';
import { filterVisiblePendingApprovals } from '../mvc/models/home.model';
import ApprovalSolicitudReviewModal from './ApprovalSolicitudReviewModal';

export default function AdminPendingApprovalsPanel({
  solicitudes = [],
  reviewingSolicitudId = null,
  onReview,
  memberName,
  formatRequestedDate,
  goToMemberClasses,
  t,
}) {
  const [activeRow, setActiveRow] = useState(null);
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });

  const pending = filterVisiblePendingApprovals(solicitudes);

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
    <section className="portal-home-section portal-home-section--priority">
      <div className="portal-home-section-head">
        <h2>✅ {t('homePendingApprovals')} ({pending.length})</h2>
      </div>
      <div className="portal-home-card-list">
        {pending.map(row => (
          <article key={row.id} className="portal-home-update-card admin-approval-card">
            <div className="portal-home-update-icon">⏳</div>
            <div className="home-item-main">
              <strong>{memberName(row.miembros)}</strong>
              <span className="admin-approval-type">
                {row.tipo === 'clase' ? t('approvalRequestTypeClase') : t('approvalRequestTypeRequisito')}
              </span>
              {row.clases_progresivas?.nombre && (
                <span>{row.clases_progresivas.nombre}</span>
              )}
              <span>{formatSolicitudTarget(row, t)}</span>
              {row.solicitado_at && (
                <span className="admin-approval-date">
                  {t('homeApprovalRequestedAt').replace('{date}', formatRequestedDate(row.solicitado_at))}
                </span>
              )}
              {row.comentario_miembro && (
                <span className="admin-approval-comment">{row.comentario_miembro}</span>
              )}
            </div>
            <div className="portal-home-card-actions admin-approval-actions">
              <button
                type="button"
                className="admin-approval-review-btn"
                disabled={reviewingSolicitudId === row.id}
                onClick={() => setActiveRow(row)}
              >
                {t('approvalRequestReview')}
              </button>
              <button
                type="button"
                className="portal-home-section-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={() => goToMemberClasses(row.miembro_id)}
              >
                {t('homeViewMemberClasses')}
              </button>
            </div>
          </article>
        ))}
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
    </section>
  );
}
