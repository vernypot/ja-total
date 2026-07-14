import NoticiaHtml from '../../components/NoticiaHtml';
import '../../styles/home.css';

export default function MemberPortalNoticiasView({
  news,
  expandedNewsId,
  setExpandedNewsId,
  loading,
  error,
  t,
  formatNewsDate,
}) {
  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1>📰 {t('portalNavNews')}</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>{t('portalNewsSubtitle')}</p>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p>{t('loading')}</p>}

      {!loading && !news.length && <p className="text-muted">{t('homeNoNews')}</p>}

      {!loading && news.length > 0 && (
        <div className="home-news-list" style={{ marginTop: '16px' }}>
          {news.map(item => (
            <article key={item.id} className="home-news-item" style={{ marginBottom: '12px', padding: '16px', backgroundColor: 'white', borderRadius: '8px' }}>
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
  );
}
