import { createContext, useEffect, useState } from 'react';
import * as AuthModel from '../mvc/models/auth.model';

export const AuthContext = createContext();

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
      const { data: usuariosData, error: queryError } = await AuthModel.fetchUserByEmail(authUser.email);
      setUserData(!queryError && usuariosData ? usuariosData : null);
    } catch {
      setUserData(null);
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
        if (error || !data.session?.user) {
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
