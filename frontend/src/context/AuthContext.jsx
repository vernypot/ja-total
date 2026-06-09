import { createContext, useEffect, useState } from "react";
import { sb } from "../services/supabase";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
