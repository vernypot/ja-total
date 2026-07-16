import { sb } from '../../services/supabase';
import { memberDisplayName, MIEMBRO_NAME_FIELDS } from '../../utils/memberDisplayName';

export const UNIDAD_ROLES = [
  'capitan',
  'sub_capitan',
  'secretario',
  'tesorero',
  'consejero',
  'miembro',
];

export const LEADERSHIP_ROLES = [
  'capitan',
  'sub_capitan',
  'secretario',
  'tesorero',
];

const UNIDAD_BASE_SELECTS = [
  'id, club_id, nombre, descripcion, genero, orden, estado, created_at, updated_at',
  'id, club_id, nombre, descripcion, genero, created_at, updated_at',
  'id, club_id, nombre, descripcion, genero, created_at',
  'id, club_id, nombre, created_at',
];

const ASSIGNMENT_SELECTS = [
  'id, unidad_id, miembro_id, rol',
  'id, unidad_id, miembro_id, rol, created_at',
  `id, unidad_id, miembro_id, rol, created_at,
    miembros ( id, ${MIEMBRO_NAME_FIELDS}, genero, estado )`,
  `id, unidad_id, miembro_id, rol, created_at,
    miembros ( id, ${MIEMBRO_NAME_FIELDS}, estado )`,
];

function isMissingColumnError(error, column) {
  const msg = error?.message || '';
  return msg.includes(`${column} does not exist`) || msg.includes(`Could not find the '${column}' column`);
}

function isSchemaMismatchError(error) {
  const msg = error?.message || '';
  return msg.includes('does not exist') || msg.includes('Could not find');
}

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

function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}

export function normalizeMemberGenderForUnidad(genero) {
  const value = String(genero || '').trim().toUpperCase();
  if (['M', 'MASCULINO', 'MALE', 'H', 'HOMBRE'].includes(value)) return 'M';
  if (['F', 'FEMENINO', 'FEMALE', 'MUJER'].includes(value)) return 'F';
  return null;
}

export function genderLabel(genero, t) {
  if (genero === 'M') return t('unidadGenderMale');
  if (genero === 'F') return t('unidadGenderFemale');
  return t('notAvailable');
}

export function roleLabel(rol, t) {
  const key = `unidadRole_${rol}`;
  return t(key) || rol;
}

export function normalizeAssignmentRow(row) {
  return {
    id: row.id,
    unidad_id: row.unidad_id,
    miembro_id: row.miembro_id,
    rol: row.rol || 'miembro',
    miembros: row.miembros || null,
  };
}

export function normalizeUnidadRow(row, assignments = null) {
  if (!row) return row;
  const embedded = (row.miembro_unidad || []).map(normalizeAssignmentRow);
  const merged = assignments ?? embedded;
  return {
    ...row,
    genero: row.genero || null,
    estado: row.estado || 'activo',
    miembro_unidad: merged,
  };
}

async function fetchUnidadRowsViaRpc(clubId) {
  const { data, error } = await sb.rpc('admin_list_unidades_by_club', { p_club_id: clubId });
  if (!error) {
    return { data: data || [], error: null };
  }

  const msg = error.message || '';
  if (msg.includes('admin_list_unidades_by_club') && msg.includes('does not exist')) {
    return { data: null, error: null };
  }

  return { data: null, error };
}

async function fetchAssignmentsForClubViaRpc(clubId) {
  const { data, error } = await sb.rpc('admin_list_miembro_unidad_for_club', { p_club_id: clubId });
  if (!error) {
    return { data: (data || []).map(normalizeAssignmentRow), error: null };
  }

  const msg = error.message || '';
  if (msg.includes('admin_list_miembro_unidad_for_club') && msg.includes('does not exist')) {
    return { data: null, error: null };
  }

  return { data: null, error };
}

