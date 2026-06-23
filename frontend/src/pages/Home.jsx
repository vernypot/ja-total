import { useHomeController } from '../mvc/controllers/useHomeController';
import HomeView from '../mvc/views/HomeView';

export default function Home() {
  return <HomeView {...useHomeController()} />;
}
