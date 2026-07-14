import { useMemberPortalCalendarioController } from '../mvc/controllers/useMemberPortalCalendarioController';
import CalendarioClubView from '../mvc/views/CalendarioClubView';

export default function MemberPortalCalendario() {
  return <CalendarioClubView {...useMemberPortalCalendarioController()} />;
}
