import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useMemberPortal } from '../../context/MemberPortalContext';
import { useDashboardAuth } from '../../hooks/useDashboardAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { getUserRole, canManageClubs } from '../../utils/permissions';
import { buildReglamentoTree } from '../../utils/reglamento';
import * as ClubesModel from '../models/clubes.model';
import * as MemberPortalModel from '../models/memberPortal.model';
import * as ReglamentoModel from '../models/reglamento.model';

export function useReglamentoController() {
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const { session } = useMemberPortal();
  const { isMemberView } = useDashboardAuth();
  const { activeClub, updateActiveClub } = useContext(ClubContext);
  const { effectiveIglesiaId } = useScopedIglesia();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = canManageClubs(getUserRole(user, userData)) && !isMemberView;

  const [clubs, setClubs] = useState([]);
  const [memberClubs, setMemberClubs] = useState([]);
  const [clubId, setClubIdState] = useState(searchParams.get('club') || activeClub?.id || '');
  const [nodos, setNodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [schemaAvailable, setSchemaAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  const tree = useMemo(() => buildReglamentoTree(nodos), [nodos]);

  const setClubId = useCallback((nextClubId) => {
    setClubIdState(nextClubId);
    const club = [...clubs, ...memberClubs].find(item => item.id === nextClubId);
    if (club && !isMemberView) {
      updateActiveClub({
        id: club.id,
        nombre: club.nombre,
        tipoNombre: club.tipos_club?.nombre || club.tipoNombre || '',
        tipoId: club.tipo_id || club.tipoId || null,
        logoUrl: club.logo_url || club.logoUrl || null,
        tipoLogoUrl: club.tipos_club?.logo_url || club.tipoLogoUrl || null,
        iglesia_id: club.iglesia_id || effectiveIglesiaId,
      });
    }
    const nextParams = new URLSearchParams(searchParams);
    if (nextClubId) nextParams.set('club', nextClubId);
    else nextParams.delete('club');
    setSearchParams(nextParams, { replace: true });
  }, [clubs, memberClubs, effectiveIglesiaId, isMemberView, searchParams, setSearchParams, updateActiveClub]);

  async function loadMemberClubs() {
    if (!session?.sessionToken) {
      setMemberClubs([]);
      return [];
    }

    const { data, error: profileError } = await MemberPortalModel.fetchPortalProfile(session.sessionToken);
    if (profileError) {
      setError(profileError.message);
      setMemberClubs([]);
      return [];
    }

    const clubes = data?.clubes || [];
    setMemberClubs(clubes);
    return clubes;
  }

  async function loadStaffClubs() {
    if (!effectiveIglesiaId) {
      setClubs([]);
      return [];
    }

    const { data, error: clubsError } = await ClubesModel.fetchClubes({
      iglesiaId: effectiveIglesiaId,
      showInactive: false,
    });

    if (clubsError) {
      setError(clubsError.message);
      setClubs([]);
      return [];
    }

    setClubs(data || []);
    return data || [];
  }

  async function loadReglamento(currentClubId) {
    if (!currentClubId) {
      setNodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    let result;
    if (isMemberView) {
      result = await ReglamentoModel.fetchPortalReglamento(session?.sessionToken, currentClubId);
    } else {
      result = await ReglamentoModel.fetchClubReglamento(currentClubId);
    }

    if (result.error) {
      setError(result.error.message || t('reglamentoLoadError'));
      setNodos([]);
    } else if (isMemberView) {
      setNodos(result.data?.nodos || []);
      setSchemaAvailable(true);
    } else {
      setNodos(result.data?.nodos || []);
      setSchemaAvailable(result.schemaAvailable !== false);
    }

    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError('');

      const availableClubs = isMemberView
        ? await loadMemberClubs()
        : await loadStaffClubs();

      if (cancelled) return;

      const queryClubId = searchParams.get('club');
      let nextClubId = queryClubId || clubId;

      if (!nextClubId && availableClubs.length === 1) {
        nextClubId = availableClubs[0].id;
      }

      if (!nextClubId && !isMemberView && activeClub?.id) {
        nextClubId = activeClub.id;
      }

      if (nextClubId !== clubId) {
        setClubIdState(nextClubId);
      }

      await loadReglamento(nextClubId);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [effectiveIglesiaId, isMemberView, session?.sessionToken]);

  useEffect(() => {
    loadReglamento(clubId);
  }, [clubId, isMemberView, session?.sessionToken]);

  async function saveNodo(payload) {
    if (!canManage || !clubId) return;
    setSaving(true);
    setError('');
    setMessage('');

    const { error: saveError } = await ReglamentoModel.upsertReglamentoNodo({
      ...payload,
      clubId,
    });

    setSaving(false);

    if (saveError) {
      setError(saveError.message || t('reglamentoSaveError'));
      return;
    }

    setMessage(t('reglamentoSaved'));
    await loadReglamento(clubId);
  }

  async function deleteNodo(nodo) {
    if (!canManage || !nodo?.id) return;
    if (!window.confirm(t('reglamentoDeleteConfirm'))) return;

    setSaving(true);
    setError('');
    setMessage('');

    const { error: deleteError } = await ReglamentoModel.deactivateReglamentoNodo(nodo.id);
    setSaving(false);

    if (deleteError) {
      setError(deleteError.message || t('reglamentoDeleteError'));
      return;
    }

    setMessage(t('reglamentoDeleted'));
    await loadReglamento(clubId);
  }

  const clubOptions = isMemberView ? memberClubs : clubs;

  return {
    canManage,
    isMemberView,
    clubs: clubOptions,
    clubId,
    setClubId,
    tree,
    loading,
    error,
    message,
    schemaAvailable,
    saving,
    saveNodo,
    deleteNodo,
    t,
  };
}
