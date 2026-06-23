import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { filterBySearch } from '../../utils/listSearch';
import { validateForm } from '../../utils/validateForm';
import * as OrgModel from '../models/estructuraOrganizacional.model';

const LEVELS = ['division', 'union', 'campo', 'zona'];

const emptyForm = level => {
  if (level === 'campo') return { codigo: '', nombre: '', tipo_campo: 'mision' };
  return { codigo: '', nombre: '' };
};

export function useEstructuraOrganizacionalController() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();

  const divisionId = params.get('division') || '';
  const unionId = params.get('union') || '';
  const campoId = params.get('campo') || '';

  const level = campoId ? 'zona' : unionId ? 'campo' : divisionId ? 'union' : 'division';

  const [items, setItems] = useState([]);
  const [parents, setParents] = useState({});
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm(level));
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [hasTable, setHasTable] = useState(true);

  const filteredItems = useMemo(
    () => filterBySearch(items, searchQuery, item => [
      item.codigo,
      item.nombre,
      item.tipo_campo,
      item.estado,
    ]),
    [items, searchQuery]
  );

  const loadParents = useCallback(async () => {
    const next = {};
    if (divisionId) {
      const { data } = await OrgModel.fetchDivisionById(divisionId);
      if (data) next.division = data;
    }
    if (unionId) {
      const { data } = await OrgModel.fetchUnionById(unionId);
      if (data) next.union = data;
    }
    if (campoId) {
      const { data } = await OrgModel.fetchCampoById(campoId);
      if (data) next.campo = data;
    }
    setParents(next);
  }, [divisionId, unionId, campoId]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');

    let result;
    if (level === 'division') {
      result = await OrgModel.fetchDivisiones({ showInactive });
    } else if (level === 'union') {
      result = await OrgModel.fetchUniones({ divisionId, showInactive });
    } else if (level === 'campo') {
      result = await OrgModel.fetchCampos({ unionId, showInactive });
    } else {
      result = await OrgModel.fetchZonas({ campoId, showInactive });
    }

    if (result.error) {
      setError(t('orgStructureLoadError') + result.error.message);
      setItems([]);
      setHasTable(result.hasTable !== false);
    } else {
      setItems(result.data || []);
      setHasTable(result.hasTable !== false);
    }

    setLoading(false);
  }, [level, divisionId, unionId, campoId, showInactive, t]);

  function navigateToLevel(nextLevel, ids = {}) {
    const next = new URLSearchParams();
    if (ids.division) next.set('division', ids.division);
    if (ids.union) next.set('union', ids.union);
    if (ids.campo) next.set('campo', ids.campo);
    setParams(next);
    setShowForm(false);
    setEditingId('');
    setForm(emptyForm(nextLevel));
    setSearchQuery('');
    setFieldErrors({});
  }

  function drillDown(item) {
    if (level === 'division') {
      navigateToLevel('union', { division: item.id });
    } else if (level === 'union') {
      navigateToLevel('campo', { division: divisionId, union: item.id });
    } else if (level === 'campo') {
      navigateToLevel('zona', { division: divisionId, union: unionId, campo: item.id });
    }
  }

  function goUp() {
    if (level === 'zona') {
      navigateToLevel('campo', { division: divisionId, union: unionId });
    } else if (level === 'campo') {
      navigateToLevel('union', { division: divisionId });
    } else if (level === 'union') {
      navigateToLevel('division', {});
    }
  }

  function openCreateForm() {
    setEditingId('');
    setForm(emptyForm(level));
    setShowForm(true);
    setFieldErrors({});
    setError('');
  }

  function closeForm() {
    setShowForm(false);
    setEditingId('');
    setForm(emptyForm(level));
    setFieldErrors({});
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      codigo: item.codigo || '',
      nombre: item.nombre || '',
      ...(level === 'campo' ? { tipo_campo: item.tipo_campo || 'mision' } : {}),
    });
    setShowForm(true);
    setFieldErrors({});
  }

  async function save() {
    const schemaId = {
      division: 'division',
      union: 'union',
      campo: 'campo',
      zona: 'zona',
    }[level];

    const validation = validateForm(schemaId, form, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    setError('');
    const payload = {
      codigo: form.codigo.trim() || null,
      nombre: form.nombre.trim(),
      ...(level === 'campo' ? { tipo_campo: form.tipo_campo } : {}),
    };

    let saveError;
    if (editingId) {
      const updaters = {
        division: OrgModel.updateDivision,
        union: OrgModel.updateUnion,
        campo: OrgModel.updateCampo,
        zona: OrgModel.updateZona,
      };
      ({ error: saveError } = await updaters[level](editingId, payload));
    } else {
      const parentPayload = {
        division: {},
        union: { division_id: divisionId },
        campo: { union_id: unionId },
        zona: { campo_id: campoId },
      }[level];
      const creators = {
        division: OrgModel.createDivision,
        union: OrgModel.createUnion,
        campo: OrgModel.createCampo,
        zona: OrgModel.createZona,
      };
      ({ error: saveError } = await creators[level]({ ...payload, ...parentPayload, estado: 'activo' }));
    }

    if (saveError) {
      setError(t('orgStructureSaveError') + saveError.message);
      return;
    }

    closeForm();
    loadItems();
  }

  async function toggleEstado(item) {
    setError('');
    const nuevo = item.estado === 'activo' ? 'inactivo' : 'activo';

    if (nuevo === 'inactivo') {
      const { data: dep, error: depError } = await OrgModel.hasActiveChildren(level, item.id);
      if (depError) {
        setError(t('orgStructureDependencyError') + depError.message);
        return;
      }
      if (dep?.length > 0) {
        setError(t('orgStructureHasActiveChildren'));
        return;
      }
    }

    const { error: updateError } = await OrgModel.toggleEstado(level, item.id, nuevo);
    if (updateError) {
      setError(t('orgStructureSaveError') + updateError.message);
      return;
    }
    loadItems();
  }

  const breadcrumb = useMemo(() => {
    const crumbs = [{ label: t('divisions'), level: 'division', onClick: () => navigateToLevel('division', {}) }];
    if (parents.division) {
      crumbs.push({
        label: `${parents.division.codigo} — ${parents.division.nombre}`,
        level: 'union',
        onClick: () => navigateToLevel('union', { division: parents.division.id }),
      });
    }
    if (parents.union) {
      crumbs.push({
        label: parents.union.nombre,
        level: 'campo',
        onClick: () => navigateToLevel('campo', { division: divisionId, union: parents.union.id }),
      });
    }
    if (parents.campo) {
      const tipo = parents.campo.tipo_campo === 'asociacion' ? t('association') : t('mission');
      crumbs.push({
        label: `${tipo}: ${parents.campo.nombre}`,
        level: 'zona',
        onClick: () => navigateToLevel('zona', { division: divisionId, union: unionId, campo: parents.campo.id }),
      });
    }
    return crumbs;
  }, [parents, divisionId, unionId, t]);

  const levelTitle = {
    division: t('divisions'),
    union: t('unions'),
    campo: t('localFields'),
    zona: t('zones'),
  }[level];

  const levelHint = {
    division: t('divisionsHint'),
    union: t('unionsHint'),
    campo: t('localFieldsHint'),
    zona: t('zonesHint'),
  }[level];

  const childLabel = {
    division: t('manageUnions'),
    union: t('manageLocalFields'),
    campo: t('manageZones'),
  }[level];

  useEffect(() => {
    loadParents();
  }, [loadParents]);

  useEffect(() => {
    setForm(emptyForm(level));
    loadItems();
  }, [level, loadItems]);

  return {
    level,
    levels: LEVELS,
    items: filteredItems,
    breadcrumb,
    levelTitle,
    levelHint,
    childLabel,
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
    hasTable,
    openCreateForm,
    closeForm,
    startEdit,
    save,
    toggleEstado,
    drillDown,
    goUp,
    canDrillDown: level !== 'zona',
    canGoUp: level !== 'division',
  };
}
