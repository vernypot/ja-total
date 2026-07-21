import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useMemberPortal } from '../../context/MemberPortalContext';
import * as MemberPortalModel from '../models/memberPortal.model';
import * as EventosModel from '../models/eventos.model';
import * as ClasesModel from '../models/clases.model';
import { compareEventsByLocalDateTime } from '../../utils/eventTimezone';
import { memberDisplayName } from '../../utils/memberDisplayName';
import {
  dismissAllPortalNotifications,
  dismissPortalNotification,
  getPortalDismissedNotifications,
  isPortalNotificationDismissed,
} from '../../utils/portalDismissedNotifications';

function buildClassUpdates(solicitudes = [], assigned = [], requisitos = []) {
  const assignmentById = Object.fromEntries(assigned.map(row => [row.id, row]));
  const requisitoById = Object.fromEntries(requisitos.map(row => [row.id, row]));

  return solicitudes
    .filter(row => row.estado === 'pendiente' || row.estado === 'rechazado')
    .map(row => {
      const assignment = assignmentById[row.miembro_clase_progresiva_id];
      const claseNombre = assignment?.clases_progresivas?.nombre || '';
      let targetLabel = claseNombre;

      if (row.tipo === 'requisito' && row.clase_requisito_id) {
        const requisito = requisitoById[row.clase_requisito_id];
        if (requisito) {
          const text = ClasesModel.getRequisitoDisplayText(requisito, null);
          targetLabel = requisito.numero != null ? `${requisito.numero}. ${text}` : text;
        }
      }

      return {
        id: row.id,
        estado: row.estado,
        tipo: row.tipo,
        claseNombre,
        targetLabel: targetLabel || claseNombre,
        comentarioLider: row.comentario_lider,
        solicitadoAt: row.solicitado_at,
      };
    })
    .sort((a, b) => String(b.solicitadoAt || '').localeCompare(String(a.solicitadoAt || '')));
}

function isPendingConfirmationRow(row) {
  return EventosModel.canMemberConfirmEvent(row);
}

