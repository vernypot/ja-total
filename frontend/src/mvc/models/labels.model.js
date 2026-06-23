import { sb } from '../../services/supabase';

export async function fetchSystemLabels() {
  return sb.from('system_labels').select('*').order('label_key', { ascending: true });
}

export async function createSystemLabel(label) {
  return sb.from('system_labels').insert([label]);
}

export async function updateSystemLabel(id, { label_es, label_en }) {
  return sb.from('system_labels').update({
    label_es,
    label_en,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
}

export async function deleteSystemLabel(id) {
  return sb.from('system_labels').delete().eq('id', id);
}

export async function bulkCreateSystemLabels(labels) {
  return sb.from('system_labels').insert(labels);
}
