import { sb } from '../../services/supabase';

function isMissingRelationError(error, relation) {
  const msg = error?.message || '';
  const code = error?.code || '';
  if (code === 'PGRST205' || code === '42P01') return true;
  return (
    (msg.includes(`relation "${relation}"`) || msg.includes(`relation "public.${relation}"`))
    && msg.includes('does not exist')
  ) || (
    msg.includes(`Could not find the table 'public.${relation}'`)
    || msg.includes(`Could not find the table '${relation}'`)
  );
}

function isMissingRpcError(error, rpcName) {
  const msg = error?.message || '';
  return msg.includes(rpcName) && msg.includes('does not exist');
}

function parseAjustesPayload(data) {
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function fetchClubMiembroEvalAjustes(clubId) {
  if (!clubId) {
    return { data: [], error: null, schemaAvailable: true };
  }

  const { data, error } = await sb.rpc('admin_get_club_miembro_eval_ajustes', {
    p_club_id: clubId,
  });

  if (!error) {
    return { data: parseAjustesPayload(data), error: null, schemaAvailable: true };
  }

  if (!isMissingRpcError(error, 'admin_get_club_miembro_eval_ajustes')) {
    if (isMissingRelationError(error, 'miembro_eval_ajuste')) {
      return { data: [], error: null, schemaAvailable: false };
    }
    return { data: null, error, schemaAvailable: true };
  }

  return fetchClubMiembroEvalAjustesDirect(clubId);
}

async function fetchClubMiembroEvalAjustesDirect(clubId) {
  const { data, error } = await sb
    .from('miembro_eval_ajuste')
    .select('id, club_id, miembro_id, puntos, fecha, motivo, registrado_por, created_at')
    .eq('club_id', clubId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelationError(error, 'miembro_eval_ajuste')) {
      return { data: [], error: null, schemaAvailable: false };
    }
    return { data: null, error, schemaAvailable: true };
  }

  return { data: data || [], error: null, schemaAvailable: true };
}

export async function addMiembroEvalAjuste({
  clubId,
  miembroId,
  puntos,
  fecha = null,
  motivo,
}) {
  const { data, error } = await sb.rpc('admin_add_miembro_eval_ajuste', {
    p_club_id: clubId,
    p_miembro_id: miembroId,
    p_puntos: puntos,
    p_fecha: fecha,
    p_motivo: motivo,
  });

  if (!error) return { data: { id: data }, error: null };

  if (!isMissingRpcError(error, 'admin_add_miembro_eval_ajuste')) {
    return { data: null, error };
  }

  return sb
    .from('miembro_eval_ajuste')
    .insert({
      club_id: clubId,
      miembro_id: miembroId,
      puntos,
      fecha: fecha || new Date().toISOString().slice(0, 10),
      motivo: motivo?.trim(),
    })
    .select('id')
    .single();
}

export async function addMiembroEvalAjustesBulk({
  clubId,
  miembroIds,
  puntos,
  fecha = null,
  motivo,
}) {
  const ids = [...new Set((miembroIds || []).filter(Boolean))];
  if (!ids.length) {
    return { data: { count: 0 }, error: null };
  }

  const { data, error } = await sb.rpc('admin_add_miembro_eval_ajustes_bulk', {
    p_club_id: clubId,
    p_miembro_ids: ids,
    p_puntos: puntos,
    p_fecha: fecha,
    p_motivo: motivo,
  });

  if (!error) return { data: { count: data }, error: null };

  if (!isMissingRpcError(error, 'admin_add_miembro_eval_ajustes_bulk')) {
    return { data: null, error };
  }

  const rows = ids.map(miembroId => ({
    club_id: clubId,
    miembro_id: miembroId,
    puntos,
    fecha: fecha || new Date().toISOString().slice(0, 10),
    motivo: motivo?.trim(),
  }));

  const result = await sb.from('miembro_eval_ajuste').insert(rows).select('id');
  if (result.error) return result;
  return { data: { count: result.data?.length || 0 }, error: null };
}

export async function removeMiembroEvalAjuste(ajusteId) {
  const { error } = await sb.rpc('admin_remove_miembro_eval_ajuste', {
    p_ajuste_id: ajusteId,
  });
  if (!error) return { error: null };

  if (!isMissingRpcError(error, 'admin_remove_miembro_eval_ajuste')) {
    return { error };
  }

  return sb.from('miembro_eval_ajuste').delete().eq('id', ajusteId);
}
