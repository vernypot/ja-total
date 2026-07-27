import { NoticiaLeidoButton } from '../../components/NoticiaLeidoButton';

export function PortalNewsActions({
  item,
  expanded,
  isLeida,
  markingId,
  onMarkLeida,
  t,
  onToggleExpand,
}) {
  if (!expanded) {
    return (
      <div className="portal-news-actions">
        <button type="button" className="home-link-btn" onClick={onToggleExpand}>
          {t('homeReadMore')}
        </button>
      </div>
    );
  }

  return (
    <div className="portal-news-actions portal-news-actions--expanded">
      <NoticiaLeidoButton
        noticiaId={item.id}
        isLeida={isLeida}
        marking={markingId === item.id}
        onMarkLeida={onMarkLeida}
        t={t}
      />
      <button type="button" className="home-link-btn" onClick={onToggleExpand}>
        {t('homeReadLess')}
      </button>
    </div>
  );
}
