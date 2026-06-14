import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import * as AuthModel from '../models/auth.model';
import { DASHBOARD_HOME_PATH } from '../../utils/dashboardRoutes';

export function useLoginController() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(DASHBOARD_HOME_PATH, { replace: true });
  }, [user, navigate]);

  async function handleLogin() {
    setError('');
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

  return { email, setEmail, password, setPassword, error, isLoading, handleLogin };
}
