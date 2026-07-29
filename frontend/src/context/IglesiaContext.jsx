import { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { getUserRole, isSuperAdmin } from '../utils/permissions';
import { DEFAULT_CHURCH_TIMEZONE, normalizeChurchTimezone } from '../utils/churchTimezones';
import { fetchIglesiaById, fetchActiveIglesias } from '../mvc/models/iglesias.model';

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
    if (authLoading || !user || activeIglesia) return undefined;

    const role = getUserRole(user, userData);
    if (!isSuperAdmin(role)) return undefined;

    let cancelled = false;

    fetchActiveIglesias().then(({ data, error }) => {
      if (cancelled || error) return;
      const iglesias = data || [];
      if (iglesias.length !== 1) return;
      const iglesia = iglesias[0];
      setActiveIglesia(iglesia.id);
      setActiveIglesiaTimezone(normalizeChurchTimezone(iglesia.timezone));
      localStorage.setItem('activeIglesiaId', iglesia.id);
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, userData, activeIglesia]);

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
