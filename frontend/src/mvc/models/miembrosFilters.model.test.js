import { describe, expect, it } from 'vitest';
import { resolveMiembroClaseProgresoEstado } from '../../constants/miembroClaseProgresoEstado';

describe('member class filter status resolution', () => {
  it('resolves legacy rows without estado_progreso', () => {
    expect(resolveMiembroClaseProgresoEstado({ tiene_investidura: true })).toBe('investida');
    expect(resolveMiembroClaseProgresoEstado({ completado: true })).toBe('completada');
    expect(resolveMiembroClaseProgresoEstado({})).toBe('sin_iniciar');
  });

  it('prefers explicit estado_progreso', () => {
    expect(resolveMiembroClaseProgresoEstado({
      estado_progreso: 'en_progreso',
      completado: true,
    })).toBe('en_progreso');
  });
});
