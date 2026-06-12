import { useEffect, useState } from 'react';
import * as MiembrosModel from '../models/miembros.model';

export function calcularEdad(fecha) {
  if (!fecha) return '';
  const hoy = new Date();
  const nacimiento = new Date(fecha);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad + ' años';
}

export function useDatosPersonalesController(miembroId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');

    const { data: memberData, error: queryError } = await MiembrosModel.fetchMiembroById(miembroId);

    if (queryError) {
      setError('Error loading member data');
      setData(null);
    } else {
      setData(memberData);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (miembroId) load();
  }, [miembroId]);

  return { data, error, loading, calcularEdad };
}
