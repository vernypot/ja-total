import { useMiembroEventosController } from '../../../mvc/controllers/useMiembroEventosController';
import MiembroEventosView from '../../../mvc/views/MiembroEventosView';

export default function MiembroEventos({ miembroId }) {
  return <MiembroEventosView {...useMiembroEventosController(miembroId)} />;
}
