import { createContext, useState, useEffect, useContext } from 'react';
import { IglesiaContext } from './IglesiaContext';
import { fetchClubesByIglesia } from '../mvc/models/clubes.model';

export const ClubContext = createContext();

function readStoredClub() {
  try {
    const saved = localStorage.getItem('activeClub');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function ClubProvider({ children }) {
  const { activeIglesia } = useContext(IglesiaContext);
  const [activeClub, setActiveClub] = useState(readStoredClub);

  useEffect(() => {
    if (activeClub) {
      localStorage.setItem('activeClub', JSON.stringify(activeClub));
    } else {
      localStorage.removeItem('activeClub');
    }
  }, [activeClub]);

  useEffect(() => {
    if (activeClub?.iglesia_id && activeIglesia && activeClub.iglesia_id !== activeIglesia) {
      setActiveClub(null);
    }
  }, [activeIglesia, activeClub?.iglesia_id]);

  useEffect(() => {
    if (!activeIglesia) return undefined;

    let cancelled = false;

    fetchClubesByIglesia(activeIglesia).then(({ data, error }) => {
      if (cancelled || error) return;

      const clubs = data || [];
      if (clubs.length !== 1) return;

      const onlyClub = clubs[0];
      setActiveClub(current => {
        if (current?.id === onlyClub.id && current?.iglesia_id === activeIglesia) {
          return current;
        }
        return {
          id: onlyClub.id,
          nombre: onlyClub.nombre,
          tipoNombre: onlyClub.tipos_club?.nombre || '',
          tipoId: onlyClub.tipo_id || null,
          logoUrl: onlyClub.logo_url || null,
          tipoLogoUrl: onlyClub.tipos_club?.logo_url || null,
          iglesia_id: onlyClub.iglesia_id || activeIglesia,
        };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [activeIglesia]);

  function updateActiveClub(club) {
    if (!club?.id) return;
    setActiveClub({
      id: club.id,
      nombre: club.nombre,
      tipoNombre: club.tipos_club?.nombre || club.tipoNombre || '',
      tipoId: club.tipo_id || club.tipoId || null,
      logoUrl: club.logo_url || null,
      tipoLogoUrl: club.tipos_club?.logo_url || null,
      iglesia_id: club.iglesia_id || activeIglesia || null,
    });
  }

  function clearActiveClub() {
    setActiveClub(null);
  }

  return (
    <ClubContext.Provider value={{ activeClub, updateActiveClub, clearActiveClub }}>
      {children}
    </ClubContext.Provider>
  );
}
