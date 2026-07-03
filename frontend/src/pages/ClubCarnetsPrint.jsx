import { useClubCarnetsPrintController } from '../mvc/controllers/useClubCarnetsPrintController';
import ClubCarnetsPrintView from '../mvc/views/ClubCarnetsPrintView';

export default function ClubCarnetsPrint() {
  return <ClubCarnetsPrintView {...useClubCarnetsPrintController()} />;
}
