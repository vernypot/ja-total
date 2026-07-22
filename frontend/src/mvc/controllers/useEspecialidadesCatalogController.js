import { useEffect, useState, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { getUserRole, isSuperAdmin } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import { useListPagination } from '../../hooks/useListPagination';
import { validateForm } from '../../utils/validateForm';
import { useLanguage } from '../../hooks/useLanguage';
import * as EspecialidadesModel from '../models/especialidades.model';

export function useEspecialidadesCatalogController() {
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const { activeClub } = useContext(ClubContext);
  const userRole = getUserRole(user, userData);
  const canManage = isSuperAdmin(userRole);

  const [data, setData] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [secciones, setSecciones] = useState([]);
  const [form, setForm] = useState({ nombre: '', tipo_id: '', seccion_id: '' });
  const [tipoFilter, setTipoFilter] = useState('');
  const [seccionFilter, setSeccionFilter] = useState('');
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [requisitosByEsp, setRequisitosByEsp] = useState({});
  const [newRequisito, setNewRequisito] = useState('');
  const [hasEstado, setHasEstado] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const effectiveTipoId = showAllTypes
    ? (tipoFilter || '')
    : (tipoFilter || activeClub?.tipoId || '');

  const catalogTipoId = showAllTypes ? (tipoFilter || undefined) : (effectiveTipoId || undefined);

  const filteredData = useMemo(
    () => filterBySearch(data, searchQuery, e => [
      e.nombre,
      e.club_tipo,
      e.tipos_club?.nombre,
      e.especialidad_secciones?.nombre,
    ]),
    [data, searchQuery]
  );

  const {
    pageItems,
    ...listPagination
  } = useListPagination(filteredData, [searchQuery, effectiveTipoId, seccionFilter, showInactive]);

  const groupedData = useMemo(() => {
    if (seccionFilter) return null;

    const hasSectionLinks = pageItems.some(
      e => e.seccion_id || e.especialidad_secciones?.id
    );
    const sectionCatalog = EspecialidadesModel.collectSeccionesFromEspecialidades(pageItems, secciones);

    if (sectionCatalog.length || hasSectionLinks) {
      return EspecialidadesModel.groupEspecialidadesBySeccion(pageItems, sectionCatalog);
    }

    if (effectiveTipoId) return null;

    return tipos
      .map(tipo => ({
        seccion: null,
        tipo,
        especialidades: pageItems.filter(e => e.tipo_id === tipo.id || e.club_tipo === tipo.nombre),
      }))
      .filter(group => group.especialidades.length > 0);
  }, [pageItems, secciones, tipos, effectiveTipoId, seccionFilter]);

  async function load() {
    setError('');

    const { data: tiposData, error: tiposError } = await EspecialidadesModel.fetchTiposClub();
    if (tiposError) {
      setError('Error loading specialties: ' + tiposError.message);
      setTipos([]);
      setData([]);
      return;
    }

    const { data: rows, error: loadError, hasEstado: estadoSupported, secciones: seccionesData, totalCount: loadedCount } =
      await EspecialidadesModel.fetchEspecialidadesCatalogSorted({
        showInactive,
        tipoId: catalogTipoId,
        tipos: tiposData || [],
      });

    if (loadError) {
      setError('Error loading specialties: ' + loadError.message);
      setData([]);
      setTipos(tiposData || []);
      setSecciones([]);
      setTotalCount(0);
      return;
    }

    let scoped = rows || [];

    if (seccionFilter) {
      scoped = scoped.filter(e =>
        e.seccion_id === seccionFilter || e.especialidad_secciones?.id === seccionFilter
      );
    }

    setHasEstado(Boolean(estadoSupported));
    setTipos(tiposData || []);
    setSecciones(seccionesData || []);
    setTotalCount(loadedCount || scoped.length);
    setData(scoped);

    const ids = (scoped || []).map(e => e.id);
    if (ids.length) {
      const { data: reqs } = await EspecialidadesModel.fetchRequisitosForEspecialidades(ids, {
        showInactive: true,
      });
      const map = {};
      for (const r of reqs || []) {
        if (!map[r.especialidad_id]) map[r.especialidad_id] = [];
        map[r.especialidad_id].push(r);
      }
      setRequisitosByEsp(map);
    } else {
      setRequisitosByEsp({});
    }
  }

  async function save() {
    if (!canManage) return;

    const validation = validateForm('especialidad', form, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    setError('');
    const payload = { nombre: form.nombre, tipo_id: form.tipo_id, seccion_id: form.seccion_id || null };
    const { error: saveError } = editingId
      ? await EspecialidadesModel.updateEspecialidad(editingId, payload)
      : await EspecialidadesModel.createEspecialidad(payload);

    if (saveError) {
      setError('Error saving specialty: ' + saveError.message);
      return;
    }

    setForm({ nombre: '', tipo_id: effectiveTipoId || '', seccion_id: seccionFilter || '' });
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
      seccion_id: item.seccion_id || item.especialidad_secciones?.id || '',
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
    setForm({ nombre: '', tipo_id: effectiveTipoId || '', seccion_id: seccionFilter || '' });
  }

  function toggleForm() {
    setShowForm(prev => {
      const next = !prev;
      if (next && !editingId) {
        setForm({ nombre: '', tipo_id: effectiveTipoId || '', seccion_id: seccionFilter || '' });
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
    await load();
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
    await load();
  }

  async function toggleRequisitoEstado(especialidadId, requisito) {
    if (!canManage) return;
    const next = requisito.estado === 'activo' ? 'inactivo' : 'activo';
    setError('');
    const { error: updateError } = await EspecialidadesModel.setEspecialidadRequisitoEstado(requisito.id, next);
    if (updateError) {
      setError('Error updating requirement status: ' + updateError.message);
      return;
    }
    await loadRequisitos(especialidadId);
    await load();
  }

  useEffect(() => { load(); }, [showInactive, catalogTipoId, seccionFilter]);
  useEffect(() => {
    if (activeClub?.tipoId && !tipoFilter) {
      setForm(prev => ({ ...prev, tipo_id: prev.tipo_id || activeClub.tipoId }));
    }
  }, [activeClub?.tipoId]);

  return {
    data: pageItems,
    groupedData,
    listPagination,
    searchQuery,
    setSearchQuery,
    secciones,
    seccionFilter,
    setSeccionFilter,
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
    fieldErrors,
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
    toggleRequisitoEstado,
    hasEstado,
    clearTipoFilter,
    showAllTypes,
    setShowAllTypes,
    totalCount,
  };
}
