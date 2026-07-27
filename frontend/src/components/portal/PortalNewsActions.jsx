import { NoticiaLeidoButton } from '../../components/NoticiaLeidoButton';
import { NoticiaListenButton } from '../../components/NoticiaListenButton';

export function PortalNewsActions({
  item,
  expanded,
  isLeida,
  markingId,
  onMarkLeida,
  t,
  onToggleExpand,
  speech,
}) {
  const listenProps = speech ? {
    noticiaId: item.id,
    isActive: speech.isSpeakingItem(item.id),
    supported: speech.supported,
    onToggle: () => speech.toggle(item, { includeContent: expanded }),
    t,
  } : null;

  if (!expanded) {
    return (
      <div className="portal-news-actions">
        {listenProps && <NoticiaListenButton {...listenProps} />}
        <button type="button" className="home-link-btn" onClick={onToggleExpand}>
          {t('homeReadMore')}
        </button>
      </div>
    );
  }

  return (
    <div className="portal-news-actions portal-news-actions--expanded">
      {listenProps && <NoticiaListenButton {...listenProps} />}
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