async function fetchUnidadRows(clubId, showInactive) {
  let lastError = null;

  for (const select of UNIDAD_BASE_SELECTS) {
    const hasEstadoColumn = select.includes('estado');
    const filterAttempts = hasEstadoColumn && !showInactive
      ? [
          query => query.eq('estado', 'activo'),
          query => query,
        ]
      : [query => query];

    for (let filterIndex = 0; filterIndex < filterAttempts.length; filterIndex += 1) {
      const applyFilter = filterAttempts[filterIndex];
      const isLastFilter = filterIndex === filterAttempts.length - 1;

      let query = sb
        .from('unidades')
        .select(select)
        .eq('club_id', clubId);

      if (select.includes('orden')) {
        query = query.order('orden', { ascending: true }).order('nombre', { ascending: true });
      } else {
        query = query.order('nombre', { ascending: true });
      }

      query = applyFilter(query);
      const { data, error } = await query;

      if (!error) {
        const rows = data || [];
        if (rows.length > 0 || isLastFilter) {
          const filtered = showInactive
            ? rows
            : rows.filter(row => {
              const estado = String(row.estado || 'activo').toLowerCase();
              return estado === 'activo';
            });
          return { data: filtered, error: null };
        }
        continue;
      }

      lastError = error;

      if (isMissingRelationError(error, 'unidades')) {
        return { data: [], error: null };
      }

      if (isSchemaMismatchError(error)) {
        break;
      }

      return { data: [], error };
    }
  }

  return { data: [], error: lastError };
}

async function fetchAssignmentsForUnidadIds(unidadIds) {
  if (!unidadIds?.length) return { data: [], error: null };

  for (const select of ASSIGNMENT_SELECTS) {
    const { data, error } = await sb
      .from('miembro_unidad')
      .select(select)
      .in('unidad_id', unidadIds);

    if (!error) {
      return { data: (data || []).map(normalizeAssignmentRow), error: null };
    }

    if (isMissingRelationError(error, 'miembro_unidad')) {
      return { data: [], error: null };
    }

    if (isSchemaMismatchError(error)) {
      continue;
    }

    return { data: [], error: null };
  }

  return { data: [], error: null };
}

function groupAssignmentsByUnidad(assignments) {
  const grouped = {};
  for (const row of assignments || []) {
    if (!row.unidad_id) continue;
    if (!grouped[row.unidad_id]) grouped[row.unidad_id] = [];
    grouped[row.unidad_id].push(row);
  }
  return grouped;
}

export async function fetchUnidadesByClub(clubId, { showInactive = false } = {}) {
  if (!clubId) return { data: [], error: null };

  let rows = [];
  let loadError = null;
  let rpcSucceeded = false;

  if (!showInactive) {
    const rpcResult = await fetchUnidadRowsViaRpc(clubId);
    if (rpcResult.error) {
      loadError = rpcResult.error;
    } else if (rpcResult.data !== null) {
      rpcSucceeded = true;
      rows = rpcResult.data;
    }
  }

  if (!rows.length && !rpcSucceeded) {
    const directResult = await fetchUnidadRows(clubId, showInactive);
    if (directResult.data?.length) {
      rows = directResult.data;
      loadError = null;
    } else if (directResult.error && !loadError) {
      loadError = directResult.error;
    } else if (!loadError) {
      rows = directResult.data || [];
    }
  }

  if (!rows.length) {
    return { data: [], error: loadError };
  }

  let assignments = [];
  const rpcAssignments = await fetchAssignmentsForClubViaRpc(clubId);
  if (rpcAssignments.data) {
    assignments = rpcAssignments.data;
  } else {
    const unidadIds = rows.map(row => row.id);
    const directAssignments = await fetchAssignmentsForUnidadIds(unidadIds);
    assignments = directAssignments.data || [];
  }

  const grouped = groupAssignmentsByUnidad(assignments);
  const data = rows.map(row => normalizeUnidadRow(row, grouped[row.id] || []));

  return { data, error: null };
}

export function attachMembersToUnidadAssignments(unidades, membersById = {}) {
  return (unidades || []).map(unidad => ({
    ...unidad,
    miembro_unidad: (unidad.miembro_unidad || []).map(row => ({
      ...row,
      miembros: row.miembros || membersById[row.miembro_id] || null,
    })),
  }));
}

