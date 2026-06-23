import { useDatosPersonalesController } from '../../../mvc/controllers/useDatosPersonalesController';
import DatosPersonalesView from '../../../mvc/views/DatosPersonalesView';

export default function DatosPersonales({ miembroId }) {
  return <DatosPersonalesView {...useDatosPersonalesController(miembroId)} />;
}
