import { useEffect, useState } from "react";
import { sb } from "../services/supabase";

export default function ClasesProgresivas() {
  const [data, setData] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [form, setForm] = useState({ nombre: "", tipo_id: "", club_tipo: "" });
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    
    let query = sb
      .from("clases_progresivas")
      .select("id,nombre,tipo_id,estado,created_at,tipos_club(nombre)");

    if (!showInactive) {
      query = query.eq("estado", "activo");
    }

    const { data: clasesData, error: clasesError } = await query;

    if (clasesError) {
      setError("Error loading classes");
      console.error(clasesError);
      setData([]);
      return;
    }

    const { data: tiposData, error: tiposError } = await sb
      .from("tipos_club")
      .select("id,nombre");

    if (tiposError) {
      setError("Error loading club types");
      console.error(tiposError);
      setTipos([]);
      return;
    }

    setData(clasesData || []);
    setTipos(tiposData || []);
  }

  async function save() {
    setError("");
    
    if (!form.nombre || !form.tipo_id) {
      setError("Complete all required fields");
      return;
    }

    const { error: saveError } = await sb.from("clases_progresivas").insert([
      {
        nombre: form.nombre,
        tipo_id: form.tipo_id,
        club_tipo: form.club_tipo,
        estado: "activo"
      }
    ]);

    if (saveError) {
      setError("Error saving class: " + saveError.message);
      console.error(saveError);
      return;
    }

    setForm({
      nombre: "",
      tipo_id: "",
      club_tipo: ""
    });

    load();
  }

  async function toggleEstado(clase) {
    setError("");
    const nuevo =
      clase.estado === "activo" ? "inactivo" : "activo";

    const { error: updateError } = await sb
      .from("clases_progresivas")
      .update({ estado: nuevo })
      .eq("id", clase.id);

    if (updateError) {
      setError("Error updating class status");
      console.error(updateError);
      return;
    }

    load();
  }

  useEffect(() => {
    load();
  }, [showInactive]);

  return (
    <div>
      <h2>Clases Progresivas</h2>

      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      <label>
        <input
          type="checkbox"
          onChange={e => setShowInactive(e.target.checked)}
        />
        Ver inactivas
      </label>

      <div className="card">
        <h4>Nueva Clase</h4>

        <input
          placeholder="Nombre de la clase"
          value={form.nombre}
          onChange={e =>
            setForm({ ...form, nombre: e.target.value })
          }
        />

        <select
        value={form.tipo_id}
        onChange={e => {
            const selected = tipos.find(
            t => t.id === e.target.value
            );

            setForm({
            ...form,
            tipo_id: selected.id,
            club_tipo: selected.nombre
            });
        }}
        >
        <option value="">Seleccione tipo de club</option>

        {tipos.map(t => (
            <option key={t.id} value={t.id}>
            {t.nombre}
            </option>
        ))}
        </select>

        <button onClick={save}>Guardar</button>
      </div>

      <div className="card">
        <h4>Listado</h4>

        {data.map(c => (
          <div key={c.id} className="row">
            <span>
              {c.nombre} ({c.tipos_club?.nombre}) [
              {c.estado}]
            </span>

            <button onClick={() => toggleEstado(c)}>
              {c.estado === "activo"
                ? "Desactivar"
                : "Activar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
