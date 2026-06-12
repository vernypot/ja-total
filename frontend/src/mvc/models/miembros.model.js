import { sb } from '../../services/supabase';

const MIEMBRO_FOTOS_BUCKET = 'miembro-fotos';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function isRlsError(error) {
  const msg = error?.message || '';
  return msg.includes('row-level security') || msg.includes('permission denied');
}

function extensionForFile(file) {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
}

function buildPhotoPath(miembroId, ext) {
  return `${miembroId}/avatar.${ext}`;
}

export function validateMiembroPhotoFile(file) {
  if (!file) return 'No file selected';
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) return 'Invalid image type. Use JPEG, PNG, WebP, or GIF.';
  if (file.size > MAX_PHOTO_BYTES) return 'Image must be 5 MB or smaller.';
  return null;
}

export function getMiembroPhotoDisplayUrl(fotoUrl) {
  if (!fotoUrl) return null;
  const separator = fotoUrl.includes('?') ? '&' : '?';
  return `${fotoUrl}${separator}t=${Date.now()}`;
}

async function setMiembroFotoUrl(miembroId, fotoUrl) {
  const rpc = await sb.rpc('admin_update_miembro_foto', {
    p_miembro_id: miembroId,
    p_foto_url: fotoUrl,
  });
  if (!rpc.error) return rpc;

  const direct = await sb.from('miembros').update({ foto_url: fotoUrl }).eq('id', miembroId);
  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;

  return rpc;
}

export async function uploadMiembroPhoto(miembroId, file) {
  const validationError = validateMiembroPhotoFile(file);
  if (validationError) return { data: null, error: new Error(validationError) };

  const ext = extensionForFile(file);
  const path = buildPhotoPath(miembroId, ext);

  let uploadError = null;
  const upload = await sb.storage
    .from(MIEMBRO_FOTOS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  uploadError = upload.error;

  if (uploadError && isRlsError(uploadError)) {
    const retry = await sb.storage
      .from(MIEMBRO_FOTOS_BUCKET)
      .upload(path, file, { contentType: file.type });
    uploadError = retry.error;
  }

  if (uploadError) {
    return {
      data: null,
      error: uploadError,
      errorStage: 'storage',
    };
  }

  const { data: urlData } = sb.storage.from(MIEMBRO_FOTOS_BUCKET).getPublicUrl(path);
  const fotoUrl = urlData?.publicUrl || null;
  if (!fotoUrl) return { data: null, error: new Error('Unable to resolve photo URL'), errorStage: 'storage' };

  const updateResult = await setMiembroFotoUrl(miembroId, fotoUrl);
  if (updateResult.error) {
    return {
      data: null,
      error: updateResult.error,
      errorStage: 'database',
    };
  }

  return { data: { foto_url: fotoUrl }, error: null };
}

export async function removeMiembroPhoto(miembroId, currentFotoUrl) {
  if (currentFotoUrl) {
    const marker = `/object/public/${MIEMBRO_FOTOS_BUCKET}/`;
    const idx = currentFotoUrl.indexOf(marker);
    if (idx !== -1) {
      const path = decodeURIComponent(currentFotoUrl.slice(idx + marker.length).split('?')[0]);
      await sb.storage.from(MIEMBRO_FOTOS_BUCKET).remove([path]);
    } else {
      for (const ext of ['jpg', 'png', 'webp', 'gif']) {
        await sb.storage.from(MIEMBRO_FOTOS_BUCKET).remove([buildPhotoPath(miembroId, ext)]);
      }
    }
  }

  return setMiembroFotoUrl(miembroId, null);
}

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

export async function fetchMiembroClubsWithLogos(miembroId) {
  const { data, error } = await sb
    .from('miembro_club')
    .select('club_id, clubes(id, nombre, logo_url, tipos_club(id, nombre, logo_url))')
    .eq('miembro_id', miembroId);

  if (error) return { data: [], error };

  const clubs = (data || [])
    .map(row => row.clubes)
    .filter(Boolean)
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', undefined, { sensitivity: 'base' }));

  return { data: clubs, error: null };
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
