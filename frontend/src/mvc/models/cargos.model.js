import { sb } from '../../services/supabase';
import { memberDisplayName as resolveMemberDisplayName, MIEMBRO_NAME_FIELDS } from '../../utils/memberDisplayName';
import { fetchTiposClub } from './clases.model';

function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function buildCargoTree(cargos, parentId = null) {
  return (cargos || [])
    .filter(c => (c.parent_id || null) === parentId)
    .sort((a, b) => (a.orden - b.orden) || (a.nombre || '').localeCompare(b.nombre || '', undefined, { sensitivity: 'base' }))
    .map(c => ({
      ...c,
      children: buildCargoTree(cargos, c.id),
    }));
}

export function flattenCargosForSelect(tree, depth = 0) {
  const out = [];
  for (const node of tree || []) {
    const prefix = depth > 0 ? `${'— '.repeat(depth)}` : '';
    out.push({ id: node.id, label: `${prefix}${node.nombre}`, depth, cargo: node });
    if (node.children?.length) {
      out.push(...flattenCargosForSelect(node.children, depth + 1));
    }
  }
  return out;
}

export function getCargoPath(cargoId, cargos) {
  if (!cargoId) return [];
  const byId = new Map((cargos || []).map(c => [c.id, c]));
  const path = [];
  let current = byId.get(cargoId);
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : null;
  }
  return path;
}

export function getDescendantIds(cargoId, cargos) {
  const ids = new Set();
  function walk(parentId) {
    for (const c of cargos || []) {
      if (c.parent_id === parentId) {
        ids.add(c.id);
        walk(c.id);
      }
    }
  }
  walk(cargoId);
  return ids;
}

export function cargoHasActiveChildren(cargoId, cargos) {
  return (cargos || []).some(c => c.parent_id === cargoId && (c.estado || 'activo') === 'activo');
}

export function filterCargosByTipo(cargos, tipoIds = []) {
  if (!tipoIds.length) return cargos || [];
  return (cargos || []).filter(c => !c.tipo_id || tipoIds.includes(c.tipo_id));
}

export function buildCargoSortIndex(cargos) {
  const tree = buildCargoTree(cargos);
  const flat = flattenCargosForSelect(tree);
  const index = new Map();
  flat.forEach((item, i) => index.set(item.id, i));
  return index;
}

export function memberDisplayName(m) {
  return resolveMemberDisplayName(m);
}

function normalizeEntityId(value) {
  return value == null ? '' : String(value);
}

function resolveMiembroId(row) {
  return normalizeEntityId(row?.miembro_id || row?.miembros?.id);
}

export function sortDirectivaRows(rows, cargoCatalog) {
  const sortIndex = buildCargoSortIndex(cargoCatalog);
  return [...(rows || [])].sort((a, b) => {
    const byCargo = compareDirectivaAssignments(a, b, sortIndex);
    if (byCargo !== 0) return byCargo;
    return memberDisplayName(a.miembros).localeCompare(
      memberDisplayName(b.miembros),
      undefined,
      { sensitivity: 'base' }
    );
  });
}

function compareDirectivaAssignments(a, b, sortIndex) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const aCargoId = a.cargo_id || a.cargos?.id;
  const bCargoId = b.cargo_id || b.cargos?.id;
  const aOrden = a.cargos?.orden ?? 0;
  const bOrden = b.cargos?.orden ?? 0;
  const aIdx = sortIndex.has(aCargoId) ? sortIndex.get(aCargoId) : (aOrden * 1000 + 999);
  const bIdx = sortIndex.has(bCargoId) ? sortIndex.get(bCargoId) : (bOrden * 1000 + 999);
  if (aIdx !== bIdx) return aIdx - bIdx;
  return aOrden - bOrden;
}

export function groupDirectivaRowsByMember(rows, cargoCatalog) {
  const sortIndex = buildCargoSortIndex(cargoCatalog);
  const byMember = new Map();

  for (const row of rows || []) {
    const miembroId = resolveMiembroId(row);
    if (!miembroId) continue;

    if (!byMember.has(miembroId)) {
      byMember.set(miembroId, {
        miembro_id: miembroId,
        miembros: row.miembros,
        assignments: [],
      });
    }

    const group = byMember.get(miembroId);
    if (!group.miembros && row.miembros) {
      group.miembros = row.miembros;
    }
    group.assignments.push(row);
  }

  const groups = Array.from(byMember.values()).filter(group => group.assignments.length > 0);

  for (const group of groups) {
    group.assignments.sort((a, b) => compareDirectivaAssignments(a, b, sortIndex));
  }

  groups.sort((a, b) => {
    const byCargo = compareDirectivaAssignments(a.assignments[0], b.assignments[0], sortIndex);
    if (byCargo !== 0) return byCargo;
    return memberDisplayName(a.miembros).localeCompare(
      memberDisplayName(b.miembros),
      undefined,
      { sensitivity: 'base' }
    );
  });

  return groups;
}

