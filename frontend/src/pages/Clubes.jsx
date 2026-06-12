import { useClubesController } from '../mvc/controllers/useClubesController';
import ClubesView from '../mvc/views/ClubesView';

export default function Clubes() {
  return <ClubesView {...useClubesController()} />;
}
