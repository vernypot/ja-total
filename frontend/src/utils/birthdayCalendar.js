import { dateFromKey, pad2, toDateKey } from './calendar';
import { normalizeEventDate } from './eventTimezone';
import { memberDisplayName } from './memberDisplayName';

export function isBirthdayEvent(event) {
  return Boolean(event?.isBirthday || event?.kind === 'birthday');
}

export function birthdayEventId(miembroId, dateKey) {
  return `birthday:${miembroId}:${dateKey}`;
}

export function parseBirthdayEventId(eventId) {
  const match = String(eventId || '').match(/^birthday:([^:]+):(\d{4}-\d{2}-\d{2})$/);
  if (!match) return null;
  return { miembroId: match[1], dateKey: match[2] };
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function birthdayDateKeysInRange(fechaNacimiento, startKey, endKey) {
  const birth = normalizeEventDate(fechaNacimiento);
  const start = normalizeEventDate(startKey);
  const end = normalizeEventDate(endKey);
  if (!birth || !start || !end || start > end) return [];

  const [, month, day] = birth.split('-').map(Number);
  const startDate = dateFromKey(start);
  const endDate = dateFromKey(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return [];

  const keys = [];
  for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year += 1) {
    const resolvedDay = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day;
    const candidate = new Date(year, month - 1, resolvedDay);
    if (Number.isNaN(candidate.getTime())) continue;
    const key = toDateKey(candidate);
    if (key && key >= start && key <= end) keys.push(key);
  }
  return keys;
}

export function buildBirthdayCalendarEvents({
  members,
  clubId,
  startDate,
  endDate,
  nameFn = memberDisplayName,
} = {}) {
  const events = [];

  for (const member of members || []) {
    if (!member?.id || !member.fecha_nacimiento) continue;
    const keys = birthdayDateKeysInRange(member.fecha_nacimiento, startDate, endDate);
    const displayName = nameFn(member) || member.nombre || '';

    for (const dateKey of keys) {
      events.push({
        id: birthdayEventId(member.id, dateKey),
        kind: 'birthday',
        isBirthday: true,
        club_id: clubId,
        miembro_id: member.id,
        miembro: member,
        nombre: displayName,
        fecha: dateKey,
        hora: '00:00:00',
        lugar: null,
        descripcion: null,
        estado: 'activo',
        tipos_evento: { id: 'birthday', nombre: 'birthday' },
      });
    }
  }

  return events;
}

export function birthdayPreferenceStorageKey(clubId) {
  return `calendario.showBirthdays.${clubId}`;
}

export function readBirthdayPreference(clubId, fallback = true) {
  if (!clubId || typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(birthdayPreferenceStorageKey(clubId));
    if (raw == null) return fallback;
    return raw === 'true';
  } catch {
    return fallback;
  }
}

export function writeBirthdayPreference(clubId, value) {
  if (!clubId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(birthdayPreferenceStorageKey(clubId), value ? 'true' : 'false');
  } catch {
    // ignore quota / private mode
  }
}
