import { useMiembroAsistenciaController } from '../../../mvc/controllers/useMiembroAsistenciaController';
import MiembroAsistenciaView from '../../../mvc/views/MiembroAsistenciaView';

export default function Asistencia({ miembroId }) {
  return <MiembroAsistenciaView {...useMiembroAsistenciaController(miembroId)} />;
}
