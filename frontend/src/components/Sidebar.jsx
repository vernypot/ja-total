import { Link, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../hooks/useLanguage";
import { useDashboardAuth } from "../hooks/useDashboardAuth";
import { getUserRole, isSuperAdmin, isAdminOrAbove } from "../utils/permissions";
import { DASHBOARD_HOME_PATH, isDashboardHomePath } from "../utils/dashboardRoutes";
import NavLinkItem from "./NavLinkItem";

import { BRAND_MARK } from '../constants/brand';

export default function Sidebar({ drawerOpen = false, isMobile = false, inert = false, onCloseDrawer }) {
  const { user, userData } = useContext(AuthContext);
  const { t } = useLanguage();
  const { isPortalOnly } = useDashboardAuth();
  const userRole = getUserRole(user, userData);
  const superadmin = isSuperAdmin(userRole);
  const adminOrAbove = isAdminOrAbove(userRole);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const isEstructuraActive = location.pathname.startsWith('/dashboard/estructura');

  const sidebarClassName = [
    'sidebar',
    drawerOpen ? 'sidebar--drawer-open' : '',
    isPortalOnly ? 'sidebar--portal' : '',
  ].filter(Boolean).join(' ');

  const handleNavClick = (event) => {
    if (isMobile && drawerOpen && event.target.closest('a')) {
      onCloseDrawer?.();
    }
  };

  return (
    <aside
      className={sidebarClassName}
      inert={inert ? '' : undefined}
      aria-hidden={inert ? true : undefined}
    >
      <div className="sidebar-header">
        <Link to={DASHBOARD_HOME_PATH} className="sidebar-brand" onClick={isMobile && drawerOpen ? onCloseDrawer : undefined}>
          <img src={BRAND_MARK} alt="" className="sidebar-brand-logo" />
          <h3 className="sidebar-brand-name">{t('appName')}</h3>
        </Link>
        <div className="sidebar-header-actions">
          {isMobile && drawerOpen && (
            <button
              type="button"
              className="sidebar-close-btn"
              aria-label={t('navMenuClose')}
              onClick={onCloseDrawer}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>
      </div>

      <nav className="sidebar-nav sidebar-nav--underline" onClick={handleNavClick}>
        {isPortalOnly ? (
          <>
            <NavLinkItem to={DASHBOARD_HOME_PATH} icon="home" active={isDashboardHomePath(location.pathname)}>
              {t('home')}
            </NavLinkItem>
            <NavLinkItem to="/dashboard/profile" icon="user" active={location.pathname.startsWith('/dashboard/profile')}>
              {t('portalNavProfile')}
            </NavLinkItem>
            <NavLinkItem to="/dashboard/noticias" icon="blog" active={isActive('/dashboard/noticias')}>
              {t('portalNavNews')}
            </NavLinkItem>
            <NavLinkItem to="/dashboard/eventos" icon="events" active={isActive('/dashboard/eventos')}>
              {t('portalNavEvents')}
            </NavLinkItem>
            <NavLinkItem to="/dashboard/calendario" icon="calendar" active={isActive('/dashboard/calendario')}>
              {t('portalNavCalendar')}
            </NavLinkItem>
          </>
        ) : (
          <>
            <NavLinkItem to={DASHBOARD_HOME_PATH} icon="home" active={isDashboardHomePath(location.pathname)}>
              {t('home')}
            </NavLinkItem>
            {adminOrAbove && (
              <NavLinkItem to="/dashboard/noticias" icon="blog" active={isActive('/dashboard/noticias')}>
                {t('noticias')}
              </NavLinkItem>
            )}
            <NavLinkItem to="/dashboard/clubes" icon="clubs" active={isActive('/dashboard/clubes')}>
              {t('clubs')}
            </NavLinkItem>
            <NavLinkItem to="/dashboard/calendario" icon="calendar" active={isActive('/dashboard/calendario')}>
              {t('clubCalendar')}
            </NavLinkItem>
            {adminOrAbove && (
              <NavLinkItem to="/dashboard/eventos" icon="events" active={isActive('/dashboard/eventos')}>
                {t('events')}
              </NavLinkItem>
            )}
            {adminOrAbove && (
              <NavLinkItem to="/dashboard/planificacion" icon="plan" active={isActive('/dashboard/planificacion')}>
                {t('periodPlanning')}
              </NavLinkItem>
            )}
            <NavLinkItem to="/dashboard/miembros" icon="members" active={isActive('/dashboard/miembros')}>
              {t('members')}
            </NavLinkItem>
            {superadmin && (
              <>
                <NavLinkItem to="/dashboard/clases-progresivas" icon="book" active={isActive('/dashboard/clases-progresivas')}>
                  {t('progressiveClasses')}
                </NavLinkItem>
                <NavLinkItem to="/dashboard/especialidades" icon="star" active={isActive('/dashboard/especialidades')}>
                  {t('specialties')}
                </NavLinkItem>
                <NavLinkItem to="/dashboard/cargos" icon="badge" active={isActive('/dashboard/cargos')}>
                  {t('cargos')}
                </NavLinkItem>
              </>
            )}

            {adminOrAbove && (
              <>
                <hr />
                <div className="admin-section">
                  <h4>{t('administration')}</h4>
                  <NavLinkItem to="/dashboard/iglesias" icon="church" className="admin-link" active={isActive('/dashboard/iglesias')}>
                    {superadmin ? t('churches') : t('myChurch')}
                  </NavLinkItem>
                  <NavLinkItem to="/dashboard/tipos-evento" icon="tag" className="admin-link" active={isActive('/dashboard/tipos-evento')}>
                    {t('eventTypes')}
                  </NavLinkItem>
                  <NavLinkItem to="/dashboard/carnets-club" icon="idcard" className="admin-link" active={isActive('/dashboard/carnets-club')}>
                    {t('printClubCarnets')}
                  </NavLinkItem>
                  {superadmin && (
                    <NavLinkItem to="/dashboard/estructura" icon="globe" className="admin-link" active={isEstructuraActive}>
                      {t('orgStructureAdminLink')}
                    </NavLinkItem>
                  )}
                  {superadmin && (
                    <>
                      <NavLinkItem to="/dashboard/usuarios" icon="key" className="admin-link" active={isActive('/dashboard/usuarios')}>
                        {t('userManagement')}
                      </NavLinkItem>
                      <NavLinkItem to="/dashboard/site-content" icon="edit" className="admin-link" active={isActive('/dashboard/site-content')}>
                        {t('siteContentTitle')}
                      </NavLinkItem>
                      <NavLinkItem to="/dashboard/landing-cms" icon="web" className="admin-link" active={isActive('/dashboard/landing-cms')}>
                        {t('landingCmsTitle')}
                      </NavLinkItem>
                      <NavLinkItem to="/dashboard/advanced-settings" icon="settings" className="admin-link" active={isActive('/dashboard/advanced-settings')}>
                        {t('advancedSettings')}
                      </NavLinkItem>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </nav>
    </aside>
  );
}
