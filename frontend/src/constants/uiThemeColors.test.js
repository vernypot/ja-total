import { describe, expect, it } from 'vitest';
import {
  isValidHexColor,
  normalizeThemeColorOverrides,
  mergeThemeColorValues,
} from '../constants/uiThemeColors';
import { buildThemeColorOverrideCss } from '../utils/applyThemeColorOverrides';

describe('uiThemeColors', () => {
  it('validates hex colors', () => {
    expect(isValidHexColor('#abc')).toBe(true);
    expect(isValidHexColor('#aabbcc')).toBe(true);
    expect(isValidHexColor('red')).toBe(false);
    expect(isValidHexColor('#gggggg')).toBe(false);
  });

  it('normalizes overrides per theme', () => {
    const result = normalizeThemeColorOverrides({
      clear: { primary: '#445cfd', invalid: 'nope' },
      dark: { accent: '#0be0af' },
    });
    expect(result.clear.primary).toBe('#445cfd');
    expect(result.clear.invalid).toBeUndefined();
    expect(result.dark.accent).toBe('#0be0af');
    expect(result.default).toEqual({});
  });

  it('merges defaults with overrides', () => {
    const merged = mergeThemeColorValues('default', { primary: '#112233' });
    expect(merged.primary).toBe('#112233');
    expect(merged.accent).toBe('#14b8a6');
  });

  it('builds css rules for active theme selectors', () => {
    const css = buildThemeColorOverrideCss({
      default: { primary: '#112233' },
      clear: {},
      dark: {},
    });
    expect(css).toContain('html:not([data-ui-theme])');
    expect(css).toContain('--brand-primary: #112233');
  });
});
