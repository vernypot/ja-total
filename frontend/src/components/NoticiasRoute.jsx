import { useDashboardAuth } from '../hooks/useDashboardAuth';
import DashboardRouteLoading from './DashboardRouteLoading';
import AdminRoute from './AdminRoute';
import Noticias from '../pages/Noticias';
import MemberPortalNoticias from '../pages/MemberPortalNoticias';

export default function NoticiasRoute() {
  const { loading, isPortalOnly } = useDashboardAuth();

  if (loading) return <DashboardRouteLoading />;
  if (isPortalOnly) return <MemberPortalNoticias />;
  return <AdminRoute element={<Noticias />} />;
}
