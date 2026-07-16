export default function BloquesCompletadosApplyModal({
  pending,
  applying,
  onConfirm,
  onCancel,
  t,
}) {
  if (!pending) return null;

  const { summary, members, count } = pending;

  return (
    <div
      className="bloques-apply-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bloques-apply-modal-title"
      onClick={onCancel}
    >
      <div
        className="bloques-apply-modal"
        onClick={e => e.stopPropagation()}
      >
        <h3 id="bloques-apply-modal-title" className="bloques-apply-modal__title">
          {t('completedBlocksApplyModalTitle')}
        </h3>

        <p className="bloques-apply-modal__hint">
          {t('completedBlocksApplyModalHint')}
        </p>

        <div className="bloques-apply-modal__section">
          <span className="bloques-apply-modal__label">{t('completedBlocksApplyModalAction')}</span>
          <p className="bloques-apply-modal__action">{summary}</p>
        </div>

        <div className="bloques-apply-modal__section">
          <span className="bloques-apply-modal__label">
            {t('completedBlocksApplyModalMembers').replace('{count}', String(count))}
          </span>
          <ul className="bloques-apply-modal__members">
            {members.map(member => (
              <li key={member.id}>{member.name}</li>
            ))}
          </ul>
        </div>

        <div className="bloques-apply-modal__actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={onCancel}
            disabled={applying}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={onConfirm}
            disabled={applying}
          >
            {applying ? t('loading') : t('completedBlocksApplyModalConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
