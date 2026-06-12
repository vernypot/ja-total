import { useClasesProgresivasController } from '../mvc/controllers/useClasesProgresivasController';
import ClasesProgresivasView from '../mvc/views/ClasesProgresivasView';

export default function ClasesProgresivas() {
  return <ClasesProgresivasView {...useClasesProgresivasController()} />;
}
