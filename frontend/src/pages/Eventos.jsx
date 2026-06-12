import { useEventosController } from '../mvc/controllers/useEventosController';
import EventosView from '../mvc/views/EventosView';

export default function Eventos() {
  return <EventosView {...useEventosController()} />;
}
