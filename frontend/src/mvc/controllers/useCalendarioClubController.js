import { useEffect, useMemo, useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ClubContext } from '../../context/ClubContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import * as EventosModel from '../models/eventos.model';
import * as ClubesModel from '../models/clubes.model';
import {
  buildCalendarCells,
  buildWeekDays,
  dateFromKey,
  groupEventsByDate,
  sortEventsByTime,
  toDateKey,
  visibleRangeForView,
} from '../../utils/calendar';
import { useChurchTimezone } from '../../hooks/useChurchTimezone';
import { clubDisplayName } from '../../utils/club';

export function useCalendarioClubController() {
  const { activeClub, updateActiveClub } = useContext(ClubContext);
  const { effectiveIglesiaId, hasIglesiaAssignment, assignedIglesiaActive } = useScopedIglesia();
  const churchTz = useChurchTimezone();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requestedClub = params.get('club');
  const clubId = requestedClub || activeClub?.id || '';

  const [viewMode, setViewMode] = useState('month');
  const [focusDateKey, setFocusDateKey] = useState(() => churchTz.getLocalTodayIso());
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedEventAssignments, setSelectedEventAssignments] = useState([]);
  const [loadingEventDetail, setLoadingEventDetail] = useState(false);

  const focusDate = useMemo(() => {
    const date = dateFromKey(focusDateKey);
    if (Number.isNaN(date.getTime())) {
      return dateFromKey(churchTz.getLocalTodayIso());
    }
    return date;
  }, [focusDateKey, churchTz]);
  const year = focusDate.getFullYear();
  const monthIndex = focusDate.getMonth();

  const activeClubData = useMemo(
    () => clubs.find(c => c.id === clubId) || (activeClub?.id === clubId ? activeClub : null),
    [clubs, clubId, activeClub]
  );

  const visibleRange = useMemo(
    () => visibleRangeForView(viewMode, focusDate),
    [viewMode, focusDate]
  );

  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const calendarCells = useMemo(() => buildCalendarCells(year, monthIndex), [year, monthIndex]);
  const weekDays = useMemo(() => buildWeekDays(focusDate), [focusDate]);

  const selectedDayEvents = useMemo(() => {
    const dateKey = viewMode === 'day' ? focusDateKey : selectedDateKey;
    if (!dateKey) return [];
    return sortEventsByTime(eventsByDate[dateKey] || []);
  }, [viewMode, focusDateKey, selectedDateKey, eventsByDate]);

  const selectedEvent = useMemo(
    () => events.find(event => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const activeSelectedDateKey = viewMode === 'day' ? focusDateKey : selectedDateKey;

  async function loadClubs() {
    const { data, error: clubsError } = await ClubesModel.fetchClubes({
      iglesiaId: effectiveIglesiaId,
      showInactive: false,
    });
    if (clubsError) {
      setError('Error loading clubs: ' + clubsError.message);
      return;
    }
    setClubs(data || []);
  }

  async function loadEvents() {
    if (!clubId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const { data, error: eventsError } = await EventosModel.fetchEventosByClubInRange(
      clubId,
      visibleRange.startDate,
      visibleRange.endDate
    );
    if (eventsError) {
      setError('Error loading calendar: ' + eventsError.message);
      setEvents([]);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }

  function clearEventSelection() {
    setSelectedEventId(null);
    setSelectedEventAssignments([]);
  }

  function selectClub(id) {
    setSelectedDateKey(null);
    clearEventSelection();
    if (id) navigate(`/dashboard/calendario?club=${id}`);
    else navigate('/dashboard/calendario');
  }

  function selectDate(dateKey) {
    setSelectedDateKey(dateKey);
    clearEventSelection();
  }

  async function selectEvent(eventId, dateKey) {
    if (dateKey) setSelectedDateKey(dateKey);
    setSelectedEventId(eventId);
    setLoadingEventDetail(true);
    setSelectedEventAssignments([]);

    const { data, error: assignError } = await EventosModel.fetchEventoAssignments(eventId);
    if (assignError) {
      setError('Error loading event: ' + assignError.message);
    } else {
      setSelectedEventAssignments(data || []);
    }
    setLoadingEventDetail(false);
  }

  function closeEventDetail() {
    clearEventSelection();
  }

  function openEventInEventsPage() {
    if (!clubId) return;
    navigate(`/dashboard/eventos?club=${clubId}`);
  }

  function setCalendarViewMode(mode) {
    setViewMode(mode);
    clearEventSelection();
    if (mode === 'day') {
      setSelectedDateKey(focusDateKey);
    } else if (mode === 'month') {
      setSelectedDateKey(null);
    }
  }

  function goToPrevious() {
    clearEventSelection();
    const d = dateFromKey(focusDateKey);
    if (viewMode === 'month') {
      d.setDate(1);
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    const nextKey = toDateKey(d);
    setFocusDateKey(nextKey);
    if (viewMode === 'day') setSelectedDateKey(nextKey);
    else if (viewMode === 'month') setSelectedDateKey(null);
  }

  function goToNext() {
    clearEventSelection();
    const d = dateFromKey(focusDateKey);
    if (viewMode === 'month') {
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    const nextKey = toDateKey(d);
    setFocusDateKey(nextKey);
    if (viewMode === 'day') setSelectedDateKey(nextKey);
    else if (viewMode === 'month') setSelectedDateKey(null);
  }

  function goToToday() {
    const today = churchTz.getLocalTodayIso();
    setFocusDateKey(today);
    setSelectedDateKey(today);
    clearEventSelection();
  }

  useEffect(() => {
    loadClubs();
  }, [effectiveIglesiaId]);

  useEffect(() => {
    if (requestedClub && clubs.some(c => c.id === requestedClub)) {
      updateActiveClub(clubs.find(c => c.id === requestedClub));
    }
  }, [requestedClub, clubs]);

  useEffect(() => {
    loadEvents();
  }, [clubId, visibleRange.startDate, visibleRange.endDate]);

  return {
    clubId,
    clubs,
    activeClubData,
    viewMode,
    focusDateKey,
    focusDate,
    eventsByDate,
    calendarCells,
    weekDays,
    year,
    monthIndex,
    loading,
    error,
    hasIglesiaAssignment,
    assignedIglesiaActive,
    iglesiaScopeReady: hasIglesiaAssignment ? assignedIglesiaActive : true,
    selectClub,
    setCalendarViewMode,
    goToPrevious,
    goToNext,
    goToToday,
    toDateKey,
    getLocalTodayIso: churchTz.getLocalTodayIso,
    clubDisplayName,
    selectedDateKey: activeSelectedDateKey,
    selectedDayEvents,
    selectedEvent,
    selectedEventAssignments,
    loadingEventDetail,
    selectDate,
    selectEvent,
    closeEventDetail,
    openEventInEventsPage,
    isEventInFuture: churchTz.isEventInFuture,
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
    getTipoEventoNombre: EventosModel.getTipoEventoNombre,
    getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
    getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
    memberDisplayName: EventosModel.memberDisplayName,
  };
}
