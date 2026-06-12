import { useEffect, useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { IglesiaContext } from '../../context/IglesiaContext';
import {
  getUserRole,
  isSuperAdmin,
  canCreateIglesia,
  canManageIglesiaProfile,
  canDeactivateIglesia,
} from '../../utils/permissions';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { filterBySearch } from '../../utils/listSearch';
import * as IglesiasModel from '../models/iglesias.model';

export function useIglesiasController() {
  const { user, userData } = useContext(AuthContext);
  const { activeIglesia, updateActiveIglesia } = useContext(IglesiaContext);
  const { effectiveIglesiaId, canSwitchIglesia } = useScopedIglesia();
  const navigate = useNavigate();
  const userRole = getUserRole(user, userData);
  const canCreate = canCreateIglesia(userRole);
  const canManage = canManageIglesiaProfile(userRole);
  const canToggleEstado = canDeactivateIglesia(userRole);
  const canSelectChurch = isSuperAdmin(userRole);

  const [data, setData] = useState([]);
  const [iglesiaData, setIglesiaData] = useState(null);
  const [nombre, setNombre] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const scopedRows = useMemo(() => {
    if (canSwitchIglesia) return data;
    if (!effectiveIglesiaId) return [];
    return data.filter(i => i.id === effectiveIglesiaId);
  }, [data, canSwitchIglesia, effectiveIglesiaId]);

  const filteredData = useMemo(
    () => filterBySearch(scopedRows, searchQuery, i => [i.nombre, i.estado]),
    [scopedRows, searchQuery]
  );

  async function load() {
    setError('');
    setLoading(true);

    try {
      const { data: rows, error: queryError } = await IglesiasModel.fetchIglesias({ showInactive });

      if (queryError) {
        setError('Error cargando iglesias: ' + queryError.message);
        setData([]);
        return;
      }

      setData(rows || []);

      const scopeId = canSwitchIglesia ? activeIglesia : effectiveIglesiaId;
      if (scopeId) {
        const active = (rows || []).find(i => i.id === scopeId);
        setIglesiaData(active || null);
      } else if (canSwitchIglesia && rows?.length > 0) {
        setIglesiaData(rows[0]);
        updateActiveIglesia(rows[0].id);
      } else {
        setIglesiaData(null);
      }
    } catch (err) {
      setError('Error inesperado: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!canCreate) return;

    setError('');
    if (!nombre.trim()) {
      setError('Nombre de iglesia es requerido');
      return;
    }

    const { error: saveError } = await IglesiasModel.createIglesia(nombre.trim());
    if (saveError) {
      setError('Error guardando iglesia: ' + saveError.message);
      return;
    }

    setNombre('');
    setShowForm(false);
    load();
  }

  function startEdit(iglesia) {
    if (!canManage) return;
    if (!canSwitchIglesia && iglesia.id !== effectiveIglesiaId) return;
    setEditingId(iglesia.id);
    setEditingNombre(iglesia.nombre);
  }

  async function saveEdit() {
    if (!canManage) return;

    if (!editingNombre.trim()) {
      setError('Nombre de iglesia es requerido');
      return;
    }

    const { error: updateError } = await IglesiasModel.updateIglesia(editingId, {
      nombre: editingNombre.trim(),
    });

    if (updateError) {
      setError('Error actualizando iglesia: ' + updateError.message);
      return;
    }

    setEditingId(null);
    setEditingNombre('');
    load();
  }

  async function toggleEstado(iglesia) {
    if (!canToggleEstado) return;

    setError('');
    const nuevo = iglesia.estado === 'activo' ? 'inactivo' : 'activo';

    if (nuevo === 'inactivo') {
      const { data: dep, error: depError } = await IglesiasModel.hasActiveClubes(iglesia.id);
      if (depError) {
        setError('Error verificando dependencias: ' + depError.message);
        return;
      }
      if (dep?.length > 0) {
        alert('No se puede desactivar. Tiene clubes activos.');
        return;
      }
    }

    const { error: updateError } = await IglesiasModel.updateIglesiaEstado(iglesia.id, nuevo);
    if (updateError) {
      setError('Error actualizando iglesia: ' + updateError.message);
      return;
    }

    load();
  }

  function selectIglesia(iglesia) {
    if (!canSelectChurch) return;
    updateActiveIglesia(iglesia.id);
    setIglesiaData(iglesia);
  }

  function navigateToClubes(iglesiaId) {
    navigate(`/dashboard/clubes?iglesia=${iglesiaId}`);
  }

  useEffect(() => { load(); }, [showInactive, effectiveIglesiaId, canSwitchIglesia]);

  return {
    data: filteredData,
    searchQuery,
    setSearchQuery,
    iglesiaData,
    activeIglesia,
    nombre,
    setNombre,
    showForm,
    setShowForm,
    showInactive,
    setShowInactive,
    error,
    loading,
    editingId,
    setEditingId,
    editingNombre,
    setEditingNombre,
    canCreate,
    canManage,
    canToggleEstado,
    canSelectChurch,
    save,
    startEdit,
    saveEdit,
    toggleEstado,
    selectIglesia,
    navigateToClubes,
  };
}
