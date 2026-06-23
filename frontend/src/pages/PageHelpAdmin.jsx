import { usePageHelpAdminController } from '../mvc/controllers/usePageHelpAdminController';
import PageHelpAdminView from '../mvc/views/PageHelpAdminView';

export default function PageHelpAdmin() {
  return <PageHelpAdminView {...usePageHelpAdminController()} />;
}
