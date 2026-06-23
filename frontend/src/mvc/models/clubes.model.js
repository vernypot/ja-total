import { sb } from '../../services/supabase';
import {
  validateImageFile,
  extensionForImageFile,
  isRlsError,
} from '../../utils/assets';

const CLUB_LOGOS_BUCKET = 'club-logos';

const CLUB_SELECT = 'id,nombre,iglesia_id,tipo_id,estado,logo_url,created_at,iglesias(id,nombre),tipos_club(id,nombre,logo_url)';

async function uploadLogoToStorage(path, file) {
  let { error } = await sb.storage
    .from(CLUB_LOGOS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error && isRlsError(error)) {
    ({ error } = await sb.storage
      .from(CLUB_LOGOS_BUCKET)
      .upload(path, file, { contentType: file.type }));
  }

  return error;
}

function publicUrlForPath(path) {
  const { data } = sb.storage.from(CLUB_LOGOS_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

async function setClubLogoUrl(clubId, logoUrl) {
  const rpc = await sb.rpc('admin_update_club_logo', {
    p_club_id: clubId,
    p_logo_url: logoUrl,
  });
  if (!rpc.error) return rpc;

  const direct = await sb.from('clubes').update({ logo_url: logoUrl }).eq('id', clubId);
  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;
  return rpc;
}

async function setTipoClubLogoUrl(tipoId, logoUrl) {
  const rpc = await sb.rpc('admin_update_tipo_club_logo', {
    p_tipo_id: tipoId,
    p_logo_url: logoUrl,
  });
  if (!rpc.error) return rpc;

  const direct = await sb.from('tipos_club').update({ logo_url: logoUrl }).eq('id', tipoId);
  if (!direct.error) return direct;
  if (!isRlsError(direct.error)) return direct;
  return rpc;
}

export async function uploadClubLogo(clubId, file) {
  const validationError = validateImageFile(file);
  if (validationError) return { data: null, error: new Error(validationError) };

  const ext = extensionForImageFile(file);
  const path = `clubs/${clubId}/logo.${ext}`;
  const uploadError = await uploadLogoToStorage(path, file);
  if (uploadError) return { data: null, error: uploadError, errorStage: 'storage' };

  const logoUrl = publicUrlForPath(path);
  if (!logoUrl) return { data: null, error: new Error('Unable to resolve logo URL'), errorStage: 'storage' };

  const updateResult = await setClubLogoUrl(clubId, logoUrl);
  if (updateResult.error) {
    return { data: null, error: updateResult.error, errorStage: 'database' };
  }

  return { data: { logo_url: logoUrl }, error: null };
}

export async function removeClubLogo(clubId, currentLogoUrl) {
  if (currentLogoUrl) {
    await removeLogoFromStorage(currentLogoUrl, `clubs/${clubId}`);
  }
  return setClubLogoUrl(clubId, null);
}

export async function uploadTipoClubLogo(tipoId, file) {
  const validationError = validateImageFile(file);
  if (validationError) return { data: null, error: new Error(validationError) };

  const ext = extensionForImageFile(file);
  const path = `tipos/${tipoId}/logo.${ext}`;
  const uploadError = await uploadLogoToStorage(path, file);
  if (uploadError) return { data: null, error: uploadError, errorStage: 'storage' };

  const logoUrl = publicUrlForPath(path);
  if (!logoUrl) return { data: null, error: new Error('Unable to resolve logo URL'), errorStage: 'storage' };

  const updateResult = await setTipoClubLogoUrl(tipoId, logoUrl);
  if (updateResult.error) {
    return { data: null, error: updateResult.error, errorStage: 'database' };
  }

  return { data: { logo_url: logoUrl }, error: null };
}

export async function removeTipoClubLogo(tipoId, currentLogoUrl) {
  if (currentLogoUrl) {
    await removeLogoFromStorage(currentLogoUrl, `tipos/${tipoId}`);
  }
  return setTipoClubLogoUrl(tipoId, null);
}

async function removeLogoFromStorage(currentLogoUrl, pathPrefix) {
  const marker = `/object/public/${CLUB_LOGOS_BUCKET}/`;
  const idx = currentLogoUrl.indexOf(marker);
  if (idx !== -1) {
    const path = decodeURIComponent(currentLogoUrl.slice(idx + marker.length).split('?')[0]);
    await sb.storage.from(CLUB_LOGOS_BUCKET).remove([path]);
    return;
  }

  for (const ext of ['jpg', 'png', 'webp', 'gif', 'svg']) {
    await sb.storage.from(CLUB_LOGOS_BUCKET).remove([`${pathPrefix}/logo.${ext}`]);
  }
}

export async function fetchClubes({ iglesiaId, showInactive = false } = {}) {
  let query = sb
    .from('clubes')
    .select(CLUB_SELECT)
    .order('nombre', { ascending: true });

  if (iglesiaId) query = query.eq('iglesia_id', iglesiaId);
  if (!showInactive) query = query.eq('estado', 'activo');
  const result = await query;
  if (!result.error) return result;

  if (/logo_url|column|Could not find/i.test(result.error.message || '')) {
    let fallback = sb
      .from('clubes')
      .select('id,nombre,iglesia_id,tipo_id,estado,created_at,iglesias(id,nombre),tipos_club(id,nombre)')
      .order('nombre', { ascending: true });
    if (iglesiaId) fallback = fallback.eq('iglesia_id', iglesiaId);
    if (!showInactive) fallback = fallback.eq('estado', 'activo');
    return fallback;
  }

  return result;
}

export async function fetchClubesByIglesia(iglesiaId) {
  return sb
    .from('clubes')
    .select('id, nombre, iglesia_id, tipo_id, logo_url, tipos_club(id, nombre, logo_url)')
    .eq('iglesia_id', iglesiaId)
    .eq('estado', 'activo')
    .order('nombre', { ascending: true });
}

export async function fetchClubById(clubId) {
  return sb
    .from('clubes')
    .select('id, nombre, iglesia_id, tipo_id, logo_url, tipos_club(id, nombre, logo_url)')
    .eq('id', clubId)
    .single();
}

export async function fetchTiposClub() {
  return sb.from('tipos_club').select('id, nombre, logo_url');
}

export async function createClub({ nombre, iglesia_id, tipo_id }) {
  return sb.from('clubes').insert([{
    nombre,
    iglesia_id,
    tipo_id: tipo_id || null,
    estado: 'activo',
  }]);
}

export async function updateClubEstado(id, estado) {
  return sb.from('clubes').update({ estado }).eq('id', id);
}

export async function hasMembers(clubId) {
  return sb.from('miembro_club').select('id').eq('club_id', clubId).limit(1);
}
