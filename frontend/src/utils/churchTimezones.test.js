import { describe, expect, it } from 'vitest';
import { isValidChurchTimezone, normalizeChurchTimezone } from './churchTimezones';

describe('churchTimezones', () => {
  it('accepts supported IANA timezones', () => {
    expect(isValidChurchTimezone('America/Bogota')).toBe(true);
    expect(isValidChurchTimezone('America/Lima')).toBe(true);
  });

  it('rejects unknown timezones', () => {
    expect(isValidChurchTimezone('Not/AZone')).toBe(false);
  });

  it('falls back to Bogota for invalid values', () => {
    expect(normalizeChurchTimezone('Not/AZone')).toBe('America/Bogota');
    expect(normalizeChurchTimezone('America/Mexico_City')).toBe('America/Mexico_City');
  });
});
