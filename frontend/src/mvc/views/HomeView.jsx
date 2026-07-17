import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import NoticiaHtml from '../../components/NoticiaHtml';
import { PageHelpLink } from '../../components/PageHelp';
import AdminPendingApprovalsPanel from '../../components/AdminPendingApprovalsPanel';
import '../../styles/home.css';

function HomeNotifications({
  t,
  canManage,
  loading,
  notificationCount,
  pendingApprovals,
  eventAttendanceAlerts,
  reviewingSolicitudId,
  reviewSolicitud,
  memberName,
  formatRequestedDate,
  formatEventDate,
  formatEventTime,
  eventDisplayName,
  getClubName,
  goToMemberClasses,
  goToEventos,
}) {
  if (!canManage || loading) return null;

  const hasVisibleApprovals = pendingApprovals.length > 0;
  const hasVisibleEventAlerts = eventAttendanceAlerts.length > 0;
  const hasVisibleNotifications = hasVisibleApprovals || hasVisibleEventAlerts;

  if (!hasVisibleNotifications) return null;

  return (
    <div className="home-notifications">
      {hasVisibleNotifications && notificationCount > 0 && (
        <section className="portal-home-hero portal-home-hero--action" aria-label={t('homeActionRequired')}>
          <div className="portal-home-hero-content">
            <span className="portal-home-hero-badge">{notificationCount}</span>
            <div>
              <h2>{t('homeActionRequired')}</h2>
              <p>{t('homeActionRequiredHint')}</p>
            </div>
          </div>
        </section>
      )}

      {hasVisibleApprovals && (
        <AdminPendingApprovalsPanel
          solicitudes={pendingApprovals}
          reviewingSolicitudId={reviewingSolicitudId}
          onReview={reviewSolicitud}
          memberName={memberName}
          formatRequestedDate={formatRequestedDate}
          goToMemberClasses={goToMemberClasses}
          t={t}
        />
      )}

      {hasVisibleEventAlerts && (
        <section className="portal-home-section portal-home-section--priority">
          <div className="portal-home-section-head">
            <h2>📋 {t('homeMeetingAttendance')}</h2>
            <button type="button" className="portal-home-section-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={goToEventos}>
              {t('viewAll')}
            </button>
          </div>
          <div className="portal-home-card-list">
            {eventAttendanceAlerts.map(({ evento, pendingCount, pendingMembers }) => {
              const day = evento.fecha?.slice(8, 10) || '--';
              const memberPreview = pendingMembers.map(memberName).join(', ');
              return (
                <article key={evento.id} className="portal-home-event-card">
                  <div className="home-event-badge">
                    <span>{day}</span>
                  </div>
                  <div className="home-item-main">
                    <strong>{eventDisplayName(evento) || t('eventUntitled')}</strong>
                    <span>{getClubName(evento)}{evento.lugar ? ` · ${evento.lugar}` : ''}</span>
                    <span>{formatEventDate(evento.fecha)} · {formatEventTime(evento.hora)}</span>
                    <span className="portal-home-event-status">
                      {t('homePendingConfirmationsCount').replace('{count}', String(pendingCount))}
                    </span>
                    {memberPreview && (
                      <span className="home-notification-members">
                        {t('homePendingConfirmationsMembers').replace('{names}', memberPreview)}
                      </span>
                    )}
                  </div>
                  <div className="portal-home-card-actions">
                    <button
                      type="button"
                      className="portal-home-section-link"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onClick={goToEventos}
                    >
                      {t('homeManageEvents')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function HomePanels({
  t,
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
  toggleNewsExpand,
  eventDayParts,
  eventPlace,
  formatEventTime,
}) {
  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="home-loading">{t('loading')}</p>}

      <div className="home-grid">
        <div className="home-main-stack">
          <section className="home-panel">
            <div className="home-panel-head">
              <h2>📰 {t('homeNews')}</h2>
              {canManage && (
                <button type="button" className="home-link-btn" onClick={goToNoticiasAdmin}>
                  {t('manageNews')}
                </button>
              )}
            </div>
            <div className="home-panel-body">
              {!loading && !news.length ? (
                <p className="home-empty">{t('homeNoNews')}</p>
              ) : (
                <div className="home-news-list">
                  {news.map(item => (
                    <article key={item.id} className="home-news-item">
                      <div className="home-news-meta">
                        <span>{formatNewsDate(item.publicado_en)}</span>
                        {item.estado !== 'activo' && <span>{t('inactive')}</span>}
                      </div>
                      <NoticiaHtml
                        html={item.titulo}
                        variant="title"
                        as="h3"
                        className="noticia-html--title"
                      />
                      {item.resumen && (
                        <NoticiaHtml
                          html={item.resumen}
                          variant="summary"
                          className="home-news-resumen noticia-html--summary"
                        />
                      )}
                      {expandedNewsId === item.id && (
                        <NoticiaHtml
                          html={item.contenido}
                          variant="content"
                          className="home-news-contenido noticia-html--content"
                        />
                      )}
                      <button type="button" className="home-link-btn" onClick={() => toggleNewsExpand(item.id)}>
                        {expandedNewsId === item.id ? t('homeReadLess') : t('homeReadMore')}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="home-panel">
            <div className="home-panel-head">
              <h2>📅 {t('homeUpcomingEvents')}</h2>
              <Link to="/dashboard/eventos" className="home-link-btn">{t('viewAll')}</Link>
            </div>
            <div className="home-panel-body">
              {!loading && !events.length ? (
                <p className="home-empty">{t('homeNoEvents')}</p>
              ) : (
                <div className="home-landing-events-list">
                  {events.map(evento => {
                    const parts = eventDayParts(evento.fecha);
                    const place = eventPlace(evento);
                    return (
                      <article key={evento.id} className="home-landing-event-row">
                        <div className="home-landing-event-date">
                          <strong>{parts.day}</strong>
                          <span>{parts.month}</span>
                        </div>
                        <div className="home-landing-event-info">
                          <h3>{eventDisplayName(evento) || t('eventUntitled')}</h3>
                          {place && <p>{place}</p>}
                        </div>
                        <div className="home-landing-event-time">{formatEventTime(evento.hora)}</div>
                      </article>
                    );
                  })}
                </div>
              )}
              {canManage && events.length > 0 && (
                <button type="button" className="home-link-btn" style={{ marginTop: '0.75rem' }} onClick={goToEventos}>
                  {t('homeManageEvents')}
                </button>
              )}
            </div>
          </section>
        </div>

        <div className="home-sidebar-stack">
          <section className="home-panel">
            <div className="home-panel-head">
              <h2>🎂 {t('homeBirthdays')}</h2>
            </div>
            <div className="home-panel-body">
              {!loading && !birthdays.length ? (
                <p className="home-empty">{t('homeNoBirthdays')}</p>
              ) : (
                <ul className="home-birthday-list">
                  {birthdays.map(member => (
                    <li key={member.id} className="home-birthday-item">
                      <div className="home-birthday-badge">🎂</div>
                      <div className="home-item-main">
                        <strong>{memberName(member)}</strong>
                        <span>{formatBirthday(member)}</span>
                      </div>
                      <span className={`home-days-tag${member.daysUntil === 0 ? ' is-today' : ''}`}>
                        {member.daysUntil === 0
                          ? t('homeBirthdayToday')
                          : `${t('homeBirthdayIn')} ${member.daysUntil} ${t('homeBirthdayDays')}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default function HomeView(props) {
  const { t } = useLanguage();
  const {
    authLoading,
    effectiveIglesiaId,
    iglesiaNombre,
    iglesias,
    hasIglesiaAssignment,
    assignedIglesiaActive,
    canSwitchIglesia,
    goToIglesias,
    selectIglesia,
    canManage,
    goToNoticiasAdmin,
    pendingApprovals,
    eventAttendanceAlerts,
    notificationCount,
    reviewingSolicitudId,
    reviewSolicitud,
    formatRequestedDate,
    goToMemberClasses,
    ...panelProps
  } = props;

  if (authLoading) {
    return (
      <div className="container home-dashboard">
        <p className="home-loading">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="container home-dashboard">
      <div className="home-header">
        <div>
          <h1>🏠 {t('homeTitle')} <PageHelpLink pageId="home" /></h1>
          <p className="home-header-sub">
            {iglesiaNombre
              ? `${t('churchLabel')}: ${iglesiaNombre}`
              : t('homeSubtitle')}
          </p>
        </div>
        {canManage && effectiveIglesiaId && (
          <button
            type="button"
            onClick={goToNoticiasAdmin}
            style={{
              padding: '10px 15px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            ✏️ {t('manageNews')}
          </button>
        )}
      </div>

      {!effectiveIglesiaId && (
        <div className="alert alert-warning home-church-notice">
          {hasIglesiaAssignment && !assignedIglesiaActive
            ? t('homeNoActiveChurch')
            : t('homeSelectChurch')}
        </div>
      )}

      {!effectiveIglesiaId && canSwitchIglesia && iglesias.length > 0 && (
        <div className="card home-church-picker">
          <h3 style={{ marginTop: 0 }}>{t('homePickChurch')}</h3>
          <p className="text-muted">{t('homePickChurchHint')}</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              className="form-input"
              defaultValue=""
              onChange={e => {
                if (e.target.value) selectIglesia(e.target.value);
              }}
              style={{ minWidth: '260px', maxWidth: '100%' }}
            >
              <option value="">{t('selectChurch')}</option>
              {iglesias.map(ig => (
                <option key={ig.id} value={ig.id}>{ig.nombre}</option>
              ))}
            </select>
            <button type="button" className="home-link-btn" onClick={goToIglesias}>
              {t('churches')}
            </button>
          </div>
        </div>
      )}

      {!effectiveIglesiaId && canSwitchIglesia && !iglesias.length && (
        <div className="card">
          <p className="home-empty">{t('homeNoChurchesYet')}</p>
          <button type="button" className="home-link-btn" onClick={goToIglesias}>
            {t('newChurch')}
          </button>
        </div>
      )}

      {effectiveIglesiaId && (
        <>
          <HomeNotifications
            t={t}
            canManage={canManage}
            loading={panelProps.loading}
            notificationCount={notificationCount}
            pendingApprovals={pendingApprovals}
            eventAttendanceAlerts={eventAttendanceAlerts}
            reviewingSolicitudId={reviewingSolicitudId}
            reviewSolicitud={reviewSolicitud}
            memberName={panelProps.memberName}
            formatRequestedDate={formatRequestedDate}
            formatEventDate={panelProps.formatEventDate}
            formatEventTime={panelProps.formatEventTime}
            eventDisplayName={panelProps.eventDisplayName}
            getClubName={panelProps.getClubName}
            goToMemberClasses={panelProps.goToMemberClasses}
            goToEventos={panelProps.goToEventos}
          />
          <HomePanels
            t={t}
            canManage={canManage}
            goToNoticiasAdmin={goToNoticiasAdmin}
            {...panelProps}
          />
        </>
      )}
    </div>
  );
}
