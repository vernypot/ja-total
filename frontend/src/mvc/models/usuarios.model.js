import { sb } from '../../services/supabase';
import * as AuthModel from './auth.model';
import { generateTemporaryPassword } from '../../utils/passwordValidation';

export async function fetchUsuarios({ showInactive = false } = {}) {
  let query = sb
    .from('usuarios')
    .select(`
      *,
      usuario_iglesia (
        id,
        iglesia_id,
        rol_iglesia,
        iglesias ( id, nombre, estado )
      )
    `)
    .order('created_at', { ascending: false });
  if (!showInactive) query = query.eq('estado', 'activo');

  const { data, error } = await query;
  if (!error) {
    return { data: normalizeUsuariosWithIglesia(data), error: null };
  }

  const { data: rpcData, error: rpcError } = await sb.rpc('admin_list_usuarios');
  if (!rpcError) {
    const rows = rpcData || [];
    const filtered = showInactive ? rows : rows.filter(u => u.estado === 'activo');
    const withIglesia = await attachIglesiaAssignments(filtered);
    return { data: withIglesia, error: null };
  }

  return { data: null, error: error || rpcError };
}

function normalizeUsuarioIglesiaRow(usuario) {
  const links = usuario?.usuario_iglesia;
  const assignment = Array.isArray(links) ? links[0] : links;
  const iglesia = assignment?.iglesias;

  return {
    ...usuario,
    usuario_iglesia: undefined,
    iglesia_id: assignment?.iglesia_id || null,
    rol_iglesia: assignment?.rol_iglesia || null,
    iglesia_nombre: iglesia?.nombre || null,
    iglesia_estado: iglesia?.estado || null,
  };
}

function normalizeUsuariosWithIglesia(rows) {
  return (rows || []).map(normalizeUsuarioIglesiaRow);
}

async function attachIglesiaAssignments(usuarios) {
  if (!usuarios?.length) return [];

  const ids = usuarios.map(u => u.id);
  const { data: assignments } = await sb
    .from('usuario_iglesia')
    .select('id, usuario_id, iglesia_id, rol_iglesia, iglesias ( id, nombre, estado )')
    .in('usuario_id', ids);

  const byUsuario = new Map((assignments || []).map(row => [row.usuario_id, row]));

  return usuarios.map(usuario => {
    const assignment = byUsuario.get(usuario.id);
    return {
      ...usuario,
      iglesia_id: assignment?.iglesia_id || null,
      rol_iglesia: assignment?.rol_iglesia || null,
      iglesia_nombre: assignment?.iglesias?.nombre || null,
      iglesia_estado: assignment?.iglesias?.estado || null,
    };
  });
}

export async function fetchUsuarioByEmail(email) {
  return sb
    .from('usuarios')
    .select('id, email, nombre, apellido1, apellido2, telefono, rol, estado, ui_theme')
    .eq('email', email)
    .single();
}

export async function createUsuario(usuario) {
  return sb.from('usuarios').insert([usuario]).select('id, email').single();
}

export async function createUsuarioWithAuth(usuario, { password, sendSetupEmail = false } = {}) {
  const profile = {
    nombre: usuario.nombre,
    apellido1: usuario.apellido1,
    apellido2: usuario.apellido2,
    email: usuario.email,
    rol: usuario.rol,
    estado: usuario.estado,
    telefono: usuario.telefono,
  };

  const authPassword = sendSetupEmail ? generateTemporaryPassword() : password;

  const rpc = await AuthModel.adminCreateUsuarioAuth({
    ...profile,
    password: authPassword,
  });

  if (!rpc.error && rpc.data) {
    if (sendSetupEmail) {
      const emailResult = await AuthModel.sendPasswordResetEmail(profile.email);
      if (emailResult.error) {
        return {
          data: rpc.data,
          error: new Error(
            'User created but setup email failed: ' + emailResult.error.message
          ),
        };
      }
    }
    return { data: rpc.data, error: null };
  }

  const isMissingRpc =
    rpc.error?.message?.includes('admin_create_usuario_auth') ||
    rpc.error?.message?.includes('Could not find the function') ||
    rpc.error?.code === 'PGRST202';

  if (!isMissingRpc && !rpc.error?.message?.includes('permission denied')) {
    return { data: null, error: rpc.error };
  }

  const metadata = {
    nombre: profile.nombre,
    apellido1: profile.apellido1 || '',
    apellido2: profile.apellido2 || '',
    role: profile.rol,
  };

  const { data: authData, error: authError } = await AuthModel.signUpAuthUser({
    email: profile.email,
    password: authPassword,
    metadata,
  });

  if (authError) return { data: null, error: authError };

  const authUserId = authData?.user?.id;
  if (!authUserId) {
    return {
      data: null,
      error: new Error(
        'Auth account created but user id is missing. If email confirmation is enabled, confirm the address or run USUARIOS_AUTH_FIX.sql.'
      ),
    };
  }

  const insert = await createUsuario({ ...profile, id: authUserId });
  if (insert.error) return insert;

  if (sendSetupEmail) {
    const emailResult = await AuthModel.sendPasswordResetEmail(profile.email);
    if (emailResult.error) {
      return {
        data: insert.data,
        error: new Error(
          'User created but setup email failed: ' + emailResult.error.message
        ),
      };
    }
  }

  return insert;
}

