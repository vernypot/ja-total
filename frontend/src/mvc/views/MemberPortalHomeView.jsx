import { Link } from 'react-router-dom';
import NoticiaHtml from '../../components/NoticiaHtml';
import MemberEventConfirmBlock from '../../components/MemberEventConfirmBlock';
import MemberEventConfirmationStatus from '../../components/MemberEventConfirmationStatus';
import EventDescriptionToggle from '../../components/EventDescriptionToggle';
import { confirmationLabel } from '../../i18n/helpers';
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
  t,
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

  const day = evento.fecha?.slice(8, 10) || '--';
  const confirmacion = getConfirmacionFromRow(row);
  const needsConfirmation = eventRequiresConfirmation(evento);
  const showConfirmControls = canMemberConfirmEvent(row);
  const memberResponded = confirmacion !== 'pendiente';

  return (
    <article className="portal-home-event-card">
      <div className="home-event-badge">
        <span>{day}</span>
      </div>
      <div className="home-item-main">
        <strong>{eventDisplayName(evento)}</strong>
        <span>
          {getClubName(evento)}
          {evento.lugar ? ` · ${evento.lugar}` : ''}
        </span>
        <span>{formatEventDate(evento.fecha)} · {formatEventTime(evento.hora)}</span>
        <EventDescriptionToggle description={evento.descripcion} />
        {!memberResponded && needsConfirmation && !showConfirmControls && (
          <span className="portal-home-event-status">
            {confirmationLabel(confirmacion, t)}
          </span>
        )}
      </div>
      {showConfirmControls && (
        <MemberEventConfirmBlock
          row={row}
          updateConfirmation={updateConfirmation}
          savingConfirmationId={savingConfirmationId}
          t={t}
          className="portal-home-event-actions"
        />
      )}
      {!showConfirmControls && memberResponded && (
        <MemberEventConfirmationStatus
          row={row}
          updateConfirmation={updateConfirmation}
          savingConfirmationId={savingConfirmationId}
          t={t}
          variant="home"
        />
      )}
    </article>
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
  embedded = false,
}) {
  const eventCardProps = {
    t,
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
                {pendingConfirmations.map(row => (
                  <EventRowCard
                    key={row.id || row.evento_id}
                    row={row}
                    {...eventCardProps}
                  />
                ))}
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
                upcomingEvents.map(row => (
                  <EventRowCard
                    key={row.id || row.evento_id}
                    row={row}
                    {...eventCardProps}
                  />
                ))
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
                    <article key={item.id} className="home-news-item">
                      <div className="home-news-meta">
                        <span>{formatNewsDate(item.publicado_en)}</span>
                        <button
                          type="button"
                          className="portal-home-dismiss-btn portal-home-dismiss-btn--inline"
                          onClick={() => dismissAnnouncement(item.id)}
                          aria-label={t('portalHomeDismissNotification')}
                        >
                          ✕
                        </button>
                      </div>
                      <NoticiaHtml html={item.titulo} variant="title" as="h3" className="noticia-html--title" />
                      {item.resumen && (
                        <NoticiaHtml html={item.resumen} variant="summary" className="home-news-resumen noticia-html--summary" />
                      )}
                      {expandedNewsId === item.id && (
                        <NoticiaHtml html={item.contenido} variant="content" className="home-news-contenido noticia-html--content" />
                      )}
                      <button
                        type="button"
                        className="home-link-btn"
                        onClick={() => setExpandedNewsId(expandedNewsId === item.id ? '' : item.id)}
                      >
                        {expandedNewsId === item.id ? t('homeReadLess') : t('homeReadMore')}
                      </button>
                    </article>
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
