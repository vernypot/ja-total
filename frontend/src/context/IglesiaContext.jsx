import { createContext, useState, useEffect } from 'react';

export const IglesiaContext = createContext();

export function IglesiaProvider({ children }) {
  const [activeIglesia, setActiveIglesia] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('activeIglesiaId');
    if (saved) {
      setActiveIglesia(saved);
    }
  }, []);

  // Save to localStorage whenever it changes
  const updateActiveIglesia = (iglesiaId) => {
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
