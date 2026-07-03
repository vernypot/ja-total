import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useLanguage } from '../../hooks/useLanguage';
import '../../styles/login.css';

const BRAND_MARK = '/teofila-mark.svg';

export default function ResetPasswordView({
  ready,
  checking,
  email,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  success,
  loading,
  handleSubmit,
}) {
  const { t } = useLanguage();

  return (
    <div className="login-page">
      <div className="login-page-brand">
        <div className="login-page-brand-content">
          <img src={BRAND_MARK} alt="" className="login-page-brand-mark" />
          <h1>{t('resetPasswordTitle')}</h1>
          <p>{t('resetPasswordPageIntro')}</p>
        </div>
        <Link to="/login" className="login-page-back">← {t('backToLogin')}</Link>
      </div>

      <div className="login-page-form-wrap">
        <div className="login-page-form">
          <div className="login-page-form-top">
            <LanguageSwitcher />
          </div>

          {checking && <p className="login-page-form-sub">{t('loading')}</p>}

          {!checking && !ready && (
            <>
              <h2>{t('resetPasswordTitle')}</h2>
              <p className="login-page-form-sub">{t('passwordResetLinkInvalid')}</p>
              {error && <div className="login-page-error">{error}</div>}
              <Link to="/login" className="login-page-submit" style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>
                {t('backToLogin')}
              </Link>
            </>
          )}

          {!checking && ready && (
            <>
              <h2>{t('resetPasswordTitle')}</h2>
              <p className="login-page-form-sub">
                {t('resetPasswordPageFor')} <strong>{email}</strong>
              </p>
              {error && <div className="login-page-error">{error}</div>}
              {success && <div className="login-page-error" style={{ background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }}>{success}</div>}

              <form onSubmit={handleSubmit}>
                <div className="login-page-field">
                  <label htmlFor="reset-password-new">{t('newPassword')}</label>
                  <input
                    id="reset-password-new"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={loading || Boolean(success)}
                    required
                  />
                </div>
                <div className="login-page-field">
                  <label htmlFor="reset-password-confirm">{t('confirmPassword')}</label>
                  <input
                    id="reset-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={loading || Boolean(success)}
                    required
                  />
                </div>
                <p className="login-page-form-sub" style={{ marginTop: 0 }}>{t('passwordHintShort')}</p>
                <button type="submit" className="login-page-submit" disabled={loading || Boolean(success)}>
                  {loading ? t('processing') : t('saveNewPassword')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