export function filterDirectivaRows(rows, { clubId, memberIds = [], tipoId } = {}) {
  const normalizedClubId = normalizeEntityId(clubId);
  const memberSet = new Set((memberIds || []).map(id => normalizeEntityId(id)));

  return (rows || []).filter(row => {
    if ((row.estado || 'activo') !== 'activo' || !row.en_curso) return false;
    const cargo = row.cargos;
    if (!cargo || (cargo.estado && cargo.estado !== 'activo')) return false;

    if (normalizeEntityId(row.club_id) === normalizedClubId) {
      return true;
    }

    if (!row.club_id && memberSet.has(resolveMiembroId(row))) {
      if (tipoId && cargo.tipo_id && cargo.tipo_id !== tipoId) return false;
      return true;
    }

    return false;
  });
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function countDirectivaMembers(rows, { clubId, memberIds = [], tipoId } = {}) {
  const filtered = filterDirectivaRows(rows, { clubId, memberIds, tipoId });
  return new Set(filtered.map(row => resolveMiembroId(row)).filter(Boolean)).size;
}

export async function fetchDirectivaMemberIds(clubs = [], { clubFilter } = {}) {
  const targetClubs = clubFilter
    ? (clubs || []).filter(c => c.id === clubFilter)
    : (clubs || []);
  const clubIds = targetClubs.map(c => c.id).filter(Boolean);
  if (!clubIds.length) return { memberIds: [], error: null };

  const { data: memberLinks, error: membersError } = await sb
    .from('miembro_club')
    .select('club_id, miembro_id')
    .in('club_id', clubIds);

  if (membersError) return { memberIds: [], error: membersError };

  const membersByClub = Object.fromEntries(clubIds.map(id => [id, new Set()]));
  for (const row of memberLinks || []) {
    membersByClub[row.club_id]?.add(row.miembro_id);
  }

  const cargoSelect = 'miembro_id, club_id, cargo_id, en_curso, estado, cargos(id, tipo_id, estado), miembros(id)';

  const { data: byClub, error: byClubError } = await sb
    .from('miembro_cargos')
    .select(cargoSelect)
    .in('club_id', clubIds)
    .eq('en_curso', true)
    .eq('estado', 'activo');

  if (byClubError) {
    if (/miembro_cargos|does not exist|Could not find/i.test(byClubError.message || '')) {
      return { memberIds: [], error: null };
    }
    return { memberIds: [], error: byClubError };
  }

  const allMemberIds = [...new Set(clubIds.flatMap(id => [...(membersByClub[id] || [])]))];
  const byMember = [];

  if (allMemberIds.length) {
    for (const chunk of chunkArray(allMemberIds, 200)) {
      const { data, error } = await sb
        .from('miembro_cargos')
        .select(cargoSelect)
        .is('club_id', null)
        .in('miembro_id', chunk)
        .eq('en_curso', true)
        .eq('estado', 'activo');

      if (error) {
        if (/miembro_cargos|does not exist|Could not find/i.test(error.message || '')) break;
        return { memberIds: [], error };
      }
      byMember.push(...(data || []));
    }
  }

  const cargoRows = [...(byClub || []), ...byMember];
  const boardIds = new Set();

  for (const club of targetClubs) {
    const filtered = filterDirectivaRows(cargoRows, {
      clubId: club.id,
      memberIds: [...(membersByClub[club.id] || [])],
      tipoId: club.tipo_id,
    });
    for (const row of filtered) {
      const miembroId = resolveMiembroId(row);
      if (miembroId) boardIds.add(miembroId);
    }
  }

  return { memberIds: [...boardIds], error: null };
}

export async function fetchClubListingStats(clubs = []) {
  const clubIds = clubs.map(c => c.id).filter(Boolean);
  const buildEmpty = () => Object.fromEntries(
    clubIds.map(id => [id, { memberCount: 0, boardCount: 0 }])
  );

  if (!clubIds.length) return { stats: {}, error: null };

  const { data: memberLinks, error: membersError } = await sb
    .from('miembro_club')
    .select('club_id, miembro_id')
    .in('club_id', clubIds);

  if (membersError) return { stats: buildEmpty(), error: membersError };

  const membersByClub = Object.fromEntries(clubIds.map(id => [id, new Set()]));
  for (const row of memberLinks || []) {
    membersByClub[row.club_id]?.add(row.miembro_id);
  }

  const stats = Object.fromEntries(clubIds.map(id => [id, {
    memberCount: membersByClub[id]?.size || 0,
    boardCount: 0,
  }]));

  const cargoSelect = 'miembro_id, club_id, cargo_id, en_curso, estado, cargos(id, tipo_id, estado)';

  const { data: byClub, error: byClubError } = await sb
    .from('miembro_cargos')
    .select(cargoSelect)
    .in('club_id', clubIds)
    .eq('en_curso', true)
    .eq('estado', 'activo');

  if (byClubError) {
    if (/miembro_cargos|does not exist|Could not find/i.test(byClubError.message || '')) {
      return { stats, error: null };
    }
    return { stats, error: byClubError };
  }

  const allMemberIds = [...new Set(clubIds.flatMap(id => [...(membersByClub[id] || [])]))];
  const byMember = [];

  if (allMemberIds.length) {
    for (const chunk of chunkArray(allMemberIds, 200)) {
      const { data, error } = await sb
        .from('miembro_cargos')
        .select(cargoSelect)
        .is('club_id', null)
        .in('miembro_id', chunk)
        .eq('en_curso', true)
        .eq('estado', 'activo');

      if (error) {
        if (/miembro_cargos|does not exist|Could not find/i.test(error.message || '')) break;
        return { stats, error };
      }
      byMember.push(...(data || []));
    }
  }

  const cargoRows = [...(byClub || []), ...byMember];
  const clubsById = new Map(clubs.map(c => [c.id, c]));

  for (const clubId of clubIds) {
    const club = clubsById.get(clubId);
    stats[clubId].boardCount = countDirectivaMembers(cargoRows, {
      clubId,
      memberIds: [...(membersByClub[clubId] || [])],
      tipoId: club?.tipo_id,
    });
  }

  return { stats, error: null };
}

export async function fetchClubDirectiva(clubId) {
  if (!clubId) return { club: null, rows: [], catalog: [], error: new Error('club id required') };

  const { data: club, error: clubError } = await sb
    .from('clubes')
    .select('id, nombre, tipo_id, logo_url, tipos_club(id, nombre, logo_url)')
    .eq('id', clubId)
    .single();

  if (clubError) return { club: null, rows: [], catalog: [], error: clubError };

  const { data: memberLinks, error: membersError } = await sb
    .from('miembro_club')
    .select('miembro_id')
    .eq('club_id', clubId);

  if (membersError) return { club, rows: [], catalog: [], error: membersError };

  const memberIds = (memberLinks || []).map(row => row.miembro_id).filter(Boolean);

  const { data: catalog, error: catalogError } = await fetchCargosCatalog({ showInactive: false });
  if (catalogError) return { club, rows: [], catalog: [], error: catalogError };

  const scopedCatalog = filterCargosByTipo(catalog || [], club.tipo_id ? [club.tipo_id] : []);

  const selects = [
    `id, miembro_id, cargo_id, club_id, fecha_inicio, en_curso, estado, cargos(id, nombre, orden, parent_id, tipo_id, estado), miembros(id, ${MIEMBRO_NAME_FIELDS}, estado)`,
    `id, miembro_id, cargo_id, club_id, fecha_inicio, en_curso, estado, cargos(id, nombre, orden, parent_id), miembros(id, ${MIEMBRO_NAME_FIELDS}, estado)`,
  ];

  let rawRows = [];
  let rowsError = null;

  for (const select of selects) {
    let query = sb
      .from('miembro_cargos')
      .select(select)
      .eq('en_curso', true)
      .eq('estado', 'activo');

    if (memberIds.length) {
      query = query.or(`club_id.eq.${clubId},and(club_id.is.null,miembro_id.in.(${memberIds.join(',')}))`);
    } else {
      query = query.eq('club_id', clubId);
    }

    const { data, error } = await query;
    if (!error) {
      rawRows = data || [];
      rowsError = null;
      break;
    }
    rowsError = error;
  }

  if (rowsError) return { club, rows: [], catalog: scopedCatalog, error: rowsError };

  const filtered = filterDirectivaRows(rawRows, {
    clubId,
    memberIds,
    tipoId: club.tipo_id,
  });
  const rows = groupDirectivaRowsByMember(filtered, scopedCatalog);

  return { club, rows, catalog: scopedCatalog, error: null };
}

export function splitMiembroCargos(rows) {
  const active = [];
  const history = [];
  for (const row of rows || []) {
    if ((row.estado || 'activo') !== 'activo') {
      history.push(row);
    } else if (row.en_curso) {
      active.push(row);
    } else {
      history.push(row);
    }
  }
  const byEnd = (a, b) => {
    const aEnd = a.fecha_fin || '';
    const bEnd = b.fecha_fin || '';
    if (aEnd !== bEnd) return bEnd.localeCompare(aEnd);
    const aStart = a.fecha_inicio || '';
    const bStart = b.fecha_inicio || '';
    return bStart.localeCompare(aStart);
  };
  history.sort(byEnd);
  return { active, history };
}

export async function fetchCargosCatalog({ showInactive = false } = {}) {
  let query = sb
    .from('cargos')
    .select('id, parent_id, nombre, codigo, descripcion, orden, tipo_id, estado, tipos_club(id, nombre)')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });

  if (!showInactive) query = query.eq('estado', 'activo');

  const { data, error } = await query;
  return {
    data: (data || []).map(row => ({
      ...row,
      estado: row.estado || 'activo',
      tipos_club: row.tipos_club || null,
    })),
    error,
  };
}

