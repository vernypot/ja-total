import { useLandingController } from '../mvc/controllers/useLandingController';
import LandingView from '../mvc/views/LandingView';

export default function Landing() {
  return <LandingView {...useLandingController()} />;
}
