import { sb } from '../../services/supabase';

export const USAGE_STAT_DEFINITIONS = [
  { id: 'clubs', metric: 'active_clubs', labelKey: 'landingStatClubs' },
  { id: 'members', metric: 'active_members', labelKey: 'landingStatMembers' },
  { id: 'events', metric: 'events_this_year', labelKey: 'landingStatEvents' },
  { id: 'churches', metric: 'active_churches', labelKey: 'landingStatChurches' },
];

const EMPTY_USAGE = {
  active_clubs: 0,
  active_members: 0,
  active_churches: 0,
  events_this_year: 0,
};

export function formatUsageStatValue(value, language = 'es') {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  return Number(value).toLocaleString(locale);
}

export function buildUsageStatCards(usage, language = 'es') {
  const resolved = usage || EMPTY_USAGE;
  return USAGE_STAT_DEFINITIONS.map(def => ({
    id: def.id,
    value: formatUsageStatValue(resolved[def.metric], language),
    labelKey: def.labelKey,
  }));
}

export async function fetchPublicUsageStats() {
  const rpc = await sb.rpc('fetch_public_usage_stats');
  if (!rpc.error && rpc.data) {
    return { data: { ...EMPTY_USAGE, ...rpc.data }, error: null };
  }

  if (rpc.error && !rpc.error.message?.includes('fetch_public_usage_stats')) {
    return { data: EMPTY_USAGE, error: rpc.error };
  }

  return { data: EMPTY_USAGE, error: rpc.error };
}
