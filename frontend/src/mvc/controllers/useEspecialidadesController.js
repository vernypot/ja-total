import { useEffect, useState } from 'react';
import * as EspecialidadesModel from '../models/especialidades.model';

export function useEspecialidadesController(miembroId) {
  const [data, setData] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    const { data: rows, error: queryError } = await EspecialidadesModel.fetchEspecialidadesByMiembro(miembroId);

    if (queryError) {
      setError('Error loading specialties');
      return;
    }

    setData(rows || []);
  }

  useEffect(() => {
    if (miembroId) load();
  }, [miembroId]);

  return { data, error };
}
