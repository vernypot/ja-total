import { useMemberPortalEventosController } from '../mvc/controllers/useMemberPortalEventosController';
import MiembroEventosView from '../mvc/views/MiembroEventosView';

export default function MemberPortalEventos() {
  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <MiembroEventosView {...useMemberPortalEventosController()} />
    </div>
  );
}
