import { useEffect, useState } from "react";
import { sb } from "../../../services/supabase";

export default function DatosPersonales({ miembroId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function calcularEdad(fecha) {
    if (!fecha) return "";
    const hoy = new Date();
    const nacimiento = new Date(fecha);

    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();

    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }

    return edad + " años";
  }

  async function load() {
    setLoading(true);
    setError("");
    
    const { data: memberData, error: queryError } = await sb
      .from("miembros")
      .select("*")
      .eq("id", miembroId)
      .single();

    if (queryError) {
      setError("Error loading member data");
      console.error(queryError);
      setData(null);
      setLoading(false);
      return;
    }

    setData(memberData);
    setLoading(false);
  }

  useEffect(() => {
    if (miembroId) load();
  }, [miembroId]);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!data) return <div>No member data found</div>;

  return (
    <div className="perfil">
      <div className="perfil-header">
        {data.foto && (
          <img src={data.foto} alt="foto" className="perfil-foto" />
        )}

        <div>
          <h2>
            {data.nombre} {data.apellido1} {data.apellido2}
          </h2>
          <p>{calcularEdad(data.fecha_nacimiento)}</p>
        </div>
      </div>

      <div className="perfil-grid">
        <div><strong>Fecha de nacimiento:</strong> {data.fecha_nacimiento}</div>
        <div><strong>Género:</strong> {data.genero}</div>
        <div><strong>Identificación:</strong> {data.identificacion}</div>
        <div><strong>Celular:</strong> {data.celular}</div>
        <div><strong>Correo:</strong> {data.email}</div>
        <div><strong>Dirección:</strong> {data.direccion}</div>
      </div>
    </div>
  );
}
