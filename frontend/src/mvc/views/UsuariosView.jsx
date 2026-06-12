import PasswordReset from '../../components/PasswordReset';
import '../../styles/form.css';

export default function UsuariosView({
  usuarios,
  iglesias,
  loading,
  error,
  success,
  showForm,
  setShowForm,
  editingId,
  showPasswordReset,
  selectedUserEmail,
  form,
  setForm,
  handleSave,
  handleDelete,
  handleEdit,
  resetForm,
  openPasswordReset,
  closePasswordReset,
}) {
  if (loading) {
    return <div className="container"><div className="loading">Loading users...</div></div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>🔑 User Management</h1>
        <button
          style={{ padding: '10px 15px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
          onClick={() => { resetForm(); setShowForm(!showForm); }}
        >
          {showForm ? '✕ Cancelar' : '➕ Nuevo Usuario'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card" style={{ padding: '20px', backgroundColor: '#f0f9ff', border: '2px solid #0891b2', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? '✏️ Editar Usuario' : '➕ Crear Nuevo Usuario'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            {['nombre', 'apellido1', 'apellido2', 'email', 'telefono'].map(field => (
              <div key={field}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{field}{field === 'nombre' || field === 'email' ? ' *' : ''}</label>
                <input
                  type={field === 'email' ? 'email' : field === 'telefono' ? 'tel' : 'text'}
                  value={form[field]}
                  onChange={e => setForm({ ...form, [field]: e.target.value })}
                  placeholder={field}
                  className="form-input"
                  disabled={field === 'email' && !!editingId}
                  style={{ margin: 0 }}
                />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Rol</label>
              <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })} className="form-input" style={{ margin: 0 }}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Estado</label>
              <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="form-input" style={{ margin: 0 }}>
                <option value="activo">Active</option>
                <option value="inactivo">Inactive</option>
                <option value="suspendido">Suspended</option>
              </select>
            </div>
            {!editingId && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Iglesia (Opcional)</label>
                  <select value={form.iglesia_id} onChange={e => setForm({ ...form, iglesia_id: e.target.value })} className="form-input" style={{ margin: 0 }}>
                    <option value="">Seleccionar iglesia...</option>
                    {iglesias.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                </div>
                {form.iglesia_id && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Rol en Iglesia</label>
                    <select value={form.rol_iglesia} onChange={e => setForm({ ...form, rol_iglesia: e.target.value })} className="form-input" style={{ margin: 0 }}>
                      <option value="member">Member</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSave} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
              ✓ {editingId ? 'Actualizar' : 'Crear'}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
              ✕ Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>👥 Usuarios ({usuarios.length})</h3>
        {usuarios.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No users found</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                  {['Nombre', 'Email', 'Rol', 'Estado', 'Teléfono', 'Creado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px', textAlign: h === 'Acciones' ? 'center' : 'left', fontWeight: 'bold' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(usuario => (
                  <tr key={usuario.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>
                      <strong>{usuario.nombre}</strong>
                      {usuario.apellido1 && ` ${usuario.apellido1}`}
                      {usuario.apellido2 && ` ${usuario.apellido2}`}
                    </td>
                    <td style={{ padding: '12px' }}>{usuario.email}</td>
                    <td style={{ padding: '12px' }}>{usuario.rol}</td>
                    <td style={{ padding: '12px' }}>{usuario.estado}</td>
                    <td style={{ padding: '12px' }}>{usuario.telefono || '—'}</td>
                    <td style={{ padding: '12px' }}>{new Date(usuario.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => handleEdit(usuario)} title="Edit">✏️</button>
                        <button onClick={() => openPasswordReset(usuario.email)} title="Reset Password">🔑</button>
                        <button onClick={() => handleDelete(usuario.id)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPasswordReset && (
        <PasswordReset onClose={closePasswordReset} userEmail={selectedUserEmail} isOwnPassword={false} />
      )}
    </div>
  );
}
