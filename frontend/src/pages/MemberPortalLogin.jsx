import { useMemberPortalLoginController } from '../mvc/controllers/useMemberPortalLoginController';
import MemberPortalLoginView from '../mvc/views/MemberPortalLoginView';

export default function MemberPortalLogin() {
  const controller = useMemberPortalLoginController();
  return <MemberPortalLoginView {...controller} />;
}
