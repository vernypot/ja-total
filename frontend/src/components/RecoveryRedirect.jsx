import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function RecoveryRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/reset-password') return;

    const hash = location.hash || '';
    const search = location.search || '';
    const isRecoveryHash = hash.includes('type=recovery') && hash.includes('access_token');
    const isRecoveryCode = search.includes('code=');

    if (isRecoveryHash || isRecoveryCode) {
      navigate(`/reset-password${search}${hash}`, { replace: true });
    }
  }, [location.pathname, location.hash, location.search, navigate]);

  return null;
}
