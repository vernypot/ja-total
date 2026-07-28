import NoticiaHtml from './NoticiaHtml';
import { NoticiaListenButton } from './NoticiaListenButton';

function NoticiaReadActions({
  item,
  expanded,
  onOpen,
  onClose,
  t,
  speech,
  showCollapseButton,
  extraActions = null,
}) {
  const listenProps = speech ? {
    noticiaId: item.id,
    isActive: speech.isSpeakingItem(item.id),
    supported: speech.supported,
    onToggle: () => speech.toggle(item, { includeContent: expanded }),
    t,
  } : null;

  return (
    <div className={`noticia-read-actions${expanded ? ' noticia-read-actions--expanded' : ''}`}>
      {!expanded && (
        <button
          type="button"
          className="btn btn-primary btn-sm noticia-read-open-btn"
          onClick={onOpen}
        >
          {t('portalReadNews')}
        </button>
      )}
      {listenProps && <NoticiaListenButton {...listenProps} />}
      {expanded && showCollapseButton && (
        <button
          type="button"
          className="btn btn-secondary btn-sm noticia-read-collapse-btn"
          onClick={onClose}
        >
          {t('homeReadLess')}
        </button>
      )}
      {expanded && extraActions}
    </div>
  );
}

export default function NoticiaListReadSection({
  item,
  expanded,
  onOpen,
  onClose,
  t,
  speech = null,
  showCollapseButton = true,
  extraActions = null,
  titleAs = 'span',
  titleClassName = 'noticia-html--title',
  summaryClassName = 'home-news-resumen noticia-html--summary',
  contentClassName = 'home-news-contenido noticia-html--content',
}) {
  function openFullNews() {
    if (!expanded) onOpen();
  }

  const actions = (
    <NoticiaReadActions
      item={item}
      expanded={expanded}
      onOpen={openFullNews}
      onClose={onClose}
      t={t}
      speech={speech}
      showCollapseButton={showCollapseButton}
      extraActions={extraActions}
    />
  );

  return (
    <>
      <h3 className="home-news-title">
        <button
          type="button"
          className="home-news-title-btn"
          onClick={openFullNews}
          aria-expanded={expanded}
        >
          <NoticiaHtml
            html={item.titulo}
            variant="title"
            as={titleAs}
            className={titleClassName}
          />
        </button>
      </h3>
      {item.resumen && (
        <NoticiaHtml
          html={item.resumen}
          variant="summary"
          className={summaryClassName}
        />
      )}
      {!expanded && actions}
      {expanded && (
        <NoticiaHtml
          html={item.contenido}
          variant="content"
          className={contentClassName}
        />
      )}
      {expanded && actions}
    </>
  );
}
