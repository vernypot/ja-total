import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import * as EventosModel from '../models/eventos.model';

export function useMiembroEventosController(miembroId) {
  const { user, userData } = useContext(AuthContext);
  const canManage = canManageChurchData(getUserRole(user, userData));
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
      const fa = EventosModel.getEventoFromRow(a)?.fecha || '';
      const fb = EventosModel.getEventoFromRow(b)?.fecha || '';
      return fb.localeCompare(fa);
    });

    setRows(sorted);
    setLoading(false);
  }

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
    rows,
    error,
    loading,
    canManage,
    updateAttendance,
    updateConfirmation,
    getEventoFromRow: EventosModel.getEventoFromRow,
    getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
    getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
    getTipoEventoNombre: EventosModel.getTipoEventoNombre,
  };
}
