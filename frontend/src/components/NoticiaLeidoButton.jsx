export function NoticiaLeidoButton({ noticiaId, isLeida, marking, onMarkLeida, t }) {
  if (isLeida) {
    return (
      <span className="portal-noticia-leido portal-noticia-leido--done" aria-live="polite">
        ✓ {t('portalNoticiaLeidoDone')}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-primary btn-sm portal-noticia-leido-btn"
      disabled={marking}
      onClick={() => onMarkLeida(noticiaId)}
    >
      {marking ? t('loading') : t('portalNoticiaLeidoCta')}
    </button>
  );
}
