/**
 * Church-local timezone for event fecha/hora (wall clock, not UTC).
 * Pass the church IANA timezone from iglesias.timezone when available.
 */
import { DEFAULT_CHURCH_TIMEZONE, normalizeChurchTimezone } from './churchTimezones';

export const EVENT_TIMEZONE = DEFAULT_CHURCH_TIMEZONE;

export function isValidWallClockDateKey(dateKey) {
  const normalized = String(dateKey || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;

  const [year, month, day] = normalized.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;

  const probe = new Date(year, month - 1, day);
  return probe.getFullYear() === year
    && probe.getMonth() === month - 1
    && probe.getDate() === day;
}

export function normalizeEventDate(fecha) {
  if (!fecha) return '';

  if (fecha instanceof Date) {
    if (Number.isNaN(fecha.getTime())) return '';
    const year = fecha.getUTCFullYear();
    const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const day = String(fecha.getUTCDate()).padStart(2, '0');
    const key = `${year}-${month}-${day}`;
    return isValidWallClockDateKey(key) ? key : '';
  }

  const raw = String(fecha).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  const key = match ? match[1] : '';
  return isValidWallClockDateKey(key) ? key : '';
}

export function normalizeEventHora(hora) {
  const raw = String(hora || '00:00:00').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return '00:00:00';
  return `${String(match[1]).padStart(2, '0')}:${match[2]}:${match[3] || '00'}`;
}

function getOffsetMinutesAtInstant(instantMs, timeZone) {
  if (!Number.isFinite(instantMs)) return 0;

  const date = new Date(instantMs);
  if (Number.isNaN(date.getTime())) return 0;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const year = Number(parts.find(part => part.type === 'year')?.value);
    const month = Number(parts.find(part => part.type === 'month')?.value);
    const day = Number(parts.find(part => part.type === 'day')?.value);
    const hour = Number(parts.find(part => part.type === 'hour')?.value);
    const minute = Number(parts.find(part => part.type === 'minute')?.value);
    const second = Number(parts.find(part => part.type === 'second')?.value);
    const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    return (asUtc - instantMs) / 60000;
  } catch {
    return 0;
  }
}

export function wallClockToInstant(fecha, hora, timeZone = DEFAULT_CHURCH_TIMEZONE) {
  const normalizedFecha = normalizeEventDate(fecha);
  if (!normalizedFecha) return null;

  const zone = normalizeChurchTimezone(timeZone);
  const normalizedHora = normalizeEventHora(hora);
  const [year, month, day] = normalizedFecha.split('-').map(Number);
  const [hour, minute, second] = normalizedHora.split(':').map(Number);

  if (![year, month, day, hour, minute, second].every(Number.isFinite)) return null;

  let instant = Date.UTC(year, month - 1, day, hour, minute, second);
  if (!Number.isFinite(instant)) return null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const offsetMinutes = getOffsetMinutesAtInstant(instant, zone);
    instant = Date.UTC(year, month - 1, day, hour, minute, second) - offsetMinutes * 60 * 1000;
    if (!Number.isFinite(instant)) return null;
  }

  const result = new Date(instant);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function getEventChurchTimezone(evento) {
  return normalizeChurchTimezone(
    evento?.clubes?.iglesias?.timezone
    || evento?.iglesia_timezone
    || DEFAULT_CHURCH_TIMEZONE
  );
}

export function formatIsoDateInTimezone(date, timeZone = DEFAULT_CHURCH_TIMEZONE) {
  const safeDate = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(safeDate.getTime())) return '';

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: normalizeChurchTimezone(timeZone),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(safeDate);

    const year = parts.find(part => part.type === 'year')?.value;
    const month = parts.find(part => part.type === 'month')?.value;
    const day = parts.find(part => part.type === 'day')?.value;
    if (!year || !month || !day) return '';
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

export function toLocalDateKey(date = new Date(), timeZone = DEFAULT_CHURCH_TIMEZONE) {
  return formatIsoDateInTimezone(date, timeZone);
}

export function getLocalTodayIso(referenceDate = new Date(), timeZone = DEFAULT_CHURCH_TIMEZONE) {
  const key = toLocalDateKey(referenceDate, timeZone);
  if (key) return key;
  return toLocalDateKey(new Date(), DEFAULT_CHURCH_TIMEZONE);
}

