import { useEffect, useMemo, useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import * as EventosModel from '../models/eventos.model';
import * as ClubesModel from '../models/clubes.model';
import { buildCalendarCells, groupEventsByDate, monthRange, toDateKey } from '../../utils/calendar';
import { clubDisplayName } from '../../utils/club';

export function useCalendarioClubController() {
  const { activeClub, updateActiveClub } = useContext(ClubContext);
  const { effectiveIglesiaId, hasIglesiaAssignment, assignedIglesiaActive } = useScopedIglesia();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requestedClub = params.get('club');
  const clubId = requestedClub || activeClub?.id || '';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeClubData = useMemo(
    () => clubs.find(c => c.id === clubId) || (activeClub?.id === clubId ? activeClub : null),
    [clubs, clubId, activeClub]
  );

  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const calendarCells = useMemo(() => buildCalendarCells(year, monthIndex), [year, monthIndex]);
  const monthMeta = useMemo(() => monthRange(year, monthIndex), [year, monthIndex]);

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
      monthMeta.startDate,
      monthMeta.endDate
    );
    if (eventsError) {
      setError('Error loading calendar: ' + eventsError.message);
      setEvents([]);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }

  function selectClub(id) {
    if (id) navigate(`/dashboard/calendario?club=${id}`);
    else navigate('/dashboard/calendario');
  }

  function goToPreviousMonth() {
    if (monthIndex === 0) {
      setYear(prev => prev - 1);
      setMonthIndex(11);
      return;
    }
    setMonthIndex(prev => prev - 1);
  }

  function goToNextMonth() {
    if (monthIndex === 11) {
      setYear(prev => prev + 1);
      setMonthIndex(0);
      return;
    }
    setMonthIndex(prev => prev + 1);
  }

  function goToToday() {
    const today = new Date();
    setYear(today.getFullYear());
    setMonthIndex(today.getMonth());
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
  }, [clubId, monthMeta.startDate, monthMeta.endDate]);

  return {
    clubId,
    clubs,
    activeClubData,
    eventsByDate,
    calendarCells,
    year,
    monthIndex,
    loading,
    error,
    hasIglesiaAssignment,
    assignedIglesiaActive,
    iglesiaScopeReady: hasIglesiaAssignment ? assignedIglesiaActive : true,
    selectClub,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    toDateKey,
    clubDisplayName,
  };
}
