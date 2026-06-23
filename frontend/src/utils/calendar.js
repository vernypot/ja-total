export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
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
