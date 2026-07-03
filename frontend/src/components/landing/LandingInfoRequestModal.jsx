import { useLandingInfoRequestController } from '../../mvc/controllers/useLandingInfoRequestController';
import { useEffect } from 'react';

export default function LandingInfoRequestModal({ open, onClose }) {
  const {
    form,
    setForm,
    fieldErrors,
    error,
    success,
    saving,
    submit,
    t,
    resetForm,
  } = useLandingInfoRequestController({ onSuccess: onClose });

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  if (!open) return null;

  return (
    <div
      className="landing-info-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="landing-info-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-info-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="landing-info-modal-header">
          <div>
            <span className="landing-section-eyebrow">{t('landingInfoRequestEyebrow')}</span>
            <h2 id="landing-info-modal-title" className="landing-info-modal-title">
              {t('landingInfoRequestTitle')}
            </h2>
            <p className="landing-info-modal-intro">{t('landingInfoRequestIntro')}</p>
          </div>
          <button type="button" className="landing-info-modal-close" onClick={onClose} aria-label={t('cancel')}>
            ×
          </button>
        </div>

        {success ? (
          <div className="landing-info-request-success" role="status">
            <strong>{t('landingInfoRequestSuccessTitle')}</strong>
            <p>{t('landingInfoRequestSuccessText')}</p>
          </div>
        ) : (
          <form className="landing-info-request-form" onSubmit={submit} noValidate>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="landing-info-request-grid">
              <label className="landing-info-request-field">
                <span>{t('landingInfoRequestName')}</span>
                <input
                  type="text"
                  className="form-input"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.nombre)}
                />
                {fieldErrors.nombre && (
                  <span className="landing-info-request-field-error">{fieldErrors.nombre}</span>
                )}
              </label>

              <label className="landing-info-request-field">
                <span>{t('email')}</span>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email && (
                  <span className="landing-info-request-field-error">{fieldErrors.email}</span>
                )}
              </label>

              <label className="landing-info-request-field">
                <span>{t('landingInfoRequestChurch')}</span>
                <input
                  type="text"
                  className="form-input"
                  value={form.iglesia}
                  onChange={e => setForm(f => ({ ...f, iglesia: e.target.value }))}
                  placeholder={t('landingInfoRequestChurchPlaceholder')}
                />
              </label>

              <label className="landing-info-request-field">
                <span>{t('phone')}</span>
                <input
                  type="tel"
                  className="form-input"
                  value={form.telefono}
                  onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                  autoComplete="tel"
                />
              </label>
            </div>

            <label className="landing-info-request-field landing-info-request-field--full">
              <span>{t('landingInfoRequestMessage')}</span>
              <textarea
                className="form-input"
                rows={4}
                value={form.mensaje}
                onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))}
                placeholder={t('landingInfoRequestMessagePlaceholder')}
                aria-invalid={Boolean(fieldErrors.mensaje)}
              />
              {fieldErrors.mensaje && (
                <span className="landing-info-request-field-error">{fieldErrors.mensaje}</span>
              )}
            </label>

            <div className="landing-info-request-actions">
              <button type="submit" className="landing-btn landing-btn-primary" disabled={saving}>
                {saving ? t('saving') : t('landingInfoRequestSubmit')}
              </button>
              <button type="button" className="landing-btn landing-btn-outline" onClick={onClose}>
                {t('cancel')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
