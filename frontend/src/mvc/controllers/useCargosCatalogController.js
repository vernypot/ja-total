import { useEffect, useState, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { getUserRole, isSuperAdmin } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import { validateForm } from '../../utils/validateForm';
import { useLanguage } from '../../hooks/useLanguage';
import * as CargosModel from '../models/cargos.model';

const EMPTY_FORM = {
  nombre: '',
  parent_id: '',
  codigo: '',
  descripcion: '',
  orden: '0',
  tipo_id: '',
};

export function useCargosCatalogController() {
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const { activeClub } = useContext(ClubContext);
  const canManage = isSuperAdmin(getUserRole(user, userData));

  const [data, setData] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tipoFilter, setTipoFilter] = useState('');
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveTipoId = showAllTypes ? (tipoFilter || '') : (tipoFilter || activeClub?.tipoId || '');

  const filteredData = useMemo(() => {
    let rows = data;
    if (effectiveTipoId) {
      rows = CargosModel.filterCargosByTipo(rows, [effectiveTipoId]);
    }
    return filterBySearch(rows, searchQuery, c => [
      c.nombre,
      c.codigo,
      c.descripcion,
      c.tipos_club?.nombre,
    ]);
  }, [data, effectiveTipoId, searchQuery]);

  const tree = useMemo(() => CargosModel.buildCargoTree(filteredData), [filteredData]);

  const parentOptions = useMemo(() => {
    const exclude = editingId
      ? new Set([editingId, ...CargosModel.getDescendantIds(editingId, data)])
      : new Set();
    const eligible = data.filter(c => !exclude.has(c.id) && (c.estado || 'activo') === 'activo');
    return CargosModel.flattenCargosForSelect(CargosModel.buildCargoTree(eligible));
  }, [data, editingId]);

  async function load() {
    setError('');
    const [{ data: rows, error: loadError }, { data: tiposData, error: tiposError }] = await Promise.all([
      CargosModel.fetchCargosCatalog({ showInactive }),
      CargosModel.fetchTiposClub(),
    ]);

    if (loadError) {
      setError(`${t('errorLoadingCargos')}: ${loadError.message}`);
      setData([]);
      return;
    }
    if (tiposError) {
      setError(`${t('errorLoadingCargos')}: ${tiposError.message}`);
    }

    setData(rows || []);
    setTipos(tiposData || []);

    if (!expandedIds.size && rows?.length) {
      const roots = rows.filter(c => !c.parent_id).map(c => c.id);
      setExpandedIds(new Set(roots));
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setEditingId(null);
    setShowForm(false);
  }

  function startCreate(parentId = '') {
    setForm({ ...EMPTY_FORM, parent_id: parentId || '' });
    setEditingId(null);
    setFieldErrors({});
    setShowForm(true);
  }

  function startEdit(item) {
    setForm({
      nombre: item.nombre || '',
      parent_id: item.parent_id || '',
      codigo: item.codigo || '',
      descripcion: item.descripcion || '',
      orden: String(item.orden ?? 0),
      tipo_id: item.tipo_id || '',
    });
    setEditingId(item.id);
    setFieldErrors({});
    setShowForm(true);
  }

  async function saveCargo() {
    if (!canManage) return;
    const validation = validateForm('cargo', form, t);
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setError(validation.firstError);
      return;
    }

    if (editingId && form.parent_id === editingId) {
      setError(t('cargoInvalidParent'));
      return;
    }

    setError('');
    const payload = {
      ...form,
      parent_id: form.parent_id || null,
      tipo_id: form.tipo_id || null,
    };

    const result = editingId
      ? await CargosModel.updateCargo(editingId, payload)
      : await CargosModel.createCargo(payload);

    if (result.error) {
      setError(`${t('errorSavingCargo')}: ${result.error.message}`);
      return;
    }

    resetForm();
    load();
  }

  async function toggleEstado(item) {
    if (!canManage) return;
    if ((item.estado || 'activo') === 'activo' && CargosModel.cargoHasActiveChildren(item.id, data)) {
      setError(t('cargoHasActiveChildren'));
      return;
    }
    setError('');
    const next = item.estado === 'activo' ? 'inactivo' : 'activo';
    const { error: toggleError } = await CargosModel.setCargoEstado(item.id, next);
    if (toggleError) {
      setError(`${t('errorSavingCargo')}: ${toggleError.message}`);
      return;
    }
    load();
  }

  function toggleExpanded(id) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    load();
  }, [showInactive]);

  return {
    tree,
    filteredData,
    tipos,
    form,
    setForm,
    tipoFilter,
    setTipoFilter,
    showAllTypes,
    setShowAllTypes,
    showInactive,
    setShowInactive,
    effectiveTipoId,
    error,
    fieldErrors,
    showForm,
    editingId,
    expandedIds,
    searchQuery,
    setSearchQuery,
    canManage,
    parentOptions,
    resetForm,
    startCreate,
    startEdit,
    saveCargo,
    toggleEstado,
    toggleExpanded,
    getCargoPath: cargoId => CargosModel.getCargoPath(cargoId, data),
  };
}
