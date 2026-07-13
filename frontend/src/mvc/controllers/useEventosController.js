import { useEffect, useState, useContext, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { useLanguage } from '../../hooks/useLanguage';
import { getUserRole, canManageClubs } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import { validateForm } from '../../utils/validateForm';
import * as EventosModel from '../models/eventos.model';
import * as MiembrosModel from '../models/miembros.model';
import * as ClubesModel from '../models/clubes.model';
import * as TiposEventoModel from '../models/tiposEvento.model';

const emptyForm = () => ({
  nombre: '',
  fecha: '',
  hora: '',
  lugar: '',
  tipo_evento_id: '',
  requiere_confirmacion: true,
  memberAssignmentMode: 'all',
  selectedMemberIds: [],
});

export function useEventosController() {
  const { t } = useLanguage();
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
  const [tiposEvento, setTiposEvento] = useState([]);
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
  const [checkinNotice, setCheckinNotice] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editingEventId, setEditingEventId] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [bulkUpdatingEventId, setBulkUpdatingEventId] = useState('');

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

  async function loadTiposEvento() {
    const { data } = await TiposEventoModel.fetchTiposEvento({ showInactive: false });
    setTiposEvento(data || []);
  }

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

    const { data, error: eventsError } = await EventosModel.fetchEventosByClub(clubId, { showInactive });
    if (eventsError) {
      setError('Error loading events: ' + eventsError.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents(data || []);
    setLoading(false);

    if (canManage && data?.length) {
      await loadAllAssignments(data);
    }
  }

  async function loadAllAssignments(eventList) {
    const eventoIds = eventList
      .filter(evento => EventosModel.eventRequiresConfirmation(evento))
      .map(evento => evento.id);
    if (!eventoIds.length) return;

    const { data, error: assignError } = await EventosModel.fetchAssignmentsForEventIds(eventoIds);
    if (assignError) {
      setError('Error loading assignments: ' + assignError.message);
      return;
    }

    setAssignments(data || {});
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
    if (editingEventId && editingEventId !== eventoId) closeEditForm();
    setExpandedEventId(eventoId);
    if (!assignments[eventoId]) {
      await loadAssignments(eventoId);
    }
  }

  function openEventForm() {
    setEditingEventId('');
    setExpandedEventId('');
    closeAttendeeEditor();
    setEventForm(emptyForm());
    setShowForm(true);
  }

  function closeEventForm() {
    setEventForm(emptyForm());
    setShowForm(false);
  }

  function resolveMemberIdsForForm() {
    if (!eventForm.requiere_confirmacion) return [];
    return eventForm.memberAssignmentMode === 'all'
      ? clubMembers.map(m => m.id)
      : eventForm.selectedMemberIds;
  }

  async function openEditForm(evento) {
    if (!canManage) return;
    setShowForm(false);
    setExpandedEventId('');
    closeAttendeeEditor();
    setEditingEventId(evento.id);
    setError('');

    const rows = assignments[evento.id] || await loadAssignments(evento.id);
    const assignedIds = (rows || []).map(row => row.miembro_id).filter(Boolean);
    const allMemberIds = clubMembers.map(m => m.id);
    const allAssigned = assignedIds.length > 0
      && assignedIds.length === allMemberIds.length
      && assignedIds.every(id => allMemberIds.includes(id));

    setEventForm({
      nombre: evento.nombre || '',
      fecha: evento.fecha || '',
      hora: String(evento.hora || '').slice(0, 5),
      lugar: evento.lugar || '',
      tipo_evento_id: evento.tipo_evento_id || '',
      requiere_confirmacion: EventosModel.eventRequiresConfirmation(evento),
      memberAssignmentMode: allAssigned || assignedIds.length === 0 ? 'all' : 'specific',
      selectedMemberIds: assignedIds.length ? assignedIds : allMemberIds,
    });
  }

  function closeEditForm() {
    setEditingEventId('');
    setEventForm(emptyForm());
  }

  async function saveEvent() {
    if (!canManage || !clubId) return;
    setError('');

    const miembroIds = resolveMemberIdsForForm();

    const validation = validateForm('event', {
      ...eventForm,
      selectedMemberIds: miembroIds.length ? miembroIds : eventForm.selectedMemberIds,
    }, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    if (editingEventId) {
      setSavingEvent(true);
      const { error: saveError } = await EventosModel.updateEvento(editingEventId, {
        nombre: eventForm.nombre,
        fecha: eventForm.fecha,
        hora: eventForm.hora,
        lugar: eventForm.lugar,
        tipoEventoId: eventForm.tipo_evento_id || null,
        requiereConfirmacion: Boolean(eventForm.requiere_confirmacion),
      });

      if (saveError) {
        setSavingEvent(false);
        setError('Error updating event: ' + saveError.message);
        return;
      }

      if (eventForm.requiere_confirmacion) {
        const { error: syncError } = await EventosModel.syncEventoAttendees(
          editingEventId,
          miembroIds,
          { requiereConfirmacion: true }
        );
        if (syncError) {
          setSavingEvent(false);
          setError('Error updating attendees: ' + syncError.message);
          return;
        }
      } else {
        const { error: clearError } = await EventosModel.clearEventoAttendees(editingEventId);
        if (clearError) {
          setSavingEvent(false);
          setError('Error clearing attendees: ' + clearError.message);
          return;
        }
      }

      setSavingEvent(false);
      closeEditForm();
      loadEvents();
      return;
    }

    await createEvent();
  }

  async function createEvent() {
    if (!canManage || !clubId) return;
    setError('');

    const miembroIds = resolveMemberIdsForForm();

    const validation = validateForm('event', {
      ...eventForm,
      selectedMemberIds: miembroIds,
    }, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    setSavingEvent(true);
    const { error: saveError } = await EventosModel.createEvento({
      clubId,
      nombre: eventForm.nombre,
      fecha: eventForm.fecha,
      hora: eventForm.hora,
      lugar: eventForm.lugar,
      tipoEventoId: eventForm.tipo_evento_id || null,
      requiereConfirmacion: Boolean(eventForm.requiere_confirmacion),
      miembroIds,
    });
    setSavingEvent(false);

    if (saveError) {
      setError('Error creating event: ' + saveError.message);
      return;
    }

    closeEventForm();
    loadEvents();
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

  async function cancelEvent(eventoId) {
    if (!canManage) return;
    if (!window.confirm(t('cancelEventConfirm'))) return;
    setError('');

    const { error: saveError } = await EventosModel.setEventoEstado(eventoId, 'cancelado');
    if (saveError) {
      setError('Error cancelling event: ' + saveError.message);
      return;
    }

    if (editingEventId === eventoId) closeEditForm();
    loadEvents();
  }

  async function deactivateEvent(eventoId) {
    if (!canManage) return;
    if (!window.confirm(t('deactivateEventConfirm'))) return;
    setError('');

    const { error: saveError } = await EventosModel.setEventoEstado(eventoId, 'inactivo');
    if (saveError) {
      setError('Error deactivating event: ' + saveError.message);
      return;
    }

    if (editingEventId === eventoId) closeEditForm();
    loadEvents();
  }

  async function reactivateEvent(eventoId) {
    if (!canManage) return;
    setError('');

    const { error: saveError } = await EventosModel.setEventoEstado(eventoId, 'activo');
    if (saveError) {
      setError('Error reactivating event: ' + saveError.message);
      return;
    }

    loadEvents();
  }

  async function setConfirmation(eventoMiembroId, confirmacionEstado, eventoId) {
    if (!canManage) return;
    setError('');

    const { error: saveError } = await EventosModel.setEventoConfirmacion(eventoMiembroId, confirmacionEstado);
    if (saveError) {
      setError('Error saving confirmation: ' + saveError.message);
      return;
    }

    await loadAssignments(eventoId);
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

  async function checkinByScan(eventoId, token) {
    if (!canManage) return;
    setError('');
    setCheckinNotice('');

    const { error: checkinError } = await EventosModel.checkinEventoByToken(eventoId, token);
    if (checkinError) {
      setError('Check-in failed: ' + checkinError.message);
      return;
    }

    setCheckinNotice('checkinRecorded');
    await loadAssignments(eventoId);
  }

  async function openAttendeeEditor(eventoId) {
    if (!canManage) return;
    const evento = events.find(e => e.id === eventoId);
    if (!EventosModel.eventRequiresConfirmation(evento)) return;
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
    const evento = events.find(e => e.id === eventoId);
    if (!EventosModel.eventRequiresConfirmation(evento)) return;
    if (attendeeEditIds.length === 0) {
      setError('Select at least one member');
      return;
    }

    setSavingAttendees(true);
    setError('');

    const { error: saveError } = await EventosModel.syncEventoAttendees(eventoId, attendeeEditIds, {
      requiereConfirmacion: EventosModel.eventRequiresConfirmation(evento),
    });
    setSavingAttendees(false);

    if (saveError) {
      setError('Error updating attendees: ' + saveError.message);
      return;
    }

    closeAttendeeEditor();
    await loadAssignments(eventoId);
  }

  async function confirmAllPending(eventoId) {
    if (!canManage) return;
    if (!window.confirm(t('confirmAllPendingConfirm'))) return;

    const rows = assignments[eventoId] || await loadAssignments(eventoId);
    const pending = rows.filter(row => EventosModel.getConfirmacionFromRow(row) === 'pendiente');
    if (!pending.length) return;

    setBulkUpdatingEventId(eventoId);
    setError('');

    for (const row of pending) {
      const { error: saveError } = await EventosModel.setEventoConfirmacion(row.id, 'confirmado');
      if (saveError) {
        setError('Error saving confirmation: ' + saveError.message);
        break;
      }
    }

    setBulkUpdatingEventId('');
    await loadAssignments(eventoId);
  }

  async function setAllAttendance(eventoId, estado) {
    if (!canManage) return;
    const confirmKey = estado === 'a_tiempo' ? 'markAllOnTimeConfirm' : 'markAllAbsentConfirm';
    if (!window.confirm(t(confirmKey))) return;

    const rows = assignments[eventoId] || await loadAssignments(eventoId);
    if (!rows.length) return;

    setBulkUpdatingEventId(eventoId);
    setError('');

    for (const row of rows) {
      const { error: saveError } = await EventosModel.setEventoAsistencia(row.id, estado);
      if (saveError) {
        setError('Error saving attendance: ' + saveError.message);
        break;
      }
    }

    setBulkUpdatingEventId('');
    await loadAssignments(eventoId);
  }

  useEffect(() => {
    loadClubs();
    loadTiposEvento();
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
    closeEditForm();
    loadEvents();
    loadMembersForClub(clubId);
  }, [clubId, showInactive]);

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
    tiposEvento,
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
    saveEvent,
    setConfirmation,
    setAttendance,
    setClubId,
    showInactive,
    setShowInactive,
    editingEventId,
    openEditForm,
    closeEditForm,
    cancelEvent,
    deactivateEvent,
    reactivateEvent,
    savingEvent,
    fieldErrors,
    bulkUpdatingEventId,
    confirmAllPending,
    setAllAttendance,
    editingAttendeesEventId,
    attendeeEditIds,
    savingAttendees,
    openAttendeeEditor,
    closeAttendeeEditor,
    toggleAttendeeEditSelection,
    selectAllAttendeeEdit,
    saveEventAttendees,
    checkinByScan,
    checkinNotice,
    isEventInFuture: EventosModel.isEventInFuture,
    getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
    getCheckedInAtFromRow: EventosModel.getCheckedInAtFromRow,
    getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
    getTipoEventoNombre: EventosModel.getTipoEventoNombre,
    memberDisplayName: EventosModel.memberDisplayName,
  };
}
