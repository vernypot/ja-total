import { useBloquesCompletadosController } from '../mvc/controllers/useBloquesCompletadosController';
import BloquesCompletadosView from '../mvc/views/BloquesCompletadosView';

export default function BloquesCompletados() {
  return <BloquesCompletadosView {...useBloquesCompletadosController()} />;
}