export async function fetchClubMembersForUnidades(clubId) {
  if (!clubId) return { data: [], error: null };

  const attempts = [
    `miembros ( id, ${MIEMBRO_NAME_FIELDS}, genero, estado )`,
    `miembros ( id, ${MIEMBRO_NAME_FIELDS}, estado )`,
    `miembros ( id, ${MIEMBRO_NAME_FIELDS} )`,
  ];

  for (const memberSelect of attempts) {
    const { data, error } = await sb
      .from('miembro_club')
      .select(memberSelect)
      .eq('club_id', clubId);

    if (!error) {
      const members = (data || [])
        .map(row => row.miembros)
        .filter(member => member && (member.estado == null || member.estado === 'activo'))
        .sort((a, b) => memberDisplayName(a).localeCompare(memberDisplayName(b), undefined, { sensitivity: 'base' }));
      return { data: members, error: null };
    }

    if (isMissingColumnError(error, 'genero') || isMissingColumnError(error, 'estado')) {
      continue;
    }

    return { data: [], error };
  }

  return { data: [], error: null };
}

export async function createUnidad({ clubId, nombre, genero, descripcion = null }) {
  const { data, error } = await sb.rpc('admin_create_unidad', {
    p_club_id: clubId,
    p_nombre: nombre,
    p_genero: genero,
    p_descripcion: descripcion,
  });

  if (!error) return { data, error: null };

  const msg = error.message || '';
  if (!msg.includes('admin_create_unidad') && !msg.includes('does not exist')) {
    return { data: null, error };
  }

  const payload = {
    club_id: clubId,
    nombre: nombre?.trim(),
    genero,
    descripcion: descripcion?.trim() || null,
  };

  const direct = await sb.from('unidades').insert(payload).select('*').single();
  return direct;
}

export async function updateUnidad(unidadId, { nombre, genero, descripcion, orden, estado } = {}) {
  const { data, error } = await sb.rpc('admin_update_unidad', {
    p_unidad_id: unidadId,
    p_nombre: nombre ?? null,
    p_genero: genero ?? null,
    p_descripcion: descripcion ?? null,
    p_orden: orden ?? null,
    p_estado: estado ?? null,
  });

  if (!error) return { data, error: null };

  const msg = error.message || '';
  if (!msg.includes('admin_update_unidad') && !msg.includes('does not exist')) {
    return { data: null, error };
  }

  const payload = {};
  if (nombre !== undefined) payload.nombre = nombre?.trim();
  if (genero !== undefined) payload.genero = genero;
  if (descripcion !== undefined) payload.descripcion = descripcion?.trim() || null;
  if (orden !== undefined) payload.orden = orden;
  if (estado !== undefined) payload.estado = estado;
  payload.updated_at = new Date().toISOString();

  return sb.from('unidades').update(payload).eq('id', unidadId).select('*').single();
}

export async function deactivateUnidad(unidadId) {
  return updateUnidad(unidadId, { estado: 'inactivo' });
}

async function clearOtherUnidadAssignments({ miembroId, unidadId }) {
  const { data: unidad, error: unidadError } = await sb
    .from('unidades')
    .select('club_id')
    .eq('id', unidadId)
    .maybeSingle();

  if (unidadError || !unidad?.club_id) return { error: unidadError || null };

  const { data: clubUnidades, error: listError } = await sb
    .from('unidades')
    .select('id')
    .eq('club_id', unidad.club_id);

  if (listError) return { error: listError };

  const otherUnidadIds = (clubUnidades || [])
    .map(row => row.id)
    .filter(id => id !== unidadId);

  if (!otherUnidadIds.length) return { error: null };

  return sb
    .from('miembro_unidad')
    .delete()
    .eq('miembro_id', miembroId)
    .in('unidad_id', otherUnidadIds);
}

async function clearUnidadLeadershipRoleDirect(unidadId, rol, keepMiembroUnidadId = null) {
  if (!LEADERSHIP_ROLES.includes(rol)) return { error: null };

  let query = sb
    .from('miembro_unidad')
    .update({ rol: 'miembro', updated_at: new Date().toISOString() })
    .eq('unidad_id', unidadId)
    .eq('rol', rol);

  if (keepMiembroUnidadId) {
    query = query.neq('id', keepMiembroUnidadId);
  }

  return query;
}

