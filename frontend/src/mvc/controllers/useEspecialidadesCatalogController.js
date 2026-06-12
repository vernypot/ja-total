import { useEffect, useState, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { getUserRole, isSuperAdmin } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import * as EspecialidadesModel from '../models/especialidades.model';

export function useEspecialidadesCatalogController() {
  const { user, userData } = useContext(AuthContext);
  const { activeClub } = useContext(ClubContext);
  const userRole = getUserRole(user, userData);
  const canManage = isSuperAdmin(userRole);

  const [data, setData] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [form, setForm] = useState({ nombre: '', tipo_id: '' });
  const [tipoFilter, setTipoFilter] = useState('');
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [requisitosByEsp, setRequisitosByEsp] = useState({});
  const [newRequisito, setNewRequisito] = useState('');
  const [hasEstado, setHasEstado] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveTipoId = showAllTypes
    ? (tipoFilter || '')
    : (tipoFilter || activeClub?.tipoId || '');

  const filteredData = useMemo(
    () => filterBySearch(data, searchQuery, e => [e.nombre, e.club_tipo, e.tipos_club?.nombre]),
    [data, searchQuery]
  );

  const groupedData = useMemo(() => {
    if (effectiveTipoId) return null;
    return tipos
      .map(tipo => ({
        tipo,
        especialidades: filteredData.filter(e => e.tipo_id === tipo.id || e.club_tipo === tipo.nombre),
      }))
      .filter(group => group.especialidades.length > 0);
  }, [filteredData, tipos, effectiveTipoId]);

  async function load() {
    setError('');

    const { data: tiposData, error: tiposError } = await EspecialidadesModel.fetchTiposClub();
    if (tiposError) {
      setError('Error loading specialties: ' + tiposError.message);
      setTipos([]);
      setData([]);
      return;
    }

    const { data: rows, error: loadError, hasEstado: estadoSupported } =
      await EspecialidadesModel.fetchEspecialidadesCatalogSorted({ showInactive });

    if (loadError) {
      setError('Error loading specialties: ' + loadError.message);
      setData([]);
      setTipos(tiposData || []);
      return;
    }

    const filtered = EspecialidadesModel.filterEspecialidadesByTipo(
      rows || [],
      effectiveTipoId || undefined,
      tiposData || []
    );

    setHasEstado(Boolean(estadoSupported));
    setTipos(tiposData || []);
    setData(filtered);
  }

  async function save() {
    if (!canManage) return;
    if (!form.nombre.trim()) {
      setError('Name is required');
      return;
    }
    if (!form.tipo_id) {
      setError('Club type is required');
      return;
    }

    setError('');
    const payload = { nombre: form.nombre, tipo_id: form.tipo_id };
    const { error: saveError } = editingId
      ? await EspecialidadesModel.updateEspecialidad(editingId, payload)
      : await EspecialidadesModel.createEspecialidad(payload);

    if (saveError) {
      setError('Error saving specialty: ' + saveError.message);
      return;
    }

    setForm({ nombre: '', tipo_id: effectiveTipoId || '' });
    setEditingId(null);
    setShowForm(false);
    load();
  }

  function startEdit(item) {
    if (!canManage) return;
    setEditingId(item.id);
    setForm({
      nombre: item.nombre,
      tipo_id: item.tipo_id || tipos.find(t => t.nombre === item.club_tipo)?.id || '',
    });
    setShowForm(true);
  }

  async function toggleEstado(item) {
    if (!canManage) return;
    setError('');
    const nuevo = item.estado === 'activo' ? 'inactivo' : 'activo';
    const { error: updateError } = await EspecialidadesModel.updateEspecialidadEstado(item.id, nuevo);
    if (updateError) {
      setError('Error updating specialty status');
      return;
    }
    load();
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ nombre: '', tipo_id: effectiveTipoId || '' });
  }

  function toggleForm() {
    setShowForm(prev => {
      const next = !prev;
      if (next && !editingId) {
        setForm({ nombre: '', tipo_id: effectiveTipoId || '' });
      }
      return next;
    });
    if (editingId) cancelForm();
  }

  function clearTipoFilter() {
    setShowAllTypes(true);
    setTipoFilter('');
  }

  async function loadRequisitos(especialidadId) {
    const { data: rows, error: reqError } = await EspecialidadesModel.fetchRequisitosByEspecialidad(especialidadId);
    if (reqError) {
      setError('Error loading requirements: ' + reqError.message);
      return;
    }
    setRequisitosByEsp(prev => ({ ...prev, [especialidadId]: rows || [] }));
  }

  async function toggleExpand(especialidadId) {
    if (expandedId === especialidadId) {
      setExpandedId(null);
      setNewRequisito('');
      return;
    }
    setExpandedId(especialidadId);
    setNewRequisito('');
    if (!requisitosByEsp[especialidadId]) {
      await loadRequisitos(especialidadId);
    }
  }

  async function addRequisito(especialidadId) {
    if (!canManage) return;
    const text = newRequisito.trim();
    if (!text) return;

    setError('');
    const { error: insertError } = await EspecialidadesModel.createEspecialidadRequisito(especialidadId, text);
    if (insertError) {
      setError('Error adding requirement: ' + insertError.message);
      return;
    }
    setNewRequisito('');
    await loadRequisitos(especialidadId);
  }

  async function removeRequisito(especialidadId, requisitoId) {
    if (!canManage) return;
    setError('');
    const { error: deleteError } = await EspecialidadesModel.deleteEspecialidadRequisito(requisitoId);
    if (deleteError) {
      setError('Error deleting requirement: ' + deleteError.message);
      return;
    }
    await loadRequisitos(especialidadId);
  }

  useEffect(() => { load(); }, [showInactive, effectiveTipoId]);
  useEffect(() => {
    if (activeClub?.tipoId && !tipoFilter) {
      setForm(prev => ({ ...prev, tipo_id: prev.tipo_id || activeClub.tipoId }));
    }
  }, [activeClub?.tipoId]);

  return {
    data: filteredData,
    groupedData,
    searchQuery,
    setSearchQuery,
    tipos,
    activeClub,
    tipoFilter,
    setTipoFilter,
    effectiveTipoId,
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
    expandedId,
    requisitosByEsp,
    newRequisito,
    setNewRequisito,
    toggleExpand,
    addRequisito,
    removeRequisito,
    hasEstado,
    clearTipoFilter,
    showAllTypes,
    setShowAllTypes,
  };
}
