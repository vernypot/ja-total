import '../../styles/form.css';

export default function ClubesView({
  data,
  iglesiasData,
  activeIglesiaData,
  showInactive,
  setShowInactive,
  error,
  loading,
  showForm,
  setShowForm,
  clubForm,
  setClubForm,
  tipos,
  addClub,
  toggleEstado,
  navigateToMiembros,
}) {
  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>🎯 Clubes</h1>
          {activeIglesiaData && (
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
              Church: <strong>{activeIglesiaData.nombre}</strong>
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 15px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {showForm ? '✕ Cancelar' : '➕ Nuevo Club'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inactivos
          </label>
        </div>

        {showForm && (
          <div style={{
            padding: '15px',
            backgroundColor: '#f0f9ff',
            border: '2px solid #0891b2',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <h4 style={{ marginTop: 0 }}>Agregar Nuevo Club</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nombre</label>
                <input
                  type="text"
                  value={clubForm.nombre}
                  onChange={e => setClubForm({ ...clubForm, nombre: e.target.value })}
                  placeholder="Nombre del club"
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Iglesia</label>
                <select
                  value={clubForm.iglesia_id}
                  onChange={e => setClubForm({ ...clubForm, iglesia_id: e.target.value })}
                  className="form-input"
                  style={{ margin: 0 }}
                >
                  <option value="">Seleccione iglesia</option>
                  {iglesiasData.map(iglesia => (
                    <option key={iglesia.id} value={iglesia.id}>{iglesia.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tipo de Club</label>
                <select
                  value={clubForm.tipo_id}
                  onChange={e => setClubForm({ ...clubForm, tipo_id: e.target.value })}
                  className="form-input"
                  style={{ margin: 0 }}
                >
                  <option value="">Seleccione tipo</option>
                  {tipos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={addClub} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                ✓ Guardar
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                ✕ Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">Cargando clubes...</div>
        ) : data.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay clubes registrados</p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {data.map(c => (
              <div key={c.id} style={{
                padding: '15px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#fff',
                transition: 'all 0.2s',
              }} className="hover-shadow">
                <div>
                  <strong>{c.nombre}</strong>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px' }}>
                    {c.tipos_club?.nombre && `Tipo: ${c.tipos_club.nombre}`}
                  </div>
                  <span className={`badge badge-${c.estado}`} style={{ marginTop: '8px', display: 'inline-block' }}>
                    {c.estado}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => navigateToMiembros(c.id)} className="btn btn-sm btn-edit">👥 Miembros</button>
                  <button
                    onClick={() => toggleEstado(c)}
                    className={`btn btn-sm ${c.estado === 'activo' ? 'btn-danger' : 'btn-success'}`}
                  >
                    {c.estado === 'activo' ? '❌ Desactivar' : '✓ Activar'}
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
