import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/supabase', () => ({
  sb: {},
}));

import { getAsistenciaFromRow, memberAttendedEvent, wasMemberCheckedInToEvent, computeCheckinAttendanceEstado, shouldCorrectLateCheckin } from './eventos.model';

describe('memberAttendedEvent', () => {
  it('returns true for on-time and late attendance', () => {
    expect(memberAttendedEvent({
      evento_asistencia: { estado: 'a_tiempo' },
    })).toBe(true);
    expect(memberAttendedEvent({
      evento_asistencia: { estado: 'tarde' },
    })).toBe(true);
  });

  it('returns false when absent or pending', () => {
    expect(memberAttendedEvent({
      evento_asistencia: { estado: 'ausente' },
    })).toBe(false);
    expect(memberAttendedEvent({})).toBe(false);
  });

  it('reads nested attendance arrays', () => {
    expect(getAsistenciaFromRow({
      evento_asistencia: [{ estado: 'a_tiempo' }],
    })).toBe('a_tiempo');
  });
});

describe('wasMemberCheckedInToEvent', () => {
  it('returns true when checked_in_at is set', () => {
    expect(wasMemberCheckedInToEvent({
      evento_asistencia: { estado: 'ausente', checked_in_at: '2026-07-13T01:00:00Z' },
    })).toBe(true);
  });

  it('returns true for on-time or late attendance without timestamp', () => {
    expect(wasMemberCheckedInToEvent({
      evento_asistencia: { estado: 'a_tiempo' },
    })).toBe(true);
    expect(wasMemberCheckedInToEvent({
      evento_asistencia: { estado: 'tarde' },
    })).toBe(true);
  });

  it('returns false when absent or not yet checked in', () => {
    expect(wasMemberCheckedInToEvent({
      evento_asistencia: { estado: 'ausente' },
    })).toBe(false);
    expect(wasMemberCheckedInToEvent({})).toBe(false);
  });
});

describe('shouldCorrectLateCheckin', () => {
  const evento = { fecha: '2026-07-13', hora: '19:00:00' };

  it('detects false late from UTC-based server comparison', () => {
    expect(shouldCorrectLateCheckin(
      {
        evento_miembro_id: 'em-1',
        estado: 'tarde',
        checked_in_at: '2026-07-13T23:55:00.000Z',
      },
      {
        ...evento,
        clubes: { iglesias: { timezone: 'America/Bogota' } },
      }
    )).toBe(true);
  });

  it('does not correct genuine late check-ins', () => {
    expect(shouldCorrectLateCheckin(
      {
        evento_miembro_id: 'em-1',
        estado: 'tarde',
        checked_in_at: '2026-07-14T00:20:00.000Z',
      },
      evento
    )).toBe(false);
  });
});

describe('computeCheckinAttendanceEstado', () => {
  const evento = { fecha: '2026-07-13', hora: '19:00:00' };

  it('marks early check-in as on time', () => {
    expect(computeCheckinAttendanceEstado(
      new Date('2026-07-13T23:30:00.000Z'),
      evento,
      { timeZone: 'America/Bogota' }
    )).toBe('a_tiempo');
  });

  it('marks check-in within 15 minutes after start as on time', () => {
    expect(computeCheckinAttendanceEstado(
      new Date('2026-07-14T00:10:00.000Z'),
      evento,
      { timeZone: 'America/Bogota' }
    )).toBe('a_tiempo');
  });

  it('marks check-in more than 15 minutes after start as late', () => {
    expect(computeCheckinAttendanceEstado(
      new Date('2026-07-14T00:20:00.000Z'),
      evento,
      { timeZone: 'America/Bogota' }
    )).toBe('tarde');
  });
});
