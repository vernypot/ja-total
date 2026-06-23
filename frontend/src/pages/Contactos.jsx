import { useContactosController } from '../mvc/controllers/useContactosController';
import ContactosView from '../mvc/views/ContactosView';

export default function Contactos({ miembroId }) {
  return <ContactosView {...useContactosController(miembroId)} />;
}
