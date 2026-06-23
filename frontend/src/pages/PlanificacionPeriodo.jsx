import { usePlanificacionPeriodoController } from '../mvc/controllers/usePlanificacionPeriodoController';
import PlanificacionPeriodoView from '../mvc/views/PlanificacionPeriodoView';

export default function PlanificacionPeriodo() {
  const controller = usePlanificacionPeriodoController();
  const iglesiaScopeReady = controller.hasIglesiaAssignment
    ? controller.assignedIglesiaActive
    : Boolean(controller.effectiveIglesiaId);

  return (
    <PlanificacionPeriodoView
      {...controller}
      iglesiaScopeReady={iglesiaScopeReady}
    />
  );
}
