import { useIglesiasController } from '../mvc/controllers/useIglesiasController';
import IglesiasView from '../mvc/views/IglesiasView';

export default function Iglesias() {
  return <IglesiasView {...useIglesiasController()} />;
}
