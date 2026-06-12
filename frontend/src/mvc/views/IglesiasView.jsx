import '../../styles/form.css';

export default function IglesiasView({
  data,
  iglesiaData,
  activeIglesia,
  nombre,
  setNombre,
  showInactive,
  setShowInactive,
  error,
  loading,
  editingId,
  setEditingId,
  editingNombre,
  setEditingNombre,
  canCreate,
  save,
  startEdit,
  saveEdit,
  toggleEstado,
  selectIglesia,
  navigateToClubes,
}) {
  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>⛪ Iglesias</h1>
          {iglesiaData && (
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
              Active: <strong>{iglesiaData.nombre}</strong>
            </p>
          )}
        </div>
        {canCreate && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre de iglesia"
              className="form-input"
              onKeyPress={e => e.key === 'Enter' && save()}
              style={{ minWidth: '200px' }}
            />
            <button onClick={save} className="btn btn-primary btn-sm">➕ Agregar</button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inactivas
          </label>
        </div>

        {loading ? (
          <div className="loading">Cargando iglesias...</div>
        ) : data.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay iglesias registradas</p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {data.map(i => (
              <div key={i.id} style={{
                padding: '15px',
                border: activeIglesia === i.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: activeIglesia === i.id ? '#dbeafe' : '#fff',
                transition: 'all 0.2s',
              }} className="hover-shadow">
                <div style={{ flex: 1 }}>
                  {editingId === i.id ? (
                    <input
                      type="text"
                      value={editingNombre}
                      onChange={e => setEditingNombre(e.target.value)}
                      className="form-input"
                      style={{ marginBottom: '8px' }}
                    />
                  ) : (
                    <strong>{i.nombre}</strong>
                  )}
                  <span className={`badge badge-${i.estado}`} style={{ marginLeft: '10px' }}>
                    {i.estado}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {editingId === i.id ? (
                    <>
                      <button onClick={saveEdit} className="btn btn-sm btn-success">✓ Guardar</button>
                      <button onClick={() => setEditingId(null)} className="btn btn-sm btn-secondary">✕ Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => selectIglesia(i)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: activeIglesia === i.id ? '#1e40af' : '#0891b2',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        ★ Select
                      </button>
                      <button onClick={() => startEdit(i)} className="btn btn-sm btn-edit">✏️ Editar</button>
                      <button onClick={() => navigateToClubes(i.id)} className="btn btn-sm btn-edit">🎯 Clubes</button>
                      <button
                        onClick={() => toggleEstado(i)}
                        className={`btn btn-sm ${i.estado === 'activo' ? 'btn-danger' : 'btn-success'}`}
                      >
                        {i.estado === 'activo' ? '❌ Desactivar' : '✓ Activar'}
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
