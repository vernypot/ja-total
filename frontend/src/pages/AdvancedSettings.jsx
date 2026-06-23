import { useAdvancedSettingsController } from '../mvc/controllers/useAdvancedSettingsController';
import AdvancedSettingsView from '../mvc/views/AdvancedSettingsView';

export default function AdvancedSettings() {
  return <AdvancedSettingsView {...useAdvancedSettingsController()} />;
}
