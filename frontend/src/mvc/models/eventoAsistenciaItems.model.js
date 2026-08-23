import { sb } from '../../services/supabase';
import { sanitizeAsistenciaItemsForSave } from '../../utils/eventoAsistenciaItems';

function isMissingTableError(error, table) {
  const msg = error?.message || '';
  return msg.includes(table) && (msg.includes('does not exist') || msg.includes('Could not find'));
}

async function replaceRows(table, filterColumn, filterId, items) {
  const { error: deleteError } = await sb
    .from(table)
    .delete()
    .eq(filterColumn, filterId);
  if (deleteError) {
    if (isMissingTableError(deleteError, table)) {
      return { data: [], error: null, skipped: true };
    }
    return { data: null, error: deleteError };
  }

  const rows = sanitizeAsistenciaItemsForSave(items);
  if (!rows.length) return { data: [], error: null };

  const payload = rows.map(row => ({
    [filterColumn]: filterId,
    orden: row.orden,
    tipo: row.tipo,
    etiqueta: row.etiqueta,
    detalle: row.detalle || null,
  }));

  const { data, error } = await sb.from(table).insert(payload).select();
  if (error && isMissingTableError(error, table)) {
    return { data: [], error: null, skipped: true };
  }
  return { data: data || [], error };
}

export async function fetchEventoAsistenciaItems(eventoId) {
  if (!eventoId) return { data: [], error: null };

  const { data, error } = await sb
    .from('evento_asistencia_item')
    .select('id, evento_id, orden, tipo, etiqueta, detalle')
    .eq('evento_id', eventoId)
    .order('orden', { ascending: true });

  if (error && isMissingTableError(error, 'evento_asistencia_item')) {
    return { data: [], error: null };
  }
  return { data: data || [], error };
}

export async function fetchEventoAsistenciaItemsByEventIds(eventoIds = []) {
  const ids = [...new Set((eventoIds || []).filter(Boolean))];
  if (!ids.length) return { data: [], error: null };

  const { data, error } = await sb
    .from('evento_asistencia_item')
    .select('id, evento_id, orden, tipo, etiqueta, detalle')
    .in('evento_id', ids)
    .order('orden', { ascending: true });

  if (error && isMissingTableError(error, 'evento_asistencia_item')) {
    return { data: [], error: null };
  }
  return { data: data || [], error };
}

export async function saveEventoAsistenciaItems(eventoId, items) {
  if (!eventoId) return { data: [], error: null };
  return replaceRows('evento_asistencia_item', 'evento_id', eventoId, items);
}

export async function fetchPlanReunionAsistenciaItems(reunionIds = []) {
  const ids = [...new Set((reunionIds || []).filter(Boolean))];
  if (!ids.length) return { data: [], error: null };

  const { data, error } = await sb
    .from('plan_reunion_asistencia_item')
    .select('id, reunion_id, orden, tipo, etiqueta, detalle')
    .in('reunion_id', ids)
    .order('orden', { ascending: true });

  if (error && isMissingTableError(error, 'plan_reunion_asistencia_item')) {
    return { data: [], error: null };
  }
  return { data: data || [], error };
}

export async function savePlanReunionAsistenciaItems(reunionId, items) {
  if (!reunionId) return { data: [], error: null };
  return replaceRows('plan_reunion_asistencia_item', 'reunion_id', reunionId, items);
}

export async function copyPlanReunionAsistenciaItemsToEvento(reunionId, eventoId) {
  if (!reunionId || !eventoId) return { data: [], error: null };

  const { data: source, error: fetchError } = await fetchPlanReunionAsistenciaItems([reunionId]);
  if (fetchError) return { data: null, error: fetchError };

  return saveEventoAsistenciaItems(
    eventoId,
    (source || []).map(row => ({
      tipo: row.tipo,
      etiqueta: row.etiqueta,
      detalle: row.detalle,
      orden: row.orden,
    }))
  );
}
