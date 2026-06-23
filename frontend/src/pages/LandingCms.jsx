import { useLandingCmsController } from '../mvc/controllers/useLandingCmsController';
import LandingCmsView from '../mvc/views/LandingCmsView';

export default function LandingCms() {
  return <LandingCmsView {...useLandingCmsController()} />;
}
