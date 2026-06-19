import { FORM_CTA_REGISTRY, FORM_SCHEMAS } from './formSchemas';
import { runValidation } from './validation';

export function validateForm(formId, values, t = key => key) {
  const schema = FORM_SCHEMAS[formId];
  if (!schema) {
    return {
      valid: false,
      fieldErrors: {},
      firstError: `Unknown form: ${formId}`,
      formError: `Unknown form: ${formId}`,
    };
  }

  return runValidation(schema.fields, values, t, schema.formRules || []);
}

export function listRegisteredForms() {
  return Object.keys(FORM_SCHEMAS);
}

/** Smoke-check: every registered form/CTA must reject an empty submit. */
export function checkAllFormCtas(t = key => key) {
  return FORM_CTA_REGISTRY.map(({ formId, submitAction, label }) => {
    const result = validateForm(formId, {}, t);
    return {
      formId,
      label,
      submitAction,
      blocksEmptySubmit: !result.valid,
      firstError: result.firstError,
    };
  });
}
