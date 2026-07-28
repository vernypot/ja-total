import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../hooks/useLanguage";
import { useDashboardAuth } from "../hooks/useDashboardAuth";
import { getUserRole } from "../utils/permissions";
import { useNavigate, Link, useLocation } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";
import DashboardViewModeSwitch from "./DashboardViewModeSwitch";
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
  const { isMemberView, isPortalOnly, session, logout: portalLogout, linkedMemberName } = useDashboardAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const userMenuRef = useRef(null);
  const userRole = getUserRole(user, userData);
  const memberName = session?.memberName || linkedMemberName || t('roleMember');
  const displayName = isMemberView ? memberName : (user?.email || '');
  const displayInitials = isMemberView
    ? memberInitials(memberName)
    : (user?.email || 'U').substring(0, 2).toUpperCase();
  const displayRole = isMemberView ? t('roleMember') : userRole;
  const portalPageTitle = useMemo(
    () => (isMemberView ? getPortalPageTitle(location.pathname, t) : ''),
    [isMemberView, location.pathname, t]
  );

  async function handleLogout() {
    if (isMemberView && isPortalOnly) {
      await portalLogout();
      return;
    }

    await logout();
  }

  useEffect(() => {
    if (!showMenu) return undefined;

    function handlePointerDown(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showMenu]);

  return (
    <div className={`topbar${isMemberView ? ' topbar--portal' : ''}${showMenuButton ? ' topbar--with-menu' : ''}`}>
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
        {isMemberView ? (
          <h1 className="portal-topbar-title">{portalPageTitle}</h1>
        ) : (
          <Link to={DASHBOARD_HOME_PATH} className="topbar-title topbar-title-link" style={{ textDecoration: 'none', color: 'inherit' }}>
            {t('home')}
          </Link>
        )}
      </div>

      <div className="topbar-right">
        <div className="user-menu" ref={userMenuRef}>
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
              <span className={`user-role role-${isMemberView ? 'member' : userRole}`}>{displayRole}</span>
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
              <DashboardViewModeSwitch onAfterSwitch={() => setShowMenu(false)} />
              <div className="user-dropdown-preferences">
                <div className="user-dropdown-preferences__group">
                  <span className="user-dropdown-preferences__label">{t('uiThemeTitle')}</span>
                  <ThemeSwitcher variant="compact" showHint={false} />
                </div>
                <div className="user-dropdown-preferences__group">
                  <span className="user-dropdown-preferences__label">{t('pageHelpAdminLanguage')}</span>
                  <LanguageSwitcher />
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
