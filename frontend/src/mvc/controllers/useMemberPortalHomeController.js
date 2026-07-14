import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useMemberPortal } from '../../context/MemberPortalContext';
import * as MemberPortalModel from '../models/memberPortal.model';
import * as EventosModel from '../models/eventos.model';
import { compareEventsByLocalDateTime } from '../../utils/eventTimezone';

export function useMemberPortalHomeController() {
  const { t, language } = useLanguage();
  const { session } = useMemberPortal();
  const [profile, setProfile] = useState(null);
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [expandedNewsId, setExpandedNewsId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [profileResult, newsResult, eventsResult] = await Promise.all([
      MemberPortalModel.fetchPortalProfile(session.sessionToken),
      MemberPortalModel.fetchPortalNoticias(session.sessionToken, { limit: 6 }),
      MemberPortalModel.fetchPortalEvents(session.sessionToken),
    ]);

    if (profileResult.error) {
      setError(profileResult.error.message);
      setLoading(false);
      return;
    }

    setProfile(profileResult.data);

    const errors = [newsResult.error, eventsResult.error].filter(Boolean);
    if (errors.length) setError(errors[0].message);

    setNews(newsResult.data || []);

    const upcoming = [...(eventsResult.data || [])]
      .filter(row => {
        const evento = EventosModel.getEventoFromRow(row);
        return evento && EventosModel.isEventInFuture(evento);
      })
      .sort((a, b) => compareEventsByLocalDateTime(
        EventosModel.getEventoFromRow(a),
        EventosModel.getEventoFromRow(b)
      ))
      .slice(0, 4)
      .map(row => EventosModel.getEventoFromRow(row))
      .filter(Boolean);

    setEvents(upcoming);
    setLoading(false);
  }

  const iglesias = profile?.iglesias || [];
  const clubs = profile?.clubes || [];

  const formatNewsDate = useMemo(() => (date) => {
    if (!date) return '';
    const locale = language === 'en' ? 'en-US' : 'es-CO';
    return new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [language]);

  function formatEventDate(fecha) {
    return EventosModel.formatEventLocalDate(fecha, language);
  }

  function formatEventTime(hora) {
    return EventosModel.formatEventLocalTime(hora);
  }

  function eventDisplayName(evento) {
    return evento?.nombre || '';
  }

  function getClubName(evento) {
    return evento?.clubes?.nombre || '';
  }

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return {
    profile,
    iglesias,
    clubs,
    news,
    events,
    expandedNewsId,
    setExpandedNewsId,
    loading,
    error,
    t,
    formatNewsDate,
    formatEventDate,
    formatEventTime,
    eventDisplayName,
    getClubName,
  };
}