export function useMemberPortalHomeController() {
  const { t, language } = useLanguage();
  const { session } = useMemberPortal();
  const miembroId = session?.miembroId;
  const [profile, setProfile] = useState(null);
  const [news, setNews] = useState([]);
  const [eventRows, setEventRows] = useState([]);
  const [classUpdates, setClassUpdates] = useState([]);
  const [expandedNewsId, setExpandedNewsId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingConfirmationId, setSavingConfirmationId] = useState(null);
  const [dismissed, setDismissed] = useState(() => getPortalDismissedNotifications(miembroId));

  async function load() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [profileResult, newsResult, eventsResult, classesResult] = await Promise.all([
      MemberPortalModel.fetchPortalProfile(session.sessionToken),
      MemberPortalModel.fetchPortalNoticias(session.sessionToken, { limit: 6 }),
      MemberPortalModel.fetchPortalEvents(session.sessionToken),
      MemberPortalModel.fetchPortalTab(session.sessionToken, 'classes'),
    ]);

    if (profileResult.error) {
      setError(profileResult.error.message);
      setLoading(false);
      return;
    }

    setProfile(profileResult.data);

    const errors = [newsResult.error, eventsResult.error, classesResult.error].filter(Boolean);
    if (errors.length) setError(errors[0].message);

    setNews(newsResult.data || []);
    setEventRows(eventsResult.data || []);

    const classesPayload = classesResult.data || {};
    const requisitos = ClasesModel.enrichRequisitoRows(classesPayload.requisitos);
    setClassUpdates(buildClassUpdates(
      classesPayload.solicitudes,
      classesPayload.assigned,
      requisitos
    ));

    setLoading(false);
  }

  async function updateConfirmation(eventoMiembroId, confirmacionEstado, eventoId = null) {
    if (!session?.sessionToken) return;
    if (!eventoMiembroId && !eventoId) return;
    if (!['confirmado', 'rechazado', 'pendiente'].includes(confirmacionEstado)) return;

    const saveKey = eventoMiembroId || eventoId;
    setError('');
    setSavingConfirmationId(saveKey);

    const { data, error: saveError } = await MemberPortalModel.setPortalEventConfirmation(
      session.sessionToken,
      confirmacionEstado,
      {
        eventoMiembroId: eventoMiembroId || null,
        eventoId: eventoMiembroId ? null : eventoId,
      }
    );

    setSavingConfirmationId(null);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setEventRows(prev => MemberPortalModel.patchPortalEventRowConfirmation(prev, {
      eventoMiembroId,
      eventoId,
      confirmacionEstado,
      savedRow: data,
    }));

    const { data: refreshedEvents, error: refreshError } = await MemberPortalModel.fetchPortalEvents(
      session.sessionToken
    );
    if (!refreshError) {
      setEventRows(refreshedEvents || []);
    }
  }

  const pendingConfirmations = useMemo(
    () => [...eventRows]
      .filter(isPendingConfirmationRow)
      .sort((a, b) => compareEventsByLocalDateTime(
        EventosModel.getEventoFromRow(a),
        EventosModel.getEventoFromRow(b)
      )),
    [eventRows]
  );

  const visibleClassUpdates = useMemo(
    () => classUpdates.filter(item => !isPortalNotificationDismissed(dismissed, 'classUpdates', item.id)),
    [classUpdates, dismissed]
  );

  const visibleNews = useMemo(
    () => news.filter(item => !isPortalNotificationDismissed(dismissed, 'announcements', item.id)),
    [news, dismissed]
  );

  const upcomingEvents = useMemo(
    () => [...eventRows]
      .filter(row => {
        const evento = EventosModel.getEventoFromRow(row);
        return evento && EventosModel.isEventInFuture(
          evento,
          new Date(),
          EventosModel.getEventChurchTimezone(evento)
        );
      })
      .sort((a, b) => compareEventsByLocalDateTime(
        EventosModel.getEventoFromRow(a),
        EventosModel.getEventoFromRow(b)
      ))
      .slice(0, 6),
    [eventRows]
  );

  const actionCount = pendingConfirmations.length
    + visibleClassUpdates.filter(row => row.estado === 'rechazado').length;

  function dismissClassUpdate(id) {
    setDismissed(dismissPortalNotification(miembroId, 'classUpdates', id));
  }

  function dismissAnnouncement(id) {
    setDismissed(dismissPortalNotification(miembroId, 'announcements', id));
  }

  function dismissAllClassUpdates() {
    setDismissed(dismissAllPortalNotifications(miembroId, 'classUpdates'));
  }

  function dismissAllAnnouncements() {
    setDismissed(dismissAllPortalNotifications(miembroId, 'announcements'));
  }

  useEffect(() => {
    setDismissed(getPortalDismissedNotifications(miembroId));
  }, [miembroId]);

  const memberName = memberDisplayName(profile);
  const welcomeName = profile?.nombre || memberName;

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
    return EventosModel.formatEventLocalTime(hora, language);
  }

  function eventDisplayName(evento) {
    return evento?.nombre || t('eventUntitled');
  }

  function getClubName(evento) {
    return evento?.clubes?.nombre || '';
  }

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return {
    profile,
    welcomeName,
    news: visibleNews,
    pendingConfirmations,
    upcomingEvents,
    classUpdates: visibleClassUpdates,
    actionCount,
    expandedNewsId,
    setExpandedNewsId,
    loading,
    error,
    savingConfirmationId,
    updateConfirmation,
    dismissClassUpdate,
    dismissAnnouncement,
    dismissAllClassUpdates,
    dismissAllAnnouncements,
    t,
    formatNewsDate,
    formatEventDate,
    formatEventTime,
    eventDisplayName,
    getClubName,
    getEventoFromRow: EventosModel.getEventoFromRow,
    getConfirmacionFromRow: EventosModel.getConfirmacionFromRow,
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
    canMemberConfirmEvent: EventosModel.canMemberConfirmEvent,
  };
}