export async function createCargo(payload) {
  const { data, error } = await sb
    .from('cargos')
    .insert({
      nombre: payload.nombre?.trim(),
      parent_id: payload.parent_id || null,
      codigo: payload.codigo?.trim() || null,
      descripcion: payload.descripcion?.trim() || null,
      orden: Number(payload.orden) || 0,
      tipo_id: payload.tipo_id || null,
      estado: 'activo',
    })
    .select('id, parent_id, nombre, codigo, descripcion, orden, tipo_id, estado')
    .single();
  return { data, error };
}

export async function updateCargo(id, payload) {
  const body = {
    nombre: payload.nombre?.trim(),
    parent_id: payload.parent_id || null,
    codigo: payload.codigo?.trim() || null,
    descripcion: payload.descripcion?.trim() || null,
    orden: Number(payload.orden) || 0,
    tipo_id: payload.tipo_id || null,
  };
  return sb.from('cargos').update(body).eq('id', id);
}

export async function setCargoEstado(id, estado) {
  return sb.from('cargos').update({ estado }).eq('id', id);
}

export async function fetchMiembroCargos(miembroId) {
  const selects = [
    'id, miembro_id, cargo_id, club_id, fecha_inicio, fecha_fin, en_curso, notas, estado, cargos(id, nombre, parent_id, tipo_id, tipos_club(id, nombre)), clubes(id, nombre)',
    'id, miembro_id, cargo_id, club_id, fecha_inicio, fecha_fin, en_curso, notas, estado, cargos(id, nombre, parent_id), clubes(id, nombre)',
    '*',
  ];

  for (const select of selects) {
    const { data, error } = await sb
      .from('miembro_cargos')
      .select(select)
      .eq('miembro_id', miembroId)
      .order('en_curso', { ascending: false })
      .order('fecha_inicio', { ascending: false, nullsFirst: false });
    if (!error) return { data: data || [], error: null };
  }

  return { data: [], error: new Error('Could not load member cargos') };
}

