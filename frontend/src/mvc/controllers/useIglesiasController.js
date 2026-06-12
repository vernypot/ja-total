import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { IglesiaContext } from '../../context/IglesiaContext';
import { getUserRole, isAdminOrAbove } from '../../utils/permissions';
import * as IglesiasModel from '../models/iglesias.model';

export function useIglesiasController() {
  const { user } = useContext(AuthContext);
  const { activeIglesia, updateActiveIglesia } = useContext(IglesiaContext);
  const navigate = useNavigate();
  const userRole = getUserRole(user);
  const canCreate = isAdminOrAbove(userRole);

  const [data, setData] = useState([]);
  const [iglesiaData, setIglesiaData] = useState(null);
  const [nombre, setNombre] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingNombre, setEditingNombre] = useState('');

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

      if (activeIglesia) {
        const active = rows.find(i => i.id === activeIglesia);
        setIglesiaData(active || null);
      } else if (rows?.length > 0) {
        setIglesiaData(rows[0]);
        updateActiveIglesia(rows[0].id);
      }
    } catch (err) {
      setError('Error inesperado: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!canCreate) {
      alert('Solo admin puede crear iglesias');
      return;
    }

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
    load();
  }

  function startEdit(iglesia) {
    setEditingId(iglesia.id);
    setEditingNombre(iglesia.nombre);
  }

  async function saveEdit() {
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
    updateActiveIglesia(iglesia.id);
    setIglesiaData(iglesia);
  }

  function navigateToClubes(iglesiaId) {
    navigate(`/dashboard/clubes?iglesia=${iglesiaId}`);
  }

  useEffect(() => { load(); }, [showInactive]);

  return {
    data,
    iglesiaData,
    activeIglesia,
    nombre,
    setNombre,
    showInactive,
    setShowInactive,
    error,
    loading,
    editingId,
    setEditingId,
    editingNombre,
    setEditingNombre,
    canCreate,
    save,
    startEdit,
    saveEdit,
    toggleEstado,
    selectIglesia,
    navigateToClubes,
  };
}
