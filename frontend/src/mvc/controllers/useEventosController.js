import { useEffect, useState, useContext, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { getUserRole, canManageClubs } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import * as EventosModel from '../models/eventos.model';
import * as MiembrosModel from '../models/miembros.model';
import * as ClubesModel from '../models/clubes.model';

const emptyForm = () => ({
  nombre: '',
  fecha: '',
  hora: '',
  lugar: '',
  memberAssignmentMode: 'all',
  selectedMemberIds: [],
});

export function useEventosController() {
  const { user, userData } = useContext(AuthContext);
  const { activeClub, updateActiveClub } = useContext(ClubContext);
  const { effectiveIglesiaId, canSwitchIglesia, hasIglesiaAssignment, assignedIglesiaActive } = useScopedIglesia();
  const userRole = getUserRole(user, userData);
  const canManage = canManageClubs(userRole);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requestedClub = params.get('club');
  const clubId = requestedClub || activeClub?.id || '';

  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [clubMembers, setClubMembers] = useState([]);
  const [expandedEventId, setExpandedEventId] = useState('');
  const [assignments, setAssignments] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [eventForm, setEventForm] = useState(emptyForm());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAttendeesEventId, setEditingAttendeesEventId] = useState('');
  const [attendeeEditIds, setAttendeeEditIds] = useState([]);
  const [savingAttendees, setSavingAttendees] = useState(false);

  const activeClubData = useMemo(
    () => clubs.find(c => c.id === clubId) || (activeClub?.id === clubId ? activeClub : null),
    [clubs, clubId, activeClub]
  );

  const filteredEvents = useMemo(
    () => filterBySearch(events, searchQuery, e => [
      e.nombre,
      e.lugar,
      e.fecha,
      e.clubes?.nombre,
    ]),
    [events, searchQuery]
  );

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

  async function loadMembersForClub(id) {
    if (!id) {
      setClubMembers([]);
      return;
    }
    const { data, error: membersError } = await MiembrosModel.fetchMiembrosByClub(id);
    if (membersError) {
      setError('Error loading club members: ' + membersError.message);
      setClubMembers([]);
      return;
    }
    const members = (data || [])
      .map(row => row.miembros)
      .filter(m => m && m.estado === 'activo');
    setClubMembers(members);
  }

  async function loadEvents() {
    if (!clubId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: eventsError } = await EventosModel.fetchEventosByClub(clubId);
    if (eventsError) {
      setError('Error loading events: ' + eventsError.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents(data || []);
    setLoading(false);
  }

  async function loadAssignments(eventoId) {
    const { data, error: assignError } = await EventosModel.fetchEventoAssignments(eventoId);
    if (assignError) {
      setError('Error loading assignments: ' + assignError.message);
      return;
    }
    setAssignments(prev => ({ ...prev, [eventoId]: data || [] }));
    return data || [];
  }

  async function toggleEventExpand(eventoId) {
    if (expandedEventId === eventoId) {
      setExpandedEventId('');
      return;
    }
    setExpandedEventId(eventoId);
    if (!assignments[eventoId]) {
      await loadAssignments(eventoId);
    }
  }

  function openEventForm() {
    setEventForm(emptyForm());
    setShowForm(true);
  }

  function closeEventForm() {
    setEventForm(emptyForm());
    setShowForm(false);
  }

  function setMemberAssignmentMode(mode) {
    setEventForm(prev => ({
      ...prev,
      memberAssignmentMode: mode,
      selectedMemberIds: mode === 'specific' ? clubMembers.map(m => m.id) : [],
    }));
  }

  function toggleMemberSelection(miembroId) {
    setEventForm(prev => {
      const set = new Set(prev.selectedMemberIds);
      if (set.has(miembroId)) set.delete(miembroId);
      else set.add(miembroId);
      return { ...prev, selectedMemberIds: Array.from(set) };
    });
  }

  function selectAllMembers() {
    setEventForm(prev => ({
      ...prev,
      selectedMemberIds: clubMembers.map(m => m.id),
    }));
  }

  async function createEvent() {
    if (!canManage || !clubId) return;
    setError('');

    if (!eventForm.fecha || !eventForm.hora || !eventForm.lugar.trim()) {
      setError('Date, time, and place are required');
      return;
    }

    const miembroIds = eventForm.memberAssignmentMode === 'all'
      ? clubMembers.map(m => m.id)
      : eventForm.selectedMemberIds;

    if (eventForm.memberAssignmentMode === 'specific' && miembroIds.length === 0) {
      setError('Select at least one member');
      return;
    }

    const { error: saveError } = await EventosModel.createEvento({
      clubId,
      nombre: eventForm.nombre,
      fecha: eventForm.fecha,
      hora: eventForm.hora,
      lugar: eventForm.lugar,
      miembroIds,
    });

    if (saveError) {
      setError('Error creating event: ' + saveError.message);
      return;
    }

    closeEventForm();
    loadEvents();
  }

  async function setAttendance(eventoMiembroId, estado, eventoId) {
    if (!canManage) return;
    setError('');

    const { error: saveError } = await EventosModel.setEventoAsistencia(eventoMiembroId, estado);
    if (saveError) {
      setError('Error saving attendance: ' + saveError.message);
      return;
    }

    await loadAssignments(eventoId);
  }

  async function openAttendeeEditor(eventoId) {
    if (!canManage) return;
    setError('');
    const rows = assignments[eventoId] || await loadAssignments(eventoId);
    setAttendeeEditIds(rows.map(row => row.miembro_id));
    setEditingAttendeesEventId(eventoId);
  }

  function closeAttendeeEditor() {
    setEditingAttendeesEventId('');
    setAttendeeEditIds([]);
  }

  function toggleAttendeeEditSelection(miembroId) {
    setAttendeeEditIds(prev => {
      const set = new Set(prev);
      if (set.has(miembroId)) set.delete(miembroId);
      else set.add(miembroId);
      return Array.from(set);
    });
  }

  function selectAllAttendeeEdit() {
    setAttendeeEditIds(clubMembers.map(m => m.id));
  }

  async function saveEventAttendees(eventoId) {
    if (!canManage) return;
    if (attendeeEditIds.length === 0) {
      setError('Select at least one member');
      return;
    }

    setSavingAttendees(true);
    setError('');

    const { error: saveError } = await EventosModel.syncEventoAttendees(eventoId, attendeeEditIds);
    setSavingAttendees(false);

    if (saveError) {
      setError('Error updating attendees: ' + saveError.message);
      return;
    }

    closeAttendeeEditor();
    await loadAssignments(eventoId);
  }

  useEffect(() => {
    loadClubs();
  }, [effectiveIglesiaId]);

  useEffect(() => {
    if (clubId && clubs.some(c => c.id === clubId)) {
      const club = clubs.find(c => c.id === clubId);
      if (club) updateActiveClub(club);
    }
  }, [clubId, clubs]);

  useEffect(() => {
    setExpandedEventId('');
    setAssignments({});
    closeAttendeeEditor();
    loadEvents();
    loadMembersForClub(clubId);
  }, [clubId]);

  function setClubId(nextClubId) {
    if (nextClubId) {
      const club = clubs.find(c => c.id === nextClubId);
      if (club) updateActiveClub(club);
      navigate(`/dashboard/eventos?club=${nextClubId}`);
    } else {
      navigate('/dashboard/eventos');
    }
  }

  return {
    clubs,
    clubId,
    activeClubData,
    events: filteredEvents,
    clubMembers,
    expandedEventId,
    assignments,
    error,
    loading,
    showForm,
    setShowForm,
    openEventForm,
    closeEventForm,
    eventForm,
    setEventForm,
    setMemberAssignmentMode,
    searchQuery,
    setSearchQuery,
    canManage,
    iglesiaScopeReady: canSwitchIglesia || (hasIglesiaAssignment && assignedIglesiaActive),
    toggleEventExpand,
    toggleMemberSelection,
    selectAllMembers,
    createEvent,
    setAttendance,
    setClubId,
    editingAttendeesEventId,
    attendeeEditIds,
    savingAttendees,
    openAttendeeEditor,
    closeAttendeeEditor,
    toggleAttendeeEditSelection,
    selectAllAttendeeEdit,
    saveEventAttendees,
    isEventInFuture: EventosModel.isEventInFuture,
    getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
    memberDisplayName: EventosModel.memberDisplayName,
  };
}
