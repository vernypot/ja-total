import '../../styles/form.css';

export default function MiembrosView({
  data,
  clubsData,
  showInactive,
  setShowInactive,
  activeIglesiaData,
  clubId,
  canManage,
  toggleEstado,
  navigateToMiembro,
  navigateToNewMiembro,
  filterByClub,
}) {
  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>👥 Miembros</h1>
          {activeIglesiaData && (
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
              Church: <strong>{activeIglesiaData.nombre}</strong>
            </p>
          )}
        </div>
        {canManage && (
          <button
            onClick={navigateToNewMiembro}
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
            ➕ Nuevo Miembro
          </button>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" onChange={e => setShowInactive(e.target.checked)} />
              Mostrar inactivos
            </label>
            {clubsData.length > 0 && (
              <select
                value={clubId || ''}
                onChange={e => filterByClub(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="">Todos los clubes</option>
                {clubsData.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {data.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay miembros registrados</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {data.map(x => {
              const m = x.miembros;
              if (!showInactive && m.estado !== 'activo') return null;
              const nombreCompleto = [m.nombre, m.apellido1, m.apellido2].filter(Boolean).join(' ');

              return (
                <div key={m.id} style={{
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
                    <strong>{nombreCompleto}</strong>
                    <span className={`badge badge-${m.estado}`} style={{ marginLeft: '10px' }}>{m.estado}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => navigateToMiembro(m.id)} className="btn btn-sm btn-edit">✏️ Editar</button>
                    {canManage && (
                      <button
                        onClick={() => toggleEstado(m)}
                        className={`btn btn-sm ${m.estado === 'activo' ? 'btn-danger' : 'btn-success'}`}
                      >
                        {m.estado === 'activo' ? '❌ Desactivar' : '✓ Activar'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
