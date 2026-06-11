import { useEffect, useState, useContext } from "react";
import { sb } from "../services/supabase";
import { AuthContext } from "../context/AuthContext";
import { IglesiaContext } from "../context/IglesiaContext";
import "../styles/form.css";

export default function Clubes() {
  const { user } = useContext(AuthContext);
  const { activeIglesia } = useContext(IglesiaContext);
  const userRole = user?.user_metadata?.role || 'user';
  const [data, setData] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nombre: "", iglesia_id: "" });
  const [activeIglesiaData, setActiveIglesiaData] = useState(null);

  const canAddClub = userRole === 'superadmin';

  async function load() {
    setError("");
    
    if (!activeIglesia) {
      setData([]);
      return;
    }

    let query = sb
      .from("clubes")
      .select("id, nombre, iglesia_id, estado, created_at")
      .eq("iglesia_id", activeIglesia);

    if (!showInactive) {
      query = query.eq("estado", "activo");
    }

    const { data: clubsData, error: clubsError } = await query;

    if (clubsError) {
      setError("Error loading clubs");
      console.error(clubsError);
      setData([]);
      return;
    }

    setData(clubsData || []);
  }

  async function loadActiveIglesia() {
    if (activeIglesia) {
      const { data: igData } = await sb
        .from("iglesias")
        .select("id, nombre")
        .eq("id", activeIglesia)
        .single();
      
      if (igData) {
        setActiveIglesiaData(igData);
      }
    }
  }

  async function save() {
    if (!canAddClub) {
      alert("Solo superadmin puede agregar clubes");
      return;
    }

    setError("");

    if (!form.nombre || !activeIglesia) {
      setError("Complete all required fields");
      return;
    }

    if (editingId) {
      const { error: updateError } = await sb
        .from("clubes")
        .update({
          nombre: form.nombre
        })
        .eq("id", editingId);

      if (updateError) {
        setError("Error updating club: " + updateError.message);
        console.error(updateError);
        return;
      }
    } else {
      const { error: saveError } = await sb.from("clubes").insert([
        {
          nombre: form.nombre,
          iglesia_id: activeIglesia,
          estado: "activo"
        }
      ]);

      if (saveError) {
        setError("Error saving club: " + saveError.message);
        console.error(saveError);
        return;
      }
    }

    setForm({ nombre: "", iglesia_id: "" });
    setEditingId(null);
    setShowForm(false);
    load();
  }

  async function startEdit(club) {
    if (!canAddClub) {
      alert("Solo superadmin puede editar clubes");
      return;
    }

    setEditingId(club.id);
    setForm({
      nombre: club.nombre,
      iglesia_id: club.iglesia_id
    });
    setShowForm(true);
  }

  async function toggleEstado(club) {
    if (!canAddClub) {
      alert("Solo superadmin puede cambiar estado");
      return;
    }

    setError("");
    const nuevo = club.estado === "activo" ? "inactivo" : "activo";

    const { error: updateError } = await sb
      .from("clubes")
      .update({ estado: nuevo })
      .eq("id", club.id);

    if (updateError) {
      setError("Error updating club status");
      console.error(updateError);
      return;
    }

    load();
  }

  useEffect(() => {
    load();
  }, [activeIglesia, showInactive]);

  useEffect(() => {
    loadActiveIglesia();
  }, [activeIglesia]);

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>🎪 Clubes</h1>
          {activeIglesiaData && (
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: "14px" }}>
              Church: <strong>{activeIglesiaData.nombre}</strong>
            </p>
          )}
        </div>
        {canAddClub && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (editingId) {
                setEditingId(null);
                setForm({ nombre: "", iglesia_id: "" });
              }
            }}
            style={{
              padding: "10px 15px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold"
            }}
          >
            {showForm ? "✕ Cancelar" : "➕ Nuevo Club"}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              onChange={e => setShowInactive(e.target.checked)}
            />
            Ver inactivos
          </label>
        </div>

        {showForm && canAddClub && (
          <div
            style={{
              padding: "15px",
              backgroundColor: "#f0f9ff",
              border: "2px solid #0891b2",
              borderRadius: "8px",
              marginBottom: "20px"
            }}
          >
            <h4 style={{ marginTop: 0 }}>
              {editingId ? "Editar Club" : "Nuevo Club"}
            </h4>

            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "bold"
                }}
              >
                Nombre *
              </label>
              <input
                placeholder="Nombre del club"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="form-input"
                style={{ margin: 0 }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={save}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                ✓ Guardar
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm({ nombre: "", iglesia_id: "" });
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                ✕ Cancelar
              </button>
            </div>
          </div>
        )}

        <h4>Listado de Clubes</h4>
        {data.length === 0 ? (
          <p className="text-muted" style={{ textAlign: "center", padding: "20px" }}>
            No hay clubes registrados
          </p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {data.map(c => (
              <div
                key={c.id}
                style={{
                  padding: "15px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#fff"
                }}
              >
                <div>
                  <strong>{c.nombre}</strong>
                  <span
                    className={`badge badge-${c.estado}`}
                    style={{ marginLeft: "10px" }}
                  >
                    {c.estado}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {canAddClub && (
                    <>
                      <button
                        onClick={() => startEdit(c)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#2563eb",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => toggleEstado(c)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor:
                            c.estado === "activo" ? "#dc2626" : "#16a34a",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        {c.estado === "activo" ? "❌ Desactivar" : "✓ Activar"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
