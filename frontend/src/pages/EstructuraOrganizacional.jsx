import { useEstructuraOrganizacionalController } from '../mvc/controllers/useEstructuraOrganizacionalController';
import EstructuraOrganizacionalView from '../mvc/views/EstructuraOrganizacionalView';

export default function EstructuraOrganizacional() {
  return <EstructuraOrganizacionalView {...useEstructuraOrganizacionalController()} />;
}
