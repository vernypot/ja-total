import { useEffect, useMemo, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import { useListPagination } from '../../hooks/useListPagination';
import * as EventosModel from '../models/eventos.model';
import { compareEventsByLocalDateTime } from '../../utils/eventTimezone';

export function useMiembroEventosController(miembroId) {
  const { user, userData } = useContext(AuthContext);
  const canManage = canManageChurchData(getUserRole(user, userData));
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attendanceFilter, setAttendanceFilter] = useState('all');

  async function load() {
    if (!miembroId) return;
    setLoading(true);
    setError('');

    const { data, error: loadError } = await EventosModel.fetchMiembroEventos(miembroId);
    if (loadError) {
      setError('Error loading events: ' + loadError.message);
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

  const {
    pageItems: paginatedRows,
    ...listPagination
  } = useListPagination(filteredRows, [attendanceFilter]);

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
    listPagination,
    allRows: rows,
    attendedCount,
    attendanceFilter,
    setAttendanceFilter,
    error,
    loading,
    canManage,
    updateAttendance,
    updateConfirmation,
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
