import { describe, expect, it } from 'vitest';
import {
  computeCheckinAttendanceEstado,
  formatEventLocalDate,
  getEventChurchTimezone,
  getEventStartInstant,
  getLocalTodayIso,
  isEventInFuture,
  isEventToday,
  toLocalDateKey,
  wallClockToInstant,
} from './eventTimezone';

describe('eventTimezone', () => {
  const evento = { fecha: '2026-07-13', hora: '19:00:00' };

  it('parses event start in church local offset', () => {
    expect(getEventStartInstant(evento, 'America/Bogota')?.toISOString()).toBe('2026-07-14T00:00:00.000Z');
  });

  it('uses configured timezone for event start', () => {
    const mexicoStart = getEventStartInstant(evento, 'America/Mexico_City');
    const bogotaStart = getEventStartInstant(evento, 'America/Bogota');
    expect(mexicoStart?.toISOString()).not.toBe(bogotaStart?.toISOString());
  });

  it('reads timezone from nested church data', () => {
    expect(getEventChurchTimezone({
      clubes: { iglesias: { timezone: 'America/Lima' } },
    })).toBe('America/Lima');
  });

  it('uses America/Bogota for local today', () => {
    const reference = new Date('2026-07-14T01:30:00.000Z');
    expect(getLocalTodayIso(reference, 'America/Bogota')).toBe('2026-07-13');
    expect(toLocalDateKey(reference, 'America/Bogota')).toBe('2026-07-13');
  });

  it('treats early check-in as on time', () => {
    expect(computeCheckinAttendanceEstado(
      new Date('2026-07-13T23:30:00.000Z'),
      evento,
      { timeZone: 'America/Bogota' }
    )).toBe('a_tiempo');
  });

  it('treats check-in minutes before start as on time', () => {
    expect(computeCheckinAttendanceEstado(
      new Date('2026-07-13T23:55:00.000Z'),
      evento,
      { timeZone: 'America/Bogota' }
    )).toBe('a_tiempo');
  });

  it('marks check-in after grace period as late', () => {
    expect(computeCheckinAttendanceEstado(
      new Date('2026-07-14T00:20:00.000Z'),
      evento,
      { timeZone: 'America/Bogota' }
    )).toBe('tarde');
  });

  it('detects future and today events in local time', () => {
    const beforeStart = new Date('2026-07-13T23:00:00.000Z');
    const afterStart = new Date('2026-07-14T00:30:00.000Z');

    expect(isEventInFuture(evento, beforeStart, 'America/Bogota')).toBe(true);
    expect(isEventInFuture(evento, afterStart, 'America/Bogota')).toBe(false);
    expect(isEventToday(evento, beforeStart, 'America/Bogota')).toBe(true);
  });

  it('formats event dates in church timezone', () => {
    expect(formatEventLocalDate('2026-07-13', 'es', { timeZone: 'America/Bogota' })).toContain('2026');
  });

  it('converts wall clock using IANA timezone', () => {
    expect(wallClockToInstant('2026-07-13', '19:00:00', 'America/Bogota')?.toISOString())
      .toBe('2026-07-14T00:00:00.000Z');
  });
});
