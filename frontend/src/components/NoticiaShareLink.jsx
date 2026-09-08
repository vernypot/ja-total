import { useEffect, useState } from 'react';
import { buildNoticiaShareUrl } from '../utils/dashboardRoutes';

export default function NoticiaShareLink({
  noticiaId,
  publicAccess = true,
  t,
  compact = false,
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = buildNoticiaShareUrl(noticiaId);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!noticiaId || !shareUrl) return null;

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`noticia-share-link${compact ? ' noticia-share-link--compact' : ''}`}>
      {!compact && (
        <span className="noticia-share-link__label">{t('noticiasShareUrlLabel')}</span>
      )}
      <div className="noticia-share-link__row">
        <input
          type="text"
          className="form-input noticia-share-link__input"
          readOnly
          value={shareUrl}
          aria-label={t('noticiasShareUrlLabel')}
          onFocus={event => event.target.select()}
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm noticia-share-link__copy"
          onClick={copyShareUrl}
        >
          {copied ? t('noticiasShareCopied') : t('noticiasShareCopy')}
        </button>
      </div>
      {!publicAccess && (
        <small className="noticia-field-hint">{t('noticiasShareUrlAuthHint')}</small>
      )}
    </div>
  );
}
