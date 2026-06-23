import { sb } from '../../services/supabase';

export function normalizePageHelpContent(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const title = String(raw.title || '').trim();
  const overview = String(raw.overview || '').trim();
  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .map(step => String(step).trim())
    .filter(Boolean);
  const fields = (Array.isArray(raw.fields) ? raw.fields : [])
    .map(field => ({
      name: String(field?.name || '').trim(),
      description: String(field?.description || '').trim(),
    }))
    .filter(field => field.name || field.description);
  const tips = (Array.isArray(raw.tips) ? raw.tips : [])
    .map(tip => String(tip).trim())
    .filter(Boolean);

  if (!title && !overview && !steps.length && !fields.length && !tips.length) {
    return null;
  }

  return { title, overview, steps, fields, tips };
}

export function contentToForm(content) {
  const normalized = normalizePageHelpContent(content) || {};
  return {
    title: normalized.title || '',
    overview: normalized.overview || '',
    stepsText: (normalized.steps || []).join('\n'),
    fields: normalized.fields?.length
      ? normalized.fields.map(field => ({ ...field }))
      : [{ name: '', description: '' }],
    tipsText: (normalized.tips || []).join('\n'),
  };
}

export function formToContent(form) {
  return normalizePageHelpContent({
    title: form.title,
    overview: form.overview,
    steps: String(form.stepsText || '').split('\n'),
    fields: (form.fields || []).filter(field => field.name?.trim() || field.description?.trim()),
    tips: String(form.tipsText || '').split('\n'),
  });
}

function overrideKey(pageId, language) {
  return `${pageId}:${language}`;
}

export function mapPageHelpRows(rows = []) {
  const map = {};
  for (const row of rows) {
    const content = normalizePageHelpContent(row.content);
    if (content) {
      map[overrideKey(row.page_id, row.language)] = content;
    }
  }
  return map;
}

export async function fetchPageHelpOverrides() {
  const { data, error } = await sb
    .from('page_help')
    .select('page_id, language, content, updated_at')
    .order('page_id', { ascending: true });

  if (error) {
    if (error.message?.includes('page_help') && error.message?.includes('does not exist')) {
      return { data: {}, error: null, tableMissing: true };
    }
    return { data: {}, error };
  }

  return { data: mapPageHelpRows(data), error: null, tableMissing: false };
}

export async function upsertPageHelp(pageId, language, content) {
  const normalized = normalizePageHelpContent(content);
  if (!normalized) {
    return { data: null, error: new Error('Invalid help content') };
  }

  const payload = {
    page_id: pageId,
    language,
    content: normalized,
    updated_at: new Date().toISOString(),
  };

  return sb
    .from('page_help')
    .upsert(payload, { onConflict: 'page_id,language' })
    .select('page_id, language, content, updated_at')
    .single();
}

export async function deletePageHelpOverride(pageId, language) {
  return sb
    .from('page_help')
    .delete()
    .eq('page_id', pageId)
    .eq('language', language);
}
