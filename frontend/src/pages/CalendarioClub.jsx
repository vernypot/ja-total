import { useCalendarioClubController } from '../mvc/controllers/useCalendarioClubController';
import CalendarioClubView from '../mvc/views/CalendarioClubView';

export default function CalendarioClub() {
  return <CalendarioClubView {...useCalendarioClubController()} />;
}
