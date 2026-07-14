import { compareEventsByLocalDateTime, normalizeEventDate } from './eventTimezone';

export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function isValidDateKey(dateKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizeEventDate(dateKey) || '');
}

export function safeLocaleDateString(date, locale, options = {}) {
  if (!date || Number.isNaN(date.getTime())) return '';
  const formatted = date.toLocaleDateString(locale, options);
  return formatted === 'Invalid Date' || formatted === 'Invalid time value' ? '' : formatted;
}

export function toDateKey(date) {
  if (!date || Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function dateFromKey(dateKey, fallbackDate = new Date()) {
  const normalized = normalizeEventDate(dateKey);
  if (!normalized) {
    return fallbackDate instanceof Date && !Number.isNaN(fallbackDate.getTime())
      ? new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), fallbackDate.getDate())
      : new Date(Number.NaN);
  }

  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return fallbackDate instanceof Date && !Number.isNaN(fallbackDate.getTime())
      ? new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), fallbackDate.getDate())
      : new Date(Number.NaN);
  }
  return date;
}

/** Week always starts on Sunday (getDay() === 0). */
export function startOfWeekSunday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function buildWeekDays(focusDate) {
  const start = startOfWeekSunday(focusDate);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function weekRange(focusDate) {
  const days = buildWeekDays(focusDate);
  return {
    startDate: toDateKey(days[0]),
    endDate: toDateKey(days[6]),
    days,
  };
}

export function dayRange(focusDate) {
  const key = toDateKey(focusDate);
  return { startDate: key, endDate: key };
}

export function visibleRangeForView(viewMode, focusDate, fallbackDate = new Date()) {
  const safeFocus = focusDate && !Number.isNaN(focusDate.getTime()) ? focusDate : fallbackDate;
  if (viewMode === 'day') return dayRange(safeFocus);
  if (viewMode === 'week') return weekRange(safeFocus);
  return monthRange(safeFocus.getFullYear(), safeFocus.getMonth());
}

export function formatCalendarPeriodLabel(viewMode, focusDate, language) {
  if (!focusDate || Number.isNaN(focusDate.getTime())) return '';

  const locale = language === 'en' ? 'en-US' : 'es-ES';
  if (viewMode === 'day') {
    return safeLocaleDateString(focusDate, locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  if (viewMode === 'week') {
    const days = buildWeekDays(focusDate);
    const start = days[0];
    const end = days[6];
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return '';
    }

    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const sameYear = start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      return `${safeLocaleDateString(start, locale, { month: 'long' })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }
    if (sameYear) {
      return `${safeLocaleDateString(start, locale, { month: 'short', day: 'numeric' })} – ${safeLocaleDateString(end, locale, { month: 'short', day: 'numeric' })}, ${start.getFullYear()}`;
    }
    return `${safeLocaleDateString(start, locale, { month: 'short', day: 'numeric', year: 'numeric' })} – ${safeLocaleDateString(end, locale, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return safeLocaleDateString(focusDate, locale, { month: 'long', year: 'numeric' });
}

export function monthRange(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
    daysInMonth: end.getDate(),
    startWeekday: start.getDay(),
  };
}

export function groupEventsByDate(events = []) {
  const map = {};
  for (const event of events) {
    const key = normalizeEventDate(event.fecha);
    if (!key) continue;
    if (!map[key]) map[key] = [];
    map[key].push(event);
  }
  return map;
}

export function formatEventTime(hora) {
  if (!hora) return '';
  return String(hora).slice(0, 5);
}

export function sortEventsByTime(events = []) {
  return [...events].sort(compareEventsByLocalDateTime);
}

export function buildCalendarCells(year, monthIndex) {
  const { daysInMonth, startWeekday } = monthRange(year, monthIndex);
  const cells = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, monthIndex, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}
