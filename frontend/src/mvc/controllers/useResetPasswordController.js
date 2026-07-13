import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { validatePassword } from '../../utils/passwordValidation';
import * as AuthModel from '../models/auth.model';

function clearRecoveryParamsFromUrl() {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, document.title, '/reset-password');
}

export function useResetPasswordController() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = AuthModel.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        setEmail(session.user.email || '');
        setReady(true);
        setLinkExpired(false);
        setChecking(false);
        clearRecoveryParamsFromUrl();
      }
    });

    async function bootstrap() {
      setChecking(true);
      setError('');
      setLinkExpired(false);

      const callbackError = AuthModel.parseAuthCallbackError();
      if (callbackError) {
        if (active) {
          setError(AuthModel.formatAuthCallbackError(callbackError, t));
          setLinkExpired(callbackError.errorCode === 'otp_expired');
          setReady(false);
          setChecking(false);
          clearRecoveryParamsFromUrl();
        }
        return;
      }

      try {
        const { session, error: sessionError, mode } = await AuthModel.completePasswordRecoverySession();

        if (sessionError) {
          if (active) setError(sessionError.message);
          return;
        }

        const hash = window.location.hash || '';
        const hasRecoveryHash = hash.includes('type=recovery');
        const isRecovery = mode === 'pkce' || hasRecoveryHash;

        if (session?.user && isRecovery) {
          if (active) {
            setEmail(session.user.email || '');
            setReady(true);
            clearRecoveryParamsFromUrl();
          }
        } else if (active) {
          setReady(false);
        }
      } catch (err) {
        if (active) setError(err.message || t('passwordResetLinkInvalid'));
      } finally {
        if (active) setChecking(false);
      }
    }

    bootstrap();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [t]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const pwdError = validatePassword(newPassword, t);
      if (pwdError) {
        setError(pwdError);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError(t('passwordsDoNotMatch'));
        return;
      }

      const { error: updateError } = await AuthModel.updateOwnPassword(newPassword);
      if (updateError) {
        setError(updateError.message);
        return;
      }

      await AuthModel.signOut();
      setSuccess(t('passwordResetSuccess'));
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      setError(err.message || t('passwordResetFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestNewLink(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email.trim()) {
      setError(t('loginEmail'));
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await AuthModel.sendPasswordResetEmail(email);
      if (resetError) {
        setError(AuthModel.formatAuthEmailError(resetError, t));
        return;
      }
      setSuccess(t('passwordResetEmailRequested'));
      setLinkExpired(false);
    } catch (err) {
      setError(err.message || t('passwordResetFailed'));
    } finally {
      setLoading(false);
    }
  }

  return {
    ready,
    checking,
    email,
    setEmail,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    success,
    loading,
    linkExpired,
    handleSubmit,
    handleRequestNewLink,
  };
}
