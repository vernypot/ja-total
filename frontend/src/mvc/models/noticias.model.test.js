import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/supabase', () => ({
  sb: {},
}));

import {
  isNoticiaExpired,
  isNoticiaVisible,
  isPublicNoticia,
  canAccessNoticia,
  normalizeExpiraEn,
  normalizeNoticiaReaderRow,
} from './noticias.model';

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

  it('allows public direct links only for general audience on public surfaces', () => {
    expect(isPublicNoticia({
      ...activeNoticia,
      audience: 'general',
      placements: ['dashboard'],
    })).toBe(true);

    expect(isPublicNoticia({
      ...activeNoticia,
      audience: 'church',
      placements: ['dashboard'],
    })).toBe(false);

    expect(isPublicNoticia({
      ...activeNoticia,
      audience: 'general',
      placements: ['newsletter'],
    })).toBe(false);
  });

  it('allows authenticated church scope for church-only news', () => {
    const churchNews = {
      ...activeNoticia,
      iglesia_id: 'ig-1',
      audience: 'church',
      placements: ['dashboard'],
    };

    expect(canAccessNoticia(churchNews, { iglesiaId: 'ig-1' })).toBe(true);
    expect(canAccessNoticia(churchNews, { iglesiaId: 'ig-2' })).toBe(false);
    expect(isPublicNoticia(churchNews)).toBe(false);
  });
});

describe('normalizeNoticiaReaderRow', () => {
  it('maps RPC rows into member display shape', () => {
    expect(normalizeNoticiaReaderRow({
      miembro_id: 'm1',
      nombre: 'Ana',
      apellido1: 'López',
      leido_at: '2026-06-01T15:00:00Z',
      estado: 'activo',
    })).toMatchObject({
      miembro_id: 'm1',
      leido_at: '2026-06-01T15:00:00Z',
      miembros: { id: 'm1', nombre: 'Ana', apellido1: 'López' },
    });
  });
});
