import { useCallback, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { validateForm } from '../../utils/validateForm';
import * as LandingInfoRequestModel from '../models/landingInfoRequest.model';

const INITIAL_FORM = {
  nombre: '',
  email: '',
  iglesia: '',
  telefono: '',
  mensaje: '',
};

export function useLandingInfoRequestController({ onSuccess } = {}) {
  const { language, t } = useLanguage();
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setFieldErrors({});
    setError('');
    setSuccess(false);
    setSaving(false);
  }, []);

  async function submit(e) {
    e?.preventDefault?.();
    setError('');
    setSuccess(false);

    const validation = validateForm('landingInfoRequest', form, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    setSaving(true);
    const { error: saveError } = await LandingInfoRequestModel.submitLandingInfoRequest({
      ...form,
      idioma: language,
    });
    setSaving(false);

    if (saveError) {
      if (saveError.message === 'LANDING_INFO_REQUESTS_NOT_CONFIGURED') {
        setError(t('landingInfoRequestNotConfigured'));
      } else {
        setError(t('landingInfoRequestError'));
      }
      return;
    }

    setForm(INITIAL_FORM);
    setFieldErrors({});
    setSuccess(true);

    if (onSuccess) {
      window.setTimeout(() => {
        onSuccess();
      }, 2200);
    }
  }

  return {
    form,
    setForm,
    fieldErrors,
    error,
    success,
    saving,
    submit,
    resetForm,
    t,
  };
}
