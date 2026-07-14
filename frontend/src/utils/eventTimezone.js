/**
 * Church-local timezone for event fecha/hora (wall clock, not UTC).
 * Pass the church IANA timezone from iglesias.timezone when available.
 */
import { DEFAULT_CHURCH_TIMEZONE, normalizeChurchTimezone } from './churchTimezones';

export const EVENT_TIMEZONE = DEFAULT_CHURCH_TIMEZONE;

export function normalizeEventHora(hora) {
  const raw = String(hora || '00:00:00').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return '00:00:00';
  return `${String(match[1]).padStart(2, '0')}:${match[2]}:${match[3] || '00'}`;
}

function getOffsetMinutesAtInstant(instantMs, timeZone) {
  const date = new Date(instantMs);
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
}

export function wallClockToInstant(fecha, hora, timeZone = DEFAULT_CHURCH_TIMEZONE) {
  if (!fecha) return null;

  const zone = normalizeChurchTimezone(timeZone);
  const normalizedHora = normalizeEventHora(hora);
  const [year, month, day] = fecha.split('-').map(Number);
  const [hour, minute, second] = normalizedHora.split(':').map(Number);

  let instant = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const offsetMinutes = getOffsetMinutesAtInstant(instant, zone);
    instant = Date.UTC(year, month - 1, day, hour, minute, second) - offsetMinutes * 60 * 1000;
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
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizeChurchTimezone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export function toLocalDateKey(date = new Date(), timeZone = DEFAULT_CHURCH_TIMEZONE) {
  return formatIsoDateInTimezone(date, timeZone);
}

export function getLocalTodayIso(referenceDate = new Date(), timeZone = DEFAULT_CHURCH_TIMEZONE) {
  return toLocalDateKey(referenceDate, timeZone);
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

export function isEventInFuture(evento, now = new Date(), timeZone = DEFAULT_CHURCH_TIMEZONE) {
  const start = getEventStartInstant(evento, timeZone);
  if (!start) return false;
  return start > now;
}

export function isEventInPast(evento, now = new Date(), timeZone = DEFAULT_CHURCH_TIMEZONE) {
  return Boolean(evento?.fecha) && !isEventInFuture(evento, now, timeZone);
}

export function isEventToday(evento, now = new Date(), timeZone = DEFAULT_CHURCH_TIMEZONE) {
  if (!evento?.fecha) return false;
  return evento.fecha === getLocalTodayIso(now, timeZone);
}

export function compareEventsByLocalDateTime(a, b) {
  const keyA = `${a?.fecha || ''}T${String(a?.hora || '').slice(0, 8)}`;
  const keyB = `${b?.fecha || ''}T${String(b?.hora || '').slice(0, 8)}`;
  return keyA.localeCompare(keyB);
}

export function formatEventLocalDate(fecha, language = 'es', options = {}) {
  if (!fecha) return '';
  const {
    timeZone = DEFAULT_CHURCH_TIMEZONE,
    ...dateOptions
  } = options;
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  const anchor = wallClockToInstant(fecha, '12:00:00', timeZone);
  if (!anchor) return '';

  return anchor.toLocaleDateString(locale, {
    timeZone: normalizeChurchTimezone(timeZone),
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...dateOptions,
  });
}

export function formatEventLocalTime(hora) {
  if (!hora) return '';
  return String(hora).slice(0, 5);
}

export function formatEventLocalDateTime(evento, language = 'es', timeZone = DEFAULT_CHURCH_TIMEZONE) {
  if (!evento) return '';
  const zone = getEventChurchTimezone(evento) !== DEFAULT_CHURCH_TIMEZONE
    ? getEventChurchTimezone(evento)
    : normalizeChurchTimezone(timeZone);
  const date = formatEventLocalDate(evento.fecha, language, { timeZone: zone });
  const time = formatEventLocalTime(evento.hora);
  return time ? `${date} · ${time}` : date;
}
