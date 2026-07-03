import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { getSystemModules } from '../models/systemModules.model';
import { DASHBOARD_HOME_PATH } from '../../utils/dashboardRoutes';

export function useSystemModulesController() {
  const { user } = useContext(AuthContext);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const modules = getSystemModules();

  function goToLogin() {
    navigate('/login');
  }

  function goToDashboard() {
    navigate(DASHBOARD_HOME_PATH);
  }

  function openInfoModal() {
    setInfoModalOpen(true);
  }

  function closeInfoModal() {
    setInfoModalOpen(false);
  }

  return {
    user,
    language,
    modules,
    infoModalOpen,
    goToLogin,
    goToDashboard,
    openInfoModal,
    closeInfoModal,
  };
}
