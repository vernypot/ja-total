import { useResetPasswordController } from '../mvc/controllers/useResetPasswordController';
import ResetPasswordView from '../mvc/views/ResetPasswordView';

export default function ResetPassword() {
  return <ResetPasswordView {...useResetPasswordController()} />;
}
