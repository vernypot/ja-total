import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../hooks/useLanguage";
import { getUserRole } from "../utils/permissions";
import { useNavigate, Link } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";
import { DASHBOARD_HOME_PATH } from "../utils/dashboardRoutes";

export default function Topbar() {
  const { user, userData, logout } = useContext(AuthContext);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const userRole = getUserRole(user, userData);
  const userInitials = (user?.email || 'U').substring(0, 2).toUpperCase();

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="topbar">
      <div className="topbar-left">
        <Link to={DASHBOARD_HOME_PATH} className="topbar-title" style={{ textDecoration: 'none', color: 'inherit' }}>
          {t('home')}
        </Link>
      </div>

      <div className="topbar-right">
        <ThemeSwitcher variant="compact" showHint={false} />
        <LanguageSwitcher />
        <div className="user-menu">
          <button
            className="user-button"
            onClick={() => setShowMenu(!showMenu)}
            title={user?.email}
          >
            <div className="user-avatar">{userInitials}</div>
            <div className="user-info">
              <span className="user-email">{user?.email}</span>
              <span className={`user-role role-${userRole}`}>{userRole}</span>
            </div>
          </button>

          {showMenu && (
            <div className="user-dropdown">
              <div className="dropdown-item user-profile">
                <div className="profile-avatar">{userInitials}</div>
                <div className="profile-info">
                  <div className="profile-email">{user?.email}</div>
                  <div className="profile-role">{userRole.toUpperCase()}</div>
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
