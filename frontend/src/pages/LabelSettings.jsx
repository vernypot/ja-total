import { useLabelSettingsController } from '../mvc/controllers/useLabelSettingsController';
import LabelSettingsView from '../mvc/views/LabelSettingsView';

export default function LabelSettings() {
  return <LabelSettingsView {...useLabelSettingsController()} />;
}
