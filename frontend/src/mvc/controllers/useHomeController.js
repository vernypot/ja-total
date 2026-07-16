import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { IglesiaContext } from '../../context/IglesiaContext';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { useChurchTimezone } from '../../hooks/useChurchTimezone';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import * as IglesiasModel from '../models/iglesias.model';
import * as NoticiasModel from '../models/noticias.model';
import * as HomeModel from '../models/home.model';
import * as EventosModel from '../models/eventos.model';
import * as ClasesModel from '../models/clases.model';

export function useHomeController() {
  const { user, userData, loading: authLoading } = useContext(AuthContext);
  const { t, language } = useLanguage();
  const { updateActiveIglesia } = useContext(IglesiaContext);
  const { activeClub } = useContext(ClubContext);
  const navigate = useNavigate();
  const {
    effectiveIglesiaId,
    assignedIglesiaNombre,
    hasIglesiaAssignment,
    assignedIglesiaActive,
    canSwitchIglesia,
  } = useScopedIglesia();
  const churchTz = useChurchTimezone();
  const userRole = getUserRole(user, userData);
  const canManage = canManageChurchData(userRole);

  const [iglesiaNombre, setIglesiaNombre] = useState(assignedIglesiaNombre || '');
  const [iglesias, setIglesias] = useState([]);
  const [news, setNews] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [events, setEvents] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [eventAttendanceAlerts, setEventAttendanceAlerts] = useState([]);
  const [expandedNewsId, setExpandedNewsId] = useState('');
  const [reviewingSolicitudId, setReviewingSolicitudId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadIglesias() {
    if (!canSwitchIglesia) return;
    const { data } = await IglesiasModel.fetchIglesias();
    setIglesias(data || []);
  }

  async function loadHomeData() {
    if (!effectiveIglesiaId) {
      setNews([]);
      setBirthdays([]);
      setEvents([]);
      setPendingApprovals([]);
      setEventAttendanceAlerts([]);
      setIglesiaNombre(assignedIglesiaNombre || '');
      return;
    }

    setLoading(true);
    setError('');
    setPendingApprovals([]);
    setEventAttendanceAlerts([]);

    try {
      const iglesiaResult = await IglesiasModel.fetchIglesiaById(effectiveIglesiaId);
      setIglesiaNombre(iglesiaResult.data?.nombre || assignedIglesiaNombre || '');

      const requests = [
        NoticiasModel.fetchDashboardNoticias({
          iglesiaId: effectiveIglesiaId,
          clubId: activeClub?.id,
          placements: ['dashboard'],
          limit: 6,
        }),
        HomeModel.fetchUpcomingBirthdaysByIglesia(effectiveIglesiaId, { days: 30 }),
        EventosModel.fetchUpcomingEventosByIglesia(effectiveIglesiaId, 4, churchTz.timeZone),
      ];

      if (canManage) {
        requests.push(
          HomeModel.fetchPendingApprovalSolicitudesByIglesia(effectiveIglesiaId),
          EventosModel.fetchEventPendingConfirmationSummariesByIglesia(
            effectiveIglesiaId,
            churchTz.timeZone,
            { limit: 6 }
          )
        );
      }

      const results = await Promise.all(requests);
      const [
        newsResult,
        birthdayResult,
        eventsResult,
        approvalsResult = { data: [], error: null },
        attendanceResult = { data: [], error: null },
      ] = results;

      const errors = [
        newsResult.error,
        birthdayResult.error,
        eventsResult.error,
        approvalsResult.error,
        attendanceResult.error,
      ].filter(Boolean);
      if (errors.length) {
        setError(errors[0].message || 'Error loading home data');
      } else {
        setError('');
      }

      setNews(newsResult.data || []);
      setBirthdays(birthdayResult.data || []);
      setEvents(eventsResult.data || []);
      setPendingApprovals(
        canManage ? HomeModel.filterVisiblePendingApprovals(approvalsResult.data) : []
      );
      setEventAttendanceAlerts(
        canManage ? EventosModel.filterVisibleEventAttendanceAlerts(attendanceResult.data) : []
      );
    } catch (err) {
      setError(err?.message || 'Error loading home data');
      setNews([]);
      setBirthdays([]);
      setEvents([]);
      setPendingApprovals([]);
      setEventAttendanceAlerts([]);
    } finally {
      setLoading(false);
    }
  }

  function formatNewsDate(dateStr) {
    return NoticiasModel.formatNoticiaDate(dateStr, language);
  }

  function formatBirthday(member) {
    return HomeModel.formatBirthdayShort(member.fecha_nacimiento, language);
  }

  function memberName(member) {
    return HomeModel.memberFullName(member);
  }

  function eventDisplayName(evento) {
    if (evento?.nombre?.trim()) return evento.nombre.trim();
    return EventosModel.memberDisplayName(evento) || '';
  }

  function goToNoticiasAdmin() {
    navigate('/dashboard/noticias');
  }

  function goToEventos() {
    navigate('/dashboard/eventos');
  }

  function goToMemberClasses(miembroId) {
    if (!miembroId) return;
    navigate(`/dashboard/miembro/${miembroId}/clases`);
  }

  function formatRequestedDate(dateStr) {
    if (!dateStr) return '';
    const locale = language === 'en' ? 'en-US' : 'es-CO';
    return new Date(dateStr).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  async function reviewSolicitud(solicitudId, aprobar, comentarioLider = null) {
    if (!canManage || !solicitudId) return false;

    setReviewingSolicitudId(solicitudId);

    const revisorNombre = [userData?.nombre, userData?.apellido1, userData?.apellido2]
      .filter(Boolean)
      .join(' ');

    const { error: reviewError } = await ClasesModel.reviewMiembroClaseAprobacionSolicitud({
      solicitudId,
      aprobar,
      comentarioLider,
      revisorUsuarioId: userData?.id || user?.id || null,
      revisorNombre: revisorNombre || null,
    });

    setReviewingSolicitudId(null);

    if (reviewError) {
      setError(reviewError.message || 'Error reviewing approval request');
      return false;
    }

    if (effectiveIglesiaId) {
      const { data } = await HomeModel.fetchPendingApprovalSolicitudesByIglesia(effectiveIglesiaId);
      setPendingApprovals(HomeModel.filterVisiblePendingApprovals(data));
    }

    return true;
  }

  function formatSolicitudTarget(row) {
    return HomeModel.formatApprovalSolicitudTarget(row, t);
  }

  const notificationCount = useMemo(
    () => pendingApprovals.length + eventAttendanceAlerts.length,
    [pendingApprovals, eventAttendanceAlerts]
  );

  function goToIglesias() {
    navigate('/dashboard/iglesias');
  }

  function toggleNewsExpand(id) {
    setExpandedNewsId(prev => (prev === id ? '' : id));
  }

  function selectIglesia(iglesiaId) {
    const iglesia = iglesias.find(item => item.id === iglesiaId);
    updateActiveIglesia(iglesiaId, iglesia?.timezone);
  }

  useEffect(() => {
    if (authLoading) return;
    loadIglesias();
  }, [authLoading, canSwitchIglesia]);

  useEffect(() => {
    if (authLoading) return;
    loadHomeData();
  }, [authLoading, effectiveIglesiaId, assignedIglesiaNombre, activeClub?.id, churchTz.timeZone, canManage]);

  useEffect(() => {
    if (authLoading || effectiveIglesiaId || !canSwitchIglesia || !iglesias.length) return;
    if (iglesias.length === 1) {
      updateActiveIglesia(iglesias[0].id, iglesias[0].timezone);
    }
  }, [authLoading, effectiveIglesiaId, canSwitchIglesia, iglesias, updateActiveIglesia]);

  return {
    authLoading,
    effectiveIglesiaId,
    iglesiaNombre,
    iglesias,
    hasIglesiaAssignment,
    assignedIglesiaActive,
    canSwitchIglesia,
    news,
    birthdays,
    events,
    pendingApprovals,
    eventAttendanceAlerts,
    notificationCount,
    reviewingSolicitudId,
    reviewSolicitud,
    formatRequestedDate,
    expandedNewsId,
    loading,
    error,
    canManage,
    formatNewsDate,
    formatBirthday,
    memberName,
    eventDisplayName,
    goToNoticiasAdmin,
    goToEventos,
    goToMemberClasses,
    formatSolicitudTarget,
    goToIglesias,
    toggleNewsExpand,
    selectIglesia,
    getClubName: evento => evento?.clubes?.nombre || '',
    formatEventDate: dateStr => churchTz.formatEventLocalDate(dateStr, language),
    formatEventTime: EventosModel.formatEventLocalTime,
  };
}
