import { useEffect, useMemo, useState } from 'react';
import * as CarnetModel from '../mvc/models/carnet.model';
import * as ClubesModel from '../mvc/models/clubes.model';

export function useBulkCarnetPrint(language = 'es') {
  const [members, setMembers] = useState([]);
  const [tokens, setTokens] = useState({});
  const [club, setClub] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [printPending, setPrintPending] = useState(false);

  const expirationLabel = useMemo(
    () => (
      expiresAt
        ? CarnetModel.formatCarnetExpirationDate(expiresAt, language)
        : ''
    ),
    [expiresAt, language]
  );

  async function printCarnetsForMembers(memberIds, clubId) {
    if (!memberIds?.length || !clubId) {
      return { ok: false, errorKey: 'bulkPrintCarnetsNoClub' };
    }

    setLoading(true);

    const [
      { data: readyMembers, skipped, error: membersError },
      { data: clubData, error: clubError },
    ] = await Promise.all([
      CarnetModel.fetchCarnetMembersForSelection(memberIds, clubId),
      ClubesModel.fetchClubById(clubId),
    ]);

    if (clubError || membersError) {
      setLoading(false);
      return { ok: false, errorKey: 'bulkPrintCarnetsError' };
    }

    if (!readyMembers.length) {
      setLoading(false);
      return { ok: false, errorKey: 'bulkPrintCarnetsNoneReady', skipped: skipped.length };
    }

    const tokenMap = await CarnetModel.loadCarnetTokensForMembers(readyMembers.map(m => m.id));

    setClub(clubData);
    setMembers(readyMembers);
    setTokens(tokenMap);
    setExpiresAt(CarnetModel.addOneYear(new Date()));
    setLoading(false);
    setPrintPending(true);

    return {
      ok: true,
      count: readyMembers.length,
      skipped: skipped.length,
    };
  }

  useEffect(() => {
    if (!printPending || !members.length || !club) return;

    let cancelled = false;
    setPrintPending(false);

    (async () => {
      await CarnetModel.triggerCarnetPrint(() => {
        if (!cancelled) setExpiresAt(CarnetModel.addOneYear(new Date()));
      }, { batch: true });
    })();

    return () => { cancelled = true; };
  }, [printPending, members, club]);

  return {
    printCarnetsForMembers,
    loading,
    members,
    tokens,
    club,
    expirationLabel,
    hasPrintLayout: members.length > 0 && Boolean(club),
  };
}
