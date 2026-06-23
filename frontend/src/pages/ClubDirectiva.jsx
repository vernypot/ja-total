import { useClubDirectivaController } from '../mvc/controllers/useClubDirectivaController';
import ClubDirectivaView from '../mvc/views/ClubDirectivaView';

export default function ClubDirectiva() {
  return <ClubDirectivaView {...useClubDirectivaController()} />;
}
