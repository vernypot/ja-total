import { useReglamentoController } from '../mvc/controllers/useReglamentoController';
import ReglamentoView from '../mvc/views/ReglamentoView';

export default function Reglamento() {
  return <ReglamentoView {...useReglamentoController()} />;
}
