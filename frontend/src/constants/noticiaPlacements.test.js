import { describe, expect, it } from 'vitest';
import {
  clearAllPlacements,
  hasPublicNoticiaSurface,
  normalizePlacements,
  NOTICIA_LANDING_SECTION_PLACEMENTS,
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

  it('defines landing section placements including dashboard', () => {
    expect(NOTICIA_LANDING_SECTION_PLACEMENTS).toEqual(['landing', 'dashboard']);
  });

  it('detects public surfaces for direct links', () => {
    expect(hasPublicNoticiaSurface(['dashboard'])).toBe(true);
    expect(hasPublicNoticiaSurface(['newsletter'])).toBe(false);
  });

  it('can clear all placements and toggle individual options', () => {
    expect(clearAllPlacements()).toEqual([]);
    expect(togglePlacement(['dashboard', 'landing'], 'dashboard')).toEqual(['landing']);
    expect(togglePlacement([], 'landing')).toEqual(['landing']);
  });
});
