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
    .select('id, email, nombre, apellido1, apellido2, telefono, rol, estado')
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
