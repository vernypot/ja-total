import { useEffect, useMemo, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import { useListPagination } from '../../hooks/useListPagination';
import * as EventosModel from '../models/eventos.model';

const attendanceHelpers = {
  getEventoFromRow: EventosModel.getEventoFromRow,
  getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
  getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
  eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
};

export function useMiembroAsistenciaController(miembroId) {
  const { user, userData } = useContext(AuthContext);
  const canManage = canManageChurchData(getUserRole(user, userData));
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attendanceFilter, setAttendanceFilter] = useState('attended');

  async function load() {
    if (!miembroId) return;
    setLoading(true);
    setError('');

    const { data, error: loadError } = await EventosModel.fetchMiembroEventos(miembroId);
    if (loadError) {
      setError('Error loading attendance: ' + loadError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(EventosModel.sortMemberEventRowsByEventDateDesc(data || []));
    setLoading(false);
  }

  const statsRows = useMemo(
    () => rows.filter(row => EventosModel.isEventoIncludedInMemberStats(
      EventosModel.getEventoFromRow(row)
    )),
    [rows]
  );

  const mergedAttendanceHelpers = useMemo(
    () => EventosModel.createMemberMergedAttendanceHelpers(rows),
    [rows]
  );

  const attendedCount = useMemo(
    () => rows.filter(mergedAttendanceHelpers.memberAttendedEvent).length,
    [rows, mergedAttendanceHelpers]
  );

  const filteredRows = useMemo(() => {
    if (attendanceFilter === 'attended') {
      return EventosModel.sortMemberEventRowsByEventDateDesc(
        rows.filter(mergedAttendanceHelpers.memberAttendedEvent)
      );
    }
    return rows;
  }, [rows, attendanceFilter, mergedAttendanceHelpers]);

  const {
    pageItems: paginatedRows,
    ...listPagination
  } = useListPagination(filteredRows, [attendanceFilter]);

  const stats = useMemo(
    () => EventosModel.computeMemberAttendanceStats(statsRows, attendanceHelpers),
    [statsRows],
  );

  async function updateAttendance(eventoMiembroId, estado) {
    if (!canManage) return;
    setError('');

    const { error: saveError } = await EventosModel.setEventoAsistencia(eventoMiembroId, estado);
    if (saveError) {
      setError('Error saving attendance: ' + saveError.message);
      return;
    }
    load();
  }

  async function updateConfirmation(eventoMiembroId, confirmacionEstado) {
    if (!canManage) return;
    setError('');

    const { error: saveError } = await EventosModel.setEventoConfirmacion(eventoMiembroId, confirmacionEstado);
    if (saveError) {
      setError('Error saving confirmation: ' + saveError.message);
      return;
    }
    load();
  }

  useEffect(() => {
    load();
  }, [miembroId]);

  return {
    rows: paginatedRows,
    allRows: rows,
    attendedCount,
    totalEventCount: rows.length,
    attendanceFilter,
    setAttendanceFilter,
    listPagination,
    stats,
    error,
    loading,
    canManage,
    updateAttendance,
    updateConfirmation,
    getEventoFromRow: EventosModel.getEventoFromRow,
    getAsistenciaFromRow: mergedAttendanceHelpers.getAsistenciaFromRow,
    getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
    getCheckedInAtFromRow: mergedAttendanceHelpers.getCheckedInAtFromRow,
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
    getTipoEventoNombre: EventosModel.getTipoEventoNombre,
    isEventInFuture: EventosModel.isEventInFuture,
    isEventInPast: EventosModel.isEventInPast,
    memberAttendedEvent: mergedAttendanceHelpers.memberAttendedEvent,
    getEventChurchTimezone: EventosModel.getEventChurchTimezone,
  };
}
