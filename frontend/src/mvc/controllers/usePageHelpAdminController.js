import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { usePageHelp } from '../../context/PageHelpContext';
import { listPageHelpPages } from '../../i18n/pageHelpContent';
import { getUserRole, isSuperAdmin } from '../../utils/permissions';
import { DASHBOARD_HOME_PATH } from '../../utils/dashboardRoutes';

export function usePageHelpAdminController() {
  const navigate = useNavigate();
  const { user, userData } = useContext(AuthContext);
  const { language } = useLanguage();
  const {
    getContent,
    hasOverride,
    saveContent,
    resetContent,
    tableMissing,
    reload,
  } = usePageHelp();

  const userRole = getUserRole(user, userData);
  const canManage = isSuperAdmin(userRole);

  const pages = useMemo(() => listPageHelpPages(), []);
  const [selectedPageId, setSelectedPageId] = useState(pages[0]?.id || '');
  const [editLanguage, setEditLanguage] = useState(language);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!canManage) navigate(DASHBOARD_HOME_PATH);
  }, [canManage, navigate]);

  useEffect(() => {
    setEditLanguage(language);
  }, [language]);

  const selectedContent = selectedPageId
    ? getContent(selectedPageId, editLanguage)
    : null;

  async function handleSave(content) {
    if (!selectedPageId) return;
    setSaving(true);
    setError('');
    setMessage('');
    const { error: saveError } = await saveContent(selectedPageId, editLanguage, content);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setMessage('saved');
  }

  async function handleReset() {
    if (!selectedPageId) return;
    setResetting(true);
    setError('');
    setMessage('');
    const { error: resetError } = await resetContent(selectedPageId, editLanguage);
    setResetting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMessage('reset');
  }

  return {
    pages,
    selectedPageId,
    setSelectedPageId,
    editLanguage,
    setEditLanguage,
    selectedContent,
    isCustom: selectedPageId ? hasOverride(selectedPageId, editLanguage) : false,
    saving,
    resetting,
    error,
    message,
    tableMissing,
    handleSave,
    handleReset,
    reload,
    canManage,
  };
}
