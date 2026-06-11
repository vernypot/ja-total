import { useEffect, useState } from 'react';
import { sb } from '../services/supabase';

export default function Contactos({ miembroId }) {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const { data: contactos, error: queryError } = await sb
      .from("miembro_contactos")
      .select("*")
      .eq("miembro_id", miembroId);
    
    if (queryError) {
      setError("Error loading contacts");
      console.error(queryError);
      return;
    }
    
    setData(contactos || []);
  }

  useEffect(() => {
    if (miembroId) {
      load();
    }
  }, [miembroId]);

  return (
    <div>
      <h2>Contactos</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {data.length === 0 ? (
        <p>No hay contactos registrados</p>
      ) : (
        data.map(contacto => (
          <div key={contacto.id}>
            {contacto.tipo}: {contacto.valor}
          </div>
        ))
      )}
    </div>
  );
}
