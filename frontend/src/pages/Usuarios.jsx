import { useEffect, useState, useContext } from 'react';
import { sb } from '../services/supabase';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/usuarios.css';

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
        <h1>User Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? '✕ Cancel' : '+ New User'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card">
          <h2>{editingId ? 'Edit User' : 'Create New User'}</h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="First name"
              />
            </div>

            <div className="form-group">
              <label>Last Name 1</label>
              <input
                type="text"
                value={form.apellido1}
                onChange={e => setForm({ ...form, apellido1: e.target.value })}
                placeholder="Last name"
              />
            </div>

            <div className="form-group">
              <label>Last Name 2</label>
              <input
                type="text"
                value={form.apellido2}
                onChange={e => setForm({ ...form, apellido2: e.target.value })}
                placeholder="Second last name"
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                disabled={!!editingId}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                placeholder="Phone number"
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                value={form.rol}
                onChange={e => setForm({ ...form, rol: e.target.value })}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={form.estado}
                onChange={e => setForm({ ...form, estado: e.target.value })}
              >
                <option value="activo">Active</option>
                <option value="inactivo">Inactive</option>
                <option value="suspendido">Suspended</option>
              </select>
            </div>

            {!editingId && (
              <>
                <div className="form-group">
                  <label>Assign to Church</label>
                  <select
                    value={form.iglesia_id}
                    onChange={e => setForm({ ...form, iglesia_id: e.target.value })}
                  >
                    <option value="">Select a church (optional)</option>
                    {iglesias.map(i => (
                      <option key={i.id} value={i.id}>{i.nombre}</option>
                    ))}
                  </select>
                </div>

                {form.iglesia_id && (
                  <div className="form-group">
                    <label>Role in Church</label>
                    <select
                      value={form.rol_iglesia}
                      onChange={e => setForm({ ...form, rol_iglesia: e.target.value })}
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

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleSave}>
              {editingId ? 'Update User' : 'Create User'}
            </button>
            <button className="btn btn-secondary" onClick={() => {
              setShowForm(false);
              resetForm();
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Users ({usuarios.length})</h2>
        
        {usuarios.length === 0 ? (
          <p className="text-muted">No users found</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Phone</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(usuario => (
                  <tr key={usuario.id}>
                    <td>
                      <strong>{usuario.nombre}</strong>
                      {usuario.apellido1 && ` ${usuario.apellido1}`}
                      {usuario.apellido2 && ` ${usuario.apellido2}`}
                    </td>
                    <td>{usuario.email}</td>
                    <td>
                      <span className={`badge badge-${usuario.rol}`}>
                        {usuario.rol}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${usuario.estado}`}>
                        {usuario.estado}
                      </span>
                    </td>
                    <td>{usuario.telefono || '—'}</td>
                    <td>{new Date(usuario.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-edit"
                          onClick={() => handleEdit(usuario)}
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(usuario.id)}
                          title="Delete"
                        >
                          ✕
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
