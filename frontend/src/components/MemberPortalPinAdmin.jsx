import { useEffect, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import * as MemberPortalModel from '../mvc/models/memberPortal.model';

export default function MemberPortalPinAdmin({
  miembroId,
  canManage,
  compact = false,
  showQrRegenerate = false,
  onTokenRegenerated,
}) {
  const { t } = useLanguage();
  const { askConfirm, confirmDialog } = useConfirmDialog({
    cancelLabel: t('cancel'),
    confirmingLabel: t('saving'),
  });
  const [hasPin, setHasPin] = useState(false);
  const [portalActivated, setPortalActivated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function loadStatus() {
    if (!miembroId || !canManage) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: statusError } = await MemberPortalModel.getPortalStatus(miembroId);
    setLoading(false);

    if (statusError) {
      setError(statusError.message);
      return;
    }

    setHasPin(Boolean(data?.hasPin));
    setPortalActivated(Boolean(data?.portalActivated));
  }

  useEffect(() => {
    loadStatus();
  }, [miembroId, canManage]);

  async function savePin() {
    setError('');
    setNotice('');

    if (!MemberPortalModel.isValidPortalPin(pin)) {
      setError(t('portalPinInvalid'));
      return;
    }

    setSaving(true);
    const { error: saveError } = await MemberPortalModel.setPortalPin(miembroId, pin);
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setPin('');
    setHasPin(true);
    setPortalActivated(false);
    setNotice(t('portalPinSaved'));
  }

  async function resetPin() {
    askConfirm({
      title: t('portalPinResetConfirmTitle'),
      message: t('portalPinResetConfirm'),
      confirmLabel: t('portalPinReset'),
      onConfirm: async () => {
        setError('');
        setNotice('');
        setResetting(true);

        const { error: resetError } = await MemberPortalModel.resetPortalPin(miembroId);
        setResetting(false);

        if (resetError) {
          setError(resetError.message);
          return;
        }

        setPin('');
        setHasPin(false);
        setPortalActivated(false);
        setNotice(t('portalPinResetDone'));
      },
    });
  }

  async function regenerateQr() {
    askConfirm({
      title: t('portalQrRegenerateConfirmTitle'),
      message: t('portalQrRegenerateConfirm'),
      confirmLabel: t('portalQrRegenerate'),
      onConfirm: async () => {
        setError('');
        setNotice('');
        setRegenerating(true);

        const { data: newToken, error: regenError } = await MemberPortalModel.regenerateProfileToken(miembroId);
        setRegenerating(false);

        if (regenError) {
          setError(regenError.message);
          return;
        }

        setNotice(t('portalQrRegenerated'));
        onTokenRegenerated?.(newToken || '');
      },
    });
  }

  if (!canManage) return null;

  const statusLabel = !hasPin
    ? t('portalStatusNoPin')
    : portalActivated
      ? t('portalStatusActive')
      : t('portalStatusAwaitingFirstLogin');

  return (
    <div style={{
      padding: compact ? '10px' : '14px',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: compact ? '8px' : '10px' }}>
        <h4 style={{ margin: 0, fontSize: compact ? '13px' : '14px' }}>{t('portalPinAdminTitle')}</h4>
        {!loading && (
          <span style={{
            fontSize: '12px',
            padding: '2px 8px',
            borderRadius: '999px',
            backgroundColor: portalActivated ? '#dcfce7' : hasPin ? '#fef9c3' : '#f3f4f6',
            color: portalActivated ? '#166534' : hasPin ? '#854d0e' : '#4b5563',
          }}>
            {statusLabel}
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>{t('loading')}</p>
      ) : (
        <>
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {hasPin ? t('portalPinConfigured') : t('portalPinAdminHint')}
          </p>
          {notice && <div className="alert" style={{ marginBottom: '10px' }}>{notice}</div>}
          {error && <div className="alert alert-error" style={{ marginBottom: '10px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="form-input"
              placeholder="••••"
              style={{ maxWidth: '120px', margin: 0 }}
            />
            <button
              type="button"
              onClick={savePin}
              disabled={saving || pin.length !== 4}
              className="btn btn-sm"
              style={{ backgroundColor: '#2563eb', color: 'white', border: 'none' }}
            >
              {hasPin ? t('portalPinUpdate') : t('portalPinSet')}
            </button>
            {hasPin && (
              <button
                type="button"
                onClick={resetPin}
                disabled={resetting}
                className="btn btn-sm"
                style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
              >
                {resetting ? t('processing') : t('portalPinReset')}
              </button>
            )}
          </div>
          {showQrRegenerate && (
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                onClick={regenerateQr}
                disabled={regenerating}
                className="btn btn-sm"
                style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}
              >
                {regenerating ? t('processing') : t('portalQrRegenerate')}
              </button>
            </div>
          )}
        </>
      )}
      {confirmDialog}
    </div>
  );
}
