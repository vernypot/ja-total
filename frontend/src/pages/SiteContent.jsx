import { useSiteContentController } from '../mvc/controllers/useSiteContentController';
import SiteContentView from '../mvc/views/SiteContentView';

export default function SiteContent() {
  return <SiteContentView {...useSiteContentController()} />;
}
