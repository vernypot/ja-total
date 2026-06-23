import { useTiposEventoController } from '../mvc/controllers/useTiposEventoController';
import TiposEventoView from '../mvc/views/TiposEventoView';

export default function TiposEvento() {
  return <TiposEventoView {...useTiposEventoController()} />;
}
