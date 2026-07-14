import { useEffect, useMemo, useState } from 'react';
import { useMemberPortal } from '../../context/MemberPortalContext';
import * as MemberPortalModel from '../models/memberPortal.model';
import * as EventosModel from '../models/eventos.model';
import { compareEventsByLocalDateTime } from '../../utils/eventTimezone';

export function useMemberPortalEventosController() {
  const { session } = useMemberPortal();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attendanceFilter, setAttendanceFilter] = useState('all');

  async function load() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: loadError } = await MemberPortalModel.fetchPortalEvents(session.sessionToken);
    if (loadError) {
      setError(loadError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const sorted = [...(data || [])].sort((a, b) => {
      const eventA = EventosModel.getEventoFromRow(a);
      const eventB = EventosModel.getEventoFromRow(b);
      return compareEventsByLocalDateTime(eventB, eventA);
    });

    setRows(sorted);
    setLoading(false);
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

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return {
    rows: filteredRows,
    allRows: rows,
    attendedCount,
    attendanceFilter,
    setAttendanceFilter,
    error,
    loading,
    canManage: false,
    updateAttendance: () => {},
    updateConfirmation: () => {},
    getEventoFromRow: EventosModel.getEventoFromRow,
    getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
    getCheckedInAtFromRow: EventosModel.getCheckedInAtFromRow,
    getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
    memberAttendedEvent: EventosModel.memberAttendedEvent,
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
    getTipoEventoNombre: EventosModel.getTipoEventoNombre,
  };
}
