import { Link, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../hooks/useLanguage";
import { useDashboardAuth } from "../hooks/useDashboardAuth";
import { getUserRole, isSuperAdmin, isAdminOrAbove } from "../utils/permissions";
import { DASHBOARD_HOME_PATH, isDashboardHomePath } from "../utils/dashboardRoutes";

const BRAND_MARK = '/teofila-mark.svg';

export default function Sidebar() {
  const { user, userData } = useContext(AuthContext);
  const { t } = useLanguage();
  const { isPortalOnly } = useDashboardAuth();
  const userRole = getUserRole(user, userData);
  const superadmin = isSuperAdmin(userRole);
  const adminOrAbove = isAdminOrAbove(userRole);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const isEstructuraActive = location.pathname.startsWith('/dashboard/estructura');

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Link to={DASHBOARD_HOME_PATH} className="sidebar-brand">
          <img src={BRAND_MARK} alt="" className="sidebar-brand-logo" />
          <h3>{t('appName')}</h3>
        </Link>
        <span className={`role-badge role-${isPortalOnly ? 'member' : userRole}`}>
          {isPortalOnly ? t('roleMember') : userRole}
        </span>
      </div>

      <nav className="sidebar-nav">
        {isPortalOnly ? (
          <>
            <Link
              to={DASHBOARD_HOME_PATH}
              className={`nav-link ${isDashboardHomePath(location.pathname) ? 'active' : ''}`}
            >
              🏠 {t('home')}
            </Link>
            <Link
              to="/dashboard/profile"
              className={`nav-link ${location.pathname.startsWith('/dashboard/profile') ? 'active' : ''}`}
            >
              👤 {t('portalNavProfile')}
            </Link>
            <Link
              to="/dashboard/noticias"
              className={`nav-link ${isActive('/dashboard/noticias') ? 'active' : ''}`}
            >
              📰 {t('portalNavNews')}
            </Link>
            <Link
              to="/dashboard/eventos"
              className={`nav-link ${isActive('/dashboard/eventos') ? 'active' : ''}`}
            >
              📅 {t('portalNavEvents')}
            </Link>
            <Link
              to="/dashboard/calendario"
              className={`nav-link ${isActive('/dashboard/calendario') ? 'active' : ''}`}
            >
              🗓️ {t('portalNavCalendar')}
            </Link>
          </>
        ) : (
          <>
            <Link
              to={DASHBOARD_HOME_PATH}
              className={`nav-link ${isDashboardHomePath(location.pathname) ? 'active' : ''}`}
            >
              🏠 {t('home')}
            </Link>
            {adminOrAbove && (
              <Link
                to="/dashboard/noticias"
                className={`nav-link ${isActive('/dashboard/noticias') ? 'active' : ''}`}
              >
                📰 {t('noticias')}
              </Link>
            )}
            <Link
              to="/dashboard/clubes"
              className={`nav-link ${isActive('/dashboard/clubes') ? 'active' : ''}`}
            >
              🎯 {t('clubs')}
            </Link>
            <Link
              to="/dashboard/calendario"
              className={`nav-link ${isActive('/dashboard/calendario') ? 'active' : ''}`}
            >
              🗓️ {t('clubCalendar')}
            </Link>
            {adminOrAbove && (
              <Link
                to="/dashboard/eventos"
                className={`nav-link ${isActive('/dashboard/eventos') ? 'active' : ''}`}
              >
                📅 {t('events')}
              </Link>
            )}
            {adminOrAbove && (
              <Link
                to="/dashboard/planificacion"
                className={`nav-link ${isActive('/dashboard/planificacion') ? 'active' : ''}`}
              >
                📋 {t('periodPlanning')}
              </Link>
            )}
            <Link
              to="/dashboard/miembros"
              className={`nav-link ${isActive('/dashboard/miembros') ? 'active' : ''}`}
            >
              👥 {t('members')}
            </Link>
            {superadmin && (
              <>
                <Link
                  to="/dashboard/clases-progresivas"
                  className={`nav-link ${isActive('/dashboard/clases-progresivas') ? 'active' : ''}`}
                >
                  📚 {t('progressiveClasses')}
                </Link>
                <Link
                  to="/dashboard/especialidades"
                  className={`nav-link ${isActive('/dashboard/especialidades') ? 'active' : ''}`}
                >
                  ⭐ {t('specialties')}
                </Link>
                <Link
                  to="/dashboard/cargos"
                  className={`nav-link ${isActive('/dashboard/cargos') ? 'active' : ''}`}
                >
                  🎖️ {t('cargos')}
                </Link>
              </>
            )}

            {adminOrAbove && (
              <>
                <hr />
                <div className="admin-section">
                  <h4>{t('administration')}</h4>
                  <Link
                    to="/dashboard/iglesias"
                    className={`nav-link admin-link ${isActive('/dashboard/iglesias') ? 'active' : ''}`}
                  >
                    ⛪ {superadmin ? t('churches') : t('myChurch')}
                  </Link>
                  <Link
                    to="/dashboard/tipos-evento"
                    className={`nav-link admin-link ${isActive('/dashboard/tipos-evento') ? 'active' : ''}`}
                  >
                    🏷️ {t('eventTypes')}
                  </Link>
                  <Link
                    to="/dashboard/carnets-club"
                    className={`nav-link admin-link ${isActive('/dashboard/carnets-club') ? 'active' : ''}`}
                  >
                    🪪 {t('printClubCarnets')}
                  </Link>
                  {superadmin && (
                    <Link
                      to="/dashboard/estructura"
                      className={`nav-link admin-link ${isEstructuraActive ? 'active' : ''}`}
                    >
                      🌎 {t('orgStructureAdminLink')}
                    </Link>
                  )}
                  {superadmin && (
                    <>
                      <Link
                        to="/dashboard/usuarios"
                        className={`nav-link admin-link ${isActive('/dashboard/usuarios') ? 'active' : ''}`}
                      >
                        🔑 {t('userManagement')}
                      </Link>
                      <Link
                        to="/dashboard/site-content"
                        className={`nav-link admin-link ${isActive('/dashboard/site-content') ? 'active' : ''}`}
                      >
                        📝 {t('siteContentTitle')}
                      </Link>
                      <Link
                        to="/dashboard/landing-cms"
                        className={`nav-link admin-link ${isActive('/dashboard/landing-cms') ? 'active' : ''}`}
                      >
                        🌐 {t('landingCmsTitle')}
                      </Link>
                      <Link
                        to="/dashboard/advanced-settings"
                        className={`nav-link admin-link ${isActive('/dashboard/advanced-settings') ? 'active' : ''}`}
                      >
                        ⚙️ {t('advancedSettings')}
                      </Link>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </nav>
    </div>
  );
}
