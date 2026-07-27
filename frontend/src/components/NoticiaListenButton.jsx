export function NoticiaListenButton({
  noticiaId,
  isActive,
  supported,
  onToggle,
  t,
}) {
  if (!supported) return null;

  return (
    <button
      type="button"
      className={`btn btn-sm ${isActive ? 'btn-secondary' : 'btn-outline'} portal-noticia-listen-btn`}
      onClick={onToggle}
      aria-pressed={isActive}
    >
      {isActive ? `⏹ ${t('portalNoticiaStopListen')}` : `🔊 ${t('portalNoticiaListen')}`}
    </button>
  );
}
