const BUTTON_STYLE = {
  padding: '8px 14px',
  fontSize: '13px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  cursor: 'pointer',
  backgroundColor: '#fff',
  color: '#374151',
  fontWeight: 600,
};

export default function PrintRemainingYearEventsButton({
  onClick,
  disabled = false,
  loading = false,
  t,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={t('printRemainingYearEventsHint')}
      style={{
        ...BUTTON_STYLE,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.65 : 1,
      }}
    >
      🖨 {loading ? t('loading') : t('printRemainingYearEvents')}
    </button>
  );
}