export async function updateUsuario(id, fields) {
  return sb.from('usuarios').update({ ...fields, updated_at: new Date() }).eq('id', id);
}

export async function updateUsuarioEstado(id, estado) {
  return sb.from('usuarios').update({ estado, updated_at: new Date() }).eq('id', id);
}

export async function assignUsuarioIglesia({ usuario_id, iglesia_id, rol_iglesia }) {
  return sb.from('usuario_iglesia').insert([{ usuario_id, iglesia_id, rol_iglesia }]);
}

export async function fetchUsuarioIglesiaByUsuario(usuarioId) {
  const { data, error } = await sb
    .from('usuario_iglesia')
    .select('id, usuario_id, iglesia_id, rol_iglesia, iglesias ( id, nombre, estado )')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

export async function upsertUsuarioIglesia({ usuario_id, iglesia_id, rol_iglesia }) {
  const { data: existing, error: fetchError } = await fetchUsuarioIglesiaByUsuario(usuario_id);
  if (fetchError) return { data: null, error: fetchError };

  if (existing?.id) {
    return sb
      .from('usuario_iglesia')
      .update({ iglesia_id, rol_iglesia, updated_at: new Date() })
      .eq('id', existing.id)
      .select('id, usuario_id, iglesia_id, rol_iglesia')
      .single();
  }

  return assignUsuarioIglesia({ usuario_id, iglesia_id, rol_iglesia });
}

export async function updateProfile(id, { nombre, apellido1, apellido2, telefono }) {
  return sb.from('usuarios').update({
    nombre,
    apellido1,
    apellido2,
    telefono,
    updated_at: new Date(),
  }).eq('id', id);
}

export async function fetchLinkedMiembroForUsuario(usuarioId) {
  if (!usuarioId) return { data: null, error: null };
  const { data, error } = await sb.rpc('admin_get_usuario_linked_miembro', {
    p_usuario_id: usuarioId,
  });
  return { data: data || null, error };
}

export async function fetchLinkedUsuarioForMiembro(miembroId) {
  if (!miembroId) return { data: null, error: null };
  const { data, error } = await sb.rpc('admin_get_miembro_linked_usuario', {
    p_miembro_id: miembroId,
  });
  return { data: data || null, error };
}

export async function fetchUnlinkedUsuarios() {
  const { data, error } = await sb.rpc('admin_list_unlinked_usuarios');
  return { data: data || [], error };
}

export async function linkUsuarioMiembro(miembroId, usuarioId) {
  return sb.rpc('admin_link_usuario_miembro', {
    p_miembro_id: miembroId,
    p_usuario_id: usuarioId,
  });
}

export async function unlinkUsuarioMiembro(miembroId) {
  return sb.rpc('admin_unlink_usuario_miembro', {
    p_miembro_id: miembroId,
  });
}

export async function promoteMiembroToUsuario({
  miembroId,
  email,
  password,
  rol = 'user',
  rolIglesia = 'member',
  iglesiaId = null,
}) {
  return sb.rpc('admin_promote_miembro_to_usuario', {
    p_miembro_id: miembroId,
    p_email: email.trim().toLowerCase(),
    p_password: password,
    p_rol: rol,
    p_rol_iglesia: rolIglesia,
    p_iglesia_id: iglesiaId,
  });
}

export async function setUsuarioSystemAccess(usuarioId, activo) {
  const result = await sb.rpc('admin_set_usuario_system_access', {
    p_usuario_id: usuarioId,
    p_activo: activo,
  });

  if (!result.error) return result;

  const msg = result.error?.message || '';
  const isMissingRpc =
    msg.includes('admin_set_usuario_system_access')
    || msg.includes('Could not find the function')
    || result.error?.code === 'PGRST202';

  if (isMissingRpc) {
    return updateUsuarioEstado(usuarioId, activo ? 'activo' : 'inactivo');
  }

  return result;
}

export async function attachLinkedMiembros(usuarios) {
  if (!usuarios?.length) return [];

  const enriched = await Promise.all(
    usuarios.map(async usuario => {
      try {
        const { data: miembro, error } = await fetchLinkedMiembroForUsuario(usuario.id);
        if (error) {
          return { ...usuario, linked_miembro: null, linked_miembro_id: null, linked_miembro_nombre: null };
        }
        return {
          ...usuario,
          linked_miembro: miembro,
          linked_miembro_id: miembro?.id || null,
          linked_miembro_nombre: miembro
            ? [miembro.nombre, miembro.apellido1, miembro.apellido2].filter(Boolean).join(' ')
            : null,
        };
      } catch {
        return { ...usuario, linked_miembro: null, linked_miembro_id: null, linked_miembro_nombre: null };
      }
    })
  );

  return enriched;
}

export async function updateUiTheme(id, ui_theme) {
  const { data, error } = await sb
    .from('usuarios')
    .update({ ui_theme, updated_at: new Date() })
    .eq('id', id)
    .select('ui_theme')
    .single();

  if (error?.message?.includes('ui_theme') || error?.code === '42703') {
    return { data: { ui_theme }, error: null };
  }

  return { data, error };
}
