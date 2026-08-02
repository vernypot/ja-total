import { useEffect, useState, useContext, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { IglesiaContext } from '../../context/IglesiaContext';
import { ClubContext } from '../../context/ClubContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { getUserRole, canManageClubs } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import { useListPagination } from '../../hooks/useListPagination';
import { validateForm } from '../../utils/validateForm';
import { useLanguage } from '../../hooks/useLanguage';
import * as ClubesModel from '../models/clubes.model';
import * as IglesiasModel from '../models/iglesias.model';
import * as CargosModel from '../models/cargos.model';

export function useClubesController() {
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const { activeIglesia } = useContext(IglesiaContext);
  const { activeClub, updateActiveClub } = useContext(ClubContext);
  const { effectiveIglesiaId, canSwitchIglesia, assignedIglesiaActive, hasIglesiaAssignment } = useScopedIglesia();
  const userRole = getUserRole(user, userData);
  const canManage = canManageClubs(userRole);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requestedIglesia = params.get('iglesia');
  const iglesiaId = canSwitchIglesia
    ? (requestedIglesia || activeIglesia)
    : effectiveIglesiaId;

  const [data, setData] = useState([]);
  const [iglesiasData, setIglesiasData] = useState([]);
  const [activeIglesiaData, setActiveIglesiaData] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingClubId, setEditingClubId] = useState(null);
  const [clubForm, setClubForm] = useState({ nombre: '', iglesia_id: iglesiaId || '', tipo_id: '' });
  const [tipos, setTipos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clubStats, setClubStats] = useState({});

  const filteredData = useMemo(
    () => filterBySearch(data, searchQuery, c => [c.nombre, c.tipos_club?.nombre, c.estado]),
    [data, searchQuery]
  );

  const {
    pageItems: paginatedData,
    ...listPagination
  } = useListPagination(filteredData, [searchQuery, showInactive, iglesiaId]);

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
        setClubStats({});
        return;
      }

      const clubRows = rows || [];
      setData(clubRows);

      const { stats, error: statsError } = await CargosModel.fetchClubListingStats(clubRows);
      setClubStats(stats || {});
      if (statsError) {
        console.error('Error loading club stats:', statsError);
      }
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
    if (!canManage) return;
    setError('');

    const validation = validateForm('club', {
      nombre: clubForm.nombre,
      iglesia_id: clubForm.iglesia_id || iglesiaId,
    }, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    const { error: saveError } = await ClubesModel.createClub({
      nombre: clubForm.nombre.trim(),
      iglesia_id: iglesiaId,
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

  function resetEditForm() {
    setEditingClubId(null);
    setShowEditForm(false);
    setFieldErrors({});
    setError('');
    setClubForm({ nombre: '', iglesia_id: iglesiaId || '', tipo_id: '' });
  }

  function startEditClub(club) {
    if (!canManage) return;
    setError('');
    setFieldErrors({});
    setEditingClubId(club.id);
    setClubForm({
      nombre: club.nombre || '',
      iglesia_id: club.iglesia_id || iglesiaId || '',
      tipo_id: club.tipo_id || '',
    });
    setShowEditForm(true);
  }

  async function saveEditClub() {
    if (!canManage || !editingClubId) return;
    setError('');

    const validation = validateForm('club', {
      nombre: clubForm.nombre,
      iglesia_id: clubForm.iglesia_id || iglesiaId,
    }, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    const targetIglesiaId = canSwitchIglesia ? (clubForm.iglesia_id || iglesiaId) : iglesiaId;
    const { error: saveError } = await ClubesModel.updateClub(editingClubId, {
      nombre: clubForm.nombre.trim(),
      iglesia_id: targetIglesiaId,
      tipo_id: clubForm.tipo_id,
    });

    if (saveError) {
      setError('Error guardando club: ' + saveError.message);
      return;
    }

    if (activeClub?.id === editingClubId) {
      const { data: updatedClub } = await ClubesModel.fetchClubById(editingClubId);
      if (updatedClub) updateActiveClub(updatedClub);
    }

    resetEditForm();
    load();
  }

  async function toggleEstado(club) {
    if (!canManage) return;
    setError('');
    const nuevo = club.estado === 'activo' ? 'inactivo' : 'activo';

    if (nuevo === 'inactivo') {
      const { data: dep, error: depError } = await ClubesModel.hasMembers(club.id);
      if (depError) {
        setError('Error verificando dependencias');
        return;
      }
      if (dep?.length > 0) {
        setError(t('clubCannotDeactivateHasMembers'));
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
    const club = data.find(c => c.id === clubId);
    if (club) updateActiveClub(club);
    navigate(`/dashboard/miembros?club=${clubId}`);
  }

  function navigateToEventos(clubId) {
    const club = data.find(c => c.id === clubId);
    if (club) updateActiveClub(club);
    navigate(`/dashboard/eventos?club=${clubId}`);
  }

  function navigateToUnidades(clubId) {
    const club = data.find(c => c.id === clubId);
    if (club) updateActiveClub(club);
    navigate(`/dashboard/unidades?club=${clubId}`);
  }

  function navigateToDirectiva(clubId) {
    const club = data.find(c => c.id === clubId);
    if (club) updateActiveClub(club);
    navigate(`/dashboard/club-directiva?club=${clubId}`);
  }

  function navigateToDetalle(club) {
    if (club) updateActiveClub(club);
    const churchId = club?.iglesia_id || iglesiaId;
    const query = churchId ? `?iglesia=${churchId}` : '';
    navigate(`/dashboard/clubes/${club.id}${query}`);
  }

  function selectClub(club) {
    if (!canSwitchIglesia && club.iglesia_id && club.iglesia_id !== effectiveIglesiaId) return;
    updateActiveClub(club);
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
    data: paginatedData,
    listPagination,
    searchQuery,
    setSearchQuery,
    iglesiasData,
    activeIglesiaData,
    canSelectIglesia: canSwitchIglesia,
    canManage,
    iglesiaScopeReady: canSwitchIglesia || (hasIglesiaAssignment && assignedIglesiaActive),
    showInactive,
    setShowInactive,
    error,
    fieldErrors,
    loading,
    showForm,
    setShowForm,
    showEditForm,
    editingClubId,
    clubForm,
    setClubForm,
    tipos,
    addClub,
    startEditClub,
    saveEditClub,
    resetEditForm,
    toggleEstado,
    navigateToMiembros,
    navigateToEventos,
    navigateToDirectiva,
    navigateToUnidades,
    navigateToDetalle,
    selectClub,
    activeClub,
    clubStats,
  };
}
