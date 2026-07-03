import { useSystemModulesController } from '../mvc/controllers/useSystemModulesController';
import SystemModulesView from '../mvc/views/SystemModulesView';

export default function SystemModules() {
  return <SystemModulesView {...useSystemModulesController()} />;
}
