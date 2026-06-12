import { sb } from '../../services/supabase';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchMiembrosByClub(clubId) {
  let query = sb.from('miembro_club').select('miembros(id,nombre,apellido1,apellido2,estado)');
  if (clubId) query = query.eq('club_id', clubId);
  return query;
}

export async function fetchMiembrosByIglesia(iglesiaId, { clubFilter, showInactive = false } = {}) {
  const { data: clubs, error: clubsError } = await sb
    .from('clubes')
    .select('id')
    .eq('iglesia_id', iglesiaId);

  if (clubsError) return { data: [], error: clubsError };
  if (!clubs?.length) return { data: [], error: null };

  const clubIds = clubs.map(c => c.id);
  const filterIds = clubFilter ? [clubFilter] : clubIds;

  const { data: rows, error } = await sb
    .from('miembro_club')
    .select('club_id, miembros(id,nombre,apellido1,apellido2,estado)')
    .in('club_id', filterIds);

  if (error) return { data: [], error };

  const byMember = new Map();

  for (const row of rows || []) {
    const m = row.miembros;
    if (!m) continue;
    if (!showInactive && m.estado !== 'activo') continue;

    if (!byMember.has(m.id)) {
      byMember.set(m.id, {
        id: m.id,
        nombre: m.nombre,
        apellido1: m.apellido1,
        apellido2: m.apellido2,
        estado: m.estado,
        clubIds: new Set(),
      });
    }
    byMember.get(m.id).clubIds.add(row.club_id);
  }

  const members = Array.from(byMember.values())
    .map(m => ({ ...m, clubIds: Array.from(m.clubIds) }))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', undefined, { sensitivity: 'base' }));

  return { data: members, error: null };
}

export async function fetchMiembroClubAssignment(miembroId, clubId) {
  return sb
    .from('miembro_club')
    .select('id')
    .eq('miembro_id', miembroId)
    .eq('club_id', clubId)
    .maybeSingle();
}

export async function assignMiembroToClub(miembroId, clubId, { fechaInicio } = {}) {
  const { data: existing } = await fetchMiembroClubAssignment(miembroId, clubId);
  if (existing) return { error: null };

  return sb.from('miembro_club').insert([{
    miembro_id: miembroId,
    club_id: clubId,
    fecha_inicio: fechaInicio || todayISO(),
  }]);
}

export async function unassignMiembroFromClub(miembroId, clubId) {
  return sb
    .from('miembro_club')
    .delete()
    .eq('miembro_id', miembroId)
    .eq('club_id', clubId);
}

export async function fetchMiembroById(id) {
  return sb
    .from('miembros')
    .select('nombre,apellido1,apellido2,fecha_nacimiento,direccion,telefono,ciudad,foto_url,documento,genero,celular')
    .eq('id', id)
    .single();
}

export async function updateMiembroEstado(id, estado) {
  return sb.from('miembros').update({ estado }).eq('id', id);
}

export async function createMiembro(miembro) {
  return sb.from('miembros').insert([miembro]);
}

export async function createMiembroWithClub(miembro, clubId, { fechaInicio } = {}) {
  const { data, error } = await sb
    .from('miembros')
    .insert([{ ...miembro, estado: 'activo' }])
    .select('id')
    .single();

  if (error) return { error };

  const { error: linkError } = await sb
    .from('miembro_club')
    .insert([{
      miembro_id: data.id,
      club_id: clubId,
      fecha_inicio: fechaInicio || todayISO(),
    }]);

  if (linkError) {
    await sb.from('miembros').delete().eq('id', data.id);
    return { error: linkError };
  }

  return { data, error: null };
}

export async function bulkCreateMiembros(members) {
  const created = [];
  const errors = [];

  for (const { member, rowNumber } of members) {
    const { club_id, club_nombre, ...miembroData } = member;
    const { error } = await createMiembroWithClub(miembroData, club_id);
    if (error) {
      errors.push({ rowNumber, message: error.message });
    } else {
      created.push(rowNumber);
    }
  }

  return { created, errors };
}

export async function updateMiembro(id, miembro) {
  return sb.from('miembros').update(miembro).eq('id', id);
}

export async function fetchMiembroClubTipoIds(miembroId) {
  const { data, error } = await sb
    .from('miembro_club')
    .select('clubes(tipo_id, tipos_club(id, nombre))')
    .eq('miembro_id', miembroId);

  if (error) return { tipoIds: [], tipos: [], error };

  const tiposMap = new Map();
  for (const row of data || []) {
    const club = row.clubes;
    if (club?.tipo_id) {
      tiposMap.set(club.tipo_id, club.tipos_club?.nombre || '');
    }
  }

  return {
    tipoIds: Array.from(tiposMap.keys()),
    tipos: Array.from(tiposMap.entries()).map(([id, nombre]) => ({ id, nombre })),
    error: null,
  };
}
