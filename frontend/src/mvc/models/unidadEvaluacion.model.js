import { sb } from '../../services/supabase';
import { DEFAULT_UNIDAD_EVAL_CONFIG, normalizeEvalConfig } from '../../utils/unidadEvaluacion';
import * as EventosModel from './eventos.model';

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

function parseEvalPayload(data) {
  let payload = data;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = null;
    }
  }

  if (!payload || typeof payload !== 'object') {
    return {
      config: { ...DEFAULT_UNIDAD_EVAL_CONFIG },
      items: [],
      cantidades: [],
    };
  }

  return {
    config: normalizeEvalConfig(payload.config || DEFAULT_UNIDAD_EVAL_CONFIG),
    items: Array.isArray(payload.items) ? payload.items : [],
    cantidades: Array.isArray(payload.cantidades) ? payload.cantidades : [],
  };
}

export async function fetchClubUnidadEval(clubId) {
  if (!clubId) {
    return {
      data: { config: { ...DEFAULT_UNIDAD_EVAL_CONFIG }, items: [], cantidades: [] },
      error: null,
    };
  }

  const { data, error } = await sb.rpc('admin_get_club_unidad_eval', { p_club_id: clubId });
  if (!error) {
    return { data: parseEvalPayload(data), error: null };
  }

  if (!isMissingRpcError(error, 'admin_get_club_unidad_eval')) {
    return { data: null, error };
  }

  return fetchClubUnidadEvalDirect(clubId);
}

async function fetchClubUnidadEvalDirect(clubId) {
  const configResult = await sb
    .from('club_unidad_eval_config')
    .select(`
      confirmacion_activa, confirmacion_puntos,
      a_tiempo_activa, a_tiempo_puntos,
      tarde_activa, tarde_puntos,
      ausente_injustificada_activa, ausente_injustificada_puntos,
      ausente_justificada_activa, ausente_justificada_puntos,
      cuota_activa, cuota_puntos
    `)
    .eq('club_id', clubId)
    .maybeSingle();

  if (configResult.error && !isMissingRelationError(configResult.error, 'club_unidad_eval_config')) {
    return { data: null, error: configResult.error };
  }

  const itemsResult = await sb
    .from('club_unidad_eval_item')
    .select('id, club_id, nombre, descripcion, puntos, orden, estado')
    .eq('club_id', clubId)
    .eq('estado', 'activo')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });

  if (itemsResult.error && !isMissingRelationError(itemsResult.error, 'club_unidad_eval_item')) {
    return { data: null, error: itemsResult.error };
  }

  const cantidadesResult = await sb
    .from('unidad_eval_item_cantidad')
    .select('id, unidad_id, eval_item_id, cantidad, unidades!inner(club_id)')
    .eq('unidades.club_id', clubId);

  if (cantidadesResult.error && !isMissingRelationError(cantidadesResult.error, 'unidad_eval_item_cantidad')) {
    return { data: null, error: cantidadesResult.error };
  }

  return {
    data: {
      config: normalizeEvalConfig(configResult.data || DEFAULT_UNIDAD_EVAL_CONFIG),
      items: itemsResult.data || [],
      cantidades: (cantidadesResult.data || []).map(row => ({
        id: row.id,
        unidad_id: row.unidad_id,
        eval_item_id: row.eval_item_id,
        cantidad: row.cantidad,
      })),
    },
    error: null,
  };
}

export async function saveClubUnidadEvalConfig(clubId, config) {
  const normalized = normalizeEvalConfig(config);
  const { error } = await sb.rpc('admin_save_club_unidad_eval_config', {
    p_club_id: clubId,
    p_confirmacion_activa: normalized.confirmacion_activa,
    p_confirmacion_puntos: normalized.confirmacion_puntos,
    p_a_tiempo_activa: normalized.a_tiempo_activa,
    p_a_tiempo_puntos: normalized.a_tiempo_puntos,
    p_tarde_activa: normalized.tarde_activa,
    p_tarde_puntos: normalized.tarde_puntos,
    p_ausente_injustificada_activa: normalized.ausente_injustificada_activa,
    p_ausente_injustificada_puntos: normalized.ausente_injustificada_puntos,
    p_ausente_justificada_activa: normalized.ausente_justificada_activa,
    p_ausente_justificada_puntos: normalized.ausente_justificada_puntos,
    p_cuota_activa: normalized.cuota_activa,
    p_cuota_puntos: normalized.cuota_puntos,
  });

  if (!error) return { error: null };

  if (!isMissingRpcError(error, 'admin_save_club_unidad_eval_config')) {
    return { error };
  }

  return sb.from('club_unidad_eval_config').upsert({
    club_id: clubId,
    ...normalized,
    updated_at: new Date().toISOString(),
  });
}

