import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginController } from '../mvc/controllers/useLoginController';
import LoginView from '../mvc/views/LoginView';

export default function Login() {
  const navigate = useNavigate();
  const controller = useLoginController();

  function closeLogin() {
    navigate('/');
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') navigate('/');
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [navigate]);

  return (
    <div
      className="login-modal-overlay"
      role="presentation"
      onClick={closeLogin}
    >
      <div
        className="login-modal-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <LoginView {...controller} modalTitleId="login-modal-title" onClose={closeLogin} />
      </div>
    </div>
  );
}
