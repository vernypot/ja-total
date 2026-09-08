import { useEffect, useMemo, useState, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import { useListPagination } from '../../hooks/useListPagination';
import {
  computeMemberEvalAttendanceScore,
  buildMemberEvalScoreDetail,
  DEFAULT_UNIDAD_EVAL_CONFIG,
} from '../../utils/unidadEvaluacion';
import * as EventosModel from '../models/eventos.model';
import * as UnidadEvaluacionModel from '../models/unidadEvaluacion.model';

const attendanceHelpers = {
  getEventoFromRow: EventosModel.getEventoFromRow,
  getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
  getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
  eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
};

export function useMiembroAsistenciaController(miembroId) {
  const { user, userData } = useContext(AuthContext);
  const { activeClub } = useContext(ClubContext);
  const [searchParams] = useSearchParams();
  const preferredClubId = searchParams.get('club') || activeClub?.id || null;
  const canManage = canManageChurchData(getUserRole(user, userData));
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attendanceFilter, setAttendanceFilter] = useState('attended');
  const [evalContext, setEvalContext] = useState({
    config: { ...DEFAULT_UNIDAD_EVAL_CONFIG },
    validationStartDate: null,
  });

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

    const nextRows = EventosModel.sortMemberEventRowsByEventDateDesc(data || []);
    setRows(nextRows);

    const { data: evalData } = await UnidadEvaluacionModel.fetchMemberEvalContext({
      miembroId,
      clubId: preferredClubId,
      memberRows: nextRows,
    });
    setEvalContext({
      config: evalData?.config || { ...DEFAULT_UNIDAD_EVAL_CONFIG },
      validationStartDate: evalData?.validationStartDate || null,
    });

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

  const evalScore = useMemo(
    () => computeMemberEvalAttendanceScore({
      memberRows: rows,
      helpers: mergedAttendanceHelpers,
      config: evalContext.config,
      validationStartDate: evalContext.validationStartDate,
    }),
    [rows, mergedAttendanceHelpers, evalContext],
  );

  const evalScoreDetail = useMemo(
    () => buildMemberEvalScoreDetail({
      memberRows: rows,
      helpers: mergedAttendanceHelpers,
      config: evalContext.config,
      validationStartDate: evalContext.validationStartDate,
    }),
    [rows, mergedAttendanceHelpers, evalContext],
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
  }, [miembroId, preferredClubId]);

  return {
    rows: paginatedRows,
    allRows: rows,
    attendedCount,
    totalEventCount: rows.length,
    attendanceFilter,
    setAttendanceFilter,
    listPagination,
    stats,
    evalScore,
    evalScoreDetail,
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
