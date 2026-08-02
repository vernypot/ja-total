import { useClubDetalleController } from '../mvc/controllers/useClubDetalleController';
import ClubDetalleView from '../mvc/views/ClubDetalleView';

export default function ClubDetalle() {
  return <ClubDetalleView {...useClubDetalleController()} />;
}
