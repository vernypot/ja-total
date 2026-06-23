import { useEffect, useState, useMemo, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import { validateForm } from '../../utils/validateForm';
import { useLanguage } from '../../hooks/useLanguage';
import * as CargosModel from '../models/cargos.model';
import * as MiembrosModel from '../models/miembros.model';

const EMPTY_ASSIGNMENT = {
  cargo_id: '',
  club_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  en_curso: true,
  inicioDesconocido: false,
  notas: '',
};

function getCargoFromLink(row) {
  return row.cargos || null;
}

export function useMiembroCargosController(miembroId) {
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const canManage = canManageChurchData(getUserRole(user, userData));

  const [assignments, setAssignments] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [memberClubs, setMemberClubs] = useState([]);
  const [memberTipos, setMemberTipos] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_ASSIGNMENT);

  const { active, history } = useMemo(
    () => CargosModel.splitMiembroCargos(assignments),
    [assignments]
  );

  const ongoingCargoIds = useMemo(
    () => new Set(active.map(row => row.cargo_id || row.cargos?.id).filter(Boolean)),
    [active]
  );

  const assignableCargos = useMemo(() => {
    const filtered = CargosModel.filterCargosByTipo(
      catalog.filter(c => (c.estado || 'activo') === 'activo' && !ongoingCargoIds.has(c.id)),
      memberTipos.map(t => t.id).filter(Boolean)
    );
    return CargosModel.flattenCargosForSelect(CargosModel.buildCargoTree(filtered));
  }, [catalog, memberTipos, ongoingCargoIds]);

  async function load() {
    if (!miembroId) return;
    setLoading(true);
    setError('');

    const [
      { data: rows, error: rowsError },
      { data: catalogRows, error: catalogError },
      { data: clubs, error: clubsError },
      { tipoIds, tipos, error: tiposError },
    ] = await Promise.all([
      CargosModel.fetchMiembroCargos(miembroId),
      CargosModel.fetchCargosCatalog({ showInactive: false }),
      MiembrosModel.fetchMiembroClubsWithLogos(miembroId),
      MiembrosModel.fetchMiembroClubTipoIds(miembroId),
    ]);

    if (rowsError) {
      setError(`${t('errorLoadingMemberCargos')}: ${rowsError.message}`);
      setLoading(false);
      return;
    }
    if (catalogError) {
      setError(`${t('errorLoadingCargos')}: ${catalogError.message}`);
    }
    if (clubsError) {
      setError(`${t('errorLoadingMemberCargos')}: ${clubsError.message}`);
    }
    if (tiposError) {
      setError(`${t('errorLoadingMemberCargos')}: ${tiposError.message}`);
    }

    setAssignments(rows || []);
    setCatalog(catalogRows || []);
    setMemberClubs(clubs || []);
    setMemberTipos(tipos || []);
    setLoading(false);
  }

  function resetForm() {
    setForm(EMPTY_ASSIGNMENT);
    setFieldErrors({});
    setEditingId(null);
    setShowForm(false);
  }

  function startAssign() {
    setForm({
      ...EMPTY_ASSIGNMENT,
      club_id: memberClubs.length === 1 ? memberClubs[0].id : '',
    });
    setEditingId(null);
    setFieldErrors({});
    setShowForm(true);
  }

  function startEdit(row) {
    setForm({
      cargo_id: row.cargo_id || row.cargos?.id || '',
      club_id: row.club_id || '',
      fecha_inicio: row.fecha_inicio || '',
      fecha_fin: row.fecha_fin || '',
      en_curso: Boolean(row.en_curso),
      inicioDesconocido: !row.fecha_inicio,
      notas: row.notas || '',
    });
    setEditingId(row.id);
    setFieldErrors({});
    setShowForm(true);
  }

  async function saveAssignment() {
    if (!canManage) return;
    const validation = validateForm(
      'miembroCargo',
      editingId ? { ...form, cargo_id: form.cargo_id || 'existing' } : form,
      t
    );
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setError(validation.firstError);
      return;
    }

    setError('');
    const result = editingId
      ? await CargosModel.updateMiembroCargo(editingId, form)
      : await CargosModel.assignCargoToMiembro(miembroId, form.cargo_id, form);

    if (result.error) {
      setError(`${t('errorSavingCargoAssignment')}: ${result.error.message}`);
      return;
    }

    resetForm();
    load();
  }

  async function closeAssignment(linkId) {
    if (!canManage) return;
    setError('');
    const { error: closeError } = await CargosModel.closeMiembroCargo(linkId);
    if (closeError) {
      setError(`${t('errorSavingCargoAssignment')}: ${closeError.message}`);
      return;
    }
    load();
  }

  useEffect(() => {
    load();
  }, [miembroId]);

  return {
    active,
    history,
    assignableCargos,
    catalog,
    memberClubs,
    memberTipos,
    error,
    fieldErrors,
    loading,
    showForm,
    editingId,
    form,
    setForm,
    canManage,
    resetForm,
    startAssign,
    startEdit,
    saveAssignment,
    closeAssignment,
    getCargoFromLink,
    getCargoPath: cargoId => CargosModel.getCargoPath(cargoId, catalog),
  };
}
