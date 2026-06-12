import { useMiembroClasesController } from '../mvc/controllers/useMiembroClasesController';
import MiembroClasesView from '../mvc/views/MiembroClasesView';

export default function Clases({ miembroId }) {
  return <MiembroClasesView {...useMiembroClasesController(miembroId)} />;
}
