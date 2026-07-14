import { describe, expect, it } from 'vitest';
import { isValidChurchCountry, normalizeChurchCountry } from './churchCountries';

describe('churchCountries', () => {
  it('accepts supported ISO country codes', () => {
    expect(isValidChurchCountry('CO')).toBe(true);
    expect(isValidChurchCountry('MX')).toBe(true);
  });

  it('rejects unknown country codes', () => {
    expect(isValidChurchCountry('ZZ')).toBe(false);
  });

  it('falls back to Colombia for invalid values', () => {
    expect(normalizeChurchCountry('ZZ')).toBe('CO');
    expect(normalizeChurchCountry('PE')).toBe('PE');
  });
});
