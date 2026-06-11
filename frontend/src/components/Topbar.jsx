import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { LanguageContext } from "../context/LanguageContext";
import { useNavigate } from "react-router-dom";
import { sb } from "../services/supabase";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Topbar() {
  const { user, setUser } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const userRole = user?.user_metadata?.role || 'user';
  const userInitials = (user?.email || 'U').substring(0, 2).toUpperCase();

  async function handleLogout() {
    await sb.auth.signOut();
    setUser(null);
    navigate('/');
  }

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h2 className="topbar-title">Dashboard</h2>
      </div>

      <div className="topbar-right">
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
              <button className="dropdown-item logout-btn" onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}