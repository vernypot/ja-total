import { useUnidadesController } from '../mvc/controllers/useUnidadesController';
import UnidadesView from '../mvc/views/UnidadesView';

export default function Unidades() {
  return <UnidadesView {...useUnidadesController()} />;
}
