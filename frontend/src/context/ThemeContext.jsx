import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import { DEFAULT_UI_THEME, normalizeUiTheme } from '../constants/uiThemes';
import * as UsuariosModel from '../mvc/models/usuarios.model';
import { applyUiTheme, cacheUiTheme, readCachedUiTheme } from '../utils/uiTheme';

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user, userData, setUserData } = useContext(AuthContext);
  const userId = userData?.id || user?.id || null;

  const [theme, setThemeState] = useState(() => readCachedUiTheme(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    applyUiTheme(theme);
    cacheUiTheme(theme, userId);
  }, [theme, userId]);

  useEffect(() => {
    if (!user) {
      setThemeState(DEFAULT_UI_THEME);
      return;
    }

    if (!userId) return;

    const nextTheme = normalizeUiTheme(userData?.ui_theme ?? readCachedUiTheme(userId));
    setThemeState(nextTheme);
  }, [user, userId, userData?.ui_theme]);

  const setTheme = useCallback(async (nextTheme) => {
    const normalized = normalizeUiTheme(nextTheme);
    setError('');
    setThemeState(normalized);

    if (!userId) return;

    setSaving(true);
    const { error: saveError } = await UsuariosModel.updateUiTheme(userId, normalized);
    setSaving(false);

    if (saveError) {
      setError(saveError.message || 'Failed to save theme');
      return;
    }

    setUserData(prev => (prev ? { ...prev, ui_theme: normalized } : prev));
  }, [userId, setUserData]);

  const value = {
    theme,
    setTheme,
    saving,
    error,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
