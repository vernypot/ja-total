import { Link } from 'react-router-dom';
import { useState } from 'react';
import PortalNewsListItem from '../../components/PortalNewsListItem';
import HomeUpcomingEventRow, { homeEventDayParts } from '../../components/HomeUpcomingEventRow';
import MemberEventConfirmBlock from '../../components/MemberEventConfirmBlock';
import MemberEventConfirmationStatus from '../../components/MemberEventConfirmationStatus';
import { confirmationLabel } from '../../i18n/helpers';
import { useLanguage } from '../../hooks/useLanguage';
import '../../styles/home.css';
import '../../styles/eventAttendance.css';

function SectionHeader({ title, actionLabel, actionTo, onClear, clearLabel }) {
  return (
    <div className="portal-home-section-head">
      <h2>{title}</h2>
      <div className="portal-home-section-actions">
        {onClear && clearLabel ? (
          <button type="button" className="portal-home-section-clear" onClick={onClear}>
            {clearLabel}
          </button>
        ) : null}
        {actionLabel && actionTo ? (
          <Link to={actionTo} className="portal-home-section-link">{actionLabel}</Link>
        ) : null}
      </div>
    </div>
  );
}

function EventRowCard({
  row,
  expanded,
  onToggle,
  t,
  language,
  formatEventDate,
  formatEventTime,
  eventDisplayName,
  getClubName,
  getEventoFromRow,
  getConfirmacionFromRow,
  eventRequiresConfirmation,
  canMemberConfirmEvent,
  updateConfirmation,
  savingConfirmationId,
}) {
  const evento = getEventoFromRow(row);
  if (!evento) return null;

  const confirmacion = getConfirmacionFromRow(row);
  const needsConfirmation = eventRequiresConfirmation(evento);
  const showConfirmControls = canMemberConfirmEvent(row);
  const memberResponded = confirmacion !== 'pendiente';

  const statusContent = !memberResponded && needsConfirmation && !showConfirmControls ? (
    <span className="portal-home-event-status">
      {confirmationLabel(confirmacion, t)}
    </span>
  ) : null;

  const actions = showConfirmControls ? (
    <MemberEventConfirmBlock
      row={row}
      updateConfirmation={updateConfirmation}
      savingConfirmationId={savingConfirmationId}
      t={t}
      className="portal-home-event-actions"
    />
  ) : !showConfirmControls && memberResponded ? (
    <MemberEventConfirmationStatus
      row={row}
      updateConfirmation={updateConfirmation}
      savingConfirmationId={savingConfirmationId}
      t={t}
      variant="home"
    />
  ) : null;

  return (
    <HomeUpcomingEventRow
      evento={evento}
      expanded={expanded}
      onToggle={onToggle}
      variant="portal"
      t={t}
      formatEventDate={formatEventDate}
      formatEventTime={formatEventTime}
      eventDisplayName={eventDisplayName}
      eventDayParts={dateStr => homeEventDayParts(dateStr, language)}
      getClubName={getClubName}
      statusContent={statusContent}
      actions={actions}
    />
  );
}

function ClassUpdateCard({ item, t, onDismiss }) {
  const isRejected = item.estado === 'rechazado';
  return (
    <article className={`portal-home-update-card${isRejected ? ' portal-home-update-card--alert' : ''}`}>
      <div className="portal-home-update-icon">{isRejected ? '⚠️' : '⏳'}</div>
      <div className="home-item-main">
        <strong>{item.targetLabel}</strong>
        {item.claseNombre && item.tipo === 'requisito' && (
          <span>{item.claseNombre}</span>
        )}
        <span className="portal-home-update-message">
          {isRejected ? t('portalHomeClassUpdateRejected') : t('portalHomeClassUpdatePending')}
        </span>
        {isRejected && item.comentarioLider && (
          <span className="portal-home-update-comment">{item.comentarioLider}</span>
        )}
      </div>
      <div className="portal-home-card-actions">
        <Link to="/dashboard/profile/clases" className="portal-home-card-link">
          {t('portalHomeViewClasses')}
        </Link>
        <button
          type="button"
          className="portal-home-dismiss-btn"
          onClick={() => onDismiss(item.id)}
          aria-label={t('portalHomeDismissNotification')}
        >
          ✕
        </button>
      </div>
    </article>
  );
}

