import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { validateForm } from '../../utils/validateForm';
import * as AuthModel from '../models/auth.model';
import { DASHBOARD_HOME_PATH } from '../../utils/dashboardRoutes';

export function useLoginController() {
  const { user, setUser } = useContext(AuthContext);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  useEffect(() => {
    if (user) navigate(DASHBOARD_HOME_PATH, { replace: true });
  }, [user, navigate]);

  async function handleLogin() {
    setError('');
    const validation = validateForm('login', { email, password }, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: authError } = await AuthModel.signIn(email, password);
      if (authError) {
        setError(authError.message || 'Login failed. Please check your credentials.');
        return;
      }
      setUser(data.user);
      navigate(DASHBOARD_HOME_PATH);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function updateEmail(value) {
    setEmail(value);
    if (fieldErrors.email) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    }
  }

  function updatePassword(value) {
    setPassword(value);
    if (fieldErrors.password) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next.password;
        return next;
      });
    }
  }

  async function handleForgotPassword() {
    setError('');
    setForgotMessage('');
    setFieldErrors({});

    if (!email.trim()) {
      setFieldErrors({ email: t('loginEmail') });
      setError(t('loginEmail'));
      return;
    }

    setIsLoading(true);
    try {
      const { error: resetError } = await AuthModel.sendPasswordResetEmail(email);
      if (resetError) {
        setError(AuthModel.formatAuthEmailError(resetError, t));
        return;
      }
      setForgotMessage(t('passwordResetEmailRequested'));
      setShowForgotPassword(false);
    } catch {
      setError(t('passwordResetFailed'));
    } finally {
      setIsLoading(false);
    }
  }

  return {
    email,
    setEmail: updateEmail,
    password,
    setPassword: updatePassword,
    error,
    fieldErrors,
    isLoading,
    handleLogin,
    showForgotPassword,
    setShowForgotPassword,
    forgotMessage,
    handleForgotPassword,
  };
}
