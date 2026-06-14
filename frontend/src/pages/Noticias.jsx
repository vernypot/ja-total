import { useNoticiasController } from '../mvc/controllers/useNoticiasController';
import NoticiasView from '../mvc/views/NoticiasView';

export default function Noticias() {
  return <NoticiasView {...useNoticiasController()} />;
}
