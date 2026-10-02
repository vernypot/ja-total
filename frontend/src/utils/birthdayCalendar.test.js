import { describe, expect, it } from 'vitest';
import { birthdayDateKeysInRange, buildBirthdayCalendarEvents, isBirthdayEvent } from './birthdayCalendar';

describe('birthdayDateKeysInRange', () => {
  it('returns the birthday that falls in the visible range', () => {
    expect(birthdayDateKeysInRange('2001-06-15', '2026-06-01', '2026-06-30')).toEqual(['2026-06-15']);
  });

  it('returns nothing when the birthday is outside the range', () => {
    expect(birthdayDateKeysInRange('2001-06-15', '2026-07-01', '2026-07-31')).toEqual([]);
  });

  it('covers year boundaries', () => {
    expect(birthdayDateKeysInRange('1990-12-31', '2025-12-20', '2026-01-10')).toEqual(['2025-12-31']);
    expect(birthdayDateKeysInRange('1990-01-02', '2025-12-20', '2026-01-10')).toEqual(['2026-01-02']);
  });

  it('moves Feb 29 to Feb 28 in non-leap years', () => {
    expect(birthdayDateKeysInRange('2000-02-29', '2026-02-01', '2026-02-28')).toEqual(['2026-02-28']);
    expect(birthdayDateKeysInRange('2000-02-29', '2024-02-01', '2024-02-29')).toEqual(['2024-02-29']);
  });
});

describe('buildBirthdayCalendarEvents', () => {
  it('builds synthetic birthday events', () => {
    const events = buildBirthdayCalendarEvents({
      members: [{ id: 'm1', nombre: 'Ana', apellido1: 'Diaz', fecha_nacimiento: '2010-05-04' }],
      clubId: 'c1',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    });
    expect(events).toHaveLength(1);
    expect(isBirthdayEvent(events[0])).toBe(true);
    expect(events[0].id).toBe('birthday:m1:2026-05-04');
    expect(events[0].miembro_id).toBe('m1');
  });
});
