import { describe, expect, it } from 'vitest';
import {
  isBlank,
  isValidEmail,
  isValidDate,
  runValidation,
  validators,
} from './validation';

const t = key => key;

describe('validation helpers', () => {
  it('detects blank values', () => {
    expect(isBlank('')).toBe(true);
    expect(isBlank('  ')).toBe(true);
    expect(isBlank(null)).toBe(true);
    expect(isBlank('ok')).toBe(false);
  });

  it('validates email format', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('bad-email')).toBe(false);
  });

  it('validates date format', () => {
    expect(isValidDate('2026-06-18')).toBe(true);
    expect(isValidDate('18-06-2026')).toBe(false);
  });
});

describe('runValidation', () => {
  it('returns field errors for missing required values', () => {
    const result = runValidation(
      { email: [validators.required(), validators.email()] },
      { email: '' },
      t
    );
    expect(result.valid).toBe(false);
    expect(result.fieldErrors.email).toBe('validationRequired');
  });

  it('passes when all rules succeed', () => {
    const result = runValidation(
      { email: [validators.required(), validators.email()] },
      { email: 'user@example.com' },
      t
    );
    expect(result.valid).toBe(true);
    expect(result.fieldErrors).toEqual({});
  });

  it('supports form-level rules', () => {
    const result = runValidation(
      {},
      { requiere_confirmacion: true, memberAssignmentMode: 'specific', selectedMemberIds: [] },
      t,
      [
        values => (
          values.requiere_confirmacion && values.memberAssignmentMode === 'specific' && !values.selectedMemberIds.length
            ? { formError: 'validationEventMembersRequired' }
            : null
        ),
      ]
    );
    expect(result.valid).toBe(false);
    expect(result.formError).toBe('validationEventMembersRequired');
  });
});
