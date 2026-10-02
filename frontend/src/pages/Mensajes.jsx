import { useContext, useEffect, useState } from 'react';
import { ClubContext } from '../context/ClubContext';
import { useDashboardAuth } from '../hooks/useDashboardAuth';
import { useMemberPortal } from '../context/MemberPortalContext';
import MensajesInbox from '../components/MensajesInbox';
import * as MemberPortalModel from '../mvc/models/memberPortal.model';
import * as ClubesModel from '../mvc/models/clubes.model';

export default function Mensajes() {
  const { activeClub } = useContext(ClubContext);
  const { isMemberView, session } = useDashboardAuth();
  const { session: portalSession } = useMemberPortal();
  const [clubs, setClubs] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isMemberView && (session?.sessionToken || portalSession?.sessionToken)) {
        const token = session?.sessionToken || portalSession?.sessionToken;
        const { data } = await MemberPortalModel.fetchPortalProfile(token);
        if (cancelled) return;
        setClubs(data?.clubes || []);
        return;
      }

      const { data } = await ClubesModel.fetchClubes({ showInactive: false });
      if (cancelled) return;
      setClubs(data || []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isMemberView, session?.sessionToken, portalSession?.sessionToken]);

  return (
    <MensajesInbox
      clubs={clubs}
      defaultClubId={activeClub?.id || clubs[0]?.id || ''}
    />
  );
}
