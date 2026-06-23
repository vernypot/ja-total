import { useDatosMedicosController } from '../../../mvc/controllers/useDatosMedicosController';
import DatosMedicosView from '../../../mvc/views/DatosMedicosView';

export default function DatosMedicos({ miembroId }) {
  return <DatosMedicosView {...useDatosMedicosController(miembroId)} />;
}
