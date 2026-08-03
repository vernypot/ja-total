import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { useLanguage } from '../../hooks/useLanguage';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import { filterBySearch } from '../../utils/listSearch';
import { useListPagination } from '../../hooks/useListPagination';
import * as UnidadesModel from '../models/unidades.model';
import * as ClubesModel from '../models/clubes.model';
import * as UnidadEvaluacionModel from '../models/unidadEvaluacion.model';
import * as ReglamentoModel from '../models/reglamento.model';
import {
  computeAllUnidadEvaluations,
  DEFAULT_UNIDAD_EVAL_CONFIG,
  formatEvalPoints,
  formatEvalPercent,
  formatValidationStartDate,
} from '../../utils/unidadEvaluacion';

const EMPTY_FORM = {
  nombre: '',
  genero: 'M',
  descripcion: '',
  evaluacion_inicio_fecha: '',
};

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function useUnidadesController() {
  const { user, userData } = useContext(AuthContext);
  const { activeClub, updateActiveClub } = useContext(ClubContext);
  const { effectiveIglesiaId, hasIglesiaAssignment, assignedIglesiaActive, canSwitchIglesia } = useScopedIglesia();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const requestedClubId = params.get('club') || '';
  const clubId = requestedClubId || activeClub?.id || '';
  const userRole = getUserRole(user, userData);
  const canManage = canManageChurchData(userRole);

  const [clubs, setClubs] = useState([]);
  const [club, setClub] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingUnidadId, setEditingUnidadId] = useState('');
  const [savingUnidadId, setSavingUnidadId] = useState('');
  const [assigningKey, setAssigningKey] = useState('');
  const [evalConfig, setEvalConfig] = useState({ ...DEFAULT_UNIDAD_EVAL_CONFIG });
  const [evalItems, setEvalItems] = useState([]);
  const [evalCantidades, setEvalCantidades] = useState([]);
  const [memberEventRows, setMemberEventRows] = useState([]);
  const [evalSchemaAvailable, setEvalSchemaAvailable] = useState(true);
  const [savingEval, setSavingEval] = useState(false);
  const [savingItemId, setSavingItemId] = useState('');
  const [savingCantidadKey, setSavingCantidadKey] = useState('');
  const [savingValidationStartId, setSavingValidationStartId] = useState('');
  const [reglamentoNodos, setReglamentoNodos] = useState([]);
  const [reglamentoInfracciones, setReglamentoInfracciones] = useState([]);
  const [reglamentoSchemaAvailable, setReglamentoSchemaAvailable] = useState(true);
  const [savingInfraccionId, setSavingInfraccionId] = useState('');

  const loadedClubIdRef = useRef('');
  const urlSyncedRef = useRef(false);

  const membersById = useMemo(() => {
    const map = {};
    for (const member of members) {
      if (member?.id) map[member.id] = member;
    }
    return map;
  }, [members]);

  const assignedMemberIds = useMemo(
    () => UnidadesModel.getAssignedMemberIds(unidades),
    [unidades]
  );

  const poolMembers = useMemo(() => {
    const filtered = members.filter(member => !assignedMemberIds.has(member.id));
    return filterBySearch(filtered, searchQuery, member => UnidadesModel.memberDisplayNameFromRow(member));
  }, [members, assignedMemberIds, searchQuery]);

  const {
    pageItems: paginatedPoolMembers,
    ...listPagination
  } = useListPagination(poolMembers, [searchQuery, clubId]);

  const displayUnidades = useMemo(
    () => UnidadesModel.attachMembersToUnidadAssignments(unidades, membersById),
    [unidades, membersById]
  );

  const evalScoresByUnidadId = useMemo(
    () => computeAllUnidadEvaluations({
      unidades: displayUnidades,
      memberEventRows,
      config: evalConfig,
      evalItems,
      cantidades: evalCantidades,
      reglamentoInfracciones,
      reglamentoNodos,
    }),
    [displayUnidades, memberEventRows, evalConfig, evalItems, evalCantidades, reglamentoInfracciones, reglamentoNodos]
  );

  async function loadEvalData(currentClubId, currentUnidades, currentMembers) {
    if (!currentClubId) {
      setEvalConfig({ ...DEFAULT_UNIDAD_EVAL_CONFIG });
      setEvalItems([]);
      setEvalCantidades([]);
      setMemberEventRows([]);
      setReglamentoNodos([]);
      setReglamentoInfracciones([]);
      setEvalSchemaAvailable(true);
      setReglamentoSchemaAvailable(true);
      return;
    }

    const memberIds = UnidadesModel.getAssignedMemberIds(currentUnidades);
    const ids = [...memberIds];

    const [evalResult, eventRowsResult, reglamentoResult] = await Promise.all([
      UnidadEvaluacionModel.fetchClubUnidadEval(currentClubId),
      ids.length
        ? UnidadEvaluacionModel.fetchClubMemberEventRowsForEval(currentClubId, ids)
        : Promise.resolve({ data: [], error: null }),
      ReglamentoModel.fetchClubReglamento(currentClubId),
    ]);

    if (evalResult.error) {
      const msg = evalResult.error.message || '';
      if (msg.includes('does not exist') || msg.includes('Could not find')) {
        setEvalSchemaAvailable(false);
      }
    } else {
      setEvalSchemaAvailable(true);
      setEvalConfig(evalResult.data?.config || { ...DEFAULT_UNIDAD_EVAL_CONFIG });
      setEvalItems(evalResult.data?.items || []);
      setEvalCantidades(evalResult.data?.cantidades || []);
    }

    if (!eventRowsResult.error) {
      setMemberEventRows(eventRowsResult.data || []);
    }

    if (reglamentoResult.error) {
      const msg = reglamentoResult.error.message || '';
      if (msg.includes('does not exist') || msg.includes('Could not find')) {
        setReglamentoSchemaAvailable(false);
      }
    } else {
      setReglamentoSchemaAvailable(reglamentoResult.schemaAvailable !== false);
      setReglamentoNodos(reglamentoResult.data?.nodos || []);
      setReglamentoInfracciones(reglamentoResult.data?.infracciones || []);
    }
  }

  async function refreshUnidades({ showLoading = false } = {}) {
    if (!clubId) {
      setUnidades([]);
      setMembers([]);
      setClub(null);
      setLoading(false);
      loadedClubIdRef.current = '';
      return;
    }

    const isClubChange = loadedClubIdRef.current !== clubId;
    if (showLoading || isClubChange) {
      setLoading(true);
    }

    loadedClubIdRef.current = clubId;

    const [clubResult, unidadesResult, membersResult] = await Promise.all([
      ClubesModel.fetchClubById(clubId),
      UnidadesModel.fetchUnidadesByClub(clubId),
      UnidadesModel.fetchClubMembersForUnidades(clubId),
    ]);

    const errors = [clubResult.error, unidadesResult.error, membersResult.error].filter(Boolean);
    if (errors.length) {
      setError(errors[0].message || t('unidadLoadError'));
    } else {
      setError('');
    }

    if (clubResult.data) {
      setClub(clubResult.data);
    } else {
      setClub(null);
    }

    setUnidades(unidadesResult.data || []);
    setMembers(membersResult.data || []);
    await loadEvalData(clubId, unidadesResult.data || [], membersResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadClubs() {
      if (!effectiveIglesiaId) {
        if (!cancelled) setClubs([]);
        return;
      }

      const { data, error: clubsError } = await ClubesModel.fetchClubes({
        iglesiaId: effectiveIglesiaId,
        showInactive: false,
      });

      if (cancelled) return;

      if (clubsError) {
        setError(clubsError.message || t('unidadLoadError'));
        setClubs([]);
        return;
      }

      setClubs(data || []);
    }

    loadClubs();
    return () => {
      cancelled = true;
    };
  }, [effectiveIglesiaId]);

  useEffect(() => {
    if (requestedClubId) {
      urlSyncedRef.current = true;
      return;
    }
    if (urlSyncedRef.current || !activeClub?.id || !clubs.length) return;
    if (!clubs.some(item => item.id === activeClub.id)) return;
    urlSyncedRef.current = true;
    navigate(`/dashboard/unidades?club=${activeClub.id}`, { replace: true });
  }, [requestedClubId, activeClub?.id, clubs, navigate]);

  useEffect(() => {
    if (clubId && clubs.some(item => item.id === clubId)) {
      const nextClub = clubs.find(item => item.id === clubId);
      if (nextClub) updateActiveClub(nextClub);
    }
  }, [clubId, clubs]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!clubId) {
        if (!cancelled) {
          setUnidades([]);
          setMembers([]);
          setClub(null);
          setLoading(false);
          loadedClubIdRef.current = '';
        }
        return;
      }

      const isClubChange = loadedClubIdRef.current !== clubId;
      if (isClubChange) {
        setLoading(true);
      }

      loadedClubIdRef.current = clubId;

      const [clubResult, unidadesResult, membersResult] = await Promise.all([
        ClubesModel.fetchClubById(clubId),
        UnidadesModel.fetchUnidadesByClub(clubId),
        UnidadesModel.fetchClubMembersForUnidades(clubId),
      ]);

      if (cancelled) return;

      const errors = [clubResult.error, unidadesResult.error, membersResult.error].filter(Boolean);
      if (errors.length) {
        setError(errors[0].message || t('unidadLoadError'));
      } else {
        setError('');
      }

      if (clubResult.data) {
        setClub(clubResult.data);
      } else {
        setClub(null);
      }

      setUnidades(unidadesResult.data || []);
      setMembers(membersResult.data || []);
      await loadEvalData(clubId, unidadesResult.data || [], membersResult.data || []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  function setClubId(nextClubId) {
    if (nextClubId) {
      const nextClub = clubs.find(item => item.id === nextClubId);
      if (nextClub) updateActiveClub(nextClub);
      navigate(`/dashboard/unidades?club=${nextClubId}`);
      return;
    }
    navigate('/dashboard/unidades');
  }

  function resetForm() {
    setForm({
      ...EMPTY_FORM,
      evaluacion_inicio_fecha: todayDateInputValue(),
    });
    setEditingUnidadId('');
    setShowForm(false);
  }

  function startCreateUnidad() {
    setEditingUnidadId('');
    setForm({
      ...EMPTY_FORM,
      evaluacion_inicio_fecha: todayDateInputValue(),
    });
    setShowForm(true);
  }

  function startEditUnidad(unidad) {
    setEditingUnidadId(unidad.id);
    setForm({
      nombre: unidad.nombre || '',
      genero: unidad.genero || 'M',
      descripcion: unidad.descripcion || '',
      evaluacion_inicio_fecha: unidad.evaluacion_inicio_fecha || '',
    });
    setShowForm(true);
  }

  async function saveUnidad() {
    if (!canManage || !clubId) return;
    if (!form.nombre.trim()) {
      setError(t('unidadNameRequired'));
      return;
    }

    setError('');
    setMessage('');
    setSavingUnidadId(editingUnidadId || 'new');

    const payload = {
      nombre: form.nombre.trim(),
      genero: form.genero,
      descripcion: form.descripcion.trim() || null,
      evaluacionInicioFecha: form.evaluacion_inicio_fecha || null,
    };

    const result = editingUnidadId
      ? await UnidadesModel.updateUnidad(editingUnidadId, payload)
      : await UnidadesModel.createUnidad({ clubId, ...payload });

    setSavingUnidadId('');

    if (result.error) {
      setError(result.error.message || t('unidadSaveError'));
      return;
    }

    setMessage(editingUnidadId ? t('unidadUpdated') : t('unidadCreated'));
    resetForm();
    await refreshUnidades();
  }

  async function removeUnidad(unidadId) {
    if (!canManage || !unidadId) return;
    setError('');
    setMessage('');
    setSavingUnidadId(unidadId);

    const { error: deleteError } = await UnidadesModel.deactivateUnidad(unidadId);
    setSavingUnidadId('');

    if (deleteError) {
      setError(deleteError.message || t('unidadDeleteError'));
      return;
    }

    setMessage(t('unidadDeleted'));
    await refreshUnidades();
  }

  async function addMemberToUnidad(unidadId, memberId) {
    if (!canManage || !unidadId || !memberId) return;

    const unidad = unidades.find(item => item.id === unidadId);
    const member = membersById[memberId];
    if (!unidad || !member) return;

    if ((unidad.miembro_unidad || []).some(row => row.miembro_id === memberId)) {
      return;
    }

    if (!UnidadesModel.memberMatchesUnidadGender(member, unidad.genero)) {
      setError(t('unidadGenderMismatch'));
      return;
    }

    const fromUnidad = unidades.find(item => (
      item.id !== unidadId
      && (item.miembro_unidad || []).some(row => row.miembro_id === memberId)
    ));

    setError('');
    setMessage('');
    setAssigningKey(`${unidadId}:${memberId}`);

    const { error: assignError } = await UnidadesModel.assignMiembroToUnidad({
      unidadId,
      miembroId: memberId,
      rol: 'miembro',
    });

    setAssigningKey('');

    if (assignError) {
      setError(assignError.message || t('unidadAssignError'));
      return;
    }

    setMessage(fromUnidad ? t('unidadMemberMoved') : t('unidadMemberAssigned'));
    await refreshUnidades();
  }

  async function removeMemberFromUnidad(miembroUnidadId) {
    if (!canManage || !miembroUnidadId) return;

    setError('');
    setAssigningKey(miembroUnidadId);

    const { error: removeError } = await UnidadesModel.removeMiembroFromUnidad(miembroUnidadId);
    setAssigningKey('');

    if (removeError) {
      setError(removeError.message || t('unidadRemoveMemberError'));
      return;
    }

    await refreshUnidades();
  }

  async function updateMemberRole(miembroUnidadId, rol) {
    if (!canManage || !miembroUnidadId || !rol) return;

    setError('');
    setAssigningKey(`role:${miembroUnidadId}`);

    const { error: roleError } = await UnidadesModel.setMiembroUnidadRol(miembroUnidadId, rol);
    setAssigningKey('');

    if (roleError) {
      setError(roleError.message || t('unidadRoleError'));
      return;
    }

    await refreshUnidades();
  }

  async function saveEvalConfig(nextConfig) {
    if (!canManage || !clubId) return;
    setError('');
    setMessage('');
    setSavingEval(true);

    const { error: saveError } = await UnidadEvaluacionModel.saveClubUnidadEvalConfig(clubId, nextConfig);
    setSavingEval(false);

    if (saveError) {
      setError(saveError.message || t('unidadEvalSaveError'));
      return;
    }

    setEvalConfig(nextConfig);
    setMessage(t('unidadEvalSaved'));
  }

  async function saveEvalItem({ itemId, nombre, descripcion, puntos }) {
    if (!canManage || !clubId || !nombre) return;
    setError('');
    setMessage('');
    setSavingItemId(itemId || 'new');

    const { error: saveError } = await UnidadEvaluacionModel.upsertClubUnidadEvalItem({
      clubId,
      itemId,
      nombre,
      descripcion,
      puntos,
      orden: evalItems.length,
    });

    setSavingItemId('');

    if (saveError) {
      setError(saveError.message || t('unidadEvalItemSaveError'));
      return;
    }

    setMessage(itemId ? t('unidadEvalItemUpdated') : t('unidadEvalItemCreated'));
    await loadEvalData(clubId, unidades, members);
  }

  async function removeEvalItem(itemId) {
    if (!canManage || !itemId) return;
    setError('');
    setSavingItemId(itemId);

    const { error: deleteError } = await UnidadEvaluacionModel.deactivateClubUnidadEvalItem(itemId);
    setSavingItemId('');

    if (deleteError) {
      setError(deleteError.message || t('unidadEvalItemDeleteError'));
      return;
    }

    setMessage(t('unidadEvalItemDeleted'));
    await loadEvalData(clubId, unidades, members);
  }

  async function setEvalItemCantidad({ unidadId, evalItemId, cantidad }) {
    if (!canManage || !unidadId || !evalItemId) return;
    const key = `${unidadId}:${evalItemId}`;
    setSavingCantidadKey(key);

    const { error: saveError } = await UnidadEvaluacionModel.setUnidadEvalItemCantidad({
      unidadId,
      evalItemId,
      cantidad,
    });

    setSavingCantidadKey('');

    if (saveError) {
      setError(saveError.message || t('unidadEvalCountSaveError'));
      return;
    }

    setEvalCantidades(prev => {
      const next = [...prev];
      const index = next.findIndex(
        row => row.unidad_id === unidadId && row.eval_item_id === evalItemId
      );
      if (index >= 0) {
        next[index] = { ...next[index], cantidad };
      } else {
        next.push({ unidad_id: unidadId, eval_item_id: evalItemId, cantidad });
      }
      return next;
    });
  }

  async function saveUnidadValidationStart(unidadId, evaluacionInicioFecha) {
    if (!canManage || !unidadId) return;
    setError('');
    setSavingValidationStartId(unidadId);

    const { error: saveError } = await UnidadesModel.updateUnidadEvaluacionInicio(
      unidadId,
      evaluacionInicioFecha || null,
    );

    setSavingValidationStartId('');

    if (saveError) {
      setError(saveError.message || t('unidadEvalValidationStartSaveError'));
      return;
    }

    setUnidades(prev => prev.map(unidad => (
      unidad.id === unidadId
        ? { ...unidad, evaluacion_inicio_fecha: evaluacionInicioFecha || null }
        : unidad
    )));
    setMessage(t('unidadEvalValidationStartSaved'));
  }

  async function saveReglamentoInfraccion({
    unidadId,
    reglamentoNodoId,
    cantidad,
    fecha,
    notas,
  }) {
    if (!canManage || !unidadId || !reglamentoNodoId) return;
    setError('');
    setSavingInfraccionId('new');

    const { error: saveError } = await ReglamentoModel.upsertUnidadInfraccion({
      unidadId,
      reglamentoNodoId,
      cantidad,
      fecha,
      notas,
    });

    setSavingInfraccionId('');

    if (saveError) {
      setError(saveError.message || t('reglamentoInfractionSaveError'));
      return;
    }

    setMessage(t('reglamentoInfractionSaved'));
    await loadEvalData(clubId, unidades, members);
  }

  async function removeReglamentoInfraccion(infraccionId) {
    if (!canManage || !infraccionId) return;
    if (!window.confirm(t('reglamentoInfractionDeleteConfirm'))) return;

    setError('');
    setSavingInfraccionId(infraccionId);

    const { error: deleteError } = await ReglamentoModel.removeUnidadInfraccion(infraccionId);
    setSavingInfraccionId('');

    if (deleteError) {
      setError(deleteError.message || t('reglamentoInfractionDeleteError'));
      return;
    }

    setMessage(t('reglamentoInfractionDeleted'));
    await loadEvalData(clubId, unidades, members);
  }

  return {
    canManage,
    clubId,
    club,
    clubs,
    setClubId,
    unidades: displayUnidades,
    members,
    membersById,
    poolMembers: paginatedPoolMembers,
    listPagination,
    loading,
    error,
    message,
    searchQuery,
    setSearchQuery,
    showForm,
    setShowForm,
    form,
    setForm,
    editingUnidadId,
    savingUnidadId,
    assigningKey,
    saveUnidad,
    resetForm,
    startEditUnidad,
    removeUnidad,
    addMemberToUnidad,
    removeMemberFromUnidad,
    updateMemberRole,
    iglesiaScopeReady: canSwitchIglesia || (hasIglesiaAssignment && assignedIglesiaActive),
    memberDisplayName: UnidadesModel.memberDisplayNameFromRow,
    genderLabel: genero => UnidadesModel.genderLabel(genero, t),
    roleLabel: rol => UnidadesModel.roleLabel(rol, t),
    roles: UnidadesModel.UNIDAD_ROLES,
    getCaptainName: unidad => UnidadesModel.getUnidadCaptainName(unidad, UnidadesModel.memberDisplayNameFromRow),
    evalConfig,
    evalItems,
    evalCantidades,
    evalScoresByUnidadId,
    evalSchemaAvailable,
    savingEval,
    savingItemId,
    savingCantidadKey,
    savingValidationStartId,
    saveEvalConfig,
    saveEvalItem,
    removeEvalItem,
    setEvalItemCantidad,
    saveUnidadValidationStart,
    startCreateUnidad,
    formatEvalPoints,
    formatEvalPercent,
    formatValidationStartDate,
    reglamentoNodos,
    reglamentoInfracciones,
    reglamentoSchemaAvailable,
    savingInfraccionId,
    saveReglamentoInfraccion,
    removeReglamentoInfraccion,
  };
}
