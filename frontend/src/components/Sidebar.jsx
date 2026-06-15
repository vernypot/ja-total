import { Link, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../hooks/useLanguage";
import { getUserRole, isSuperAdmin, isAdminOrAbove } from "../utils/permissions";
import { DASHBOARD_HOME_PATH, isDashboardHomePath } from "../utils/dashboardRoutes";

export default function Sidebar() {
  const { user, userData } = useContext(AuthContext);
  const { t } = useLanguage();
  const userRole = getUserRole(user, userData);
  const superadmin = isSuperAdmin(userRole);
  const adminOrAbove = isAdminOrAbove(userRole);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Link to={DASHBOARD_HOME_PATH} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3>{t('appName')}</h3>
        </Link>
        <span className={`role-badge role-${userRole}`}>{userRole}</span>
      </div>

      <nav className="sidebar-nav">
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
        {adminOrAbove && (
          <Link
            to="/dashboard/iglesias"
            className={`nav-link ${isActive('/dashboard/iglesias') ? 'active' : ''}`}
          >
            ⛪ {superadmin ? t('churches') : t('myChurch')}
          </Link>
        )}
        <Link
          to="/dashboard/clubes"
          className={`nav-link ${isActive('/dashboard/clubes') ? 'active' : ''}`}
        >
          🎯 {t('clubs')}
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
            to="/dashboard/tipos-evento"
            className={`nav-link ${isActive('/dashboard/tipos-evento') ? 'active' : ''}`}
          >
            🏷️ {t('eventTypes')}
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
          </>
        )}

        {superadmin && (
          <>
            <hr />
            <div className="admin-section">
              <h4>{t('administration')}</h4>
              <Link
                to="/dashboard/usuarios"
                className={`nav-link admin-link ${isActive('/dashboard/usuarios') ? 'active' : ''}`}
              >
                🔑 {t('userManagement')}
              </Link>
              <Link
                to="/dashboard/advanced-settings"
                className={`nav-link admin-link ${isActive('/dashboard/advanced-settings') ? 'active' : ''}`}
              >
                ⚙️ {t('advancedSettings')}
              </Link>
            </div>
          </>
        )}
      </nav>
    </div>
  );
}
