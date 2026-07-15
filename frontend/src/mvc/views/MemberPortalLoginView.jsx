import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import PortalQrScanner from '../../components/PortalQrScanner';
import { BRAND_MARK } from '../../constants/brand';
import '../../styles/login.css';

export default function MemberPortalLoginView({
  token,
  setToken,
  pin,
  setPin,
  pinConfirm,
  setPinConfirm,
  memberPreview,
  step,
  error,
  loading,
  resolving,
  resolveToken,
  submitLogin,
  scanAgain,
}) {
  const { t } = useLanguage();
  const isPinSetup = Boolean(memberPreview?.needsPinSetup);

  return (
    <div className="login-page">
      <div className="login-page-brand">
        <div className="login-page-brand-content">
          <img src={BRAND_MARK} alt="" className="login-page-brand-mark" />
          <h1>{t('portalLoginTitle')}</h1>
          <p>{t('portalLoginBrandText')}</p>
        </div>
        <Link to="/" className="login-page-back">← {t('landingBackHome')}</Link>
      </div>

      <div className="login-page-form-wrap">
        <div className="login-page-form login-page-form--portal">
          <h2>
            {step === 'pin'
              ? (isPinSetup ? t('portalPinSetupTitle') : t('portalPinStepTitle'))
              : t('portalScanQr')}
          </h2>
          <p className="login-page-form-sub">
            {step === 'pin'
              ? (isPinSetup ? t('portalPinSetupHint') : t('portalPinReady'))
              : t('portalLoginSubtitle')}
          </p>

          {error && <div className="login-page-error">{error}</div>}

          {step === 'scan' && (
            <>
              <div className="login-page-qr-hero">
                <PortalQrScanner
                  onToken={resolveToken}
                  disabled={loading || resolving}
                  variant="hero"
                />
              </div>
              <details className="login-page-manual-token">
                <summary>{t('portalManualToken')}</summary>
                <label>
                  <span>{t('portalTokenLabel')}</span>
                  <input
                    type="text"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    onBlur={e => resolveToken(e.target.value)}
                    autoComplete="off"
                    placeholder={t('portalTokenPlaceholder')}
                  />
                </label>
              </details>
            </>
          )}

          {step === 'pin' && memberPreview && (
            <form onSubmit={submitLogin} className="login-page-pin-form">
              <div className="login-page-member-identified">
                <div className="login-page-member-identified-label">{t('portalMemberIdentified')}</div>
                <strong>{memberPreview.memberName}</strong>
                <p>{isPinSetup ? t('portalPinCreateHint') : t('portalPinEnterHint')}</p>
              </div>

              <div className="login-page-field">
                <label htmlFor="portal-pin">
                  {isPinSetup ? t('portalPinCreateLabel') : t('portalPinValidateLabel')}
                </label>
                <input
                  id="portal-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  autoComplete={isPinSetup ? 'new-password' : 'one-time-code'}
                  autoFocus
                  disabled={loading}
                />
              </div>

              {isPinSetup && (
                <div className="login-page-field">
                  <label htmlFor="portal-pin-confirm">{t('portalPinConfirmLabel')}</label>
                  <input
                    id="portal-pin-confirm"
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    value={pinConfirm}
                    onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>
              )}

              <button
                type="submit"
                className="login-page-submit"
                disabled={
                  loading
                  || resolving
                  || pin.length !== 4
                  || (isPinSetup && pinConfirm.length !== 4)
                }
              >
                {loading
                  ? t('portalSigningIn')
                  : (isPinSetup ? t('portalPinCreate') : t('portalValidatePin'))}
              </button>

              <button
                type="button"
                className="login-page-submit login-page-submit--secondary"
                onClick={scanAgain}
                disabled={loading}
              >
                {t('portalScanAgain')}
              </button>
            </form>
          )}

          <p className="login-page-footer-link">
            <Link to="/login">{t('portalStaffLoginLink')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
