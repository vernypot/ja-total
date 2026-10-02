export default function MensajePrivacyNotice({ t, className = '' }) {
  return (
    <aside
      className={['mensaje-privacy-notice', className].filter(Boolean).join(' ')}
      role="note"
    >
      <span className="mensaje-privacy-notice-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
          <path
            fill="currentColor"
            d="M12 2 1 21h22L12 2zm0 6c.6 0 1 .4 1 1v5a1 1 0 1 1-2 0V9c0-.6.4-1 1-1zm0 11a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 12 19z"
          />
        </svg>
      </span>
      <span className="mensaje-privacy-notice-text">{t('mensajePrivacyNotice')}</span>
    </aside>
  );
}
