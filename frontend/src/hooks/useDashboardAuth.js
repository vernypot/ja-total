import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useMemberPortal } from '../context/MemberPortalContext';
import { useDashboardViewMode } from '../context/DashboardViewModeContext';

export function useDashboardAuth() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { isAuthenticated, ready: portalReady, session, logout: portalLogout } = useMemberPortal();
  const {
    isMemberView,
    canSwitchViewMode,
    viewMode,
    linkedMiembroId,
    linkedMemberName,
    loadingLinkedAccess,
    switchingMode,
    switchError,
    switchToMemberView,
    switchToAdminView,
  } = useDashboardViewMode();

  const loading = authLoading || !portalReady || loadingLinkedAccess;
  const isStaff = Boolean(user);
  const isPortalOnly = isAuthenticated && !user;

  return {
    loading,
    isStaff,
    isPortalOnly,
    isMemberView,
    canSwitchViewMode,
    viewMode,
    linkedMiembroId,
    linkedMemberName,
    switchingMode,
    switchError,
    switchToMemberView,
    switchToAdminView,
    session,
    logout: portalLogout,
  };
}
