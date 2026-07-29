import PortalNewsListItem from '../../components/PortalNewsListItem';
import '../../styles/home.css';
import '../../styles/noticias.css';

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
  speech,
}) {
  function toggleNewsExpand(itemId) {
    if (expandedNewsId === itemId && speech?.isSpeakingItem(itemId)) {
      speech.stop();
    }
    setExpandedNewsId(expandedNewsId === itemId ? '' : itemId);
  }

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
