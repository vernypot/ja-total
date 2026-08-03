import { sb } from '../../services/supabase';
import { buildReglamentoNodosMap } from '../../utils/reglamento';

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

function parseReglamentoPayload(data) {
  let payload = data;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = null;
    }
  }

  if (!payload || typeof payload !== 'object') {
    return { nodos: [], infracciones: [] };
  }

  return {
    nodos: Array.isArray(payload.nodos) ? payload.nodos : [],
    infracciones: Array.isArray(payload.infracciones) ? payload.infracciones : [],
  };
}

export async function fetchClubReglamento(clubId) {
  if (!clubId) {
    return { data: { nodos: [], infracciones: [] }, error: null, schemaAvailable: true };
  }

  const { data, error } = await sb.rpc('admin_get_club_reglamento', { p_club_id: clubId });
  if (!error) {
    return { data: parseReglamentoPayload(data), error: null, schemaAvailable: true };
  }

  if (!isMissingRpcError(error, 'admin_get_club_reglamento')) {
    if (isMissingRelationError(error, 'club_reglamento_nodo')) {
      return { data: { nodos: [], infracciones: [] }, error: null, schemaAvailable: false };
    }
    return { data: null, error, schemaAvailable: true };
  }

  return fetchClubReglamentoDirect(clubId);
}

async function fetchClubReglamentoDirect(clubId) {
  const nodosResult = await sb
    .from('club_reglamento_nodo')
    .select('id, club_id, parent_id, nivel, titulo, descripcion, puntos_penalizacion, orden, estado')
    .eq('club_id', clubId)
    .eq('estado', 'activo')
    .order('nivel', { ascending: true })
    .order('orden', { ascending: true })
    .order('titulo', { ascending: true });

  if (nodosResult.error) {
    if (isMissingRelationError(nodosResult.error, 'club_reglamento_nodo')) {
      return { data: { nodos: [], infracciones: [] }, error: null, schemaAvailable: false };
    }
    return { data: null, error: nodosResult.error, schemaAvailable: true };
  }

  const infraccionesResult = await sb
    .from('unidad_reglamento_infraccion')
    .select('id, unidad_id, reglamento_nodo_id, cantidad, fecha, notas, unidades!inner(club_id)')
    .eq('unidades.club_id', clubId)
    .order('fecha', { ascending: false });

  if (infraccionesResult.error && !isMissingRelationError(infraccionesResult.error, 'unidad_reglamento_infraccion')) {
    return { data: null, error: infraccionesResult.error, schemaAvailable: true };
  }

  return {
    data: {
      nodos: nodosResult.data || [],
      infracciones: (infraccionesResult.data || []).map(row => ({
        id: row.id,
        unidad_id: row.unidad_id,
        reglamento_nodo_id: row.reglamento_nodo_id,
        cantidad: row.cantidad,
        fecha: row.fecha,
        notas: row.notas,
      })),
    },
    error: null,
    schemaAvailable: true,
  };
}

export async function fetchPortalReglamento(sessionToken, clubId) {
  if (!sessionToken || !clubId) {
    return { data: { nodos: [] }, error: null };
  }

  const { data, error } = await sb.rpc('member_portal_fetch_reglamento', {
    p_session_token: sessionToken,
    p_club_id: clubId,
  });

  if (error) {
    return { data: null, error };
  }

  const payload = parseReglamentoPayload(data);
  return { data: { nodos: payload.nodos }, error: null };
}

export async function upsertReglamentoNodo({
  nodoId = null,
  clubId,
  parentId = null,
  titulo,
  descripcion = null,
  puntosPenalizacion = 0,
  orden = 0,
}) {
  const { data, error } = await sb.rpc('admin_upsert_reglamento_nodo', {
    p_nodo_id: nodoId,
    p_club_id: clubId,
    p_parent_id: parentId,
    p_titulo: titulo,
    p_descripcion: descripcion,
    p_puntos_penalizacion: puntosPenalizacion,
    p_orden: orden,
  });

  if (!error) return { data: { id: data }, error: null };

  if (!isMissingRpcError(error, 'admin_upsert_reglamento_nodo')) {
    return { data: null, error };
  }

  const payload = {
    club_id: clubId,
    parent_id: parentId,
    nivel: parentId ? 2 : 1,
    titulo: titulo?.trim(),
    descripcion: descripcion?.trim() || null,
    puntos_penalizacion: puntosPenalizacion,
    orden,
    estado: 'activo',
    updated_at: new Date().toISOString(),
  };

  if (nodoId) {
    return sb.from('club_reglamento_nodo').update(payload).eq('id', nodoId).select('id').single();
  }

  return sb.from('club_reglamento_nodo').insert(payload).select('id').single();
}

export async function deactivateReglamentoNodo(nodoId) {
  const { error } = await sb.rpc('admin_deactivate_reglamento_nodo', { p_nodo_id: nodoId });
  if (!error) return { error: null };

  if (!isMissingRpcError(error, 'admin_deactivate_reglamento_nodo')) {
    return { error };
  }

  return sb
    .from('club_reglamento_nodo')
    .update({ estado: 'inactivo', updated_at: new Date().toISOString() })
    .eq('id', nodoId);
}

export async function upsertUnidadInfraccion({
  infraccionId = null,
  unidadId,
  reglamentoNodoId,
  cantidad = 1,
  fecha = null,
  notas = null,
}) {
  const { data, error } = await sb.rpc('admin_upsert_unidad_infraccion', {
    p_infraccion_id: infraccionId,
    p_unidad_id: unidadId,
    p_reglamento_nodo_id: reglamentoNodoId,
    p_cantidad: cantidad,
    p_fecha: fecha,
    p_notas: notas,
  });

  if (!error) return { data: { id: data }, error: null };

  if (!isMissingRpcError(error, 'admin_upsert_unidad_infraccion')) {
    return { data: null, error };
  }

  const payload = {
    unidad_id: unidadId,
    reglamento_nodo_id: reglamentoNodoId,
    cantidad,
    fecha: fecha || new Date().toISOString().slice(0, 10),
    notas: notas?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (infraccionId) {
    return sb.from('unidad_reglamento_infraccion').update(payload).eq('id', infraccionId).select('id').single();
  }

  return sb.from('unidad_reglamento_infraccion').insert(payload).select('id').single();
}

export async function removeUnidadInfraccion(infraccionId) {
  const { error } = await sb.rpc('admin_remove_unidad_infraccion', { p_infraccion_id: infraccionId });
  if (!error) return { error: null };

  if (!isMissingRpcError(error, 'admin_remove_unidad_infraccion')) {
    return { error };
  }

  return sb.from('unidad_reglamento_infraccion').delete().eq('id', infraccionId);
}

export function getReglamentoMaps(nodos) {
  return buildReglamentoNodosMap(nodos);
}
