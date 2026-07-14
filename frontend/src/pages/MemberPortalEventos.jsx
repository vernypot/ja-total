import { useMemberPortalEventosController } from '../mvc/controllers/useMemberPortalEventosController';
import MiembroEventosView from '../mvc/views/MiembroEventosView';

export default function MemberPortalEventos() {
  return (
    <div className="portal-page">
      <MiembroEventosView {...useMemberPortalEventosController()} />
    </div>
  );
}
