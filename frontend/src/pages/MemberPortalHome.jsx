import { Navigate } from 'react-router-dom';
import { useDashboardAuth } from '../hooks/useDashboardAuth';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { getPortalLandingPath } from '../utils/dashboardRoutes';
import { useMemberPortalHomeController } from '../mvc/controllers/useMemberPortalHomeController';
import MemberPortalHomeView from '../mvc/views/MemberPortalHomeView';

export default function MemberPortalHome({ embedded = false }) {
  const { isPortalOnly } = useDashboardAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isPortalOnly && isMobile && !embedded) {
    return <Navigate to={getPortalLandingPath(true)} replace />;
  }

  return <MemberPortalHomeView {...useMemberPortalHomeController()} embedded={embedded} />;
}
