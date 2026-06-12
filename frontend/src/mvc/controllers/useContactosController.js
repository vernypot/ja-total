import { useEffect, useState } from 'react';
import * as ContactosModel from '../models/contactos.model';

export function useContactosController(miembroId) {
  const [data, setData] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    const { data: contactos, error: queryError } = await ContactosModel.fetchContactosByMiembro(miembroId);

    if (queryError) {
      setError('Error loading contacts');
      return;
    }

    setData(contactos || []);
  }

  useEffect(() => {
    if (miembroId) load();
  }, [miembroId]);

  return { data, error };
}
