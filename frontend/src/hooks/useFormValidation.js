import { useCallback, useState } from 'react';
import { validateForm } from '../utils/validateForm';

export function useFormValidation(formId, t) {
  const [fieldErrors, setFieldErrors] = useState({});

  const clearFieldError = useCallback(field => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const validate = useCallback(
    values => {
      const result = validateForm(formId, values, t);
      setFieldErrors(result.fieldErrors);
      return result;
    },
    [formId, t]
  );

  const getFieldError = useCallback(
    field => fieldErrors[field] || '',
    [fieldErrors]
  );

  return {
    fieldErrors,
    setFieldErrors,
    clearFieldError,
    clearAllFieldErrors,
    validate,
    getFieldError,
  };
}

export function applyValidationResult(setError, setFieldErrors, result) {
  setFieldErrors(result.fieldErrors);
  setError(result.firstError || result.formError || '');
  return result.valid;
}
