export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function dateFromKey(dateKey) {
  const [year, month, day] = (dateKey || '').split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
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

export function visibleRangeForView(viewMode, focusDate) {
  if (viewMode === 'day') return dayRange(focusDate);
  if (viewMode === 'week') return weekRange(focusDate);
  return monthRange(focusDate.getFullYear(), focusDate.getMonth());
}

export function formatCalendarPeriodLabel(viewMode, focusDate, language) {
  const locale = language === 'en' ? 'en-US' : 'es-ES';
  if (viewMode === 'day') {
    return focusDate.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  if (viewMode === 'week') {
    const [start, end] = [buildWeekDays(focusDate)[0], buildWeekDays(focusDate)[6]];
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const sameYear = start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      return `${start.toLocaleDateString(locale, { month: 'long' })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }
    if (sameYear) {
      return `${start.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}, ${start.getFullYear()}`;
    }
    return `${start.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })} – ${end.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return focusDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
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
    const key = event.fecha;
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
  return [...events].sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || '')));
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
