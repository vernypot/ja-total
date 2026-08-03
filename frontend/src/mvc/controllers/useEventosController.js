import { useEffect, useState, useContext, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { useLanguage } from '../../hooks/useLanguage';
import { getUserRole, canManageClubs, canOperateEvents } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import { useListPagination } from '../../hooks/useListPagination';
import { validateForm } from '../../utils/validateForm';
import * as EventosModel from '../models/eventos.model';
import * as MiembrosModel from '../models/miembros.model';
import * as ClubesModel from '../models/clubes.model';
import * as TiposEventoModel from '../models/tiposEvento.model';
import { useChurchTimezone } from '../../hooks/useChurchTimezone';
import { useLinkedMemberEventConfirmation } from '../../hooks/useLinkedMemberEventConfirmation';
import { emptyEventCuotaForm } from '../../utils/cuota';

const emptyForm = () => ({
  nombre: '',
  fecha: '',
  hora: '',
  lugar: '',
  descripcion: '',
  tipo_evento_id: '',
  requiere_confirmacion: true,
  memberAssignmentMode: 'all',
  selectedMemberIds: [],
  actividad_inicio_local: '',
  ...emptyEventCuotaForm(),
});

export function useEventosController() {
  const { t, language } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const { activeClub, updateActiveClub } = useContext(ClubContext);
  const { effectiveIglesiaId, canSwitchIglesia, hasIglesiaAssignment, assignedIglesiaActive } = useScopedIglesia();
  const churchTz = useChurchTimezone();
  const userRole = getUserRole(user, userData);
  const canManage = canManageClubs(userRole);
  const canOperate = canOperateEvents(userRole);
  const {
    linkedMiembroId,
    buildSelfRow,
    updateConfirmation: updateSelfConfirmationBase,
    savingConfirmationId: savingSelfConfirmationId,
  } = useLinkedMemberEventConfirmation();
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
  const [showInactive, setShowInactive] = useState(false);
  const [editingEventId, setEditingEventId] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [bulkUpdatingEventId, setBulkUpdatingEventId] = useState('');
  const [selfEventRowsByEventId, setSelfEventRowsByEventId] = useState({});
  const [manualAddEventId, setManualAddEventId] = useState('');
  const [manualAddForm, setManualAddForm] = useState({ miembroId: '', justificacion: '' });
  const [manualAddFieldErrors, setManualAddFieldErrors] = useState({});
  const [savingManualAdd, setSavingManualAdd] = useState(false);
  const [initializingEventId, setInitializingEventId] = useState('');
  const [mergeAnchorEventId, setMergeAnchorEventId] = useState('');
  const [mergeTargetEventId, setMergeTargetEventId] = useState('');
  const [mergingAttendance, setMergingAttendance] = useState(false);

  const activeClubData = useMemo(
    () => clubs.find(c => c.id === clubId) || (activeClub?.id === clubId ? activeClub : null),
    [clubs, clubId, activeClub]
  );

  const filteredEvents = useMemo(
    () => filterBySearch(events, searchQuery, e => [
      e.nombre,
      e.lugar,
      e.descripcion,
      e.fecha,
      e.clubes?.nombre,
    ]),
    [events, searchQuery]
  );

  const {
    pageItems: paginatedEvents,
    ...listPagination
  } = useListPagination(filteredEvents, [searchQuery, showInactive, clubId]);

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

    const eventList = data || [];
    if (canOperate && eventList.length) {
      await loadAllAssignments(eventList);
    }
    await loadLinkedMemberEventRows(eventList);
  }

  async function loadLinkedMemberEventRows(eventList) {
    if (!linkedMiembroId || !eventList?.length) {
      setSelfEventRowsByEventId({});
      return;
    }

    const { data, error: loadError } = await EventosModel.fetchMiembroEventos(linkedMiembroId);
    if (loadError) return;

    const eventIds = new Set(eventList.map(evento => evento.id));
    const map = {};
    for (const row of data || []) {
      const eventoId = EventosModel.getEventoIdFromRow(row);
      if (eventoId && eventIds.has(eventoId)) {
        map[eventoId] = row;
      }
    }
    setSelfEventRowsByEventId(map);
  }

  function getSelfEventRow(evento, assignmentRows = []) {
    if (!evento?.id) return null;
    return selfEventRowsByEventId[evento.id] || buildSelfRow(assignmentRows, evento);
  }

  async function loadAllAssignments(eventList) {
    const eventoIds = eventList.map(evento => evento.id);
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
      if (manualAddEventId === eventoId) closeManualAddMember();
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
    const needsMembers = eventForm.requiere_confirmacion || eventForm.cuota_aplica;
    if (!needsMembers) return [];
    return eventForm.memberAssignmentMode === 'all'
      ? clubMembers.map(m => m.id)
      : eventForm.selectedMemberIds;
  }

  function eventNeedsMemberAssignment(form = eventForm) {
    return Boolean(form.requiere_confirmacion || form.cuota_aplica);
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
      descripcion: evento.descripcion || '',
      tipo_evento_id: evento.tipo_evento_id || '',
      requiere_confirmacion: EventosModel.eventRequiresConfirmation(evento),
      memberAssignmentMode: allAssigned || assignedIds.length === 0 ? 'all' : 'specific',
      selectedMemberIds: assignedIds.length ? assignedIds : allMemberIds,
      actividad_inicio_local: EventosModel.isoToDatetimeLocalValue(
        evento.actividad_inicio_at,
        EventosModel.getEventChurchTimezone(evento) || churchTz.timeZone
      ),
      ...emptyEventCuotaForm(evento, activeClubData),
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
        descripcion: eventForm.descripcion,
        tipoEventoId: eventForm.tipo_evento_id || null,
        requiereConfirmacion: Boolean(eventForm.requiere_confirmacion),
        actividadInicioAt: eventForm.actividad_inicio_local
          ? EventosModel.datetimeLocalValueToIso(
            eventForm.actividad_inicio_local,
            EventosModel.getEventChurchTimezone(events.find(e => e.id === editingEventId)) || churchTz.timeZone
          )
          : null,
        cuotaAplica: Boolean(eventForm.cuota_aplica),
        cuotaUseDefault: Boolean(eventForm.cuota_use_default),
        cuotaMontoOverride: eventForm.cuota_monto_override,
      });

      if (saveError) {
        setSavingEvent(false);
        setError('Error updating event: ' + saveError.message);
        return;
      }

      const needsMembers = eventForm.requiere_confirmacion || eventForm.cuota_aplica;
      if (needsMembers) {
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
      descripcion: eventForm.descripcion,
      tipoEventoId: eventForm.tipo_evento_id || null,
      requiereConfirmacion: Boolean(eventForm.requiere_confirmacion),
      cuotaAplica: Boolean(eventForm.cuota_aplica),
      cuotaUseDefault: Boolean(eventForm.cuota_use_default),
      cuotaMontoOverride: eventForm.cuota_monto_override,
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

    const { error: saveError } = await EventosModel.setEventoEstado(eventoId, EventosModel.EVENTO_ESTADO.ACTIVO);
    if (saveError) {
      setError('Error reactivating event: ' + saveError.message);
      return;
    }

    loadEvents();
  }

  async function endEvent(eventoId) {
    if (!canOperate) return;
    setError('');

    const { error: saveError } = await EventosModel.setEventoEstado(
      eventoId,
      EventosModel.EVENTO_ESTADO.FINALIZADO
    );
    if (saveError) {
      setError('Error ending event: ' + saveError.message);
      return;
    }

    if (editingEventId === eventoId) closeEditForm();
    loadEvents();
  }

  async function setConfirmation(eventoMiembroId, confirmacionEstado, eventoId) {
    if (!canOperate) return;
    setError('');

    const { error: saveError } = await EventosModel.setEventoConfirmacion(eventoMiembroId, confirmacionEstado);
    if (saveError) {
      setError('Error saving confirmation: ' + saveError.message);
      return;
    }

    await loadAssignments(eventoId);
  }

  async function updateSelfConfirmation(eventoMiembroId, confirmacionEstado, eventoId = null) {
    const targetEventoId = eventoId || expandedEventId;
    const { error: saveError } = await updateSelfConfirmationBase(
      eventoMiembroId,
      confirmacionEstado,
      eventoId
    );
    if (saveError) {
      setError('Error saving confirmation: ' + saveError.message);
      return;
    }
    if (targetEventoId) await loadAssignments(targetEventoId);
    if (events.length) await loadLinkedMemberEventRows(events);
  }

  async function setAttendance(eventoMiembroId, estado, eventoId) {
    if (!canOperate) return;
    setError('');

    const { error: saveError } = await EventosModel.setEventoAsistencia(eventoMiembroId, estado);
    if (saveError) {
      setError('Error saving attendance: ' + saveError.message);
      return;
    }

    await loadAssignments(eventoId);
  }

  async function initializeEvent(eventoId) {
    if (!canOperate || !eventoId) return;
    setError('');

    setInitializingEventId(eventoId);
    const { error: initError } = await EventosModel.setEventoActividadInicio(eventoId);
    setInitializingEventId('');

    if (initError) {
      setError('Error initializing event: ' + initError.message);
      return;
    }

    await loadEvents();
  }

  async function scanAttendees(eventoId) {
    if (!canOperate || !eventoId) return;
    setError('');

    const { error: scanError } = await EventosModel.startEventoEscaneo(eventoId);
    if (scanError) {
      setError('Error starting scan session: ' + scanError.message);
      return;
    }

    navigate(`/dashboard/checkin?evento=${encodeURIComponent(eventoId)}&started=1`);
  }

  function openMergeAttendance(eventoId) {
    if (!canManage) return;
    const evento = filteredEvents.find(e => e.id === eventoId);
    if (!evento) return;
    const targets = EventosModel.getSameDateEventoMergeTargets(filteredEvents, evento);
    setMergeAnchorEventId(eventoId);
    setMergeTargetEventId(targets[0]?.id || '');
    setError('');
  }

  function closeMergeAttendance() {
    setMergeAnchorEventId('');
    setMergeTargetEventId('');
  }

  function mapMergeAttendanceError(message) {
    const text = String(message || '');
    if (text.includes('same club and date')) return t('eventMergeSameDateRequired');
    if (text.includes('different attendance groups')) return t('eventMergeDifferentGroups');
    if (text.includes('at least two events')) return t('eventMergeSelectTwo');
    if (text.includes('admin_create_evento_asistencia_grupo') || text.includes('does not exist')) {
      return t('eventMergeSchemaMissing');
    }
    return text || t('eventMergeFailed');
  }

  async function confirmMergeAttendance() {
    if (!canManage || !mergeAnchorEventId || !mergeTargetEventId) {
      setError(t('eventMergeSelectTarget'));
      return;
    }
    if (mergeAnchorEventId === mergeTargetEventId) {
      setError(t('eventMergeSelectTarget'));
      return;
    }

    setMergingAttendance(true);
    setError('');

    const anchor = filteredEvents.find(e => e.id === mergeAnchorEventId);
    const target = filteredEvents.find(e => e.id === mergeTargetEventId);
    const ids = new Set([mergeAnchorEventId, mergeTargetEventId]);
    if (anchor?.asistencia_grupo_id) {
      for (const sibling of EventosModel.getGrupoSiblingEventos(filteredEvents, anchor)) {
        ids.add(sibling.id);
      }
    }
    if (target?.asistencia_grupo_id) {
      for (const sibling of EventosModel.getGrupoSiblingEventos(filteredEvents, target)) {
        ids.add(sibling.id);
      }
    }

    const { error: mergeError } = await EventosModel.createEventoAsistenciaGrupo([...ids]);
    setMergingAttendance(false);

    if (mergeError) {
      setError(mapMergeAttendanceError(mergeError.message));
      return;
    }

    closeMergeAttendance();
    await loadEvents();
  }

  async function unmergeAttendance(eventoId) {
    if (!canManage || !eventoId) return;
    setError('');

    const { error: dissolveError } = await EventosModel.dissolveEventoAsistenciaGrupo(eventoId);
    if (dissolveError) {
      setError(mapMergeAttendanceError(dissolveError.message));
      return;
    }

    await loadEvents();
  }

  function mapExcludeAttendanceError(message) {
    const text = String(message || '');
    if (text.includes('EVENTO_EXCLUIR_ASISTENCIA.sql')) return t('eventExcludeAttendanceSchemaMissing');
    return text || t('eventExcludeAttendanceFailed');
  }

  async function excludeFromAttendanceRegistry(eventoId) {
    if (!canManage || !eventoId) return;
    setError('');

    const { error: saveError } = await EventosModel.setEventoExcluirRegistroAsistencia(eventoId, true);
    if (saveError) {
      setError(mapExcludeAttendanceError(saveError.message));
      return;
    }

    await loadEvents();
  }

  async function restoreToAttendanceRegistry(eventoId) {
    if (!canManage || !eventoId) return;
    setError('');

    const { error: saveError } = await EventosModel.setEventoExcluirRegistroAsistencia(eventoId, false);
    if (saveError) {
      setError(mapExcludeAttendanceError(saveError.message));
      return;
    }

    await loadEvents();
  }

  const mergeAnchorEvent = useMemo(
    () => filteredEvents.find(e => e.id === mergeAnchorEventId) || null,
    [filteredEvents, mergeAnchorEventId]
  );

  const mergeCandidates = useMemo(() => {
    if (!mergeAnchorEvent) return [];
    return EventosModel.getSameDateEventoMergeTargets(filteredEvents, mergeAnchorEvent);
  }, [filteredEvents, mergeAnchorEvent]);

  const grupoIndex = useMemo(
    () => EventosModel.groupEventsByAsistenciaGrupo(filteredEvents),
    [filteredEvents]
  );

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

  function mapManualAddError(message) {
    const text = String(message || '');
    if (text.includes('member already assigned')) return t('manualAddMemberAlreadyAssigned');
    if (text.includes('justification required')) return t('manualAddJustificationRequired');
    if (text.includes('member is not in this event club')) return t('manualAddMemberNotInClub');
    if (text.includes('admin_add_evento_miembro_manual') || text.includes('justificacion_asignacion')) {
      return t('manualAddMemberSchemaMissing');
    }
    return text || t('manualAddMemberFailed');
  }

  function openManualAddMember(eventoId) {
    if (!canManage) return;
    setManualAddEventId(eventoId);
    setManualAddForm({ miembroId: '', justificacion: '' });
    setManualAddFieldErrors({});
    setError('');
  }

  function closeManualAddMember() {
    setManualAddEventId('');
    setManualAddForm({ miembroId: '', justificacion: '' });
    setManualAddFieldErrors({});
  }

  async function saveManualAddMember(eventoId) {
    if (!canManage) return false;

    const validation = validateForm('eventManualAddMember', manualAddForm, t);
    setManualAddFieldErrors(validation.fieldErrors || {});
    if (!validation.valid) {
      setError(validation.firstError || validation.formError || '');
      return false;
    }

    const evento = events.find(e => e.id === eventoId);
    const rows = assignments[eventoId] || await loadAssignments(eventoId);
    if ((rows || []).some(row => row.miembro_id === manualAddForm.miembroId)) {
      setError(t('manualAddMemberAlreadyAssigned'));
      return false;
    }

    setSavingManualAdd(true);
    setError('');
    setManualAddFieldErrors({});

    const { error: saveError } = await EventosModel.addMiembroToEventoManual(
      eventoId,
      manualAddForm.miembroId,
      manualAddForm.justificacion,
      { requiereConfirmacion: EventosModel.eventRequiresConfirmation(evento) }
    );

    setSavingManualAdd(false);

    if (saveError) {
      setError(mapManualAddError(saveError.message));
      return false;
    }

    closeManualAddMember();
    await loadAssignments(eventoId);
    return true;
  }

  async function confirmAllPending(eventoId) {
    if (!canManage) return;

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
    setSelfEventRowsByEventId({});
    closeAttendeeEditor();
    closeManualAddMember();
    closeEditForm();
    loadEvents();
    loadMembersForClub(clubId);
  }, [clubId, showInactive]);

  useEffect(() => {
    if (!linkedMiembroId || !events.length) {
      if (!linkedMiembroId) setSelfEventRowsByEventId({});
      return;
    }
    loadLinkedMemberEventRows(events);
  }, [linkedMiembroId, events]);

  function setClubId(nextClubId) {
    if (nextClubId) {
      const club = clubs.find(c => c.id === nextClubId);
      if (club) updateActiveClub(club);
      navigate(`/dashboard/eventos?club=${nextClubId}`);
    } else {
      navigate('/dashboard/eventos');
    }
  }

  function formatEventTime(hora) {
    return EventosModel.formatEventLocalTime(hora, language);
  }

  function formatEventTimestamp(iso) {
    return EventosModel.formatEventTimestamp(
      iso,
      language,
      churchTz.timeZone
    );
  }

  return {
    clubs,
    clubId,
    activeClubData,
    events: paginatedEvents,
    allClubEvents: filteredEvents,
    listPagination,
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
    canOperateEvents: canOperate,
    iglesiaScopeReady: canSwitchIglesia || (hasIglesiaAssignment && assignedIglesiaActive),
    toggleEventExpand,
    loadEventAssignments: loadAssignments,
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
    endEvent,
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
    manualAddEventId,
    manualAddForm,
    setManualAddForm,
    manualAddFieldErrors,
    savingManualAdd,
    openManualAddMember,
    closeManualAddMember,
    saveManualAddMember,
    initializeEvent,
    scanAttendees,
    initializingEventId,
    mergeAnchorEventId,
    mergeAnchorEvent,
    mergeCandidates,
    mergeTargetEventId,
    setMergeTargetEventId,
    mergingAttendance,
    openMergeAttendance,
    closeMergeAttendance,
    confirmMergeAttendance,
    unmergeAttendance,
    excludeFromAttendanceRegistry,
    restoreToAttendanceRegistry,
    canCombineEventoAttendance: EventosModel.canCombineEventoAttendance,
    getGrupoSiblingEventos: EventosModel.getGrupoSiblingEventos,
    isEventoExcludedFromAttendance: EventosModel.isEventoExcludedFromAttendance,
    formatMergedEventoLabels: (items) => EventosModel.formatMergedEventoLabels(items, {
      untitledLabel: t('eventUntitled'),
    }),
    sortEventAttendanceRows: EventosModel.sortEventAttendanceRows,
    isEventoActive: EventosModel.isEventoActive,
    isEventoEnded: EventosModel.isEventoEnded,
    isEventInFuture: churchTz.isEventInFuture,
    getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
    getCheckedInAtFromRow: EventosModel.getCheckedInAtFromRow,
    getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
    getManualAddJustificationFromRow: EventosModel.getManualAddJustificationFromRow,
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
    getTipoEventoNombre: EventosModel.getTipoEventoNombre,
    memberDisplayName: EventosModel.memberDisplayName,
    formatEventTime,
    formatEventTimestamp,
    linkedMiembroId,
    buildSelfEventRow: buildSelfRow,
    getSelfEventRow,
    updateSelfConfirmation,
    savingSelfConfirmationId,
  };
}
