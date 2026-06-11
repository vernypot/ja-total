import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { sb } from '../services/supabase';
import PasswordReset from '../components/PasswordReset';
import '../styles/form.css';

export default function UserProfile() {
  const { user, logout } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido1: '',
    apellido2: '',
    telefono: ''
  });

  useEffect(() => {
    async function loadUserData() {
      setError('');
      try {
        if (!user?.id || !user?.email) {
          setError('User not found');
          setLoading(false);
          return;
        }

        // First, try to fetch user data from usuarios table
        const { data, error: queryError } = await sb
          .from('usuarios')
          .select('id, email, nombre, apellido1, apellido2, telefono, rol, estado')
          .eq('email', user.email)
          .single();

        if (queryError) {
          console.error('Query error:', queryError);
          // If query fails (RLS or not found), use auth user data as fallback
          setUserData({
            id: user.id,
            email: user.email,
            nombre: user.user_metadata?.nombre || 'N/A',
            apellido1: user.user_metadata?.apellido1 || 'N/A',
            apellido2: user.user_metadata?.apellido2 || 'N/A',
            telefono: user.user_metadata?.telefono || 'N/A',
            rol: user.user_metadata?.role || 'user',
            estado: user.user_metadata?.estado || 'activo'
          });
        } else if (data) {
          setUserData(data);
        } else {
          // No data returned
          setUserData({
            id: user.id,
            email: user.email,
            nombre: 'N/A',
            apellido1: 'N/A',
            apellido2: 'N/A',
            telefono: 'N/A',
            rol: user.user_metadata?.role || 'user',
            estado: 'activo'
          });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        // Use auth user data as fallback
        setUserData({
          id: user.id,
          email: user.email,
          nombre: user.user_metadata?.nombre || 'N/A',
          apellido1: user.user_metadata?.apellido1 || 'N/A',
          apellido2: user.user_metadata?.apellido2 || 'N/A',
          telefono: user.user_metadata?.telefono || 'N/A',
          rol: user.user_metadata?.role || 'user',
          estado: user.user_metadata?.estado || 'activo'
        });
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [user]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing, reset form
      setFormData({
        nombre: userData?.nombre || '',
        apellido1: userData?.apellido1 || '',
        apellido2: userData?.apellido2 || '',
        telefono: userData?.telefono || ''
      });
      setError('');
      setSuccess('');
      setIsEditing(false);
    } else {
      // Enter edit mode
      setFormData({
        nombre: userData?.nombre || '',
        apellido1: userData?.apellido1 || '',
        apellido2: userData?.apellido2 || '',
        telefono: userData?.telefono || ''
      });
      setIsEditing(true);
      setError('');
      setSuccess('');
    }
  };

  const handleSaveProfile = async () => {
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      if (!userData?.id) {
        setError('User ID not found');
        setIsSaving(false);
        return;
      }

      const { error: updateError } = await sb
        .from('usuarios')
        .update({
          nombre: formData.nombre,
          apellido1: formData.apellido1,
          apellido2: formData.apellido2,
          telefono: formData.telefono,
          updated_at: new Date()
        })
        .eq('id', userData.id);

      if (updateError) {
        setError('Error saving profile: ' + updateError.message);
        console.error(updateError);
        setIsSaving(false);
        return;
      }

      // Update local state
      setUserData({
        ...userData,
        nombre: formData.nombre,
        apellido1: formData.apellido1,
        apellido2: formData.apellido2,
        telefono: formData.telefono
      });

      setSuccess('✓ Profile updated successfully');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error: ' + err.message);
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '40px' }}>
        <p>Loading profile...</p>
      </div>
    );
  }

  const roleColors = {
    superadmin: '#dc2626',
    admin: '#2563eb',
    user: '#16a34a'
  };

  const estadoColors = {
    activo: '#16a34a',
    inactivo: '#6b7280',
    suspendido: '#dc2626'
  };

  const userRole = userData?.rol || 'user';
  const userEstado = userData?.estado || 'activo';

  return (
    <div className="container">
      <div className="page-header">
        <h1>👤 Mi Perfil</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {userData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Profile Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Información Personal</h3>
              <button
                onClick={handleEditToggle}
                style={{
                  padding: '6px 12px',
                  backgroundColor: isEditing ? '#6b7280' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                {isEditing ? '✕ Cancelar' : '✏️ Editar'}
              </button>
            </div>

            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>
                  Email
                </label>
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#999'
                }}>
                  {userData.email} <span style={{ fontSize: '0.75rem' }}>(no editable)</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>
                  Nombre
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ingrese su nombre"
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                ) : (
                  <div style={{
                    padding: '10px 12px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    {userData.nombre || 'N/A'}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>
                  Primer Apellido
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.apellido1}
                    onChange={(e) => setFormData({ ...formData, apellido1: e.target.value })}
                    placeholder="Ingrese su primer apellido"
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                ) : (
                  <div style={{
                    padding: '10px 12px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    {userData.apellido1 || 'N/A'}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>
                  Segundo Apellido
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.apellido2}
                    onChange={(e) => setFormData({ ...formData, apellido2: e.target.value })}
                    placeholder="Ingrese su segundo apellido"
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                ) : (
                  <div style={{
                    padding: '10px 12px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    {userData.apellido2 || 'N/A'}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>
                  Teléfono
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="Ingrese su teléfono"
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                ) : (
                  <div style={{
                    padding: '10px 12px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    {userData.telefono || 'N/A'}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>
                    Rol
                  </label>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: roleColors[userRole] || '#6b7280',
                      color: 'white',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      display: 'inline-block'
                    }}
                  >
                    {userRole.toUpperCase()}
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>
                    Estado
                  </label>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: estadoColors[userEstado] || '#6b7280',
                      color: 'white',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      display: 'inline-block',
                      textTransform: 'capitalize'
                    }}
                  >
                    {userEstado}
                  </span>
                </div>
              </div>

              {isEditing && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    style={{
                      flex: 1,
                      padding: '10px 15px',
                      backgroundColor: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      opacity: isSaving ? 0.6 : 1
                    }}
                  >
                    {isSaving ? '⏳ Guardando...' : '✓ Guardar Cambios'}
                  </button>
                  <button
                    onClick={handleEditToggle}
                    disabled={isSaving}
                    style={{
                      flex: 1,
                      padding: '10px 15px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      opacity: isSaving ? 0.6 : 1
                    }}
                  >
                    ✕ Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Security Card */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>🔐 Seguridad</h3>

            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>
                  Contraseña
                </label>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 10px 0' }}>
                  Mantén tu contraseña segura y única
                </p>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  style={{
                    width: '100%',
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
                  🔑 Cambiar Contraseña
                </button>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px', display: 'block' }}>
                  Sesión
                </label>
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 10px 0' }}>
                  Cierra sesión para salir de tu cuenta
                </p>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '10px 15px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  🚪 Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <PasswordReset
          onClose={() => setShowPasswordModal(false)}
          userEmail={user?.email}
          isOwnPassword={true}
        />
      )}
    </div>
  );
}
