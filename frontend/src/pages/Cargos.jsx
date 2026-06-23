import { useCargosCatalogController } from '../mvc/controllers/useCargosCatalogController';
import { useMiembroCargosController } from '../mvc/controllers/useMiembroCargosController';
import CargosCatalogView from '../mvc/views/CargosCatalogView';
import MiembroCargosView from '../mvc/views/MiembroCargosView';

export default function Cargos({ miembroId }) {
  if (miembroId) {
    return <MiembroCargosView {...useMiembroCargosController(miembroId)} />;
  }
  return <CargosCatalogView {...useCargosCatalogController()} />;
}
