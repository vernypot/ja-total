import { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { getUserRole, isSuperAdmin } from '../utils/permissions';
import { DEFAULT_CHURCH_TIMEZONE, normalizeChurchTimezone } from '../utils/churchTimezones';
import { fetchIglesiaById } from '../mvc/models/iglesias.model';

export const IglesiaContext = createContext();

export function IglesiaProvider({ children }) {
  const { user, userData, loading: authLoading } = useContext(AuthContext);
  const [activeIglesia, setActiveIglesia] = useState(null);
  const [activeIglesiaTimezone, setActiveIglesiaTimezone] = useState(DEFAULT_CHURCH_TIMEZONE);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setActiveIglesia(null);
      setActiveIglesiaTimezone(DEFAULT_CHURCH_TIMEZONE);
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

  useEffect(() => {
    if (!activeIglesia) {
      setActiveIglesiaTimezone(DEFAULT_CHURCH_TIMEZONE);
      return undefined;
    }

    let cancelled = false;
    fetchIglesiaById(activeIglesia).then(({ data }) => {
      if (!cancelled) {
        setActiveIglesiaTimezone(normalizeChurchTimezone(data?.timezone));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeIglesia]);

  const updateActiveIglesia = (iglesiaId, timezone = null) => {
    if (!user) return;

    const role = getUserRole(user, userData);
    if (!isSuperAdmin(role)) {
      const assignedId = userData?.iglesia_id;
      if (assignedId && iglesiaId !== assignedId) return;
    }

    setActiveIglesia(iglesiaId);
    if (timezone) {
      setActiveIglesiaTimezone(normalizeChurchTimezone(timezone));
    }
    if (iglesiaId) {
      localStorage.setItem('activeIglesiaId', iglesiaId);
    } else {
      localStorage.removeItem('activeIglesiaId');
    }
  };

  return (
    <IglesiaContext.Provider value={{ activeIglesia, activeIglesiaTimezone, updateActiveIglesia }}>
      {children}
    </IglesiaContext.Provider>
  );
}
