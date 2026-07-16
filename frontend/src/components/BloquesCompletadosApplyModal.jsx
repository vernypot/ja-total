import { useEffect, useState } from 'react';

function blockNeedsValidator(block) {
  return block?.actionType === 'requisito' || block?.actionType === 'seccion';
}

export default function BloquesCompletadosApplyModal({
  pending,
  applying,
  defaultValidatorName = '',
  onConfirm,
  onCancel,
  t,
}) {
  const [validatedBy, setValidatedBy] = useState('');

  useEffect(() => {
    if (pending) {
      setValidatedBy(defaultValidatorName || '');
    }
  }, [pending, defaultValidatorName]);

  if (!pending) return null;

  const { summary, members, count, block } = pending;
  const needsValidator = blockNeedsValidator(block);

  function handleConfirm() {
    onConfirm(needsValidator ? validatedBy.trim() : undefined);
  }

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
          {needsValidator
            ? t('completedBlocksApplyModalRequisitoHint')
            : t('completedBlocksApplyModalHint')}
        </p>

        <div className="bloques-apply-modal__section">
          <span className="bloques-apply-modal__label">{t('completedBlocksApplyModalAction')}</span>
          <p className="bloques-apply-modal__action">{summary}</p>
        </div>

        {needsValidator && (
          <div className="bloques-apply-modal__section">
            <label className="bloques-apply-modal__field" htmlFor="bloques-validated-by">
              <span className="bloques-apply-modal__label">{t('validatedBy')}</span>
              <input
                id="bloques-validated-by"
                type="text"
                value={validatedBy}
                disabled={applying}
                placeholder={t('validatedByPlaceholder')}
                onChange={e => setValidatedBy(e.target.value)}
                className="bloques-apply-modal__input"
              />
              <span className="bloques-apply-modal__field-hint">
                {t('completedBlocksApplyModalValidatedByHint')}
              </span>
            </label>
          </div>
        )}

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
            onClick={handleConfirm}
            disabled={applying || (needsValidator && !validatedBy.trim())}
          >
            {applying ? t('loading') : t('completedBlocksApplyModalConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