export default function MemberPortalHomeView({
  welcomeName,
  news,
  pendingConfirmations,
  upcomingEvents,
  classUpdates,
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
  getEventoFromRow,
  getConfirmacionFromRow,
  eventRequiresConfirmation,
  canMemberConfirmEvent,
  isLeida,
  markLeida,
  markingId,
  speech,
  embedded = false,
}) {
  const { language } = useLanguage();
  const [expandedEventId, setExpandedEventId] = useState('');
  const eventCardProps = {
    t,
    language,
    formatEventDate,
    formatEventTime,
    eventDisplayName,
    getClubName,
    getEventoFromRow,
    getConfirmacionFromRow,
    eventRequiresConfirmation,
    canMemberConfirmEvent,
    updateConfirmation,
    savingConfirmationId,
  };

  const hasPriorityContent = pendingConfirmations.length > 0 || classUpdates.length > 0;

  function toggleNewsExpand(itemId) {
    if (expandedNewsId === itemId && speech?.isSpeakingItem(itemId)) {
      speech.stop();
    }
    setExpandedNewsId(expandedNewsId === itemId ? '' : itemId);
  }

  function toggleEventExpand(eventId) {
    setExpandedEventId(current => (current === eventId ? '' : eventId));
  }

  return (
    <div className={`portal-page home-dashboard portal-home${embedded ? ' portal-home--embedded' : ''}`}>
      {!embedded && (
        <div className="portal-page-header portal-page-header--hide-mobile">
          <div>
            <h1>🏠 {t('portalHomeWelcome').replace('{name}', welcomeName)}</h1>
            <p className="home-header-sub">{t('portalHomeSubtitle')}</p>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="home-loading">{t('loading')}</p>}

      {!loading && (
        <>
          {actionCount > 0 && (
            <section className="portal-home-hero portal-home-hero--action" aria-label={t('portalHomeActionRequired')}>
              <div className="portal-home-hero-content">
                <span className="portal-home-hero-badge">{actionCount}</span>
                <div>
                  <h2>{t('portalHomeActionRequired')}</h2>
                  <p>{t('portalHomeActionRequiredHint')}</p>
                </div>
              </div>
            </section>
          )}

          {pendingConfirmations.length > 0 && (
            <section className="portal-home-section portal-home-section--priority">
              <SectionHeader
                title={`📋 ${t('portalHomeConfirmAttendance')}`}
                actionLabel={t('portalHomeViewAllEvents')}
                actionTo="/dashboard/eventos"
              />
              <div className="portal-home-card-list">
                {pendingConfirmations.map(row => {
                  const eventId = row.id || row.evento_id || getEventoFromRow(row)?.id;
                  return (
                    <EventRowCard
                      key={eventId}
                      row={row}
                      expanded={expandedEventId === eventId}
                      onToggle={() => toggleEventExpand(eventId)}
                      {...eventCardProps}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {classUpdates.length > 0 && (
            <section className="portal-home-section">
              <SectionHeader
                title={`🎓 ${t('portalHomeClassUpdates')}`}
                actionLabel={t('portalHomeViewClasses')}
                actionTo="/dashboard/profile/clases"
                onClear={dismissAllClassUpdates}
                clearLabel={t('portalHomeClearAll')}
              />
              <div className="portal-home-card-list">
                {classUpdates.map(item => (
                  <ClassUpdateCard
                    key={item.id}
                    item={item}
                    t={t}
                    onDismiss={dismissClassUpdate}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="portal-home-section">
            <SectionHeader
              title={`📅 ${t('portalHomeUpcomingMeetings')}`}
              actionLabel={upcomingEvents.length ? t('portalHomeViewAllEvents') : null}
              actionTo="/dashboard/eventos"
            />
            <div className="portal-home-card-list">
              {!upcomingEvents.length ? (
                <p className="home-empty">{t('portalHomeNoUpcomingMeetings')}</p>
              ) : (
                upcomingEvents.map(row => {
                  const eventId = row.id || row.evento_id || getEventoFromRow(row)?.id;
                  return (
                    <EventRowCard
                      key={eventId}
                      row={row}
                      expanded={expandedEventId === eventId}
                      onToggle={() => toggleEventExpand(eventId)}
                      {...eventCardProps}
                    />
                  );
                })
              )}
            </div>
          </section>

          <section className="portal-home-section">
            <SectionHeader
              title={`📰 ${t('portalHomeAnnouncements')}`}
              actionLabel={news.length ? t('portalHomeViewAllNews') : null}
              actionTo="/dashboard/noticias"
              onClear={news.length ? dismissAllAnnouncements : null}
              clearLabel={t('portalHomeClearAll')}
            />
            <div className="portal-home-card-list">
              {!news.length ? (
                <p className="home-empty">{t('portalHomeNoAnnouncements')}</p>
              ) : (
                <div className="home-news-list">
                  {news.map(item => (
                    <PortalNewsListItem
                      key={item.id}
                      item={item}
                      expanded={expandedNewsId === item.id}
                      onToggleExpand={() => toggleNewsExpand(item.id)}
                      formatNewsDate={formatNewsDate}
                      isLeida={isLeida}
                      markingId={markingId}
                      onMarkLeida={markLeida}
                      t={t}
                      speech={speech}
                      metaExtra={(
                        <button
                          type="button"
                          className="portal-home-dismiss-btn portal-home-dismiss-btn--inline"
                          onClick={() => dismissAnnouncement(item.id)}
                          aria-label={t('portalHomeDismissNotification')}
                        >
                          ✕
                        </button>
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {!hasPriorityContent && !upcomingEvents.length && !news.length && (
            <p className="portal-home-all-clear">{t('portalHomeAllClear')}</p>
          )}
        </>
      )}
    </div>
  );
}
