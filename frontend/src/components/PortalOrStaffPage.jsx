import { useDashboardAuth } from '../hooks/useDashboardAuth';
import DashboardRouteLoading from './DashboardRouteLoading';

export default function PortalOrStaffPage({ portal: PortalPage, staff: StaffPage }) {
  const { loading, isMemberView } = useDashboardAuth();

  if (loading) return <DashboardRouteLoading />;
  if (isMemberView) return <PortalPage />;
  return <StaffPage />;
}
