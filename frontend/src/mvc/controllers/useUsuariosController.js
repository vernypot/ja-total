import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, isSuperAdmin } from '../../utils/permissions';
import * as UsuariosModel from '../models/usuarios.model';
import * as IglesiasModel from '../models/iglesias.model';

const EMPTY_FORM = {
  nombre: '',
  apellido1: '',
  apellido2: '',
  email: '',
  rol: 'user',
  estado: 'activo',
  telefono: '',
  iglesia_id: '',
  rol_iglesia: 'member',
};

export function useUsuariosController() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const userRole = getUserRole(user);

  const [usuarios, setUsuarios] = useState([]);
  const [iglesias, setIglesias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!isSuperAdmin(userRole)) navigate('/dashboard');
  }, [userRole, navigate]);

  async function loadUsuarios() {
    setLoading(true);
    setError('');

    const { data, error: queryError } = await UsuariosModel.fetchUsuarios();
    if (queryError) {
      setError('Error loading users');
      setLoading(false);
      return;
    }

    setUsuarios(data || []);
    setLoading(false);
  }

  async function loadIglesias() {
    const { data, error: queryError } = await IglesiasModel.fetchActiveIglesias();
    if (!queryError) setIglesias(data || []);
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
        result = await UsuariosModel.updateUsuario(editingId, {
          nombre: form.nombre,
          apellido1: form.apellido1,
          apellido2: form.apellido2,
          rol: form.rol,
          estado: form.estado,
          telefono: form.telefono,
        });
      } else {
        result = await UsuariosModel.createUsuario({
          nombre: form.nombre,
          apellido1: form.apellido1,
          apellido2: form.apellido2,
          email: form.email,
          rol: form.rol,
          estado: form.estado,
          telefono: form.telefono,
        });
      }

      if (result.error) {
        setError('Error saving user: ' + result.error.message);
        return;
      }

      if (form.iglesia_id && !editingId) {
        const userId = result.data[0].id;
        await UsuariosModel.assignUsuarioIglesia({
          usuario_id: userId,
          iglesia_id: form.iglesia_id,
          rol_iglesia: form.rol_iglesia,
        });
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
    const { error: queryError } = await UsuariosModel.deleteUsuario(id);
    if (queryError) {
      setError('Error deleting user: ' + queryError.message);
      return;
    }

    setSuccess('User deleted successfully');
    loadUsuarios();
  }

  function handleEdit(usuario) {
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
      rol_iglesia: 'member',
    });
    setShowForm(true);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function openPasswordReset(email) {
    setSelectedUserEmail(email);
    setShowPasswordReset(true);
  }

  function closePasswordReset() {
    setShowPasswordReset(false);
    setSelectedUserEmail(null);
  }

  useEffect(() => {
    loadUsuarios();
    loadIglesias();
  }, []);

  return {
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
  };
}
