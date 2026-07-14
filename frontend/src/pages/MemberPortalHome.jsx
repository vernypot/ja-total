import { useMemberPortalHomeController } from '../mvc/controllers/useMemberPortalHomeController';
import MemberPortalHomeView from '../mvc/views/MemberPortalHomeView';

export default function MemberPortalHome() {
  return <MemberPortalHomeView {...useMemberPortalHomeController()} />;
}
