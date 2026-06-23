import { useEffect, useState, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import { validateForm } from '../../utils/validateForm';
import { useLanguage } from '../../hooks/useLanguage';
import * as ContactosModel from '../models/contactos.model';

const EMPTY_FORM = { nombre: '', telefono: '', relacion: '' };

export function useContactosController(miembroId) {
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const userRole = getUserRole(user, userData);
  const canManage = canManageChurchData(userRole);

  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);

  const filteredData = useMemo(
    () => filterBySearch(data, searchQuery, c => [c.nombre, c.telefono, c.relacion, c.estado]),
    [data, searchQuery]
  );

  async function load() {
    if (!miembroId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data: contactos, error: queryError } = await ContactosModel.fetchContactosByMiembro(miembroId, {
      showInactive,
    });

    if (queryError) {
      const msg = queryError.message || '';
      setError(
        msg.includes('row-level security')
          ? 'Error loading contacts: permission denied (RLS). Run MIEMBRO_CONTACTOS_RLS_FIX.sql in Supabase SQL Editor, then log out and back in.'
          : 'Error loading contacts: ' + msg
      );
      setData([]);
    } else {
      setData(contactos || []);
    }

    setLoading(false);
  }

  async function save() {
    if (!canManage) return;

    const validation = validateForm('contacto', form, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    setError('');
    const payload = {
      nombre: form.nombre,
      telefono: form.telefono,
      relacion: form.relacion,
    };
    const { error: saveError } = editingId
      ? await ContactosModel.updateMiembroContacto(editingId, miembroId, payload)
      : await ContactosModel.createMiembroContacto(miembroId, payload);

    if (saveError) {
      const msg = saveError.message || '';
      setError(
        msg.includes('row-level security') || msg.includes('permission denied')
          ? 'Error saving contact: permission denied (RLS). Re-run MIEMBRO_CONTACTOS_RLS_FIX.sql in Supabase, then GRANT_SUPERADMIN.sql, then log out and back in.'
          : 'Error saving contact: ' + msg
      );
      return;
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    load();
  }

  function startEdit(contacto) {
    if (!canManage) return;
    setEditingId(contacto.id);
    setForm({
      nombre: contacto.nombre || '',
      telefono: contacto.telefono || '',
      relacion: contacto.relacion || '',
    });
    setShowForm(true);
    setError('');
  }

  async function toggleEstado(contacto) {
    if (!canManage) return;
    setError('');
    const nuevo = contacto.estado === 'activo' ? 'inactivo' : 'activo';
    const { error: updateError } = await ContactosModel.updateMiembroContactoEstado(contacto.id, nuevo);
    if (updateError) {
      const msg = updateError.message || '';
      setError(
        msg.includes('row-level security')
          ? 'Error updating contact: permission denied (RLS). Run MIEMBRO_CONTACTOS_RLS_FIX.sql in Supabase SQL Editor.'
          : 'Error updating contact: ' + msg
      );
      return;
    }
    load();
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  function toggleForm() {
    if (showForm && editingId) {
      cancelForm();
      return;
    }
    setShowForm(prev => {
      const next = !prev;
      if (next) {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setError('');
      }
      return next;
    });
  }

  useEffect(() => {
    load();
  }, [miembroId, showInactive]);

  return {
    data: filteredData,
    searchQuery,
    setSearchQuery,
    showInactive,
    setShowInactive,
    error,
    fieldErrors,
    loading,
    showForm,
    editingId,
    form,
    setForm,
    canManage,
    save,
    startEdit,
    toggleEstado,
    cancelForm,
    toggleForm,
    miembroId,
  };
}
