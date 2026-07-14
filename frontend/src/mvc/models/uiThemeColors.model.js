import { sb } from '../../services/supabase';
import { normalizeThemeColorOverrides } from '../../constants/uiThemeColors';

const SETTINGS_KEY = 'ui_theme_color_overrides';

export async function fetchThemeColorOverrides() {
  const { data, error } = await sb
    .from('system_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01' || error.message?.includes('system_settings')) {
      return { data: normalizeThemeColorOverrides(null), error: null, missingTable: true };
    }
    return { data: normalizeThemeColorOverrides(null), error };
  }

  return {
    data: normalizeThemeColorOverrides(data?.value),
    error: null,
    missingTable: false,
  };
}

export async function saveThemeColorOverrides(overrides) {
  const value = normalizeThemeColorOverrides(overrides);
  const payload = {
    key: SETTINGS_KEY,
    value,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from('system_settings')
    .upsert(payload, { onConflict: 'key' })
    .select('value')
    .single();

  if (error) {
    if (error.code === '42P01' || error.message?.includes('system_settings')) {
      return { data: null, error: { message: 'system_settings table not found — run UI_THEME_COLOR_OVERRIDES.sql in Supabase' } };
    }
    return { data: null, error };
  }

  return { data: normalizeThemeColorOverrides(data?.value), error: null };
}

export async function resetThemeColorOverrides(themeId) {
  const { data: current, error: fetchError } = await fetchThemeColorOverrides();
  if (fetchError) return { data: null, error: fetchError };

  const next = {
    ...current,
    [themeId]: {},
  };

  return saveThemeColorOverrides(next);
}
