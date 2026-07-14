import { useCallback, useEffect, useMemo, useState } from 'react';
import { UI_THEMES } from '../../constants/uiThemes';
import {
  mergeThemeColorValues,
  normalizeThemeColorOverrides,
  THEME_COLOR_DEFAULTS,
  THEME_COLOR_FIELDS,
} from '../../constants/uiThemeColors';
import * as UiThemeColorsModel from '../models/uiThemeColors.model';
import { applyThemeColorOverrides } from '../../utils/applyThemeColorOverrides';

export function useThemeColorOverridesController() {
  const [activeThemeId, setActiveThemeId] = useState('default');
  const [overrides, setOverrides] = useState(normalizeThemeColorOverrides(null));
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [missingTable, setMissingTable] = useState(false);

  const mergedValues = useMemo(
    () => mergeThemeColorValues(activeThemeId, draft),
    [activeThemeId, draft]
  );

  const loadOverrides = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data, error: fetchError, missingTable: tableMissing } = await UiThemeColorsModel.fetchThemeColorOverrides();
    if (fetchError) {
      setError(fetchError.message || 'Failed to load theme colors');
      setLoading(false);
      return;
    }

    setMissingTable(Boolean(tableMissing));
    setOverrides(data);
    applyThemeColorOverrides(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOverrides();
  }, [loadOverrides]);

  useEffect(() => {
    setDraft(overrides[activeThemeId] || {});
    setSuccess('');
  }, [activeThemeId, overrides]);

  function handleFieldChange(key, value) {
    setSuccess('');
    setDraft(prev => {
      const next = { ...prev };
      if (!value) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }

  function handleResetField(key) {
    setSuccess('');
    setDraft(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');

    const next = {
      ...overrides,
      [activeThemeId]: draft,
    };

    const { data, error: saveError } = await UiThemeColorsModel.saveThemeColorOverrides(next);
    setSaving(false);

    if (saveError) {
      setError(saveError.message || 'Failed to save theme colors');
      return;
    }

    setOverrides(data);
    applyThemeColorOverrides(data);
    setSuccess('saved');
  }

  async function handleResetTheme() {
    if (!confirm('Reset all color overrides for this theme to defaults?')) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const { data, error: resetError } = await UiThemeColorsModel.resetThemeColorOverrides(activeThemeId);
    setSaving(false);

    if (resetError) {
      setError(resetError.message || 'Failed to reset theme colors');
      return;
    }

    setOverrides(data);
    setDraft({});
    applyThemeColorOverrides(data);
    setSuccess('reset');
  }

  function handlePreview() {
    const preview = {
      ...overrides,
      [activeThemeId]: draft,
    };
    applyThemeColorOverrides(preview);
  }

  return {
    themes: UI_THEMES,
    activeThemeId,
    setActiveThemeId,
    fields: THEME_COLOR_FIELDS,
    defaults: THEME_COLOR_DEFAULTS[activeThemeId],
    mergedValues,
    draft,
    loading,
    saving,
    error,
    success,
    missingTable,
    handleFieldChange,
    handleResetField,
    handleSave,
    handleResetTheme,
    handlePreview,
    reload: loadOverrides,
  };
}
