import { useContext, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../hooks/useLanguage";
import { useDashboardAuth } from "../hooks/useDashboardAuth";
import { getUserRole } from "../utils/permissions";
import { useNavigate, Link, useLocation } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";
import { DASHBOARD_HOME_PATH } from "../utils/dashboardRoutes";
import { getPortalPageTitle } from "../utils/portalMobileNav";

function memberInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'M';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Topbar({ showMenuButton = false, onMenuToggle, menuOpen = false }) {
  const { user, userData, logout } = useContext(AuthContext);
  const { t } = useLanguage();
  const { isPortalOnly, session, logout: portalLogout } = useDashboardAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const userRole = getUserRole(user, userData);
  const memberName = session?.memberName || t('roleMember');
  const displayName = isPortalOnly ? memberName : (user?.email || '');
  const displayInitials = isPortalOnly
    ? memberInitials(memberName)
    : (user?.email || 'U').substring(0, 2).toUpperCase();
  const displayRole = isPortalOnly ? t('roleMember') : userRole;
  const portalPageTitle = useMemo(
    () => (isPortalOnly ? getPortalPageTitle(location.pathname, t) : ''),
    [isPortalOnly, location.pathname, t]
  );

  async function handleLogout() {
    if (isPortalOnly) {
      await portalLogout();
      return;
    }

    await logout();
  }

  return (
    <div className={`topbar${isPortalOnly ? ' topbar--portal' : ''}${showMenuButton ? ' topbar--with-menu' : ''}`}>
      <div className="topbar-left">
        {showMenuButton && (
          <button
            type="button"
            className={`topbar-menu-btn${menuOpen ? ' topbar-menu-btn--open' : ''}`}
            aria-label={menuOpen ? t('navMenuClose') : t('navMenuOpen')}
            aria-expanded={menuOpen}
            onClick={onMenuToggle}
          >
            <span className="topbar-menu-btn__icon" aria-hidden="true" />
          </button>
        )}
        {isPortalOnly ? (
          <h1 className="portal-topbar-title">{portalPageTitle}</h1>
        ) : (
          <Link to={DASHBOARD_HOME_PATH} className="topbar-title topbar-title-link" style={{ textDecoration: 'none', color: 'inherit' }}>
            {t('home')}
          </Link>
        )}
      </div>

      <div className="topbar-right">
        <ThemeSwitcher variant="compact" showHint={false} />
        <LanguageSwitcher />
        <div className="user-menu">
          <button
            className="user-button"
            onClick={() => setShowMenu(!showMenu)}
            title={displayName}
            aria-label={displayName}
            aria-expanded={showMenu}
            aria-haspopup="menu"
          >
            <div className="user-avatar">{displayInitials}</div>
            <div className="user-info">
              <span className="user-email">{displayName}</span>
              <span className={`user-role role-${isPortalOnly ? 'member' : userRole}`}>{displayRole}</span>
            </div>
          </button>

          {showMenu && (
            <div className="user-dropdown">
              <div className="dropdown-item user-profile">
                <div className="profile-avatar">{displayInitials}</div>
                <div className="profile-info">
                  <div className="profile-email">{displayName}</div>
                  <div className="profile-role">{displayRole.toUpperCase()}</div>
                </div>
              </div>
              <hr />
              <button
                className="dropdown-item"
                onClick={() => {
                  navigate('/dashboard/profile');
                  setShowMenu(false);
                }}
                style={{ cursor: 'pointer' }}
              >
                👤 {t('profile')}
              </button>
              <hr />
              <button className="dropdown-item logout-btn" onClick={handleLogout}>
                🚪 {t('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
