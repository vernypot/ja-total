import { useMiembroCarnetController } from '../../../mvc/controllers/useMiembroCarnetController';
import MiembroCarnetView from '../../../mvc/views/MiembroCarnetView';

export default function Carnet({ miembroId }) {
  return <MiembroCarnetView {...useMiembroCarnetController(miembroId)} />;
}
