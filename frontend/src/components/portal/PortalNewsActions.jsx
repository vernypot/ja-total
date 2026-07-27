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
  return (
    <div className="portal-news-actions">
      <NoticiaLeidoButton
        noticiaId={item.id}
        isLeida={isLeida}
        marking={markingId === item.id}
        onMarkLeida={onMarkLeida}
        t={t}
      />
      <button type="button" className="home-link-btn" onClick={onToggleExpand}>
        {expanded ? t('homeReadLess') : t('homeReadMore')}
      </button>
    </div>
  );
}
