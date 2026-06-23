import { useLoginController } from '../mvc/controllers/useLoginController';
import LoginView from '../mvc/views/LoginView';

export default function Login() {
  return <LoginView {...useLoginController()} />;
}
