import { useEffect, useState, useContext, useMemo, useCallback } from 'react';
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
import { validateForm } from '../../utils/validateForm';
import { useLanguage } from '../../hooks/useLanguage';
import * as IglesiasModel from '../models/iglesias.model';
import * as OrgModel from '../models/estructuraOrganizacional.model';

const emptyChurchForm = () => ({
  nombre: '',
  division_id: '',
  union_id: '',
  campo_id: '',
  zona_id: '',
});

const emptyOrgFilters = () => ({
  division_id: '',
  union_id: '',
  campo_id: '',
  zona_id: '',
});

export function useIglesiasController() {
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const { activeIglesia, updateActiveIglesia } = useContext(IglesiaContext);
  const { effectiveIglesiaId, canSwitchIglesia } = useScopedIglesia();
  const navigate = useNavigate();
  const userRole = getUserRole(user, userData);
  const canCreate = canCreateIglesia(userRole);
  const canManage = canManageIglesiaProfile(userRole);
  const canToggleEstado = canDeactivateIglesia(userRole);
  const canSelectChurch = isSuperAdmin(userRole);
  const canEditOrg = canManage;

  const [data, setData] = useState([]);
  const [iglesiaData, setIglesiaData] = useState(null);
  const [churchForm, setChurchForm] = useState(emptyChurchForm());
  const [orgFilters, setOrgFilters] = useState(emptyOrgFilters());
  const [divisiones, setDivisiones] = useState([]);
  const [uniones, setUniones] = useState([]);
  const [campos, setCampos] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [filterUniones, setFilterUniones] = useState([]);
  const [filterCampos, setFilterCampos] = useState([]);
  const [filterZonas, setFilterZonas] = useState([]);
  const [hasOrgStructure, setHasOrgStructure] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const scopedRows = useMemo(() => {
    if (canSwitchIglesia) return data;
    if (!effectiveIglesiaId) return [];
    return data.filter(i => i.id === effectiveIglesiaId);
  }, [data, canSwitchIglesia, effectiveIglesiaId]);

  const filteredData = useMemo(() => {
    let rows = scopedRows.filter(i => IglesiasModel.iglesiaMatchesOrgFilter(i, orgFilters));
    return filterBySearch(rows, searchQuery, i => [
      i.nombre,
      i.estado,
      IglesiasModel.iglesiaHierarchyLabel(i),
    ]);
  }, [scopedRows, orgFilters, searchQuery]);

  const loadDivisiones = useCallback(async () => {
    const { data: rows, hasTable } = await OrgModel.fetchDivisiones();
    if (hasTable === false) {
      setDivisiones([]);
      return false;
    }
    setDivisiones(rows || []);
    return true;
  }, []);

  const loadUniones = useCallback(async (divisionId, target = 'form') => {
    if (!divisionId) {
      if (target === 'form') setUniones([]);
      else setFilterUniones([]);
      return;
    }
    const { data: rows } = await OrgModel.fetchUniones({ divisionId });
    if (target === 'form') setUniones(rows || []);
    else setFilterUniones(rows || []);
  }, []);

  const loadCampos = useCallback(async (unionId, target = 'form') => {
    if (!unionId) {
      if (target === 'form') setCampos([]);
      else setFilterCampos([]);
      return;
    }
    const { data: rows } = await OrgModel.fetchCampos({ unionId });
    if (target === 'form') setCampos(rows || []);
    else setFilterCampos(rows || []);
  }, []);

  const loadZonas = useCallback(async (campoId, target = 'form') => {
    if (!campoId) {
      if (target === 'form') setZonas([]);
      else setFilterZonas([]);
      return;
    }
    const { data: rows } = await OrgModel.fetchZonas({ campoId });
    if (target === 'form') setZonas(rows || []);
    else setFilterZonas(rows || []);
  }, []);

  async function hydrateFormCascade(form) {
    if (form.division_id) await loadUniones(form.division_id, 'form');
    if (form.union_id) await loadCampos(form.union_id, 'form');
    if (form.campo_id) await loadZonas(form.campo_id, 'form');
  }

  async function load() {
    setError('');
    setLoading(true);

    try {
      const { data: rows, error: queryError, hasOrgStructure: orgReady } =
        await IglesiasModel.fetchIglesias({ showInactive });

      if (queryError) {
        setError(t('churchesLoadError') + queryError.message);
        setData([]);
        return;
      }

      const orgEnabled = orgReady !== false;
      setHasOrgStructure(orgEnabled);
      setData(rows || []);

      if (orgEnabled) await loadDivisiones();

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
      setError(t('churchesUnexpectedError') + err.message);
    } finally {
      setLoading(false);
    }
  }

  function setChurchFormField(field, value) {
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[field];
      if (field === 'zona_id') delete next.zona_id;
      return next;
    });
    setChurchForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'division_id') {
        next.union_id = '';
        next.campo_id = '';
        next.zona_id = '';
      } else if (field === 'union_id') {
        next.campo_id = '';
        next.zona_id = '';
      } else if (field === 'campo_id') {
        next.zona_id = '';
      }
      return next;
    });
  }

  function setOrgFilter(field, value) {
    setOrgFilters(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'division_id') {
        next.union_id = '';
        next.campo_id = '';
        next.zona_id = '';
      } else if (field === 'union_id') {
        next.campo_id = '';
        next.zona_id = '';
      } else if (field === 'campo_id') {
        next.zona_id = '';
      }
      return next;
    });
  }

  function clearOrgFilters() {
    setOrgFilters(emptyOrgFilters());
    setFilterUniones([]);
    setFilterCampos([]);
    setFilterZonas([]);
  }

  function resetChurchForm() {
    setChurchForm(emptyChurchForm());
    setUniones([]);
    setCampos([]);
    setZonas([]);
    setFieldErrors({});
  }

  function requiresZona() {
    return hasOrgStructure && canEditOrg;
  }

  async function save() {
    if (!canCreate) return;

    setError('');
    const validation = validateForm('iglesia', {
      nombre: churchForm.nombre,
      zona_id: churchForm.zona_id,
      requireZona: requiresZona(),
    }, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    const { error: saveError } = await IglesiasModel.createIglesia({
      nombre: churchForm.nombre.trim(),
      zona_id: churchForm.zona_id || null,
    });
    if (saveError) {
      setError(t('churchesSaveError') + saveError.message);
      return;
    }

    resetChurchForm();
    setShowForm(false);
    load();
  }

  async function startEdit(iglesia) {
    if (!canManage) return;
    if (!canSwitchIglesia && iglesia.id !== effectiveIglesiaId) return;

    setShowForm(false);
    setError('');
    setFieldErrors({});
    const form = IglesiasModel.churchFormFromIglesia(iglesia);
    setEditingId(iglesia.id);
    setChurchForm(form);
    if (hasOrgStructure) await hydrateFormCascade(form);
  }

  async function saveEdit() {
    if (!canManage) return;

    const validation = validateForm('iglesia', {
      nombre: churchForm.nombre,
      zona_id: churchForm.zona_id,
      requireZona: requiresZona(),
    }, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    const { error: updateError } = await IglesiasModel.updateIglesia(editingId, {
      nombre: churchForm.nombre.trim(),
      zona_id: hasOrgStructure ? (churchForm.zona_id || null) : undefined,
    });

    if (updateError) {
      setError(t('churchesSaveError') + updateError.message);
      return;
    }

    setEditingId(null);
    resetChurchForm();
    load();
  }

  async function toggleEstado(iglesia) {
    if (!canToggleEstado) return;

    setError('');
    const nuevo = iglesia.estado === 'activo' ? 'inactivo' : 'activo';

    if (nuevo === 'inactivo') {
      const { data: dep, error: depError } = await IglesiasModel.hasActiveClubes(iglesia.id);
      if (depError) {
        setError(t('churchesDependencyError') + depError.message);
        return;
      }
      if (dep?.length > 0) {
        setError(t('churchHasActiveClubs'));
        return;
      }
    }

    const { error: updateError } = await IglesiasModel.updateIglesiaEstado(iglesia.id, nuevo);
    if (updateError) {
      setError(t('churchesSaveError') + updateError.message);
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

  function cancelEdit() {
    setEditingId(null);
    resetChurchForm();
    setError('');
  }

  useEffect(() => { load(); }, [showInactive, effectiveIglesiaId, canSwitchIglesia]);

  useEffect(() => {
    loadUniones(churchForm.division_id, 'form');
  }, [churchForm.division_id, loadUniones]);

  useEffect(() => {
    loadCampos(churchForm.union_id, 'form');
  }, [churchForm.union_id, loadCampos]);

  useEffect(() => {
    loadZonas(churchForm.campo_id, 'form');
  }, [churchForm.campo_id, loadZonas]);

  useEffect(() => {
    loadUniones(orgFilters.division_id, 'filter');
  }, [orgFilters.division_id, loadUniones]);

  useEffect(() => {
    loadCampos(orgFilters.union_id, 'filter');
  }, [orgFilters.union_id, loadCampos]);

  useEffect(() => {
    loadZonas(orgFilters.campo_id, 'filter');
  }, [orgFilters.campo_id, loadZonas]);

  return {
    data: filteredData,
    totalCount: scopedRows.length,
    searchQuery,
    setSearchQuery,
    iglesiaData,
    activeIglesia,
    churchForm,
    setChurchFormField,
    orgFilters,
    setOrgFilter,
    clearOrgFilters,
    divisiones,
    uniones,
    campos,
    zonas,
    filterUniones,
    filterCampos,
    filterZonas,
    hasOrgStructure,
    showForm,
    setShowForm,
    showInactive,
    setShowInactive,
    error,
    fieldErrors,
    loading,
    editingId,
    canCreate,
    canManage,
    canEditOrg,
    canToggleEstado,
    canSelectChurch,
    save,
    startEdit,
    saveEdit,
    cancelEdit,
    toggleEstado,
    selectIglesia,
    navigateToClubes,
    resetChurchForm,
    iglesiaHierarchyLabel: IglesiasModel.iglesiaHierarchyLabel,
  };
}
