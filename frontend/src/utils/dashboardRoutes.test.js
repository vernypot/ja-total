import { describe, expect, it } from 'vitest';
import { buildNoticiaShareUrl, publicNoticiaPath } from './dashboardRoutes';

describe('publicNoticiaPath', () => {
  it('builds a stable path from the noticia id', () => {
    expect(publicNoticiaPath('abc-123')).toBe('/noticias/abc-123');
    expect(publicNoticiaPath('')).toBe('');
  });
});

describe('buildNoticiaShareUrl', () => {
  it('combines origin and path', () => {
    expect(buildNoticiaShareUrl('abc-123', 'https://example.org')).toBe('https://example.org/noticias/abc-123');
  });
});
