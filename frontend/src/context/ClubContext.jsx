import { createContext, useState, useEffect, useContext } from 'react';
import { IglesiaContext } from './IglesiaContext';

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
