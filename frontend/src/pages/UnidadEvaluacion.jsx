import { useUnidadEvalMaintenanceController } from '../mvc/controllers/useUnidadEvalMaintenanceController';
import UnidadEvaluacionView from '../mvc/views/UnidadEvaluacionView';
import { useLanguage } from '../hooks/useLanguage';

export default function UnidadEvaluacion() {
  const { t } = useLanguage();
  return <UnidadEvaluacionView {...useUnidadEvalMaintenanceController()} t={t} />;
}
