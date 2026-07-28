import NoticiaFeaturedImage from './NoticiaFeaturedImage';
import NoticiaListReadSection from './NoticiaListReadSection';
import { NoticiaLeidoButton } from './NoticiaLeidoButton';

export default function PortalNewsListItem({
  item,
  expanded,
  onToggleExpand,
  formatNewsDate,
  isLeida,
  markingId,
  onMarkLeida,
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
        extraActions={expanded ? (
          <NoticiaLeidoButton
            noticiaId={item.id}
            isLeida={isLeida(item.id)}
            marking={markingId === item.id}
            onMarkLeida={onMarkLeida}
            t={t}
          />
        ) : null}
      />
    </article>
  );
}
