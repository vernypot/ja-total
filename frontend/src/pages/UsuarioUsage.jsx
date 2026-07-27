import { useUsuarioUsageController } from '../mvc/controllers/useUsuarioUsageController';
import UsuarioUsageView from '../mvc/views/UsuarioUsageView';

export default function UsuarioUsage() {
  return <UsuarioUsageView {...useUsuarioUsageController()} />;
}
