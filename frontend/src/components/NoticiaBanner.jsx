import NoticiaHtml from './NoticiaHtml';
import '../styles/noticiaBanner.css';

export default function NoticiaBanner({ items, formatDate, dismissible = false, onDismiss }) {
  if (!items?.length) return null;

  const item = items[0];

  return (
    <aside className="noticia-banner" role="region" aria-label="Announcement">
      <div className="noticia-banner-inner">
        <div className="noticia-banner-copy">
          {item.categoria && <span className="noticia-banner-tag">{item.categoria}</span>}
          <NoticiaHtml html={item.titulo} variant="title" as="strong" className="noticia-banner-title" />
          {(item.resumen || item.excerpt) && (
            <NoticiaHtml
              html={item.resumen || item.excerpt}
              variant="summary"
              className="noticia-banner-text"
            />
          )}
          {item.publicado_en && formatDate && (
            <span className="noticia-banner-date">{formatDate(item.publicado_en)}</span>
          )}
        </div>
        {dismissible && (
          <button type="button" className="noticia-banner-dismiss" onClick={onDismiss} aria-label="Dismiss">
            ×
          </button>
        )}
      </div>
    </aside>
  );
}
