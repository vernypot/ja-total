import NoticiaFeaturedImage from './NoticiaFeaturedImage';
import NoticiaListReadSection from './NoticiaListReadSection';

export default function DashboardNewsListItem({
  item,
  expanded,
  onToggleExpand,
  formatNewsDate,
  t,
  speech,
  metaExtra = null,
}) {
  function openFullNews() {
    if (!expanded) onToggleExpand();
  }

  return (
    <article className="home-news-item">
      <div className="home-news-meta">
        <span>{formatNewsDate(item.publicado_en)}</span>
        {metaExtra}
      </div>
      <NoticiaFeaturedImage
        desktopUrl={item.imagen_destacada_url}
        mobileUrl={item.imagen_destacada_mobile_url}
      />
      <NoticiaListReadSection
        item={item}
        expanded={expanded}
        onOpen={openFullNews}
        onClose={onToggleExpand}
        t={t}
        speech={speech}
      />
    </article>
  );
}
