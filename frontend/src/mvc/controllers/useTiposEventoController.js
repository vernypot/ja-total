import { useEffect, useMemo, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, isAdminOrAbove } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import { useListPagination } from '../../hooks/useListPagination';
import { validateForm } from '../../utils/validateForm';
import { useLanguage } from '../../hooks/useLanguage';
import * as TiposEventoModel from '../models/tiposEvento.model';

const emptyForm = () => ({
  nombre: '',
  descripcion: '',
  orden: '0',
});

export function useTiposEventoController() {
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const canManage = isAdminOrAbove(getUserRole(user, userData));

  const [items, setItems] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [hasTable, setHasTable] = useState(true);

  const filteredItems = useMemo(
    () => filterBySearch(items, searchQuery, item => [item.nombre, item.descripcion]),
    [items, searchQuery]
  );

  const {
    pageItems: paginatedItems,
    ...listPagination
  } = useListPagination(filteredItems, [searchQuery, showInactive]);

  async function load() {
    setLoading(true);
    setError('');

    const { data, error: loadError, hasTable: tableExists } =
      await TiposEventoModel.fetchTiposEvento({ showInactive });

    if (loadError) {
      setError('Error loading event types: ' + loadError.message);
      setItems([]);
    } else {
      setItems(data || []);
      setHasTable(tableExists !== false);
    }

    setLoading(false);
  }

  function openCreateForm() {
    setEditingId('');
    setForm(emptyForm());
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId('');
    setForm(emptyForm());
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      orden: String(item.orden ?? 0),
    });
    setShowForm(true);
  }

  async function save() {
    if (!canManage) return;

    const validation = validateForm('tipoEvento', form, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    setError('');
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      orden: form.orden,
    };

    const { error: saveError } = editingId
      ? await TiposEventoModel.updateTipoEvento(editingId, payload)
      : await TiposEventoModel.createTipoEvento(payload);

    if (saveError) {
      setError('Error saving event type: ' + saveError.message);
      return;
    }

    closeForm();
    load();
  }

  async function toggleEstado(item) {
    if (!canManage) return;
    setError('');
    const { error: updateError } = await TiposEventoModel.toggleTipoEventoEstado(item);
    if (updateError) {
      setError('Error updating event type status: ' + updateError.message);
      return;
    }
    load();
  }

  useEffect(() => {
    load();
  }, [showInactive]);

  return {
    items: paginatedItems,
    listPagination,
    showInactive,
    setShowInactive,
    showForm,
    editingId,
    form,
    setForm,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    fieldErrors,
    canManage,
    hasTable,
    openCreateForm,
    closeForm,
    startEdit,
    save,
    toggleEstado,
  };
}
