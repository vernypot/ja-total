import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import DashboardNoticiaBanner from '../components/DashboardNoticiaBanner';
import RouteErrorBoundary from '../components/RouteErrorBoundary';
import PortalBottomNav from '../components/portal/PortalBottomNav';
import { useDashboardAuth } from '../hooks/useDashboardAuth';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useLanguage } from '../hooks/useLanguage';


export default function Dashboard() {
  const { isPortalOnly } = useDashboardAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  const showStaffDrawer = isMobile && !isPortalOnly;
  const sidebarInert = isPortalOnly ? isMobile : showStaffDrawer && !drawerOpen;

  return (
    <div className={`layout${isPortalOnly ? ' layout--portal' : ''}`}>
      <RouteErrorBoundary>
        <Sidebar
          drawerOpen={drawerOpen}
          isMobile={isMobile}
          inert={sidebarInert}
        />
      </RouteErrorBoundary>

      {showStaffDrawer && drawerOpen && (
        <button
          type="button"
          className="layout-backdrop is-visible"
          aria-label={t('navMenuClose')}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className="main">
        <Topbar
          showMenuButton={showStaffDrawer}
          onMenuToggle={() => setDrawerOpen(open => !open)}
          menuOpen={drawerOpen}
        />
        <div className="content">
          {!isPortalOnly && <DashboardNoticiaBanner />}
          <RouteErrorBoundary>
            <div className={isPortalOnly ? 'portal-breadcrumb' : undefined}>
              <Breadcrumb />
            </div>
          </RouteErrorBoundary>
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </div>
        {isPortalOnly && <PortalBottomNav />}
      </div>
    </div>
  );
}
