import { usePublicNoticiaController } from '../mvc/controllers/usePublicNoticiaController';
import PublicNoticiaView from '../mvc/views/PublicNoticiaView';

export default function PublicNoticia() {
  return <PublicNoticiaView {...usePublicNoticiaController()} />;
}
