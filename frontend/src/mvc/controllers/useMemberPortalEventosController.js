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
  const [savingConfirmationId, setSavingConfirmationId] = useState(null);

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

  const attendedCount = useMemo(
    () => rows.filter(EventosModel.memberAttendedEvent).length,
    [rows]
  );

  const filteredRows = useMemo(() => {
    if (attendanceFilter === 'attended') {
      return rows.filter(EventosModel.memberAttendedEvent);
    }
    return rows;
  }, [rows, attendanceFilter]);

  const {
    pageItems: paginatedRows,
    ...listPagination
  } = useListPagination(filteredRows, [attendanceFilter]);

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return {
    rows: paginatedRows,
    listPagination,
    allRows: rows,
    attendedCount,
    attendanceFilter,
    setAttendanceFilter,
    error,
    loading,
    canManage: false,
    updateAttendance: () => {},
    updateConfirmation,
    savingConfirmationId,
    getEventoFromRow: EventosModel.getEventoFromRow,
    getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
    getCheckedInAtFromRow: EventosModel.getCheckedInAtFromRow,
    getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
    memberAttendedEvent: EventosModel.memberAttendedEvent,
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
    getTipoEventoNombre: EventosModel.getTipoEventoNombre,
    isEventInFuture: EventosModel.isEventInFuture,
    getEventChurchTimezone: EventosModel.getEventChurchTimezone,
  };
}
