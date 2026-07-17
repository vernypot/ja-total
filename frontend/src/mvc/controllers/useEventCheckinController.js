import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { getUserRole, canManageClubs } from '../../utils/permissions';
import * as EventosModel from '../models/eventos.model';
import { getEventChurchTimezone } from '../../utils/eventTimezone';
import {
  memberNameFromTokenRow,
  parseTokenFromQrPayload,
  resolveMiembroFromToken,
} from '../models/carnet.model';

export function useEventCheckinController() {
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const canManage = canManageClubs(getUserRole(user, userData));
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const eventoId = params.get('evento') || params.get('e') || '';
  const tokenFromUrl = parseTokenFromQrPayload(params.get('t') || '');
  const sessionStarted = params.get('started') === '1';
  const handledUrlTokenRef = useRef('');

  const [evento, setEvento] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(eventoId));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isFuture = evento ? EventosModel.isEventInFuture(evento, new Date(), getEventChurchTimezone(evento)) : false;
  const isActive = evento ? EventosModel.isEventoActive(evento) : false;
  const isEnded = evento ? EventosModel.isEventoEnded(evento) : false;
  const scannerEnabled = isActive && (sessionStarted || !isFuture);
  const recordedCount = useMemo(
    () => rows.filter(row => EventosModel.getAsistenciaFromRow(row)).length,
    [rows]
  );
  const sortedRows = useMemo(
    () => EventosModel.sortEventAttendanceRows(rows),
    [rows]
  );

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
    await loadRegistry();
    setLoading(false);
  }, [eventoId, loadRegistry, t]);

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

  const beginEvent = useCallback(() => {
    if (!eventoId || !EventosModel.isEventoActive(evento)) return;
    navigate(`/dashboard/checkin?evento=${encodeURIComponent(eventoId)}&started=1`, { replace: true });
  }, [evento, eventoId, navigate]);

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

  return {
    eventoId,
    evento,
    rows: sortedRows,
    recordedCount,
    loading,
    error,
    notice,
    canManage,
    isFuture,
    isActive,
    isEnded,
    sessionStarted,
    scannerEnabled,
    beginEvent,
    endEvent,
    checkin,
    memberDisplayName: EventosModel.memberDisplayName,
    getAsistenciaFromRow: EventosModel.getAsistenciaFromRow,
    getCheckedInAtFromRow: EventosModel.getCheckedInAtFromRow,
    getTipoEventoNombre: EventosModel.getTipoEventoNombre,
  };
}
