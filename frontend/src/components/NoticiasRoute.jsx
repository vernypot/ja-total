import { useDashboardAuth } from '../hooks/useDashboardAuth';
import DashboardRouteLoading from './DashboardRouteLoading';
import AdminRoute from './AdminRoute';
import Noticias from '../pages/Noticias';
import MemberPortalNoticias from '../pages/MemberPortalNoticias';

function StaffNoticiasPage() {
  return <AdminRoute element={<Noticias />} />;
}

export default function NoticiasRoute() {
  const { loading, isMemberView, isPortalOnly } = useDashboardAuth();

  if (loading) return <DashboardRouteLoading />;
  if (isMemberView || isPortalOnly) return <MemberPortalNoticias />;
  return <StaffNoticiasPage />;
}
