import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import NoticiaHtml from '../../components/NoticiaHtml';
import '../../styles/home.css';

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
  getClubName,
  formatEventDate,
  formatEventTime,
}) {
  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="home-loading">{t('loading')}</p>}

      <div className="home-grid">
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

          <section className="home-panel">
            <div className="home-panel-head">
              <h2>📅 {t('homeUpcomingEvents')}</h2>
              <Link to="/dashboard/eventos" className="home-link-btn">{t('viewAll')}</Link>
            </div>
            <div className="home-panel-body">
              {!loading && !events.length ? (
                <p className="home-empty">{t('homeNoEvents')}</p>
              ) : (
                <ul className="home-event-list">
                  {events.map(evento => {
                    const day = evento.fecha?.slice(8, 10) || '--';
                    return (
                      <li key={evento.id} className="home-event-item">
                        <div className="home-event-badge">
                          <span>{day}</span>
                        </div>
                        <div className="home-item-main">
                          <strong>{eventDisplayName(evento) || t('eventUntitled')}</strong>
                          <span>{getClubName(evento)}{evento.lugar ? ` · ${evento.lugar}` : ''}</span>
                          <span>{formatEventDate(evento.fecha)} · {formatEventTime(evento.hora)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {canManage && events.length > 0 && (
                <button type="button" className="home-link-btn" style={{ marginTop: '0.75rem' }} onClick={goToEventos}>
                  {t('homeManageEvents')}
                </button>
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
          <h1>🏠 {t('homeTitle')}</h1>
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
        <HomePanels
          t={t}
          canManage={canManage}
          goToNoticiasAdmin={goToNoticiasAdmin}
          {...panelProps}
        />
      )}
    </div>
  );
}
