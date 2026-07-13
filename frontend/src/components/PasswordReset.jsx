import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getUserRole, isSuperAdmin } from '../utils/permissions';
import { useLanguage } from '../hooks/useLanguage';
import { validatePassword } from '../utils/passwordValidation';
import * as AuthModel from '../mvc/models/auth.model';
import '../styles/form.css';

export default function PasswordReset({ onClose, userEmail, isOwnPassword = true }) {
  const { user, userData } = useContext(AuthContext);
  const { t } = useLanguage();
  const userRole = getUserRole(user, userData);
  const canResetOthers = isSuperAdmin(userRole);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangeOwnPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error: signInError } = await AuthModel.verifyPassword(user.email, currentPassword);

      if (signInError) {
        setError(t('currentPassword') + ': ' + signInError.message);
        setLoading(false);
        return;
      }

      const pwdError = validatePassword(newPassword, t);
      if (pwdError) {
        setError(pwdError);
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError(t('passwordsDoNotMatch'));
        setLoading(false);
        return;
      }

      const { error: updateError } = await AuthModel.updateOwnPassword(newPassword);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(`✓ ${t('changePasswordTitle')}`);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetOtherPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!canResetOthers) {
      setError(t('error'));
      setLoading(false);
      return;
    }

    try {
      const pwdError = validatePassword(newPassword, t);
      if (pwdError) {
        setError(pwdError);
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError(t('passwordsDoNotMatch'));
        setLoading(false);
        return;
      }

      const { error: rpcError } = await AuthModel.adminSetUserPassword(userEmail, newPassword);

      if (rpcError) {
        const msg = rpcError.message || '';
        if (
          msg.includes('admin_set_usuario_password') ||
          msg.includes('Could not find the function') ||
          rpcError.code === 'PGRST202'
        ) {
          setError(t('runUsuariosAuthFix'));
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }

      setSuccess(`✓ ${t('resetPasswordTitle')}: ${userEmail}`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    if (!canResetOthers) {
      setError(t('error'));
      setLoading(false);
      return;
    }

    try {
      const { error: emailError } = await AuthModel.sendPasswordResetEmail(userEmail);

      if (emailError) {
        setError(AuthModel.formatAuthEmailError(emailError, t));
        setLoading(false);
        return;
      }

      setSuccess(`✓ ${t('passwordResetEmailSent')}: ${userEmail}`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const title = isOwnPassword
    ? t('changePasswordTitle')
    : `${t('resetPasswordTitle')} - ${userEmail}`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '90%',
          maxWidth: '500px',
          padding: '30px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>🔑 {title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)'
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '15px' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ marginBottom: '15px' }}>
            {success}
          </div>
        )}

        <form onSubmit={isOwnPassword ? handleChangeOwnPassword : handleResetOtherPassword}>
          {isOwnPassword && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                {t('currentPassword')} *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('currentPassword')}
                className="form-input"
                required
                disabled={loading}
              />
            </div>
          )}

          {!isOwnPassword && (
            <p className="text-muted" style={{ marginTop: 0, marginBottom: '15px', fontSize: '14px' }}>
              {t('resetPasswordHint')}
            </p>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              {t('newPassword')} *
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('newPassword')}
              className="form-input"
              required
              disabled={loading}
            />
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '5px' }}>
              {t('passwordHintShort')}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              {t('confirmPassword')} *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('confirmPassword')}
              className="form-input"
              required
              disabled={loading}
            />
          </div>

          {newPassword && (
            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>{t('passwordRequirementsTitle')}:</div>
              <div style={{ fontSize: '12px' }}>
                <div style={{ color: newPassword.length >= 8 ? '#16a34a' : '#dc2626' }}>
                  {newPassword.length >= 8 ? '✓' : '✕'} {t('passwordMinLength')}
                </div>
                <div style={{ color: /[A-Z]/.test(newPassword) ? '#16a34a' : '#dc2626' }}>
                  {/[A-Z]/.test(newPassword) ? '✓' : '✕'} {t('passwordUppercase')}
                </div>
                <div style={{ color: /[0-9]/.test(newPassword) ? '#16a34a' : '#dc2626' }}>
                  {/[0-9]/.test(newPassword) ? '✓' : '✕'} {t('passwordNumber')}
                </div>
                <div style={{ color: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '#16a34a' : '#dc2626' }}>
                  {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '✓' : '✕'} {t('passwordSpecial')}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                minWidth: '140px',
                padding: '12px',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? `⏳ ${t('processing')}` : `✓ ${t('saveNewPassword')}`}
            </button>
            {!isOwnPassword && (
              <button
                type="button"
                onClick={handleSendResetEmail}
                disabled={loading}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  padding: '12px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? `⏳ ${t('processing')}` : `📧 ${t('sendPasswordResetEmail')}`}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                minWidth: '140px',
                padding: '12px',
                backgroundColor: 'var(--color-btn-neutral)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: loading ? 0.6 : 1
              }}
            >
              ✕ {t('cancel')}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '15px', fontSize: '12px', color: 'var(--color-text-secondary)', backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '4px' }}>
          <strong>🔒 {t('securityTips')}:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>{t('securityTip1')}</li>
            <li>{t('securityTip2')}</li>
            <li>{t('securityTip3')}</li>
            <li>{t('securityTip4')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
