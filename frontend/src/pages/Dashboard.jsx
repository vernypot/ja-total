import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import DashboardNoticiaBanner from '../components/DashboardNoticiaBanner';
import RouteErrorBoundary from '../components/RouteErrorBoundary';
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

  useEffect(() => {
    if (!drawerOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  const showMobileDrawer = isMobile;
  const sidebarInert = isMobile && !drawerOpen;

  return (
    <div className={`layout${isPortalOnly ? ' layout--portal' : ''}`}>
      <RouteErrorBoundary>
        <Sidebar
          drawerOpen={drawerOpen}
          isMobile={isMobile}
          inert={sidebarInert}
          onCloseDrawer={() => setDrawerOpen(false)}
        />
      </RouteErrorBoundary>

      {showMobileDrawer && drawerOpen && (
        <button
          type="button"
          className="layout-backdrop is-visible"
          aria-label={t('navMenuClose')}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className="main">
        <Topbar
          showMenuButton={showMobileDrawer}
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
      </div>
    </div>
  );
}
