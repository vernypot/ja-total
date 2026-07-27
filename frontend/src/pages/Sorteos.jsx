import { useSorteosController } from '../mvc/controllers/useSorteosController';
import SorteosView from '../mvc/views/SorteosView';

export default function Sorteos() {
  return <SorteosView {...useSorteosController()} />;
}
