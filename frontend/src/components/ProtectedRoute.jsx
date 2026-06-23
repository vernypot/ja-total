import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../hooks/useLanguage';

export default function ProtectedRoute({ element }) {
  const { user, loading } = useContext(AuthContext);
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading">{t('loading')}</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return element;
}
