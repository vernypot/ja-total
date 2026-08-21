import { useEffect } from 'react';

export default function UnidadFormModal({
  open,
  editingUnidadId,
  form,
  setForm,
  savingUnidadId,
  onSave,
  onClose,
  t,
}) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const titleId = 'unidad-form-modal-title';

  return (
    <div
      className="unidades-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="unidades-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={event => event.stopPropagation()}
      >
        <div className="unidades-modal__header">
          <h2 id={titleId} className="unidades-modal__title">
            {editingUnidadId ? t('unidadEdit') : t('unidadNew')}
          </h2>
          <button
            type="button"
            className="unidades-modal__close"
            onClick={onClose}
            aria-label={t('close')}
          >
            ×
          </button>
        </div>

        <div className="unidades-modal__body">
          <div className="unidades-form-grid">
            <label className="unidades-field">
              <span className="unidades-field__label">{t('unidadName')}</span>
              <input
                className="form-input"
                value={form.nombre}
                autoFocus
                onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
              />
            </label>
            <label className="unidades-field">
              <span className="unidades-field__label">{t('unidadGender')}</span>
              <select
                className="form-input"
                value={form.genero}
                onChange={e => setForm(prev => ({ ...prev, genero: e.target.value }))}
              >
                <option value="M">{t('unidadGenderMale')}</option>
                <option value="F">{t('unidadGenderFemale')}</option>
              </select>
            </label>
            <label className="unidades-field">
              <span className="unidades-field__label">{t('unidadEvalValidationStartLabel')}</span>
              <input
                type="date"
                className="form-input"
                value={form.evaluacion_inicio_fecha}
                onChange={e => setForm(prev => ({
                  ...prev,
                  evaluacion_inicio_fecha: e.target.value,
                }))}
              />
            </label>
            <label className="unidades-field unidades-field--full">
              <span className="unidades-field__hint">{t('unidadEvalValidationStartFieldHint')}</span>
            </label>
            <label className="unidades-field unidades-field--full">
              <span className="unidades-field__label">{t('unidadDescription')}</span>
              <textarea
                className="form-input"
                rows={3}
                value={form.descripcion}
                onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
              />
            </label>
          </div>
        </div>

        <div className="unidades-modal__footer unidades-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={Boolean(savingUnidadId)}
            onClick={onSave}
          >
            {savingUnidadId ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
