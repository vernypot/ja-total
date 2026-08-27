import { describe, expect, it } from 'vitest';
import {
  formatPrintEventDayDate,
  formatPrintMonthGroupLabel,
  groupEventosByMonth,
} from './clubRemainingYearEvents.js';

describe('formatPrintMonthGroupLabel', () => {
  it('returns month name with capital first letter and no year', () => {
    expect(formatPrintMonthGroupLabel('2026-09', 'es')).toBe('Septiembre');
    expect(formatPrintMonthGroupLabel('2026-03', 'en')).toBe('March');
  });
});

describe('formatPrintEventDayDate', () => {
  it('returns weekday name and day number without month or year', () => {
    expect(formatPrintEventDayDate('2026-09-05', 'es')).toBe('Sábado 5');
    expect(formatPrintEventDayDate('2026-09-05', 'en')).toBe('Saturday 5');
  });
});

describe('groupEventosByMonth', () => {
  it('groups events under capitalized month labels', () => {
    const groups = groupEventosByMonth([
      { id: 1, fecha: '2026-09-05' },
      { id: 2, fecha: '2026-09-12' },
      { id: 3, fecha: '2026-10-03' },
    ], 'es');

    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe('Septiembre');
    expect(groups[1].label).toBe('Octubre');
    expect(groups[0].events).toHaveLength(2);
  });
});