function normalizeMiembroCargoPayload(payload) {
  const enCurso = Boolean(payload.en_curso);
  const fechaInicio = payload.inicioDesconocido ? null : (payload.fecha_inicio || null);
  return {
    club_id: payload.club_id || null,
    fecha_inicio: fechaInicio,
    fecha_fin: enCurso ? null : (payload.fecha_fin || todayISO()),
    en_curso: enCurso,
    notas: payload.notas?.trim() || null,
  };
}

export async function assignCargoToMiembro(miembroId, cargoId, payload) {
  const body = normalizeMiembroCargoPayload(payload);
  const direct = await sb
    .from('miembro_cargos')
    .insert({
      miembro_id: miembroId,
      cargo_id: cargoId,
      ...body,
      estado: 'activo',
    })
    .select('id')
    .single();

  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;

  return sb.rpc('admin_assign_miembro_cargo', {
    p_miembro_id: miembroId,
    p_cargo_id: cargoId,
    p_club_id: body.club_id,
    p_fecha_inicio: body.fecha_inicio,
    p_fecha_fin: body.fecha_fin,
    p_en_curso: body.en_curso,
    p_notas: body.notas,
  });
}

export async function updateMiembroCargo(linkId, payload) {
  const body = normalizeMiembroCargoPayload(payload);
  const direct = await sb
    .from('miembro_cargos')
    .update(body)
    .eq('id', linkId);

  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;

  return sb.rpc('admin_update_miembro_cargo', {
    p_link_id: linkId,
    p_club_id: body.club_id,
    p_fecha_inicio: body.fecha_inicio,
    p_fecha_fin: body.fecha_fin,
    p_en_curso: body.en_curso,
    p_notas: body.notas,
    p_clear_fecha_inicio: Boolean(payload.inicioDesconocido),
  });
}

export async function closeMiembroCargo(linkId, fechaFin) {
  const direct = await sb
    .from('miembro_cargos')
    .update({ en_curso: false, fecha_fin: fechaFin || todayISO() })
    .eq('id', linkId);

  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;

  return sb.rpc('admin_close_miembro_cargo', {
    p_link_id: linkId,
    p_fecha_fin: fechaFin || todayISO(),
  });
}

export { fetchTiposClub };
