import { useEffect, useState } from "react";
import { sb } from "../services/supabase";
import '../styles/form.css';

export default function ClasesProgresivas() {
  const [data, setData] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [form, setForm] = useState({ nombre: "", tipo_id: "", club_tipo: "" });
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

    if (editingId) {
      const { error: updateError } = await sb
        .from("clases_progresivas")
        .update({
          nombre: form.nombre,
          tipo_id: form.tipo_id,
          club_tipo: form.club_tipo
        })
        .eq("id", editingId);

      if (updateError) {
        setError("Error updating class: " + updateError.message);
        console.error(updateError);
        return;
      }
    } else {
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
    }

    setForm({
      nombre: "",
      tipo_id: "",
      club_tipo: ""
    });
    setEditingId(null);
    setShowForm(false);
    load();
  }

  async function startEdit(clase) {
    setEditingId(clase.id);
    setForm({
      nombre: clase.nombre,
      tipo_id: clase.tipo_id,
      club_tipo: clase.tipos_club?.nombre || ""
    });
    setShowForm(true);
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
    <div className="container">
      <div className="page-header">
        <h1>📚 Clases Progresivas</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              onChange={e => setShowInactive(e.target.checked)}
            />
            Ver inactivas
          </label>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (editingId) {
                setEditingId(null);
                setForm({ nombre: "", tipo_id: "", club_tipo: "" });
              }
            }}
            style={{
              padding: '10px 15px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {showForm ? '✕ Cancelar' : '➕ Nueva Clase'}
          </button>
        </div>

        {showForm && (
          <div style={{
            padding: '15px',
            backgroundColor: '#f0f9ff',
            border: '2px solid #0891b2',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h4 style={{ marginTop: 0 }}>{editingId ? 'Editar Clase' : 'Nueva Clase'}</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nombre *</label>
                <input
                  placeholder="Nombre de la clase"
                  value={form.nombre}
                  onChange={e =>
                    setForm({ ...form, nombre: e.target.value })
                  }
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tipo de Club *</label>
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
                  className="form-input"
                  style={{ margin: 0 }}
                >
                  <option value="">Seleccione tipo de club</option>

                  {tipos.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={save}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✓ Guardar
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm({ nombre: "", tipo_id: "", club_tipo: "" });
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕ Cancelar
              </button>
            </div>
          </div>
        )}

        <h4>Listado de Clases</h4>
        {data.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
            No hay clases registradas
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {data.map(c => (
              <div key={c.id} style={{
                padding: '15px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#fff'
              }}>
                <div>
                  <strong>{c.nombre}</strong>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px' }}>
                    Tipo: {c.tipos_club?.nombre}
                  </div>
                  <span className={`badge badge-${c.estado}`} style={{ marginTop: '8px', display: 'inline-block' }}>
                    {c.estado}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => startEdit(c)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => toggleEstado(c)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: c.estado === 'activo' ? '#dc2626' : '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {c.estado === "activo"
                      ? "❌ Desactivar"
                      : "✓ Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
