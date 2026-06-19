import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import { getDefaultPageHelpContent } from '../i18n/pageHelpContent';
import {
  deletePageHelpOverride,
  fetchPageHelpOverrides,
  normalizePageHelpContent,
  upsertPageHelp,
} from '../mvc/models/pageHelp.model';
import { getUserRole, isSuperAdmin } from '../utils/permissions';

const PageHelpContext = createContext(null);

function overrideKey(pageId, language) {
  return `${pageId}:${language}`;
}

export function PageHelpProvider({ children }) {
  const { user, userData } = useContext(AuthContext);
  const userRole = getUserRole(user, userData);
  const canEditHelp = isSuperAdmin(userRole);

  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error, tableMissing: missing } = await fetchPageHelpOverrides();
    if (!error) {
      setOverrides(data || {});
      setTableMissing(Boolean(missing));
    }
    setLoading(false);
    return { error, tableMissing: missing };
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const getContent = useCallback((pageId, language = 'es') => {
    const custom = overrides[overrideKey(pageId, language)];
    if (custom) return custom;
    return getDefaultPageHelpContent(pageId, language);
  }, [overrides]);

  const hasOverride = useCallback((pageId, language = 'es') => {
    return Boolean(overrides[overrideKey(pageId, language)]);
  }, [overrides]);

  const saveContent = useCallback(async (pageId, language, content) => {
    const { data, error } = await upsertPageHelp(pageId, language, content);
    if (error) return { error };

    if (data?.content) {
      const normalized = normalizePageHelpContent(data.content);
      if (normalized) {
        setOverrides(prev => ({
          ...prev,
          [overrideKey(pageId, language)]: normalized,
        }));
      }
    } else {
      await reload();
    }

    return { error: null };
  }, [reload]);

  const resetContent = useCallback(async (pageId, language) => {
    const { error } = await deletePageHelpOverride(pageId, language);
    if (error) return { error };

    setOverrides(prev => {
      const next = { ...prev };
      delete next[overrideKey(pageId, language)];
      return next;
    });

    return { error: null };
  }, []);

  const value = useMemo(() => ({
    loading,
    tableMissing,
    canEditHelp,
    getContent,
    hasOverride,
    saveContent,
    resetContent,
    reload,
  }), [loading, tableMissing, canEditHelp, getContent, hasOverride, saveContent, resetContent, reload]);

  return (
    <PageHelpContext.Provider value={value}>
      {children}
    </PageHelpContext.Provider>
  );
}

export function usePageHelp() {
  const value = useContext(PageHelpContext);
  if (!value) {
    throw new Error('usePageHelp must be used within PageHelpProvider');
  }
  return value;
}
