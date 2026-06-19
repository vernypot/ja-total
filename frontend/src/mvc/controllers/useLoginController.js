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

  return {
    email,
    setEmail: updateEmail,
    password,
    setPassword: updatePassword,
    error,
    fieldErrors,
    isLoading,
    handleLogin,
  };
}