export function getEventStartInstant(evento, timeZone = DEFAULT_CHURCH_TIMEZONE) {
  if (!evento?.fecha) return null;
  const zone = getEventChurchTimezone(evento) !== DEFAULT_CHURCH_TIMEZONE
    ? getEventChurchTimezone(evento)
    : normalizeChurchTimezone(timeZone);
  return wallClockToInstant(evento.fecha, evento.hora, zone);
}

export function computeCheckinAttendanceEstado(checkinAt, evento, { graceMinutes = 15, timeZone } = {}) {
  const zone = timeZone || getEventChurchTimezone(evento);
  const start = getEventStartInstant(evento, zone);
  if (!start) return 'a_tiempo';

  const checkin = checkinAt instanceof Date ? checkinAt : new Date(checkinAt);
  if (Number.isNaN(checkin.getTime())) return 'a_tiempo';

  const graceEnd = new Date(start.getTime() + graceMinutes * 60 * 1000);
  return checkin.getTime() <= graceEnd.getTime() ? 'a_tiempo' : 'tarde';
}

export function eventHasScheduledTime(evento) {
  if (!evento) return false;
  const raw = evento.hora;
  return raw != null && String(raw).trim() !== '';
}

/** Members can confirm through the event date when no start time is set. */
export function isEventOpenForMemberConfirmation(evento, now = new Date(), timeZone = DEFAULT_CHURCH_TIMEZONE) {
  const fecha = normalizeEventDate(evento?.fecha);
  if (!fecha) return false;

  const zone = normalizeChurchTimezone(timeZone || getEventChurchTimezone(evento));

  if (!eventHasScheduledTime(evento)) {
    return fecha >= getLocalTodayIso(now, zone);
  }

  const start = getEventStartInstant(evento, zone);
  if (!start) return false;
  return start > now;
}

export function isEventInFuture(evento, now = new Date(), timeZone = DEFAULT_CHURCH_TIMEZONE) {
  const start = getEventStartInstant(evento, timeZone);
  if (!start) return false;
  return start > now;
}

export function isEventInPast(evento, now = new Date(), timeZone = DEFAULT_CHURCH_TIMEZONE) {
  return Boolean(evento?.fecha) && !isEventInFuture(evento, now, timeZone);
}

export function isEventToday(evento, now = new Date(), timeZone = DEFAULT_CHURCH_TIMEZONE) {
  const fecha = normalizeEventDate(evento?.fecha);
  if (!fecha) return false;
  return fecha === getLocalTodayIso(now, timeZone);
}

export function compareEventsByLocalDateTime(a, b) {
  const keyA = `${normalizeEventDate(a?.fecha)}T${String(a?.hora || '').slice(0, 8)}`;
  const keyB = `${normalizeEventDate(b?.fecha)}T${String(b?.hora || '').slice(0, 8)}`;
  return keyA.localeCompare(keyB);
}

export function formatEventLocalDate(fecha, language = 'es', options = {}) {
  const normalizedFecha = normalizeEventDate(fecha);
  if (!normalizedFecha) return '';
  const {
    timeZone = DEFAULT_CHURCH_TIMEZONE,
    ...dateOptions
  } = options;
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  const anchor = wallClockToInstant(normalizedFecha, '12:00:00', timeZone);
  if (!anchor || Number.isNaN(anchor.getTime())) return '';

  const formatted = anchor.toLocaleDateString(locale, {
    timeZone: normalizeChurchTimezone(timeZone),
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...dateOptions,
  });

  return formatted === 'Invalid Date' || formatted === 'Invalid time value' ? '' : formatted;
}

export function formatEventLocalTime(hora, language = 'es') {
  if (!hora) return '';
  const normalized = normalizeEventHora(hora);
  const match = normalized.match(/^(\d{2}):(\d{2})/);
  if (!match) return '';

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '';

  const locale = language === 'en' ? 'en-US' : 'es-CO';
  const stamp = new Date(2000, 0, 1, hour, minute, 0);
  const formatted = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(stamp);

  return formatted === 'Invalid Date' ? '' : formatted;
}

export function formatEventLocalDateTime(evento, language = 'es', timeZone = DEFAULT_CHURCH_TIMEZONE) {
  if (!evento) return '';
  const zone = getEventChurchTimezone(evento) !== DEFAULT_CHURCH_TIMEZONE
    ? getEventChurchTimezone(evento)
    : normalizeChurchTimezone(timeZone);
  const date = formatEventLocalDate(evento.fecha, language, { timeZone: zone });
  const time = formatEventLocalTime(evento.hora, language);
  return time ? `${date} · ${time}` : date;
}
