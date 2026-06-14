import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { IglesiaContext } from '../../context/IglesiaContext';
import { AuthContext } from '../../context/AuthContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import * as IglesiasModel from '../models/iglesias.model';
import * as NoticiasModel from '../models/noticias.model';
import * as HomeModel from '../models/home.model';
import * as EventosModel from '../models/eventos.model';

export function useHomeController() {
  const { user, userData, loading: authLoading } = useContext(AuthContext);
  const { language } = useLanguage();
  const { updateActiveIglesia } = useContext(IglesiaContext);
  const navigate = useNavigate();
  const {
    effectiveIglesiaId,
    assignedIglesiaNombre,
    hasIglesiaAssignment,
    assignedIglesiaActive,
    canSwitchIglesia,
  } = useScopedIglesia();
  const userRole = getUserRole(user, userData);
  const canManage = canManageChurchData(userRole);

  const [iglesiaNombre, setIglesiaNombre] = useState(assignedIglesiaNombre || '');
  const [iglesias, setIglesias] = useState([]);
  const [news, setNews] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [events, setEvents] = useState([]);
  const [expandedNewsId, setExpandedNewsId] = useState('');
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
      setIglesiaNombre(assignedIglesiaNombre || '');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const iglesiaResult = await IglesiasModel.fetchIglesiaById(effectiveIglesiaId);
      setIglesiaNombre(iglesiaResult.data?.nombre || assignedIglesiaNombre || '');

      const [newsResult, birthdayResult, eventsResult] = await Promise.all([
        NoticiasModel.fetchNoticiasByIglesia(effectiveIglesiaId, { limit: 6 }),
        HomeModel.fetchUpcomingBirthdaysByIglesia(effectiveIglesiaId, { days: 30 }),
        EventosModel.fetchUpcomingEventosByIglesia(effectiveIglesiaId, 4),
      ]);

      const errors = [newsResult.error, birthdayResult.error, eventsResult.error].filter(Boolean);
      if (errors.length) {
        setError(errors[0].message || 'Error loading home data');
      } else {
        setError('');
      }

      setNews(newsResult.data || []);
      setBirthdays(birthdayResult.data || []);
      setEvents(eventsResult.data || []);
    } catch (err) {
      setError(err?.message || 'Error loading home data');
      setNews([]);
      setBirthdays([]);
      setEvents([]);
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

  function goToIglesias() {
    navigate('/dashboard/iglesias');
  }

  function toggleNewsExpand(id) {
    setExpandedNewsId(prev => (prev === id ? '' : id));
  }

  function selectIglesia(iglesiaId) {
    updateActiveIglesia(iglesiaId);
  }

  useEffect(() => {
    if (authLoading) return;
    loadIglesias();
  }, [authLoading, canSwitchIglesia]);

  useEffect(() => {
    if (authLoading) return;
    loadHomeData();
  }, [authLoading, effectiveIglesiaId, assignedIglesiaNombre]);

  useEffect(() => {
    if (authLoading || effectiveIglesiaId || !canSwitchIglesia || !iglesias.length) return;
    if (iglesias.length === 1) {
      updateActiveIglesia(iglesias[0].id);
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
    goToIglesias,
    toggleNewsExpand,
    selectIglesia,
    getClubName: evento => evento?.clubes?.nombre || '',
    formatEventDate: dateStr => NoticiasModel.formatNoticiaDate(dateStr, language),
    formatEventTime: hora => (hora ? String(hora).slice(0, 5) : ''),
  };
}
