import { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { getUserRole, isSuperAdmin } from '../utils/permissions';

export const IglesiaContext = createContext();

export function IglesiaProvider({ children }) {
  const { user, userData, loading: authLoading } = useContext(AuthContext);
  const [activeIglesia, setActiveIglesia] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setActiveIglesia(null);
      setInitialized(false);
      return;
    }

    const role = getUserRole(user, userData);

    if (isSuperAdmin(role)) {
      if (!initialized) {
        const saved = localStorage.getItem('activeIglesiaId');
        if (saved) setActiveIglesia(saved);
        setInitialized(true);
      }
      return;
    }

    const assignedId = userData?.iglesia_id;
    const assignedActive = userData?.iglesia_estado === 'activo';

    if (assignedId && assignedActive) {
      setActiveIglesia(assignedId);
      localStorage.setItem('activeIglesiaId', assignedId);
    } else {
      setActiveIglesia(null);
      localStorage.removeItem('activeIglesiaId');
    }

    setInitialized(true);
  }, [authLoading, user, userData, initialized]);

  const updateActiveIglesia = (iglesiaId) => {
    if (!user) return;

    const role = getUserRole(user, userData);
    if (!isSuperAdmin(role)) {
      const assignedId = userData?.iglesia_id;
      if (assignedId && iglesiaId !== assignedId) return;
    }

    setActiveIglesia(iglesiaId);
    if (iglesiaId) {
      localStorage.setItem('activeIglesiaId', iglesiaId);
    } else {
      localStorage.removeItem('activeIglesiaId');
    }
  };

  return (
    <IglesiaContext.Provider value={{ activeIglesia, updateActiveIglesia }}>
      {children}
    </IglesiaContext.Provider>
  );
}
