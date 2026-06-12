import { useEspecialidadesController } from '../mvc/controllers/useEspecialidadesController';
import EspecialidadesView from '../mvc/views/EspecialidadesView';

export default function Especialidades({ miembroId }) {
  return <EspecialidadesView {...useEspecialidadesController(miembroId)} />;
}
