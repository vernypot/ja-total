import { useUsuariosController } from '../mvc/controllers/useUsuariosController';
import UsuariosView from '../mvc/views/UsuariosView';

export default function Usuarios() {
  return <UsuariosView {...useUsuariosController()} />;
}
