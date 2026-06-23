import { useMiembrosController } from '../mvc/controllers/useMiembrosController';
import MiembrosView from '../mvc/views/MiembrosView';

export default function Miembros() {
  return <MiembrosView {...useMiembrosController()} />;
}
