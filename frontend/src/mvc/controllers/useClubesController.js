import { useEffect, useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { IglesiaContext } from '../../context/IglesiaContext';
import * as ClubesModel from '../models/clubes.model';
import * as IglesiasModel from '../models/iglesias.model';

export function useClubesController() {
  const { activeIglesia } = useContext(IglesiaContext);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const iglesiaId = params.get('iglesia') || activeIglesia;

  const [data, setData] = useState([]);
  const [iglesiasData, setIglesiasData] = useState([]);
  const [activeIglesiaData, setActiveIglesiaData] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clubForm, setClubForm] = useState({ nombre: '', iglesia_id: iglesiaId || '', tipo_id: '' });
  const [tipos, setTipos] = useState([]);

  async function loadTipos() {
    const { data: tiposData, error: tiposError } = await ClubesModel.fetchTiposClub();
    if (tiposError) {
      console.error('Error loading club types:', tiposError);
      return;
    }
    setTipos(tiposData || []);
  }

  async function load() {
    setError('');
    setLoading(true);

    try {
      if (iglesiaId) {
        const { data: igData } = await IglesiasModel.fetchIglesiaById(iglesiaId);
        if (igData) setActiveIglesiaData(igData);
        else setActiveIglesiaData(null);
      } else {
        setActiveIglesiaData(null);
      }

      const { data: rows, error: queryError } = await ClubesModel.fetchClubes({ iglesiaId, showInactive });

      if (queryError) {
        setError('Error cargando clubes: ' + queryError.message);
        setData([]);
        return;
      }

      setData(rows || []);
    } catch (err) {
      setError('Error inesperado: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadIglesias() {
    const { data: igData, error } = await IglesiasModel.fetchActiveIglesias();
    if (!error) setIglesiasData(igData || []);
  }

  async function addClub() {
    setError('');

    if (!clubForm.nombre.trim() || !clubForm.iglesia_id) {
      setError('Nombre e iglesia son requeridos');
      return;
    }

    const { error: saveError } = await ClubesModel.createClub({
      nombre: clubForm.nombre.trim(),
      iglesia_id: clubForm.iglesia_id,
      tipo_id: clubForm.tipo_id,
    });

    if (saveError) {
      setError('Error guardando club: ' + saveError.message);
      return;
    }

    setClubForm({ nombre: '', iglesia_id: iglesiaId || '', tipo_id: '' });
    setShowForm(false);
    load();
  }

  async function toggleEstado(club) {
    setError('');
    const nuevo = club.estado === 'activo' ? 'inactivo' : 'activo';

    if (nuevo === 'inactivo') {
      const { data: dep, error: depError } = await ClubesModel.hasMembers(club.id);
      if (depError) {
        setError('Error verificando dependencias');
        return;
      }
      if (dep?.length > 0) {
        alert('No se puede desactivar. Tiene miembros asignados.');
        return;
      }
    }

    const { error: updateError } = await ClubesModel.updateClubEstado(club.id, nuevo);
    if (updateError) {
      setError('Error actualizando club: ' + updateError.message);
      return;
    }

    load();
  }

  function navigateToMiembros(clubId) {
    navigate(`/dashboard/miembros?club=${clubId}`);
  }

  useEffect(() => {
    setClubForm(prev => ({ ...prev, iglesia_id: iglesiaId || '' }));
  }, [iglesiaId]);

  useEffect(() => {
    load();
    loadTipos();
    loadIglesias();
  }, [iglesiaId, showInactive]);

  return {
    data,
    iglesiasData,
    activeIglesiaData,
    showInactive,
    setShowInactive,
    error,
    loading,
    showForm,
    setShowForm,
    clubForm,
    setClubForm,
    tipos,
    addClub,
    toggleEstado,
    navigateToMiembros,
  };
}
