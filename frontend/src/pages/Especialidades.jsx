import { useEffect, useState } from 'react';
import { sb } from '../services/supabase';

export default function Especialidades({ miembroId }) {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const { data: especialidades, error: queryError } = await sb
      .from('miembro_especialidad')
      .select('*')
      .eq('miembro_id', miembroId);
    
    if (queryError) {
      setError("Error loading specialties");
      console.error(queryError);
      return;
    }
    
    setData(especialidades || []);
  }

  useEffect(() => {
    if (miembroId) {
      load();
    }
  }, [miembroId]);

  return (
    <div>
      <h2>Especialidades</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {data.length === 0 ? (
        <p>No hay especialidades registradas</p>
      ) : (
        data.map(e => (
          <div key={e.id}>{e.especialidad_id}</div>
        ))
      )}
    </div>
  );
}
