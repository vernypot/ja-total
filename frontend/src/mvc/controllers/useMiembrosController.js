import { useEffect, useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { IglesiaContext } from '../../context/IglesiaContext';
import { getUserRole, isSuperAdmin } from '../../utils/permissions';
import * as MiembrosModel from '../models/miembros.model';
import * as IglesiasModel from '../models/iglesias.model';
import * as ClubesModel from '../models/clubes.model';

export function useMiembrosController() {
  const { user } = useContext(AuthContext);
  const { activeIglesia } = useContext(IglesiaContext);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const clubId = params.get('club');
  const userRole = getUserRole(user);
  const canManage = isSuperAdmin(userRole);

  const [data, setData] = useState([]);
  const [clubsData, setClubsData] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [activeIglesiaData, setActiveIglesiaData] = useState(null);

  async function load() {
    const { data: rows, error } = await MiembrosModel.fetchMiembrosByClub(clubId);
    if (error) {
      console.error('Error loading members:', error);
      setData([]);
      return;
    }
    setData(rows || []);
  }

  async function loadIglesias() {
    const { data: igData } = await IglesiasModel.fetchActiveIglesias();
    if (igData) {
      if (activeIglesia) {
        const active = igData.find(i => i.id === activeIglesia);
        if (active) setActiveIglesiaData(active);
      } else if (igData.length > 0) {
        setActiveIglesiaData(igData[0]);
      }
    }
  }

  async function loadClubs() {
    if (activeIglesia) {
      const { data: clubData } = await ClubesModel.fetchClubesByIglesia(activeIglesia);
      setClubsData(clubData || []);
    }
  }

  async function toggleEstado(miembro) {
    if (!canManage) {
      alert('Solo superadmin puede cambiar estado');
      return;
    }

    const nuevo = miembro.estado === 'activo' ? 'inactivo' : 'activo';
    const { error } = await MiembrosModel.updateMiembroEstado(miembro.id, nuevo);
    if (error) {
      alert('Error updating status');
      return;
    }
    load();
  }

  function navigateToMiembro(id) {
    navigate(`/dashboard/miembro/${id}`);
  }

  function navigateToNewMiembro() {
    navigate('/dashboard/miembro/new');
  }

  function filterByClub(newClubId) {
    if (newClubId) {
      navigate(`/dashboard/miembros?club=${newClubId}`);
    } else {
      navigate('/dashboard/miembros');
    }
  }

  useEffect(() => { load(); }, [clubId, showInactive]);
  useEffect(() => { loadIglesias(); loadClubs(); }, [activeIglesia]);

  return {
    data,
    clubsData,
    showInactive,
    setShowInactive,
    activeIglesiaData,
    clubId,
    canManage,
    toggleEstado,
    navigateToMiembro,
    navigateToNewMiembro,
    filterByClub,
  };
}
