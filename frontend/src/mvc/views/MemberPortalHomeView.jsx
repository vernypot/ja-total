import NoticiaHtml from '../../components/NoticiaHtml';
import '../../styles/home.css';

export default function MemberPortalHomeView({
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
}) {
  return (
    <div className="container home-dashboard" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div className="home-header">
        <div>
          <h1>🏠 {t('portalNavHome')}</h1>
          <p className="home-header-sub">{t('portalHomeSubtitle')}</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="home-loading">{t('loading')}</p>}

      {!loading && (
        <>
          <section className="home-panel" style={{ marginBottom: '16px' }}>
            <div className="home-panel-head">
              <h2>⛪ {t('portalMyChurches')}</h2>
            </div>
            <div className="home-panel-body">
              {!iglesias.length ? (
                <p className="home-empty">{t('portalNoChurches')}</p>
              ) : (
                <ul className="home-birthday-list">
                  {iglesias.map(iglesia => (
                    <li key={iglesia.id} className="home-birthday-item">
                      <div className="home-item-main">
                        <strong>{iglesia.nombre}</strong>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="home-panel" style={{ marginBottom: '16px' }}>
            <div className="home-panel-head">
              <h2>👥 {t('portalMyClubs')}</h2>
            </div>
            <div className="home-panel-body">
              {!clubs.length ? (
                <p className="home-empty">{t('portalNoClubs')}</p>
              ) : (
                <ul className="home-birthday-list">
                  {clubs.map(club => (
                    <li key={club.id} className="home-birthday-item">
                      <div className="home-item-main">
                        <strong>{club.nombre}</strong>
                        {club.iglesia_nombre && <span>{club.iglesia_nombre}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <div className="home-grid">
            <section className="home-panel">
              <div className="home-panel-head">
                <h2>📰 {t('homeNews')}</h2>
              </div>
              <div className="home-panel-body">
                {!news.length ? (
                  <p className="home-empty">{t('homeNoNews')}</p>
                ) : (
                  <div className="home-news-list">
                    {news.map(item => (
                      <article key={item.id} className="home-news-item">
                        <div className="home-news-meta">
                          <span>{formatNewsDate(item.publicado_en)}</span>
                        </div>
                        <NoticiaHtml html={item.titulo} variant="title" as="h3" className="noticia-html--title" />
                        {item.resumen && (
                          <NoticiaHtml html={item.resumen} variant="summary" className="home-news-resumen noticia-html--summary" />
                        )}
                        {expandedNewsId === item.id && (
                          <NoticiaHtml html={item.contenido} variant="content" className="home-news-contenido noticia-html--content" />
                        )}
                        <button type="button" className="home-link-btn" onClick={() => setExpandedNewsId(expandedNewsId === item.id ? '' : item.id)}>
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
              </div>
              <div className="home-panel-body">
                {!events.length ? (
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
                            <strong>{eventDisplayName(evento)}</strong>
                            <span>{getClubName(evento)}{evento.lugar ? ` · ${evento.lugar}` : ''}</span>
                            <span>{formatEventDate(evento.fecha)} · {formatEventTime(evento.hora)}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
