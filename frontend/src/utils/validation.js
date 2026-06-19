import { stripHtmlTags } from './sanitizeHtml';

export function isBlank(value) {
  if (value == null) return true;
  if (typeof value === 'string') return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function isValidEmail(value) {
  if (isBlank(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export function isValidDate(value) {
  if (isBlank(value)) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

export const validators = {
  required(messageKey = 'validationRequired') {
    return value => (isBlank(value) ? messageKey : null);
  },

  email(messageKey = 'validationEmail') {
    return value => (isValidEmail(value) ? null : messageKey);
  },

  minLength(min, messageKey = 'validationMinLength') {
    return value => {
      if (isBlank(value)) return null;
      return String(value).trim().length >= min ? null : { key: messageKey, params: { min } };
    };
  },

  htmlRequired(messageKey = 'validationRequired') {
    return value => (isBlank(stripHtmlTags(value)) ? messageKey : null);
  },

  date(messageKey = 'validationDate') {
    return value => (isValidDate(value) ? null : messageKey);
  },

  dateOnOrAfter(otherField, messageKey = 'validationDateRange') {
    return (value, values) => {
      const other = values?.[otherField];
      if (!isValidDate(value) || !isValidDate(other)) return null;
      return value >= other ? null : messageKey;
    };
  },

  minNumber(min, messageKey = 'validationMinNumber') {
    return value => {
      const num = Number(value);
      if (Number.isNaN(num) || num < min) return { key: messageKey, params: { min } };
      return null;
    };
  },

  oneOf(options, messageKey = 'validationRequired') {
    return value => (options.includes(value) ? null : messageKey);
  },

  custom(fn) {
    return fn;
  },
};

export function formatValidationMessage(result, t) {
  if (!result) return '';
  if (typeof result === 'string') return t(result);
  if (result.key) {
    let message = t(result.key);
    if (result.params) {
      for (const [param, value] of Object.entries(result.params)) {
        message = message.replace(`{${param}}`, String(value));
      }
    }
    return message;
  }
  return t('validationRequired');
}

export function runFieldValidation(rules = [], value, values, t) {
  for (const rule of rules) {
    const result = rule(value, values);
    if (result) return formatValidationMessage(result, t);
  }
  return '';
}

export function runValidation(fieldRules = {}, values = {}, t = key => key, formRules = []) {
  const fieldErrors = {};

  for (const [field, rules] of Object.entries(fieldRules)) {
    const message = runFieldValidation(rules, values[field], values, t);
    if (message) fieldErrors[field] = message;
  }

  for (const rule of formRules) {
    const result = rule(values);
    if (!result) continue;
    if (typeof result === 'object' && result.field && result.message) {
      if (!fieldErrors[result.field]) {
        fieldErrors[result.field] = formatValidationMessage(result.message, t);
      }
    } else if (typeof result === 'object' && result.formError) {
      const formError = formatValidationMessage(result.formError, t);
      return {
        valid: false,
        fieldErrors,
        firstError: formError || Object.values(fieldErrors)[0] || '',
        formError,
      };
    }
  }

  const firstError = Object.values(fieldErrors)[0] || '';
  return {
    valid: !firstError,
    fieldErrors,
    firstError,
    formError: '',
  };
}
