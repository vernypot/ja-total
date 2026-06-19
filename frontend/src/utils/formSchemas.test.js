import { describe, expect, it } from 'vitest';
import { FORM_CTA_REGISTRY, FORM_SCHEMAS } from './formSchemas';
import { validateForm, listRegisteredForms, checkAllFormCtas } from './validateForm';

const t = key => key;

describe('form schemas registry', () => {
  it('registers all expected forms', () => {
    const ids = listRegisteredForms();
    expect(ids).toContain('login');
    expect(ids).toContain('event');
    expect(ids).toContain('planPeriod');
    expect(ids).toContain('noticia');
    expect(ids.length).toBeGreaterThanOrEqual(10);
  });

  it('exposes CTA metadata for each form', () => {
    expect(FORM_CTA_REGISTRY.length).toBe(Object.keys(FORM_SCHEMAS).length);
    for (const entry of FORM_CTA_REGISTRY) {
      expect(entry.formId).toBeTruthy();
      expect(entry.submitAction).toBeTruthy();
      expect(entry.requiredFields.length).toBeGreaterThan(0);
    }
  });
});

describe('validateForm', () => {
  it('rejects invalid login', () => {
    const result = validateForm('login', { email: 'bad', password: '' }, t);
    expect(result.valid).toBe(false);
    expect(result.fieldErrors.password).toBe('validationRequired');
  });

  it('accepts valid login', () => {
    const result = validateForm('login', { email: 'user@example.com', password: 'secret' }, t);
    expect(result.valid).toBe(true);
  });

  it('rejects event without place', () => {
    const result = validateForm('event', { fecha: '2026-06-18', hora: '18:00', lugar: '' }, t);
    expect(result.valid).toBe(false);
    expect(result.fieldErrors.lugar).toBe('validationRequired');
  });

  it('rejects plan period with inverted dates', () => {
    const result = validateForm('planPeriod', {
      nombre: 'Plan A',
      fecha_inicio: '2026-06-20',
      fecha_fin: '2026-06-01',
      num_reuniones: '8',
    }, t);
    expect(result.valid).toBe(false);
    expect(result.fieldErrors.fecha_fin).toBe('validationDateRange');
  });

  it('rejects news without content', () => {
    const result = validateForm('noticia', {
      titulo: '<p></p>',
      contenido: '',
      publicado_en: '2026-06-18',
    }, t);
    expect(result.valid).toBe(false);
    expect(result.fieldErrors.contenido).toBe('validationRequired');
  });

  it('rejects user password mismatch on create', () => {
    const result = validateForm('usuario', {
      nombre: 'Ana',
      apellido1: 'Lopez',
      email: 'ana@example.com',
      rol: 'user',
      password: 'Aa1!aaaa',
      confirmPassword: 'Bb2!bbbb',
      sendSetupEmail: false,
    }, t);
    expect(result.valid).toBe(false);
    expect(result.fieldErrors.confirmPassword).toBe('validationPasswordMismatch');
  });

  it('returns error for unknown form id', () => {
    const result = validateForm('missing-form', {}, t);
    expect(result.valid).toBe(false);
    expect(result.firstError).toContain('Unknown form');
  });
});

describe('form CTA smoke checks', () => {
  it('blocks empty submit for every registered form', () => {
    for (const entry of FORM_CTA_REGISTRY) {
      const result = validateForm(entry.formId, {}, t);
      expect(result.valid, `${entry.formId} (${entry.submitAction}) should reject empty values`).toBe(false);
    }
  });

  it('checkAllFormCtas reports all forms as blocking empty submit', () => {
    const checks = checkAllFormCtas(t);
    const failures = checks.filter(c => !c.blocksEmptySubmit);
    expect(failures).toEqual([]);
  });
});
