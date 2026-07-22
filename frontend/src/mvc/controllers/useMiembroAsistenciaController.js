import { useEffect, useMemo, useState } from 'react';
import { useListPagination } from '../../hooks/useListPagination';
import * as EventosModel from '../models/eventos.model';

const attendanceHelpers = {
  getEventoFromRow: EventosModel.getEventoFromRow,
  getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
  getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
  eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
};

export function useMiembroAsistenciaController(miembroId) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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

    const sorted = [...(data || [])].sort((a, b) => {
      const fa = EventosModel.getEventoFromRow(a)?.fecha || '';
      const fb = EventosModel.getEventoFromRow(b)?.fecha || '';
      return fb.localeCompare(fa);
    });

    setRows(sorted.filter(row => EventosModel.isEventoIncludedInMemberStats(
      EventosModel.getEventoFromRow(row)
    )));
    setLoading(false);
  }

  const {
    pageItems: paginatedRows,
    ...listPagination
  } = useListPagination(rows, [miembroId]);

  const stats = useMemo(
    () => EventosModel.computeMemberAttendanceStats(rows, attendanceHelpers),
    [rows],
  );

  useEffect(() => {
    load();
  }, [miembroId]);

  return {
    rows: paginatedRows,
    listPagination,
    stats,
    error,
    loading,
    getEventoFromRow: EventosModel.getEventoFromRow,
    getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
    getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
    getCheckedInAtFromRow: EventosModel.getCheckedInAtFromRow,
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
    getTipoEventoNombre: EventosModel.getTipoEventoNombre,
    isEventInFuture: EventosModel.isEventInFuture,
    isEventInPast: EventosModel.isEventInPast,
    memberAttendedEvent: EventosModel.memberAttendedEvent,
  };
}
