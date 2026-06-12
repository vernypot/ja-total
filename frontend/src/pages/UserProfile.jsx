import { useUserProfileController } from '../mvc/controllers/useUserProfileController';
import UserProfileView from '../mvc/views/UserProfileView';

export default function UserProfile() {
  return <UserProfileView {...useUserProfileController()} />;
}