export async function upsertClubUnidadEvalItem({
  clubId,
  itemId = null,
  nombre,
  descripcion = null,
  puntos = 0,
  orden = 0,
}) {
  const { data, error } = await sb.rpc('admin_upsert_club_unidad_eval_item', {
    p_item_id: itemId,
    p_club_id: clubId,
    p_nombre: nombre,
    p_descripcion: descripcion,
    p_puntos: puntos,
    p_orden: orden,
  });

  if (!error) return { data: { id: data }, error: null };

  if (!isMissingRpcError(error, 'admin_upsert_club_unidad_eval_item')) {
    return { data: null, error };
  }

  const payload = {
    club_id: clubId,
    nombre: nombre?.trim(),
    descripcion: descripcion?.trim() || null,
    puntos,
    orden,
    estado: 'activo',
    updated_at: new Date().toISOString(),
  };

  if (itemId) {
    return sb.from('club_unidad_eval_item').update(payload).eq('id', itemId).select('id').single();
  }

  return sb.from('club_unidad_eval_item').insert(payload).select('id').single();
}

export async function deactivateClubUnidadEvalItem(itemId) {
  const { error } = await sb.rpc('admin_deactivate_club_unidad_eval_item', {
    p_item_id: itemId,
  });

  if (!error) return { error: null };

  if (!isMissingRpcError(error, 'admin_deactivate_club_unidad_eval_item')) {
    return { error };
  }

  return sb
    .from('club_unidad_eval_item')
    .update({ estado: 'inactivo', updated_at: new Date().toISOString() })
    .eq('id', itemId);
}

export async function setUnidadEvalItemCantidad({ unidadId, evalItemId, cantidad }) {
  const { error } = await sb.rpc('admin_set_unidad_eval_item_cantidad', {
    p_unidad_id: unidadId,
    p_eval_item_id: evalItemId,
    p_cantidad: cantidad,
  });

  if (!error) return { error: null };

  if (!isMissingRpcError(error, 'admin_set_unidad_eval_item_cantidad')) {
    return { error };
  }

  return sb.from('unidad_eval_item_cantidad').upsert({
    unidad_id: unidadId,
    eval_item_id: evalItemId,
    cantidad,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'unidad_id,eval_item_id' });
}

export async function fetchClubMemberEventRowsForEval(clubId, memberIds) {
  if (!clubId || !memberIds?.length) return { data: [], error: null };

  const selects = [
    `id, evento_id, miembro_id, cuota_pagada, confirmacion_estado,
     evento_asistencia ( id, estado, justificada, checked_in_at ),
     eventos!inner (
       id, club_id, nombre, fecha, hora, estado, cuota_aplica,
       excluir_registro_asistencia, asistencia_grupo_id, requiere_confirmacion,
       clubes ( iglesias ( timezone ) )
     )`,
    `id, evento_id, miembro_id, cuota_pagada, confirmacion_estado,
     evento_asistencia ( id, estado, checked_in_at ),
     eventos!inner (
       id, club_id, nombre, fecha, hora, estado, cuota_aplica,
       excluir_registro_asistencia, asistencia_grupo_id, requiere_confirmacion,
       clubes ( iglesias ( timezone ) )
     )`,
    `id, evento_id, miembro_id,
     evento_asistencia ( id, estado, checked_in_at ),
     eventos!inner ( id, club_id, fecha, hora, estado )`,
  ];

  for (const select of selects) {
    const { data, error } = await sb
      .from('evento_miembro')
      .select(select)
      .eq('eventos.club_id', clubId)
      .in('miembro_id', memberIds);

    if (!error) {
      return {
        data: EventosModel.filterRowsForMemberAttendanceStats(data || []),
        error: null,
      };
    }

    const msg = error?.message || '';
    if (msg.includes('does not exist') || msg.includes('Could not find')) {
      continue;
    }

    return { data: [], error };
  }

  return { data: [], error: null };
}
