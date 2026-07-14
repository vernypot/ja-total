import { useContext, useMemo } from 'react';
import { IglesiaContext } from '../context/IglesiaContext';
import { DEFAULT_CHURCH_TIMEZONE, normalizeChurchTimezone } from '../utils/churchTimezones';
import {
  compareEventsByLocalDateTime,
  computeCheckinAttendanceEstado,
  formatEventLocalDate,
  formatEventLocalDateTime,
  formatEventLocalTime,
  getEventStartInstant,
  getLocalTodayIso,
  isEventInFuture,
  isEventInPast,
  isEventToday,
  toLocalDateKey,
} from '../utils/eventTimezone';

export function useChurchTimezone() {
  const { activeIglesiaTimezone } = useContext(IglesiaContext);
  const timeZone = normalizeChurchTimezone(activeIglesiaTimezone || DEFAULT_CHURCH_TIMEZONE);

  return useMemo(() => ({
    timeZone,
    getLocalTodayIso: (referenceDate = new Date()) => getLocalTodayIso(referenceDate, timeZone),
    toLocalDateKey: (referenceDate = new Date()) => toLocalDateKey(referenceDate, timeZone),
    getEventStartInstant: (evento) => getEventStartInstant(evento, timeZone),
    computeCheckinAttendanceEstado: (checkinAt, evento, options = {}) => (
      computeCheckinAttendanceEstado(checkinAt, evento, { ...options, timeZone })
    ),
    isEventInFuture: (evento, now = new Date()) => isEventInFuture(evento, now, timeZone),
    isEventInPast: (evento, now = new Date()) => isEventInPast(evento, now, timeZone),
    isEventToday: (evento, now = new Date()) => isEventToday(evento, now, timeZone),
    compareEventsByLocalDateTime,
    formatEventLocalDate: (fecha, language = 'es', options = {}) => (
      formatEventLocalDate(fecha, language, { ...options, timeZone })
    ),
    formatEventLocalTime,
    formatEventLocalDateTime: (evento, language = 'es') => formatEventLocalDateTime(evento, language, timeZone),
  }), [timeZone]);
}
