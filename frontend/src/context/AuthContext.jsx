import { createContext, useEffect, useState } from "react";
import { sb } from "../services/supabase";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initializeAuth() {
      try {
        const { data, error } = await sb.auth.getSession();
        if (error) {
          console.error('Failed to get session:', error);
          setUser(null);
          setUserData(null);
        } else if (data.session?.user) {
          const authUser = data.session.user;
          setUser(authUser);
          
          // Fetch user data from usuarios table
          try {
            const { data: usuariosData, error: queryError } = await sb
              .from('usuarios')
              .select('id, email, nombre, apellido1, apellido2, telefono, rol, estado')
              .eq('email', authUser.email)
              .single();
            
            if (queryError) {
              console.warn('Could not fetch usuarios data:', queryError);
              setUserData(null);
            } else if (usuariosData) {
              setUserData(usuariosData);
            }
          } catch (err) {
            console.error('Error fetching usuarios data:', err);
            setUserData(null);
          }
        } else {
          setUser(null);
          setUserData(null);
        }
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        try {
          const { data: usuariosData, error: queryError } = await sb
            .from('usuarios')
            .select('id, email, nombre, apellido1, apellido2, telefono, rol, estado')
            .eq('email', session.user.email)
            .single();
          
          if (!queryError && usuariosData) {
            setUserData(usuariosData);
          } else {
            setUserData(null);
          }
        } catch (err) {
          console.error('Error fetching usuarios data on auth change:', err);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, setUser, setUserData }}>
      {children}
    </AuthContext.Provider>
  );
}
