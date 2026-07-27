import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { useChurchTimezone } from '../../hooks/useChurchTimezone';
import { getUserRole, canManageClubs } from '../../utils/permissions';
import { useListPagination } from '../../hooks/useListPagination';
import * as EventosModel from '../models/eventos.model';
import {
  datetimeLocalValueToIso,
  formatEventTimestamp,
  getEventChurchTimezone,
  isoToDatetimeLocalValue,
} from '../../utils/eventTimezone';
import {
  memberNameFromTokenRow,
  parseTokenFromQrPayload,
  resolveMiembroFromToken,
} from '../models/carnet.model';

export function useEventCheckinController() {
  const { t, language } = useLanguage();
  const { timeZone } = useChurchTimezone();
  const { user, userData } = useContext(AuthContext);
  const canManage = canManageClubs(getUserRole(user, userData));
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const eventoId = params.get('evento') || params.get('e') || '';
  const tokenFromUrl = parseTokenFromQrPayload(params.get('t') || '');
  const sessionStartedParam = params.get('started') === '1';
  const handledUrlTokenRef = useRef('');

  const [evento, setEvento] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(eventoId));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activityStartDraft, setActivityStartDraft] = useState('');
  const [savingActivityStart, setSavingActivityStart] = useState(false);
  const [startingScan, setStartingScan] = useState(false);
  const [grupoEventos, setGrupoEventos] = useState([]);

  const sessionStarted = sessionStartedParam
    || Boolean(evento?.escaneo_inicio_at || evento?.evento_asistencia_grupo?.escaneo_inicio_at);
  const isFuture = evento ? EventosModel.isEventInFuture(evento, new Date(), getEventChurchTimezone(evento)) : false;
  const isActive = evento ? EventosModel.isEventoActive(evento) : false;
  const isEnded = evento ? EventosModel.isEventoEnded(evento) : false;
  const isExcludedFromAttendance = evento ? EventosModel.isEventoExcludedFromAttendance(evento) : false;
  const scannerEnabled = isActive && !isExcludedFromAttendance && (sessionStarted || !isFuture);
  const recordedCount = useMemo(
    () => rows.filter(row => EventosModel.getAsistenciaFromRow(row)).length,
    [rows]
  );
  const sortedRows = useMemo(
    () => EventosModel.sortEventAttendanceRows(rows),
    [rows]
  );

  const {
    pageItems: paginatedRows,
    ...listPagination
  } = useListPagination(sortedRows, [eventoId]);

  const loadRegistry = useCallback(async () => {
    if (!eventoId) return;
    const { data, error: registryError } = await EventosModel.fetchEventoAssignments(eventoId);
    if (registryError) {
      setError(registryError.message);
      setRows([]);
      return;
    }
    setRows(data || []);
  }, [eventoId]);

  const loadEvent = useCallback(async () => {
    if (!eventoId) {
      setEvento(null);
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: eventError } = await EventosModel.fetchEventoById(eventoId);
    if (eventError) {
      setError(eventError.message);
      setEvento(null);
      setRows([]);
      setLoading(false);
      return;
    }

    if (!data) {
      setError(t('eventNotFound'));
      setEvento(null);
      setRows([]);
      setLoading(false);
      return;
    }

    setEvento(data);
    setActivityStartDraft(
      isoToDatetimeLocalValue(
        data.actividad_inicio_at || data.evento_asistencia_grupo?.actividad_inicio_at,
        getEventChurchTimezone(data) || timeZone
      )
    );

    if (data?.asistencia_grupo_id) {
      const { data: grupoRows } = await EventosModel.fetchEventosInAsistenciaGrupo(eventoId);
      setGrupoEventos(grupoRows || []);
    } else {
      setGrupoEventos(data ? [data] : []);
    }

    await loadRegistry();
    setLoading(false);
  }, [eventoId, loadRegistry, t, timeZone]);

  const checkin = useCallback(async (token) => {
    if (!canManage || !eventoId || !token) return;

    setError('');
    setNotice('');

    const { data: memberRows } = await resolveMiembroFromToken(token);
    const memberName = memberNameFromTokenRow(memberRows);
    const memberId = memberRows?.[0]?.miembro_id;

    const priorRow = memberId
      ? rows.find(row => row.miembro_id === memberId)
      : null;

    if (priorRow && EventosModel.wasMemberCheckedInToEvent(priorRow)) {
      setNotice(memberName
        ? t('checkinAlreadyRecordedFor').replace('{name}', memberName)
        : t('checkinAlreadyRecorded'));
      return;
    }

    const { error: checkinError } = await EventosModel.checkinEventoByToken(eventoId, token, evento);
    if (checkinError) {
      setError(checkinError.message);
      return;
    }

    setNotice(memberName
      ? t('checkinRecordedFor').replace('{name}', memberName)
      : t('checkinRecorded'));

    await loadRegistry();
  }, [canManage, evento, eventoId, loadRegistry, rows, t]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    if (!eventoId || !tokenFromUrl || !canManage) return;
    if (handledUrlTokenRef.current === tokenFromUrl) return;
    handledUrlTokenRef.current = tokenFromUrl;
    checkin(tokenFromUrl);
  }, [eventoId, tokenFromUrl, canManage, checkin]);

  const beginEvent = useCallback(async () => {
    if (!eventoId || !EventosModel.isEventoActive(evento)) return;

    setStartingScan(true);
    setError('');

    const { data, error: scanError } = await EventosModel.startEventoEscaneo(eventoId);
    setStartingScan(false);

    if (scanError) {
      setError(scanError.message);
      return;
    }

    if (data) setEvento(data);
    navigate(`/dashboard/checkin?evento=${encodeURIComponent(eventoId)}&started=1`, { replace: true });
  }, [evento, eventoId, navigate]);

  const markActivityStartedNow = useCallback(async () => {
    if (!canManage || !eventoId) return;

    setSavingActivityStart(true);
    setError('');

    const { data, error: saveError } = await EventosModel.setEventoActividadInicio(eventoId);
    setSavingActivityStart(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    if (data) {
      setEvento(data);
      setActivityStartDraft(
        isoToDatetimeLocalValue(data.actividad_inicio_at, getEventChurchTimezone(data) || timeZone)
      );
    }
    setNotice(t('eventInitializedNotice'));
  }, [canManage, eventoId, t, timeZone]);

  const saveActivityStartManual = useCallback(async () => {
    if (!canManage || !eventoId || !activityStartDraft) return;

    const iso = datetimeLocalValueToIso(
      activityStartDraft,
      getEventChurchTimezone(evento) || timeZone
    );
    if (!iso) {
      setError(t('activityStartInvalid'));
      return;
    }

    setSavingActivityStart(true);
    setError('');

    const { data, error: saveError } = await EventosModel.setEventoActividadInicio(eventoId, iso);
    setSavingActivityStart(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    if (data) {
      setEvento(data);
      setActivityStartDraft(
        isoToDatetimeLocalValue(data.actividad_inicio_at, getEventChurchTimezone(data) || timeZone)
      );
    }
    setNotice(t('activityStartSaved'));
  }, [activityStartDraft, canManage, evento, eventoId, t, timeZone]);

  const endEvent = useCallback(async () => {
    if (!canManage || !eventoId) return;

    setError('');
    setNotice('');

    const { error: saveError } = await EventosModel.setEventoEstado(
      eventoId,
      EventosModel.EVENTO_ESTADO.FINALIZADO
    );
    if (saveError) {
      setError(saveError.message);
      return;
    }

    navigate('/dashboard/eventos', { replace: true });
  }, [canManage, eventoId, navigate]);

  const formatTimestamp = useCallback((iso) => (
    formatEventTimestamp(iso, language, getEventChurchTimezone(evento) || timeZone)
  ), [evento, language, timeZone]);

  return {
    eventoId,
    evento,
    rows: paginatedRows,
    listPagination,
    recordedCount,
    loading,
    error,
    notice,
    canManage,
    isFuture,
    isActive,
    isEnded,
    sessionStarted,
    isExcludedFromAttendance,
    scannerEnabled,
    beginEvent,
    endEvent,
    checkin,
    activityStartDraft,
    setActivityStartDraft,
    markActivityStartedNow,
    saveActivityStartManual,
    savingActivityStart,
    startingScan,
    formatTimestamp,
    grupoEventos,
    memberDisplayName: EventosModel.memberDisplayName,
    getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
    getCheckedInAtFromRow: EventosModel.getCheckedInAtFromRow,
    getTipoEventoNombre: EventosModel.getTipoEventoNombre,
  };
}
