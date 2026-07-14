import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useLanguage } from '../../hooks/useLanguage';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/login.css';

const BRAND_MARK = '/teofila-mark.svg';

export default function LoginView({
  email,
  setEmail,
  password,
  setPassword,
  error,
  fieldErrors = {},
  isLoading,
  handleLogin,
  showForgotPassword,
  setShowForgotPassword,
  forgotMessage,
  handleForgotPassword,
}) {
  const { t } = useLanguage();

  return (
    <div className="login-page">
      <div className="login-page-brand">
        <div className="login-page-brand-content">
          <img src={BRAND_MARK} alt="" className="login-page-brand-mark" />
          <h1>{t('loginBrandTitle')}</h1>
          <p>{t('loginBrandText')}</p>
        </div>
        <Link to="/" className="login-page-back">← {t('landingBackHome')}</Link>
      </div>

      <div className="login-page-form-wrap">
        <div className="login-page-form">
          <div className="login-page-form-top">
            <LanguageSwitcher />
          </div>
          <h2>{t('loginTitle')} <PageHelpLink pageId="login" compact /></h2>
          <p className="login-page-form-sub">{t('loginSubtitle')}</p>
          {forgotMessage && (
            <div className="login-page-error" style={{ background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }}>
              {forgotMessage}
            </div>
          )}
          {error && <div className="login-page-error">{error}</div>}

          <Link to="/portal" className="login-page-member-cta">
            <span className="login-page-member-cta-icon" aria-hidden="true">📱</span>
            <div className="login-page-member-cta-copy">
              <strong>{t('loginMemberQrCtaTitle')}</strong>
              <span>{t('loginMemberQrCtaText')}</span>
            </div>
            <span className="login-page-member-cta-action">{t('loginMemberQrCtaButton')}</span>
          </Link>

          <div className="login-page-divider" role="separator">
            <span>{t('loginStaffDivider')}</span>
          </div>

          <div className={`login-page-field ${fieldErrors.email ? 'login-page-field--invalid' : ''}`}>
            <label htmlFor="login-email">{t('loginEmail')}</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isLoading}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && <span className="login-page-field-error" role="alert">{fieldErrors.email}</span>}
          </div>
          <div className={`login-page-field ${fieldErrors.password ? 'login-page-field--invalid' : ''}`}>
            <label htmlFor="login-password">{t('loginPassword')}</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
              aria-invalid={Boolean(fieldErrors.password)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            {fieldErrors.password && <span className="login-page-field-error" role="alert">{fieldErrors.password}</span>}
            <button
              type="button"
              className="login-page-forgot"
              onClick={() => setShowForgotPassword(v => !v)}
              disabled={isLoading}
            >
              {t('forgotPassword')}
            </button>
          </div>
          {showForgotPassword && (
            <button
              type="button"
              className="login-page-submit login-page-submit--secondary"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              {isLoading ? t('processing') : t('sendPasswordResetEmail')}
            </button>
          )}
          <button type="button" className="login-page-submit" onClick={handleLogin} disabled={isLoading}>
            {isLoading ? t('signingIn') : t('signIn')}
          </button>
        </div>
      </div>
    </div>
  );
}
