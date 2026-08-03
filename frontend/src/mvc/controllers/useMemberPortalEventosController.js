import { useEffect, useMemo, useState } from 'react';
import { useMemberPortal } from '../../context/MemberPortalContext';
import { useListPagination } from '../../hooks/useListPagination';
import * as MemberPortalModel from '../models/memberPortal.model';
import * as EventosModel from '../models/eventos.model';
import { compareEventsByLocalDateTime } from '../../utils/eventTimezone';

export function useMemberPortalEventosController() {
  const { session } = useMemberPortal();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attendanceFilter, setAttendanceFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('upcoming');
  const [savingConfirmationId, setSavingConfirmationId] = useState(null);

  function eventFromRow(row) {
    return EventosModel.getEventoFromRow(row);
  }

  function isUpcomingRow(row) {
    const evento = eventFromRow(row);
    if (!evento) return false;
    return EventosModel.isEventInFuture(evento, new Date(), EventosModel.getEventChurchTimezone(evento));
  }

  function isPastRow(row) {
    const evento = eventFromRow(row);
    if (!evento) return false;
    return EventosModel.isEventInPast(evento, new Date(), EventosModel.getEventChurchTimezone(evento));
  }

  const timeFilteredRows = useMemo(() => {
    if (timeFilter === 'past') return rows.filter(isPastRow);
    if (timeFilter === 'upcoming') return rows.filter(isUpcomingRow);
    return rows;
  }, [rows, timeFilter]);

  async function load({ silent = false } = {}) {
    if (!session?.sessionToken) {
      if (!silent) setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
      setError('');
    }

    const { data, error: loadError } = await MemberPortalModel.fetchPortalEvents(session.sessionToken);
    if (loadError) {
      if (!silent) {
        setError(loadError.message);
        setRows([]);
        setLoading(false);
      }
      return;
    }

    const sorted = [...(data || [])].sort((a, b) => {
      const eventA = EventosModel.getEventoFromRow(a);
      const eventB = EventosModel.getEventoFromRow(b);
      return compareEventsByLocalDateTime(eventB, eventA);
    });

    setRows(sorted);
    if (!silent) setLoading(false);
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

    setRows(prev => MemberPortalModel.patchPortalEventRowConfirmation(prev, {
      eventoMiembroId,
      eventoId,
      confirmacionEstado,
      savedRow: data,
    }));

    await load({ silent: true });
  }

  const mergedAttendanceHelpers = useMemo(
    () => EventosModel.createMemberMergedAttendanceHelpers(rows),
    [rows]
  );

  const attendedCount = useMemo(
    () => timeFilteredRows.filter(mergedAttendanceHelpers.memberAttendedEvent).length,
    [timeFilteredRows, mergedAttendanceHelpers]
  );

  const filteredRows = useMemo(() => {
    if (attendanceFilter === 'attended') {
      return timeFilteredRows.filter(mergedAttendanceHelpers.memberAttendedEvent);
    }
    return timeFilteredRows;
  }, [timeFilteredRows, attendanceFilter, mergedAttendanceHelpers]);

  const {
    pageItems: paginatedRows,
    ...listPagination
  } = useListPagination(filteredRows, [attendanceFilter, timeFilter]);

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return {
    rows: paginatedRows,
    listPagination,
    allRows: timeFilteredRows,
    attendedCount,
    attendanceFilter,
    setAttendanceFilter,
    timeFilter,
    setTimeFilter,
    showTimeFilter: true,
    totalEventCount: rows.length,
    error,
    loading,
    canManage: false,
    updateAttendance: () => {},
    updateConfirmation,
    savingConfirmationId,
    getEventoFromRow: EventosModel.getEventoFromRow,
    getAsistenciaFromRow: mergedAttendanceHelpers.getAsistenciaFromRow,
    getCheckedInAtFromRow: mergedAttendanceHelpers.getCheckedInAtFromRow,
    getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
    memberAttendedEvent: mergedAttendanceHelpers.memberAttendedEvent,
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
    getTipoEventoNombre: EventosModel.getTipoEventoNombre,
    isEventInFuture: EventosModel.isEventInFuture,
    getEventChurchTimezone: EventosModel.getEventChurchTimezone,
  };
}
