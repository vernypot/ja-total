import { useEffect, useMemo, useState, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import { validateForm } from '../../utils/validateForm';
import { useLanguage } from '../../hooks/useLanguage';
import * as DistincionesModel from '../models/distinciones.model';
import * as MiembrosModel from '../models/miembros.model';

const EMPTY_FORM = {
  distincion_id: '',
  club_id: '',
  fecha_otorgada: new Date().toISOString().slice(0, 10),
  notas: '',
};

export function useMiembroDistincionesController(miembroId) {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const activeClubId = params.get('club') || '';
  const { user, userData } = useContext(AuthContext);
  const canManage = canManageChurchData(getUserRole(user, userData));

  const [assigned, setAssigned] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [memberClubs, setMemberClubs] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [hasTable, setHasTable] = useState(true);

  const assignedIds = useMemo(
    () => new Set(assigned.map(row => DistincionesModel.getDistincionIdFromRow(row)).filter(Boolean)),
    [assigned]
  );

  const assignable = useMemo(
    () => catalog.filter(item => (item.estado || 'activo') === 'activo' && !assignedIds.has(item.id)),
    [catalog, assignedIds]
  );

  async function load() {
    if (!miembroId) return;
    setLoading(true);
    setError('');

    const [
      { data: assignedRows, error: assignedError, hasTable: tableExists },
      { data: catalogRows, error: catalogError },
      { data: clubs, error: clubsError },
    ] = await Promise.all([
      DistincionesModel.fetchMiembroDistinciones(miembroId),
      DistincionesModel.fetchDistincionesCatalog({ showInactive: false }),
      MiembrosModel.fetchMiembroClubsWithLogos(miembroId),
    ]);

    if (assignedError) {
      setError(`${t('errorLoadingMemberDistinciones')}: ${assignedError.message}`);
      setLoading(false);
      return;
    }
    if (catalogError) {
      setError(`${t('errorLoadingDistinciones')}: ${catalogError.message}`);
      setLoading(false);
      return;
    }
    if (clubsError) {
      setError(`${t('errorLoadingMemberDistinciones')}: ${clubsError.message}`);
      setLoading(false);
      return;
    }

    setAssigned(assignedRows || []);
    setCatalog(catalogRows || []);
    setMemberClubs(clubs || []);
    setHasTable(tableExists !== false);
    setLoading(false);
  }

  function startAssign() {
    setForm({
      ...EMPTY_FORM,
      club_id: activeClubId || '',
      fecha_otorgada: new Date().toISOString().slice(0, 10),
    });
    setFieldErrors({});
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setFieldErrors({});
  }

  async function assignDistincion() {
    if (!canManage) return;

    const validation = validateForm('miembroDistincion', form, t);
    setFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError || validation.formError);
      return;
    }

    setError('');
    const { error: assignError } = await DistincionesModel.assignDistincionToMiembro({
      miembroId,
      distincionId: form.distincion_id,
      clubId: form.club_id || null,
      fechaOtorgada: form.fecha_otorgada,
      notas: form.notas,
    });

    if (assignError) {
      setError(`${t('errorAssigningDistincion')}: ${assignError.message}`);
      return;
    }

    closeForm();
    load();
  }

  async function unassignDistincion(linkId) {
    if (!canManage) return;
    setError('');
    const { error: unassignError } = await DistincionesModel.unassignDistincionFromMiembro(linkId);
    if (unassignError) {
      setError(`${t('errorUnassigningDistincion')}: ${unassignError.message}`);
      return;
    }
    load();
  }

  useEffect(() => {
    load();
  }, [miembroId]);

  return {
    assigned,
    assignable,
    memberClubs,
    error,
    fieldErrors,
    loading,
    showForm,
    form,
    setForm,
    canManage,
    hasTable,
    startAssign,
    closeForm,
    assignDistincion,
    unassignDistincion,
    getDistincionFromRow: DistincionesModel.getDistincionFromRow,
  };
}
