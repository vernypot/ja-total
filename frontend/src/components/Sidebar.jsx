import { Link, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Sidebar() {
  const { user } = useContext(AuthContext);
  const userRole = user?.user_metadata?.role || 'user';
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>JA Total</h3>
        <span className={`role-badge role-${userRole}`}>{userRole}</span>
      </div>

      <nav className="sidebar-nav">
        <Link 
          to="/dashboard/miembros" 
          className={`nav-link ${isActive('/dashboard/miembros') ? 'active' : ''}`}
        >
          👥 Members
        </Link>
        <Link 
          to="/dashboard/iglesias" 
          className={`nav-link ${isActive('/dashboard/iglesias') ? 'active' : ''}`}
        >
          ⛪ Churches
        </Link>
        <Link 
          to="/dashboard/clubes" 
          className={`nav-link ${isActive('/dashboard/clubes') ? 'active' : ''}`}
        >
          🎯 Clubs
        </Link>
        <Link 
          to="/dashboard/clases-progresivas" 
          className={`nav-link ${isActive('/dashboard/clases-progresivas') ? 'active' : ''}`}
        >
          📚 Progressive Classes
        </Link>
        <Link 
          to="/dashboard/especialidades" 
          className={`nav-link ${isActive('/dashboard/especialidades') ? 'active' : ''}`}
        >
          ⭐ Specialties
        </Link>

        {userRole === 'superadmin' && (
          <>
            <hr />
            <div className="admin-section">
              <h4>Administration</h4>
              <Link 
                to="/dashboard/usuarios" 
                className={`nav-link admin-link ${isActive('/dashboard/usuarios') ? 'active' : ''}`}
              >
                🔑 User Management
              </Link>
            </div>
          </>
        )}
      </nav>
    </div>
  );
}