async function assignMiembroToUnidadDirect({ unidadId, miembroId, rol = 'miembro' }) {
  const { error: clearError } = await clearOtherUnidadAssignments({ miembroId, unidadId });
  if (clearError) return { data: null, error: clearError };

  await clearUnidadLeadershipRoleDirect(unidadId, rol);

  const { data: existing, error: findError } = await sb
    .from('miembro_unidad')
    .select('id')
    .eq('unidad_id', unidadId)
    .eq('miembro_id', miembroId)
    .maybeSingle();

  if (findError) return { data: null, error: findError };

  if (existing?.id) {
    return sb
      .from('miembro_unidad')
      .update({ rol, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single();
  }

  return sb
    .from('miembro_unidad')
    .insert({
      unidad_id: unidadId,
      miembro_id: miembroId,
      rol,
      fecha_inicio: todayISO(),
    })
    .select('*')
    .single();
}

export async function assignMiembroToUnidad({ unidadId, miembroId, rol = 'miembro' }) {
  const { data, error } = await sb.rpc('admin_assign_miembro_unidad', {
    p_unidad_id: unidadId,
    p_miembro_id: miembroId,
    p_rol: rol,
  });

  if (!error) return { data, error: null };

  const msg = error.message || '';
  const isMissingRpc = msg.includes('admin_assign_miembro_unidad') && msg.includes('does not exist');
  const isConflictSpecError = msg.includes('ON CONFLICT') || msg.includes('exclusion constraint');
  const isMoveBlocked = msg.includes('already assigned to another unit');
  const isLeadershipUniqueViolation = msg.includes('uq_miembro_unidad_');

  if (!isMissingRpc && !isConflictSpecError && !isMoveBlocked && !isLeadershipUniqueViolation) {
    return { data: null, error };
  }

  return assignMiembroToUnidadDirect({ unidadId, miembroId, rol });
}

async function setMiembroUnidadRolDirect(miembroUnidadId, rol) {
  const { data: row, error: rowError } = await sb
    .from('miembro_unidad')
    .select('id, unidad_id')
    .eq('id', miembroUnidadId)
    .maybeSingle();

  if (rowError) return { data: null, error: rowError };
  if (!row?.unidad_id) return { data: null, error: rowError || new Error('unit member assignment not found') };

  const { error: clearError } = await clearUnidadLeadershipRoleDirect(row.unidad_id, rol, miembroUnidadId);
  if (clearError) return { data: null, error: clearError };

  return sb
    .from('miembro_unidad')
    .update({ rol, updated_at: new Date().toISOString() })
    .eq('id', miembroUnidadId)
    .select('*')
    .single();
}

export async function setMiembroUnidadRol(miembroUnidadId, rol) {
  const { data, error } = await sb.rpc('admin_set_miembro_unidad_rol', {
    p_miembro_unidad_id: miembroUnidadId,
    p_rol: rol,
  });

  if (!error) return { data, error: null };

  const msg = error.message || '';
  const isMissingRpc = msg.includes('admin_set_miembro_unidad_rol') && msg.includes('does not exist');
  const isLeadershipUniqueViolation = msg.includes('uq_miembro_unidad_');

  if (!isMissingRpc && !isLeadershipUniqueViolation) {
    return { data: null, error };
  }

  return setMiembroUnidadRolDirect(miembroUnidadId, rol);
}

export async function removeMiembroFromUnidad(miembroUnidadId) {
  const { error } = await sb.rpc('admin_remove_miembro_unidad', {
    p_miembro_unidad_id: miembroUnidadId,
  });

  if (!error) return { error: null };

  const msg = error.message || '';
  if (!msg.includes('admin_remove_miembro_unidad') && !msg.includes('does not exist')) {
    return { error };
  }

  return sb.from('miembro_unidad').delete().eq('id', miembroUnidadId);
}

export function getAssignedMemberIds(unidades) {
  const ids = new Set();
  for (const unidad of unidades || []) {
    for (const row of unidad.miembro_unidad || []) {
      if (row.miembro_id) ids.add(row.miembro_id);
    }
  }
  return ids;
}

export function memberMatchesUnidadGender(member, unidadGenero) {
  const memberGender = normalizeMemberGenderForUnidad(member?.genero);
  return Boolean(memberGender && unidadGenero && memberGender === unidadGenero);
}

export function getUnidadCaptainName(unidad, memberDisplayNameFn = memberDisplayName) {
  const captain = (unidad?.miembro_unidad || []).find(row => row.rol === 'capitan');
  const member = captain?.miembros;
  if (!member) return '';
  return memberDisplayNameFn(member);
}

export function memberDisplayNameFromRow(member) {
  return memberDisplayName(member);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
