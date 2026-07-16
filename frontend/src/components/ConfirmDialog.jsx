import { useEffect } from 'react';
import '../styles/confirm-dialog.css';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirming = false,
  confirmingLabel,
  highlight,
}) {
  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape' && !confirming) onCancel?.();
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onCancel, confirming]);

  if (!open) return null;

  return (
    <div
      className="confirm-dialog-overlay"
      role="presentation"
      onClick={confirming ? undefined : onCancel}
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={event => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">{title}</h2>
        <p id="confirm-dialog-message" className="confirm-dialog__message">
          {message}
          {highlight ? <span className="confirm-dialog__tag-name">{highlight}</span> : null}
        </p>
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="confirm-dialog__btn confirm-dialog__btn--cancel"
            onClick={onCancel}
            disabled={confirming}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="confirm-dialog__btn confirm-dialog__btn--confirm"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? (confirmingLabel || '…') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
