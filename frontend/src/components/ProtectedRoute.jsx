import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useMemberPortal } from '../context/MemberPortalContext';
import DashboardRouteLoading from './DashboardRouteLoading';

export default function ProtectedRoute({ element }) {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { isAuthenticated, ready: portalReady } = useMemberPortal();

  if (authLoading || !portalReady) {
    return <DashboardRouteLoading />;
  }

  if (user || isAuthenticated) {
    return element;
  }

  return <Navigate to="/login" replace />;
}
