import { useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import '../styles/form-modal.css';

export default function FormModal({
  open,
  title,
  onClose,
  children,
  disableClose = false,
  maxWidth = '640px',
}) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape' && !disableClose) onClose?.();
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, disableClose]);

  if (!open) return null;

  return (
    <div
      className="form-modal-overlay"
      role="presentation"
      onClick={disableClose ? undefined : onClose}
    >
      <div
        className="form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-modal-title"
        style={{ maxWidth }}
        onClick={event => event.stopPropagation()}
      >
        <div className="form-modal__header">
          <h2 id="form-modal-title" className="form-modal__title">{title}</h2>
          <button
            type="button"
            className="form-modal__close"
            onClick={onClose}
            disabled={disableClose}
            aria-label={t('close')}
          >
            ×
          </button>
        </div>
        <div className="form-modal__body">
          {children}
        </div>
      </div>
    </div>
  );
}
