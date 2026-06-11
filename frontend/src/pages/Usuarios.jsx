import { useEffect, useState, useContext } from 'react';
import { sb } from '../services/supabase';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/form.css';

export default function Usuarios() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const userRole = user?.user_metadata?.role || 'user';

  const [usuarios, setUsuarios] = useState([]);
  const [iglesias, setIglesias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    nombre: '',
    apellido1: '',
    apellido2: '',
    email: '',
    rol: 'user',
    estado: 'activo',
    telefono: '',
    iglesia_id: '',
    rol_iglesia: 'member'
  });

  // Check permissions
  useEffect(() => {
    if (userRole !== 'superadmin') {
      navigate('/dashboard');
    }
  }, [userRole, navigate]);

  // Load data
  useEffect(() => {
    loadUsuarios();
    loadIglesias();
  }, []);

  async function loadUsuarios() {
    setLoading(true);
    setError('');
    
    const { data, error: queryError } = await sb
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (queryError) {
      setError('Error loading users');
      console.error(queryError);
      return;
    }

    setUsuarios(data || []);
    setLoading(false);
  }

  async function loadIglesias() {
    const { data, error: queryError } = await sb
      .from('iglesias')
      .select('id, nombre')
      .eq('estado', 'activo');

    if (queryError) {
      console.error('Error loading churches:', queryError);
      return;
    }

    setIglesias(data || []);
  }

  async function handleSave() {
    setError('');
    setSuccess('');

    if (!form.nombre || !form.email) {
      setError('Name and email are required');
      return;
    }

    try {
      let result;
      if (editingId) {
        result = await sb
          .from('usuarios')
          .update({
            nombre: form.nombre,
            apellido1: form.apellido1,
            apellido2: form.apellido2,
            rol: form.rol,
            estado: form.estado,
            telefono: form.telefono,
            updated_at: new Date()
          })
          .eq('id', editingId);
      } else {
        result = await sb
          .from('usuarios')
          .insert([{
            nombre: form.nombre,
            apellido1: form.apellido1,
            apellido2: form.apellido2,
            email: form.email,
            rol: form.rol,
            estado: form.estado,
            telefono: form.telefono
          }]);
      }

      if (result.error) {
        setError('Error saving user: ' + result.error.message);
        return;
      }

      // Assign to church if selected
      if (form.iglesia_id && !editingId) {
        const userId = result.data[0].id;
        const { error: assignError } = await sb
          .from('usuario_iglesia')
          .insert([{
            usuario_id: userId,
            iglesia_id: form.iglesia_id,
            rol_iglesia: form.rol_iglesia
          }]);

        if (assignError) {
          console.error('Error assigning to church:', assignError);
        }
      }

      setSuccess(editingId ? 'User updated successfully' : 'User created successfully');
      resetForm();
      loadUsuarios();
      setShowForm(false);
    } catch (err) {
      setError('Unexpected error: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    setError('');
    const { error: queryError } = await sb
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (queryError) {
      setError('Error deleting user: ' + queryError.message);
      return;
    }

    setSuccess('User deleted successfully');
    loadUsuarios();
  }

  async function handleEdit(usuario) {
    setEditingId(usuario.id);
    setForm({
      nombre: usuario.nombre,
      apellido1: usuario.apellido1 || '',
      apellido2: usuario.apellido2 || '',
      email: usuario.email,
      rol: usuario.rol,
      estado: usuario.estado,
      telefono: usuario.telefono || '',
      iglesia_id: '',
      rol_iglesia: 'member'
    });
    setShowForm(true);
  }

  function resetForm() {
    setForm({
      nombre: '',
      apellido1: '',
      apellido2: '',
      email: '',
      rol: 'user',
      estado: 'activo',
      telefono: '',
      iglesia_id: '',
      rol_iglesia: 'member'
    });
    setEditingId(null);
  }

  if (loading) {
    return <div className="container"><div className="loading">Loading users...</div></div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>🔑 User Management</h1>
        <button 
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
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? '✕ Cancelar' : '➕ Nuevo Usuario'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card" style={{
          padding: '20px',
          backgroundColor: '#f0f9ff',
          border: '2px solid #0891b2',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? '✏️ Editar Usuario' : '➕ Crear Nuevo Usuario'}</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre"
                className="form-input"
                style={{ margin: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Apellido 1</label>
              <input
                type="text"
                value={form.apellido1}
                onChange={e => setForm({ ...form, apellido1: e.target.value })}
                placeholder="Primer apellido"
                className="form-input"
                style={{ margin: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Apellido 2</label>
              <input
                type="text"
                value={form.apellido2}
                onChange={e => setForm({ ...form, apellido2: e.target.value })}
                placeholder="Segundo apellido"
                className="form-input"
                style={{ margin: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                className="form-input"
                disabled={!!editingId}
                style={{ margin: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Teléfono</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                placeholder="Teléfono"
                className="form-input"
                style={{ margin: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Rol</label>
              <select
                value={form.rol}
                onChange={e => setForm({ ...form, rol: e.target.value })}
                className="form-input"
                style={{ margin: 0 }}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Estado</label>
              <select
                value={form.estado}
                onChange={e => setForm({ ...form, estado: e.target.value })}
                className="form-input"
                style={{ margin: 0 }}
              >
                <option value="activo">Active</option>
                <option value="inactivo">Inactive</option>
                <option value="suspendido">Suspended</option>
              </select>
            </div>

            {!editingId && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Iglesia (Opcional)</label>
                  <select
                    value={form.iglesia_id}
                    onChange={e => setForm({ ...form, iglesia_id: e.target.value })}
                    className="form-input"
                    style={{ margin: 0 }}
                  >
                    <option value="">Seleccionar iglesia...</option>
                    {iglesias.map(i => (
                      <option key={i.id} value={i.id}>{i.nombre}</option>
                    ))}
                  </select>
                </div>

                {form.iglesia_id && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Rol en Iglesia</label>
                    <select
                      value={form.rol_iglesia}
                      onChange={e => setForm({ ...form, rol_iglesia: e.target.value })}
                      className="form-input"
                      style={{ margin: 0 }}
                    >
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
            <button 
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              ✓ {editingId ? 'Actualizar' : 'Crear'}
            </button>
            <button 
              onClick={() => {
                setShowForm(false);
                resetForm();
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

      <div className="card">
        <h3 style={{ marginTop: 0 }}>👥 Usuarios ({usuarios.length})</h3>
        
        {usuarios.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No users found</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Nombre</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Rol</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Estado</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Teléfono</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Creado</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Acciones</th>
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
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: usuario.rol === 'superadmin' ? '#fecaca' : usuario.rol === 'admin' ? '#fbbf24' : '#d1d5db',
                        color: usuario.rol === 'superadmin' ? '#7f1d1d' : usuario.rol === 'admin' ? '#78350f' : '#374151'
                      }}>
                        {usuario.rol}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: usuario.estado === 'activo' ? '#bbf7d0' : usuario.estado === 'inactivo' ? '#d1d5db' : '#fed7aa',
                        color: usuario.estado === 'activo' ? '#065f46' : usuario.estado === 'inactivo' ? '#374151' : '#7c2d12'
                      }}>
                        {usuario.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{usuario.telefono || '—'}</td>
                    <td style={{ padding: '12px' }}>{new Date(usuario.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(usuario)}
                          title="Edit"
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
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(usuario.id)}
                          title="Delete"
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
