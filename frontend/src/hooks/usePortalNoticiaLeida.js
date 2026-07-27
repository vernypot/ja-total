import { useCallback, useEffect, useState } from 'react';
import * as MemberPortalModel from '../mvc/models/memberPortal.model';

export function usePortalNoticiaLeida(sessionToken) {
  const [leidoIds, setLeidoIds] = useState(() => new Set());
  const [markingId, setMarkingId] = useState('');

  useEffect(() => {
    if (!sessionToken) {
      setLeidoIds(new Set());
      return undefined;
    }

    let cancelled = false;

    MemberPortalModel.fetchPortalNoticiasLeidas(sessionToken).then(({ data }) => {
      if (!cancelled) {
        setLeidoIds(new Set(data || []));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  const isLeida = useCallback(noticiaId => leidoIds.has(noticiaId), [leidoIds]);

  const markLeida = useCallback(async noticiaId => {
    if (!sessionToken || !noticiaId || leidoIds.has(noticiaId)) {
      return { ok: true };
    }

    setMarkingId(noticiaId);
    const { data, error } = await MemberPortalModel.markPortalNoticiaLeida(sessionToken, noticiaId);
    setMarkingId('');

    if (error) {
      return { ok: false, error };
    }

    if (data) {
      setLeidoIds(prev => new Set([...prev, noticiaId]));
    }

    return { ok: Boolean(data) };
  }, [sessionToken, leidoIds]);

  return { isLeida, markLeida, markingId };
}
