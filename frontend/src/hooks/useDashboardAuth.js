import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useMemberPortal } from '../context/MemberPortalContext';

export function useDashboardAuth() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { isAuthenticated, ready: portalReady, session, logout: portalLogout } = useMemberPortal();

  const loading = authLoading || !portalReady;
  const isStaff = Boolean(user);
  const isPortalOnly = isAuthenticated && !user;

  return {
    loading,
    isStaff,
    isPortalOnly,
    session,
    logout: portalLogout,
  };
}
