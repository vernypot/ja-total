import { describe, expect, it } from 'vitest';
import { memberDisplayName, memberLegalFullName } from './memberDisplayName';

describe('memberDisplayName', () => {
  it('uses legal first name and first last name by default', () => {
    expect(memberDisplayName({ nombre: 'Juan', apellido1: 'Pérez', apellido2: 'Gómez' }))
      .toBe('Juan Pérez');
  });

  it('prefers optional name fields when set', () => {
    expect(memberDisplayName({
      nombre: 'Juan Carlos',
      apellido1: 'Pérez',
      apellido2: 'Gómez',
      nombre_opcional: 'Juancito',
      apellido_opcional: 'Perico',
    })).toBe('Juancito Perico');
  });

  it('allows partial optional overrides', () => {
    expect(memberDisplayName({
      nombre: 'María',
      apellido1: 'López',
      nombre_opcional: 'Mari',
    })).toBe('Mari López');
  });

  it('keeps legal full name separate', () => {
    const member = { nombre: 'Ana', apellido1: 'Ruiz', apellido2: 'Díaz' };
    expect(memberLegalFullName(member)).toBe('Ana Ruiz Díaz');
    expect(memberDisplayName(member)).toBe('Ana Ruiz');
  });

  it('uses legal full name for printed member data', () => {
    const member = {
      nombre: 'Juan Carlos',
      apellido1: 'Pérez',
      apellido2: 'Gómez',
      nombre_opcional: 'Juancito',
      apellido_opcional: 'Perico',
    };
    expect(memberDisplayName(member)).toBe('Juancito Perico');
    expect(memberLegalFullName(member)).toBe('Juan Carlos Pérez Gómez');
  });
});
