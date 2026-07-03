import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClubContext } from '../../context/ClubContext';
import { useLanguage } from '../../hooks/useLanguage';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import { clubDisplayName } from '../../utils/club';
import * as CarnetModel from '../models/carnet.model';
import * as ClubesModel from '../models/clubes.model';

export function useClubCarnetsPrintController() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { activeClub, updateActiveClub } = useContext(ClubContext);
  const { effectiveIglesiaId } = useScopedIglesia();

  const [clubs, setClubs] = useState([]);
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [tokens, setTokens] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cardExpiresAt, setCardExpiresAt] = useState(() => CarnetModel.addOneYear(new Date()));

  const clubId = activeClub?.id || '';
  const expirationLabel = useMemo(
    () => CarnetModel.formatCarnetExpirationDate(cardExpiresAt, language),
    [cardExpiresAt, language]
  );

  async function loadClubs() {
    if (!effectiveIglesiaId) {
      setClubs([]);
      return;
    }
    const { data } = await ClubesModel.fetchClubesByIglesia(effectiveIglesiaId);
    setClubs(data || []);
  }

  async function loadCarnets() {
    if (!clubId) {
      setClub(null);
      setMembers([]);
      setTokens({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [
      { data: clubData, error: clubError },
      { data: memberRows, error: membersError },
    ] = await Promise.all([
      ClubesModel.fetchClubById(clubId),
      CarnetModel.fetchActiveClubCarnetMembers(clubId),
    ]);

    if (clubError) {
      setError(clubError.message || t('clubCarnetsLoadError'));
      setClub(null);
      setMembers([]);
      setTokens({});
      setLoading(false);
      return;
    }

    if (membersError) {
      setError(membersError.message || t('clubCarnetsLoadError'));
      setClub(clubData);
      setMembers([]);
      setTokens({});
      setLoading(false);
      return;
    }

    setClub(clubData);
    setMembers(memberRows || []);

    const tokenMap = await CarnetModel.loadCarnetTokensForMembers((memberRows || []).map(m => m.id));
    setTokens(tokenMap);
    setLoading(false);
  }

  function selectClub(nextClubId) {
    const picked = clubs.find(c => c.id === nextClubId);
    if (picked) updateActiveClub(picked);
  }

  function printAll() {
    CarnetModel.triggerCarnetPrint(() => {
      setCardExpiresAt(CarnetModel.addOneYear(new Date()));
    }, { batch: true });
  }

  function goToClubs() {
    navigate('/dashboard/clubes');
  }

  useEffect(() => {
    loadClubs();
  }, [effectiveIglesiaId]);

  useEffect(() => {
    loadCarnets();
  }, [clubId]);

  return {
    t,
    activeClub,
    club,
    clubs,
    clubId,
    members,
    tokens,
    loading,
    error,
    expirationLabel,
    selectClub,
    printAll,
    goToClubs,
    clubDisplayName,
    effectiveIglesiaId,
  };
}
