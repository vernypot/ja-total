import { useState } from 'react';
import { formatSolicitudTarget } from '../mvc/models/clases.model';

export default function ApprovalSolicitudReviewModal({
  row,
  saving,
  t,
  onClose,
  onReview,
  onRejectRequest,
}) {
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
