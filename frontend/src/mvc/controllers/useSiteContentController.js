import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, isSuperAdmin } from '../../utils/permissions';
import { DASHBOARD_HOME_PATH } from '../../utils/dashboardRoutes';
import { getSiteContentPages } from '../models/siteContent.model';

export function useSiteContentController() {
  const navigate = useNavigate();
  const { user, userData } = useContext(AuthContext);
  const userRole = getUserRole(user, userData);
  const canManage = isSuperAdmin(userRole);
  const pages = getSiteContentPages();

  useEffect(() => {
    if (!canManage) navigate(DASHBOARD_HOME_PATH);
  }, [canManage, navigate]);

  function openPreview(path) {
    window.open(path, '_blank', 'noopener,noreferrer');
  }

  return {
    pages,
    canManage,
    openPreview,
  };
}
