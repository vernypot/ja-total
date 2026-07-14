import { useMemberPortalNoticiasController } from '../mvc/controllers/useMemberPortalNoticiasController';
import MemberPortalNoticiasView from '../mvc/views/MemberPortalNoticiasView';

export default function MemberPortalNoticias() {
  return <MemberPortalNoticiasView {...useMemberPortalNoticiasController()} />;
}
