import { useDistincionesCatalogController } from '../mvc/controllers/useDistincionesCatalogController';
import { useMiembroDistincionesController } from '../mvc/controllers/useMiembroDistincionesController';
import DistincionesCatalogView from '../mvc/views/DistincionesCatalogView';
import MiembroDistincionesView from '../mvc/views/MiembroDistincionesView';

export default function Distinciones({ miembroId }) {
  if (miembroId) {
    return <MiembroDistincionesView {...useMiembroDistincionesController(miembroId)} />;
  }
  return <DistincionesCatalogView {...useDistincionesCatalogController()} />;
}
