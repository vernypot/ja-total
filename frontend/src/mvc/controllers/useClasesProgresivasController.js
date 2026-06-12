import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, isSuperAdmin } from '../../utils/permissions';
import * as ClasesModel from '../models/clases.model';

export function useClasesProgresivasController() {
  const { user } = useContext(AuthContext);
  const userRole = getUserRole(user);
  const canManage = isSuperAdmin(userRole);

  const [data, setData] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [form, setForm] = useState({ nombre: '', tipo_id: '', club_tipo: '' });
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    setError('');

    const { data: clasesData, error: clasesError } = await ClasesModel.fetchClasesProgresivas({ showInactive });
    if (clasesError) {
      setError('Error loading classes');
      setData([]);
      return;
    }

    const { data: tiposData, error: tiposError } = await ClasesModel.fetchTiposClub();
    if (tiposError) {
      setError('Error loading club types');
      setTipos([]);
      return;
    }

    setData(clasesData || []);
    setTipos(tiposData || []);
  }

  async function save() {
    if (!canManage) {
      alert('Solo superadmin puede agregar clases');
      return;
    }

    setError('');
    if (!form.nombre || !form.tipo_id) {
      setError('Complete all required fields');
      return;
    }

    const payload = { nombre: form.nombre, tipo_id: form.tipo_id, club_tipo: form.club_tipo };
    const { error: saveError } = editingId
      ? await ClasesModel.updateClaseProgresiva(editingId, payload)
      : await ClasesModel.createClaseProgresiva(payload);

    if (saveError) {
      setError('Error saving class: ' + saveError.message);
      return;
    }

    setForm({ nombre: '', tipo_id: '', club_tipo: '' });
    setEditingId(null);
    setShowForm(false);
    load();
  }

  function startEdit(clase) {
    if (!canManage) {
      alert('Solo superadmin puede editar clases');
      return;
    }

    setEditingId(clase.id);
    setForm({
      nombre: clase.nombre,
      tipo_id: clase.tipo_id,
      club_tipo: clase.tipos_club?.nombre || '',
    });
    setShowForm(true);
  }

  async function toggleEstado(clase) {
    if (!canManage) {
      alert('Solo superadmin puede cambiar estado');
      return;
    }

    setError('');
    const nuevo = clase.estado === 'activo' ? 'inactivo' : 'activo';
    const { error: updateError } = await ClasesModel.updateClaseEstado(clase.id, nuevo);

    if (updateError) {
      setError('Error updating class status');
      return;
    }

    load();
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ nombre: '', tipo_id: '', club_tipo: '' });
  }

  function toggleForm() {
    setShowForm(prev => !prev);
    if (editingId) cancelForm();
  }

  useEffect(() => { load(); }, [showInactive]);

  return {
    data,
    tipos,
    form,
    setForm,
    showInactive,
    setShowInactive,
    error,
    showForm,
    editingId,
    canManage,
    save,
    startEdit,
    toggleEstado,
    cancelForm,
    toggleForm,
  };
}
