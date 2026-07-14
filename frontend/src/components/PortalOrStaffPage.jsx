import { useDashboardAuth } from '../hooks/useDashboardAuth';
import DashboardRouteLoading from './DashboardRouteLoading';

export default function PortalOrStaffPage({ portal: PortalPage, staff: StaffPage }) {
  const { loading, isPortalOnly } = useDashboardAuth();

  if (loading) return <DashboardRouteLoading />;
  if (isPortalOnly) return <PortalPage />;
  return <StaffPage />;
}
