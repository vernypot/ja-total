import { useEspecialidadesCatalogController } from '../mvc/controllers/useEspecialidadesCatalogController';
import { useMiembroEspecialidadesController } from '../mvc/controllers/useMiembroEspecialidadesController';
import EspecialidadesCatalogView from '../mvc/views/EspecialidadesCatalogView';
import MiembroEspecialidadesView from '../mvc/views/MiembroEspecialidadesView';

export default function Especialidades({ miembroId }) {
  if (miembroId) {
    return <MiembroEspecialidadesView {...useMiembroEspecialidadesController(miembroId)} />;
  }
  return <EspecialidadesCatalogView {...useEspecialidadesCatalogController()} />;
}
