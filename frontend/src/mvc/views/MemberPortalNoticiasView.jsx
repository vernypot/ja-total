import NoticiaHtml from '../../components/NoticiaHtml';
import NoticiaFeaturedImage from '../../components/NoticiaFeaturedImage';
import { PortalNewsActions } from '../../components/portal/PortalNewsActions';
import '../../styles/home.css';

export default function MemberPortalNoticiasView({
  news,
  expandedNewsId,
  setExpandedNewsId,
  loading,
  error,
  t,
  formatNewsDate,
  isLeida,
  markLeida,
  markingId,
}) {
  return (
    <div className="portal-page">
      <div className="portal-page-header portal-page-header--hide-mobile">
        <h1>📰 {t('portalNavNews')}</h1>
        <p>{t('portalNewsSubtitle')}</p>
      </div>

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
              <NoticiaFeaturedImage
                desktopUrl={item.imagen_destacada_url}
                mobileUrl={item.imagen_destacada_mobile_url}
              />
              <NoticiaHtml html={item.titulo} variant="title" as="h3" className="noticia-html--title" />
              {item.resumen && (
                <NoticiaHtml html={item.resumen} variant="summary" className="home-news-resumen noticia-html--summary" />
              )}
              {expandedNewsId === item.id && (
                <NoticiaHtml html={item.contenido} variant="content" className="home-news-contenido noticia-html--content" />
              )}
              <PortalNewsActions
                item={item}
                expanded={expandedNewsId === item.id}
                isLeida={isLeida(item.id)}
                markingId={markingId}
                onMarkLeida={markLeida}
                t={t}
                onToggleExpand={() => setExpandedNewsId(expandedNewsId === item.id ? '' : item.id)}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
