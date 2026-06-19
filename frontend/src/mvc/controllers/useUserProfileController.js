import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { validateForm } from '../../utils/validateForm';
import * as UsuariosModel from '../models/usuarios.model';

function buildFallbackUserData(user) {
  return {
    id: user.id,
    email: user.email,
    nombre: user.user_metadata?.nombre || 'N/A',
    apellido1: user.user_metadata?.apellido1 || 'N/A',
    apellido2: user.user_metadata?.apellido2 || 'N/A',
    telefono: user.user_metadata?.telefono || 'N/A',
    rol: user.user_metadata?.role || 'user',
    estado: user.user_metadata?.estado || 'activo',
  };
}

export function useUserProfileController() {
  const { user, logout } = useContext(AuthContext);
  const { t } = useLanguage();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', apellido1: '', apellido2: '', telefono: '' });

  useEffect(() => {
    async function loadUserData() {
      setError('');

      if (!user?.id || !user?.email) {
        setError('User not found');
        setLoading(false);
        return;
      }

      try {
        const { data, error: queryError } = await UsuariosModel.fetchUsuarioByEmail(user.email);

        if (queryError || !data) {
          setUserData(buildFallbackUserData(user));
        } else {
          setUserData(data);
        }
      } catch {
        setUserData(buildFallbackUserData(user));
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [user]);

  function handleEditToggle() {
    if (isEditing) {
      setFormData({
        nombre: userData?.nombre || '',
        apellido1: userData?.apellido1 || '',
        apellido2: userData?.apellido2 || '',
        telefono: userData?.telefono || '',
      });
      setError('');
      setSuccess('');
      setIsEditing(false);
    } else {
      setFormData({
        nombre: userData?.nombre || '',
        apellido1: userData?.apellido1 || '',
        apellido2: userData?.apellido2 || '',
        telefono: userData?.telefono || '',
      });
      setIsEditing(true);
      setError('');
      setSuccess('');
    }
  }

  async function handleSaveProfile() {
    setError('');
    setSuccess('');

    const validation = validateForm('userProfile', {
      ...formData,
      email: user?.email || userData?.email || '',
    }, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    setIsSaving(true);

    try {
      if (!userData?.id) {
        setError('User ID not found');
        return;
      }

      const { error: updateError } = await UsuariosModel.updateProfile(userData.id, formData);
      if (updateError) {
        setError('Error saving profile: ' + updateError.message);
        return;
      }

      setUserData({ ...userData, ...formData });
      setSuccess('✓ Profile updated successfully');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleLogout() {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  }

  return {
    user,
    userData,
    loading,
    showPasswordModal,
    setShowPasswordModal,
    error,
    fieldErrors,
    success,
    isEditing,
    isSaving,
    formData,
    setFormData,
    handleEditToggle,
    handleSaveProfile,
    handleLogout,
  };
}
