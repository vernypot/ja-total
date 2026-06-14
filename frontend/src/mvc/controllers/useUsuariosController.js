import { useEffect, useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { getUserRole, isSuperAdmin } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import { validatePassword } from '../../utils/passwordValidation';
import * as UsuariosModel from '../models/usuarios.model';
import * as IglesiasModel from '../models/iglesias.model';
import { DASHBOARD_HOME_PATH } from '../../utils/dashboardRoutes';

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
  password: '',
  confirmPassword: '',
  sendSetupEmail: false,
};

export function useUsuariosController() {
  const { t } = useLanguage();
  const { user, userData, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const userRole = getUserRole(user, userData);

  const [usuarios, setUsuarios] = useState([]);
  const [iglesias, setIglesias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsuarios = useMemo(
    () => filterBySearch(usuarios, searchQuery, u => [
      u.nombre,
      u.apellido1,
      u.apellido2,
      u.email,
      u.telefono,
      u.rol,
      u.estado,
      u.iglesia_nombre,
      u.rol_iglesia,
    ]),
    [usuarios, searchQuery]
  );

  useEffect(() => {
    if (!isSuperAdmin(userRole)) navigate(DASHBOARD_HOME_PATH);
  }, [userRole, navigate]);

  async function loadUsuarios() {
    setLoading(true);
    setError('');

    const { data, error: queryError } = await UsuariosModel.fetchUsuarios({ showInactive });
    if (queryError) {
      console.error('Error loading users:', queryError);
      const msg = queryError.message || '';
      setError(
        msg.includes('recursion')
          ? 'Error loading users: RLS recursion. Run USUARIOS_RLS_SELECT_FIX.sql in Supabase, then log out and back in.'
          : msg.includes('admin_list_usuarios')
            ? 'Error loading users: run USUARIOS_RLS_SELECT_FIX.sql in Supabase SQL Editor.'
            : 'Error loading users: ' + msg
      );
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

    if (!form.iglesia_id) {
      setError(t('iglesiaRequired'));
      return;
    }

    const iglesiaValida = iglesias.some(i => i.id === form.iglesia_id);
    if (!iglesiaValida) {
      setError(t('iglesiaMustBeActive'));
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
        if (form.sendSetupEmail) {
          // Password is generated server-side when sending setup email.
        } else {
          if (!form.password) {
            setError(t('initialPasswordRequired'));
            return;
          }
          const pwdError = validatePassword(form.password, t);
          if (pwdError) {
            setError(pwdError);
            return;
          }
          if (form.password !== form.confirmPassword) {
            setError(t('passwordsDoNotMatch'));
            return;
          }
        }

        result = await UsuariosModel.createUsuarioWithAuth(
          {
            nombre: form.nombre,
            apellido1: form.apellido1,
            apellido2: form.apellido2,
            email: form.email.trim(),
            rol: form.rol,
            estado: form.estado,
            telefono: form.telefono,
          },
          {
            password: form.password,
            sendSetupEmail: form.sendSetupEmail,
          }
        );
      }

      if (result.error) {
        const msg = result.error.message || '';
        const isRls = msg.includes('row-level security');
        const isAuth = msg.includes('already registered') || msg.includes('already exists');
        setError(
          isRls
            ? 'Error saving user: permission denied (RLS). Run USUARIOS_RLS_FIX.sql in Supabase SQL Editor, then log out and back in.'
            : isAuth
              ? t('authAccountExists')
              : msg.includes('admin_create_usuario_auth') || msg.includes('USUARIOS_AUTH_FIX')
                ? 'Error saving user: ' + msg + ' Run USUARIOS_AUTH_FIX.sql in Supabase.'
                : 'Error saving user: ' + msg
        );
        return;
      }

      if (form.sendSetupEmail && !editingId) {
        setSuccess(t('userCreatedSetupEmailSent'));
      } else if (editingId) {
        setSuccess('User updated successfully');
      } else {
        setSuccess(t('userCreatedWithPassword'));
      }

      let resolvedUserId = editingId || result.data?.id;
      if (!resolvedUserId) {
        const { data: created, error: fetchError } = await UsuariosModel.fetchUsuarioByEmail(form.email.trim());
        if (!fetchError && created?.id) resolvedUserId = created.id;
      }
      if (!resolvedUserId) {
        setError(t('userSavedIglesiaAssignFailed'));
        resetForm();
        loadUsuarios();
        setShowForm(false);
        return;
      }

      const { error: assignError } = await UsuariosModel.upsertUsuarioIglesia({
        usuario_id: resolvedUserId,
        iglesia_id: form.iglesia_id,
        rol_iglesia: form.rol_iglesia,
      });

      if (assignError) {
        setError(
          editingId
            ? t('userUpdatedIglesiaAssignFailed') + assignError.message
            : t('userCreatedIglesiaAssignFailed') + assignError.message
        );
        resetForm();
        loadUsuarios();
        setShowForm(false);
        return;
      }

      resetForm();
      loadUsuarios();
      setShowForm(false);
    } catch (err) {
      setError('Unexpected error: ' + err.message);
    }
  }

  async function toggleEstado(usuario) {
    if (usuario.id === user?.id || usuario.id === userData?.id) {
      alert('No puede desactivar su propio usuario');
      return;
    }

    setError('');
    const nuevo = usuario.estado === 'activo' ? 'inactivo' : 'activo';

    const { error: updateError } = await UsuariosModel.updateUsuarioEstado(usuario.id, nuevo);
    if (updateError) {
      setError('Error actualizando usuario: ' + updateError.message);
      return;
    }

    setSuccess(nuevo === 'inactivo' ? 'Usuario desactivado' : 'Usuario activado');
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
      iglesia_id: usuario.iglesia_id || '',
      rol_iglesia: usuario.rol_iglesia || 'member',
      password: '',
      confirmPassword: '',
      sendSetupEmail: false,
    });
    setShowForm(true);

    const { data: assignment } = await UsuariosModel.fetchUsuarioIglesiaByUsuario(usuario.id);
    if (assignment?.iglesia_id) {
      setForm(prev => ({
        ...prev,
        iglesia_id: assignment.iglesia_id,
        rol_iglesia: assignment.rol_iglesia || 'member',
      }));
    }
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
    if (authLoading) return;
    loadUsuarios();
    loadIglesias();
  }, [authLoading, showInactive]);

  return {
    usuarios: filteredUsuarios,
    searchQuery,
    setSearchQuery,
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
    showInactive,
    setShowInactive,
    handleSave,
    toggleEstado,
    handleEdit,
    resetForm,
    openPasswordReset,
    closePasswordReset,
  };
}
