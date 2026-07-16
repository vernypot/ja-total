import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMemberPortal } from '../../context/MemberPortalContext';
import * as MemberPortalModel from '../models/memberPortal.model';
import * as EventosModel from '../models/eventos.model';
import {
  buildCalendarCells,
  buildWeekDays,
  dateFromKey,
  groupEventsByDate,
  isValidDateKey,
  sortEventsByTime,
  toDateKey,
  visibleRangeForView,
} from '../../utils/calendar';
import { clubDisplayName } from '../../utils/club';
import { normalizeChurchTimezone } from '../../utils/churchTimezones';
import { EVENT_TIMEZONE, getLocalTodayIso, normalizeEventDate } from '../../utils/eventTimezone';

function coerceDateKey(dateKey, fallbackTimezone) {
  const normalized = normalizeEventDate(dateKey);
  if (isValidDateKey(normalized)) return normalized;
  return getLocalTodayIso(fallbackTimezone);
}

export function useMemberPortalCalendarioController() {
  const { session } = useMemberPortal();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requestedClub = params.get('club');

  const [clubs, setClubs] = useState([]);
  const [clubId, setClubId] = useState('');
  const [viewMode, setViewMode] = useState('month');
  const [focusDateKey, setFocusDateKey] = useState(() => getLocalTodayIso(EVENT_TIMEZONE));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [memberEventByEventId, setMemberEventByEventId] = useState({});
  const [savingConfirmationId, setSavingConfirmationId] = useState(null);

  const activeClubData = useMemo(
    () => clubs.find(c => c.id === clubId) || null,
    [clubs, clubId]
  );

  const clubTimezone = useMemo(
    () => normalizeChurchTimezone(activeClubData?.timezone || EVENT_TIMEZONE),
    [activeClubData?.timezone]
  );

  const todayKey = useMemo(() => getLocalTodayIso(clubTimezone), [clubTimezone]);

  const safeFocusDateKey = useMemo(
    () => coerceDateKey(focusDateKey, clubTimezone),
    [focusDateKey, clubTimezone]
  );

  const focusDate = useMemo(() => {
    const date = dateFromKey(safeFocusDateKey, dateFromKey(todayKey));
    if (Number.isNaN(date.getTime())) {
      return dateFromKey(todayKey);
    }
    return date;
  }, [safeFocusDateKey, todayKey]);

  const year = focusDate.getFullYear();
  const monthIndex = focusDate.getMonth();

  const visibleRange = useMemo(
    () => visibleRangeForView(viewMode, focusDate, dateFromKey(todayKey)),
    [viewMode, focusDate, todayKey]
  );

  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const calendarCells = useMemo(() => buildCalendarCells(year, monthIndex), [year, monthIndex]);
  const weekDays = useMemo(() => buildWeekDays(focusDate), [focusDate]);

  const activeSelectedDateKey = viewMode === 'day' ? safeFocusDateKey : selectedDateKey;

  const selectedDayEvents = useMemo(() => {
    const dateKey = activeSelectedDateKey;
    if (!dateKey) return [];
    return sortEventsByTime(eventsByDate[dateKey] || []);
  }, [activeSelectedDateKey, eventsByDate]);

  const selectedEvent = useMemo(
    () => events.find(event => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const setSafeFocusDateKey = useCallback((nextKey) => {
    setFocusDateKey(coerceDateKey(nextKey, clubTimezone));
  }, [clubTimezone]);

  async function loadClubs() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await MemberPortalModel.fetchPortalProfile(session.sessionToken);
    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    const clubRows = (profile?.clubes || []).map(club => ({
      id: club.id,
      nombre: club.nombre,
      iglesia_id: club.iglesia_id,
      iglesia_nombre: club.iglesia_nombre,
      timezone: club.timezone,
    }));

    setClubs(clubRows);

    const initialClub = requestedClub && clubRows.some(c => c.id === requestedClub)
      ? requestedClub
      : (clubRows[0]?.id || '');

    setClubId(prev => prev || initialClub);

    if (!clubRows.length) {
      setLoading(false);
    }
  }

  async function loadMemberEvents() {
    if (!session?.sessionToken) {
      setMemberEventByEventId({});
      return;
    }

    const { data, error: loadError } = await MemberPortalModel.fetchPortalEvents(session.sessionToken);
    if (loadError) {
      setMemberEventByEventId({});
      return;
    }

    const map = {};
    for (const row of data || []) {
      const eventoId = row.evento_id || row.eventos?.id;
      if (eventoId) map[eventoId] = row;
    }
    setMemberEventByEventId(map);
  }

  async function updateConfirmation(eventoMiembroId, confirmacionEstado, eventoId = null) {
    if (!session?.sessionToken) return;
    if (!eventoMiembroId && !eventoId) return;
    if (!['confirmado', 'rechazado', 'pendiente'].includes(confirmacionEstado)) return;

    const saveKey = eventoMiembroId || eventoId;
    setError('');
    setSavingConfirmationId(saveKey);

    const { data, error: saveError } = await MemberPortalModel.setPortalEventConfirmation(
      session.sessionToken,
      confirmacionEstado,
      {
        eventoMiembroId: eventoMiembroId || null,
        eventoId: eventoMiembroId ? null : eventoId,
      }
    );

    setSavingConfirmationId(null);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setMemberEventByEventId(prev => MemberPortalModel.patchPortalEventMapConfirmation(prev, {
      eventoMiembroId,
      eventoId,
      confirmacionEstado,
      savedRow: data,
    }));

    await loadMemberEvents();
  }

  async function loadEvents() {
    if (!session?.sessionToken || !clubId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    const { data, error: eventsError, warning } = await MemberPortalModel.fetchPortalCalendarEvents(
      session.sessionToken,
      clubId,
      visibleRange.startDate,
      visibleRange.endDate
    );

    if (eventsError) {
      setError(eventsError.message || 'Could not load calendar events');
      setEvents([]);
    } else {
      setEvents(data || []);
      if (warning) {
        setNotice(warning);
      }
    }

    setLoading(false);
  }

  function clearEventSelection() {
    setSelectedEventId(null);
  }

  function selectClub(id) {
    setSelectedDateKey(null);
    clearEventSelection();
    setClubId(id);
    if (id) navigate(`/dashboard/calendario?club=${id}`);
    else navigate('/dashboard/calendario');
  }

  function selectDate(dateKey) {
    const normalized = normalizeEventDate(dateKey);
    if (!isValidDateKey(normalized)) return;
    setSelectedDateKey(normalized);
    clearEventSelection();
  }

  function selectEvent(eventId, dateKey) {
    const normalized = normalizeEventDate(dateKey);
    if (normalized) setSelectedDateKey(normalized);
    setSelectedEventId(eventId);
  }

  function closeEventDetail() {
    clearEventSelection();
  }

  function setCalendarViewMode(mode) {
    setViewMode(mode);
    clearEventSelection();
    if (mode === 'day') setSelectedDateKey(safeFocusDateKey);
    else if (mode === 'month') setSelectedDateKey(null);
  }

  function shiftFocus(step) {
    clearEventSelection();
    const d = new Date(focusDate.getTime());
    if (Number.isNaN(d.getTime())) {
      setSafeFocusDateKey(todayKey);
      if (viewMode === 'day') setSelectedDateKey(todayKey);
      return;
    }

    if (viewMode === 'month') {
      d.setDate(1);
      d.setMonth(d.getMonth() + step);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + (step * 7));
    } else {
      d.setDate(d.getDate() + step);
    }

    const nextKey = toDateKey(d) || todayKey;
    setSafeFocusDateKey(nextKey);
    if (viewMode === 'day') setSelectedDateKey(nextKey);
    else if (viewMode === 'month') setSelectedDateKey(null);
  }

  function goToPrevious() {
    shiftFocus(-1);
  }

  function goToNext() {
    shiftFocus(1);
  }

  function goToToday() {
    setSafeFocusDateKey(todayKey);
    setSelectedDateKey(todayKey);
    clearEventSelection();
  }

  useEffect(() => {
    loadClubs();
    loadMemberEvents();
  }, [session?.sessionToken]);

  useEffect(() => {
    if (requestedClub && clubs.some(c => c.id === requestedClub)) {
      setClubId(requestedClub);
    }
  }, [requestedClub, clubs]);

  useEffect(() => {
    if (!isValidDateKey(safeFocusDateKey)) {
      setSafeFocusDateKey(todayKey);
    }
  }, [safeFocusDateKey, todayKey, setSafeFocusDateKey]);

  useEffect(() => {
    loadEvents();
  }, [session?.sessionToken, clubId, visibleRange.startDate, visibleRange.endDate]);

  return {
    clubId,
    clubs,
    activeClubData,
    viewMode,
    focusDateKey: safeFocusDateKey,
    focusDate,
    eventsByDate,
    calendarCells,
    weekDays,
    loading,
    error: notice ? '' : error,
    calendarNotice: notice,
    iglesiaScopeReady: true,
    selectClub,
    setCalendarViewMode,
    goToPrevious,
    goToNext,
    goToToday,
    toDateKey,
    getLocalTodayIso: () => todayKey,
    clubDisplayName,
    selectedDateKey: activeSelectedDateKey,
    selectedDayEvents,
    selectedEvent,
    selectedEventAssignments: [],
    memberEventRow: selectedEvent ? memberEventByEventId[selectedEvent.id] || null : null,
    loadingEventDetail: false,
    selectDate,
    selectEvent,
    closeEventDetail,
    openEventInEventsPage: () => navigate('/dashboard/eventos'),
    updateConfirmation,
    savingConfirmationId,
    canMemberConfirmEvent: EventosModel.canMemberConfirmEvent,
    isEventInFuture: (evento) => EventosModel.isEventInFuture(evento, new Date(), clubTimezone),
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
    getTipoEventoNombre: EventosModel.getTipoEventoNombre,
    getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
    getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
    memberDisplayName: EventosModel.memberDisplayName,
    readOnly: true,
  };
}
