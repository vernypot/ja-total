import { useCallback, useEffect, useState } from 'react';
import { useDashboardAuth } from './useDashboardAuth';
import * as MensajesModel from '../mvc/models/mensajes.model';

export function useInboxUnreadCount() {
  const { isMemberView, session, isStaff, loading } = useDashboardAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (loading || (!isMemberView && !isStaff)) {
      setCount(0);
      return;
    }
    const sessionToken = isMemberView ? session?.sessionToken : null;
    const { data } = await MensajesModel.fetchUnreadMensajeCount({ sessionToken });
    setCount(Number(data) || 0);
  }, [loading, isMemberView, isStaff, session?.sessionToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    function onRefresh() {
      refresh();
    }
    window.addEventListener('inbox-unread-refresh', onRefresh);
    return () => window.removeEventListener('inbox-unread-refresh', onRefresh);
  }, [refresh]);

  return count;
}
