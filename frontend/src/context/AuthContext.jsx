import { createContext, useEffect, useState } from 'react';
import * as AuthModel from '../mvc/models/auth.model';
import * as UsuariosModel from '../mvc/models/usuarios.model';
import { isSuperAdminEmail } from '../utils/permissions';

export const AuthContext = createContext();

function mergeIglesiaAssignment(profile, assignment) {
  if (!profile) return profile;
  const iglesia = assignment?.iglesias;

  return {
    ...profile,
    iglesia_id: assignment?.iglesia_id || null,
    rol_iglesia: assignment?.rol_iglesia || null,
    iglesia_nombre: iglesia?.nombre || null,
    iglesia_estado: iglesia?.estado || null,
  };
}

function resolveUserData(authUser, dbUser, assignment = null) {
  const email = authUser?.email;
  const superadmin = isSuperAdminEmail(email);

  if (dbUser) {
    const profile = superadmin && dbUser.rol !== 'superadmin'
      ? { ...dbUser, rol: 'superadmin', estado: dbUser.estado || 'activo' }
      : dbUser;
    return mergeIglesiaAssignment(profile, assignment);
  }

  if (superadmin && authUser) {
    return mergeIglesiaAssignment({
      id: authUser.id,
      email: authUser.email,
      nombre: authUser.user_metadata?.nombre || email.split('@')[0],
      apellido1: authUser.user_metadata?.apellido1 || '',
      apellido2: authUser.user_metadata?.apellido2 || '',
      telefono: authUser.user_metadata?.telefono || '',
      rol: 'superadmin',
      estado: 'activo',
      ui_theme: 'default',
    }, assignment);
  }

  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUserData(authUser) {
    if (!authUser?.email) {
      setUserData(null);
      return;
    }

    try {
      const { data: usuariosData } = await AuthModel.fetchUserByEmail(authUser.email);
      const userId = usuariosData?.id || authUser.id;
      let assignment = null;

      if (userId) {
        const { data: iglesiaLink } = await UsuariosModel.fetchUsuarioIglesiaByUsuario(userId);
        assignment = iglesiaLink;
      }

      setUserData(resolveUserData(authUser, usuariosData, assignment));
    } catch {
      setUserData(resolveUserData(authUser, null));
    }
  }

  async function logout() {
    await AuthModel.signOut();
    setUser(null);
    setUserData(null);
    window.location.href = '/';
  }

  useEffect(() => {
    async function initializeAuth() {
      try {
        const { data, error } = await AuthModel.getSession();
        if (error || !data?.session?.user) {
          setUser(null);
          setUserData(null);
        } else {
          const authUser = data.session.user;
          setUser(authUser);
          await loadUserData(authUser);
        }
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = AuthModel.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await loadUserData(session.user);
      } else {
        setUser(null);
        setUserData(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, setUser, setUserData, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
