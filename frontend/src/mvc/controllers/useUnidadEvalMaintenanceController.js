import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { useLanguage } from '../../hooks/useLanguage';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import * as UnidadesModel from '../models/unidades.model';
import * as ClubesModel from '../models/clubes.model';
import * as UnidadEvaluacionModel from '../models/unidadEvaluacion.model';
import { DEFAULT_UNIDAD_EVAL_CONFIG } from '../../utils/unidadEvaluacion';
import { clubDisplayName } from '../../utils/club';

export function useUnidadEvalMaintenanceController() {
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const { activeClub, updateActiveClub } = useContext(ClubContext);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    effectiveIglesiaId,
    canSwitchIglesia,
    hasIglesiaAssignment,
    assignedIglesiaActive,
  } = useScopedIglesia();

  const userRole = getUserRole(user, userData);
  const canManage = canManageChurchData(userRole);
  const requestedClubId = params.get('club') || '';
  const clubId = requestedClubId || activeClub?.id || '';

  const [clubs, setClubs] = useState([]);
  const [club, setClub] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [evalConfig, setEvalConfig] = useState({ ...DEFAULT_UNIDAD_EVAL_CONFIG });
  const [evalItems, setEvalItems] = useState([]);
  const [evalCantidades, setEvalCantidades] = useState([]);
  const [evalSchemaAvailable, setEvalSchemaAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingEval, setSavingEval] = useState(false);
  const [savingItemId, setSavingItemId] = useState('');
  const [savingCantidadKey, setSavingCantidadKey] = useState('');

  const urlSyncedRef = useRef(false);

  const displayUnidades = useMemo(
    () => UnidadesModel.attachMembersToUnidadAssignments(unidades, {}),
    [unidades],
  );

  async function loadEvalData(currentClubId, currentUnidades) {
    if (!currentClubId) {
      setEvalConfig({ ...DEFAULT_UNIDAD_EVAL_CONFIG });
      setEvalItems([]);
      setEvalCantidades([]);
      setEvalSchemaAvailable(true);
      return;
    }

    const evalResult = await UnidadEvaluacionModel.fetchClubUnidadEval(currentClubId);
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

    if (!currentUnidades?.length) {
      const { data } = await UnidadesModel.fetchUnidadesByClub(currentClubId);
      setUnidades(data || []);
    }
  }

  async function refreshData({ showLoading = false } = {}) {
    if (!clubId) {
      setUnidades([]);
      setClub(null);
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);

    const [clubResult, unidadesResult] = await Promise.all([
      ClubesModel.fetchClubById(clubId),
      UnidadesModel.fetchUnidadesByClub(clubId),
    ]);

    const errors = [clubResult.error, unidadesResult.error].filter(Boolean);
    setError(errors.length ? (errors[0].message || t('unidadLoadError')) : '');

    setClub(clubResult.data || null);
    setUnidades(unidadesResult.data || []);
    await loadEvalData(clubId, unidadesResult.data || []);
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
    return () => { cancelled = true; };
  }, [effectiveIglesiaId, t]);

  useEffect(() => {
    if (requestedClubId) {
      urlSyncedRef.current = true;
      return;
    }
    if (urlSyncedRef.current || !activeClub?.id || !clubs.length) return;
    if (!clubs.some(item => item.id === activeClub.id)) return;
    urlSyncedRef.current = true;
    navigate(`/dashboard/unidad-evaluacion?club=${activeClub.id}`, { replace: true });
  }, [requestedClubId, activeClub?.id, clubs, navigate]);

  useEffect(() => {
    if (clubId && clubs.some(item => item.id === clubId)) {
      const nextClub = clubs.find(item => item.id === clubId);
      if (nextClub) updateActiveClub(nextClub);
    }
  }, [clubId, clubs, updateActiveClub]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!clubId) {
        if (!cancelled) {
          setUnidades([]);
          setClub(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const [clubResult, unidadesResult] = await Promise.all([
        ClubesModel.fetchClubById(clubId),
        UnidadesModel.fetchUnidadesByClub(clubId),
      ]);

      if (cancelled) return;

      const errors = [clubResult.error, unidadesResult.error].filter(Boolean);
      setError(errors.length ? (errors[0].message || t('unidadLoadError')) : '');

      setClub(clubResult.data || null);
      setUnidades(unidadesResult.data || []);
      await loadEvalData(clubId, unidadesResult.data || []);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [clubId, t]);

  function setClubId(nextClubId) {
    if (!nextClubId) {
      navigate('/dashboard/unidad-evaluacion');
      return;
    }
    const nextClub = clubs.find(item => item.id === nextClubId);
    if (nextClub) updateActiveClub(nextClub);
    navigate(`/dashboard/unidad-evaluacion?club=${nextClubId}`);
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
    await loadEvalData(clubId, unidades);
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
    await loadEvalData(clubId, unidades);
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
        row => row.unidad_id === unidadId && row.eval_item_id === evalItemId,
      );
      if (index >= 0) {
        next[index] = { ...next[index], cantidad };
      } else {
        next.push({ unidad_id: unidadId, eval_item_id: evalItemId, cantidad });
      }
      return next;
    });
  }

  return {
    canManage,
    clubId,
    club,
    clubs,
    setClubId,
    unidades: displayUnidades,
    evalConfig,
    evalItems,
    evalCantidades,
    evalSchemaAvailable,
    loading,
    error,
    message,
    savingEval,
    savingItemId,
    savingCantidadKey,
    saveEvalConfig,
    saveEvalItem,
    removeEvalItem,
    setEvalItemCantidad,
    clubDisplayName: clubDisplayName(club),
    iglesiaScopeReady: canSwitchIglesia || (hasIglesiaAssignment && assignedIglesiaActive),
  };
}
