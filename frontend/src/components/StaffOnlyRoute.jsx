import { Navigate } from 'react-router-dom';
import { useDashboardAuth } from '../hooks/useDashboardAuth';
import { DASHBOARD_HOME_PATH } from '../utils/dashboardRoutes';
import DashboardRouteLoading from './DashboardRouteLoading';

export default function StaffOnlyRoute({ element }) {
  const { loading, isStaff, isMemberView } = useDashboardAuth();

  if (loading) return <DashboardRouteLoading />;

  if (isMemberView) {
    return <Navigate to={DASHBOARD_HOME_PATH} replace />;
  }

  if (!isStaff) {
    return <Navigate to="/login" replace />;
  }

  return element;
}
