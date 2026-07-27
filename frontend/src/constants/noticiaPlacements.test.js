import { describe, expect, it } from 'vitest';
import {
  clearAllPlacements,
  normalizePlacements,
  togglePlacement,
} from '../constants/noticiaPlacements';

describe('noticia placements', () => {
  it('allows empty placements when configured', () => {
    expect(normalizePlacements([], { allowEmpty: true })).toEqual([]);
    expect(normalizePlacements(['dashboard'], { allowEmpty: true })).toEqual(['dashboard']);
  });

  it('falls back to dashboard for invalid or empty reads by default', () => {
    expect(normalizePlacements([])).toEqual(['dashboard']);
    expect(normalizePlacements(null)).toEqual(['dashboard']);
  });

  it('can clear all placements and toggle individual options', () => {
    expect(clearAllPlacements()).toEqual([]);
    expect(togglePlacement(['dashboard', 'landing'], 'dashboard')).toEqual(['landing']);
    expect(togglePlacement([], 'landing')).toEqual(['landing']);
  });
});
