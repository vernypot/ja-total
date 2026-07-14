import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/supabase', () => ({
  sb: {},
}));

import { isNoticiaExpired, isNoticiaVisible, normalizeExpiraEn } from './noticias.model';

const activeNoticia = {
  estado: 'activo',
  publicado_en: '2026-01-01',
};

describe('noticias visibility', () => {
  it('treats blank expiration as no expiration', () => {
    expect(normalizeExpiraEn('')).toBeNull();
    expect(normalizeExpiraEn('   ')).toBeNull();
    expect(isNoticiaVisible({ ...activeNoticia, expira_en: '' }, { referenceDate: '2026-06-18' })).toBe(true);
    expect(isNoticiaVisible({ ...activeNoticia, expira_en: null }, { referenceDate: '2026-06-18' })).toBe(true);
    expect(isNoticiaExpired({ ...activeNoticia, expira_en: '' }, '2026-06-18')).toBe(false);
  });

  it('hides only after expiration date passes', () => {
    expect(isNoticiaVisible({
      ...activeNoticia,
      expira_en: '2026-06-20',
    }, { referenceDate: '2026-06-18' })).toBe(true);

    expect(isNoticiaVisible({
      ...activeNoticia,
      expira_en: '2026-06-10',
    }, { referenceDate: '2026-06-18' })).toBe(false);
  });
});
