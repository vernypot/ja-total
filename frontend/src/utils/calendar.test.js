import { describe, expect, it } from 'vitest';
import {
  dateFromKey,
  formatCalendarPeriodLabel,
  groupEventsByDate,
  toDateKey,
  visibleRangeForView,
} from './calendar';

describe('calendar utils', () => {
  it('does not produce invalid date keys from invalid dates', () => {
    expect(toDateKey(new Date(Number.NaN))).toBe('');
    expect(toDateKey(null)).toBe('');
  });

  it('groups events using normalized fecha values', () => {
    const map = groupEventsByDate([
      { id: '1', fecha: '2026-07-13T00:00:00.000Z' },
      { id: '2', fecha: '2026-07-13' },
    ]);

    expect(map['2026-07-13']).toHaveLength(2);
  });

  it('returns empty period label for invalid focus dates', () => {
    expect(formatCalendarPeriodLabel('month', new Date(Number.NaN), 'en')).toBe('');
  });

  it('builds a valid visible range for month view', () => {
    const focusDate = dateFromKey('2026-07-13');
    const range = visibleRangeForView('month', focusDate);

    expect(range.startDate).toBe('2026-07-01');
    expect(range.endDate).toBe('2026-07-31');
  });

  it('falls back when focus date is invalid', () => {
    const fallback = new Date(2026, 6, 13);
    const range = visibleRangeForView('month', new Date(Number.NaN), fallback);

    expect(range.startDate).toBe('2026-07-01');
    expect(range.endDate).toBe('2026-07-31');
  });
});
