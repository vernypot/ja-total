import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useDashboardAuth } from '../hooks/useDashboardAuth';
import FormModal from './FormModal';
import * as MensajesModel from '../mvc/models/mensajes.model';

const PROMPT_KEY = 'inbox-unread-prompt-shown';

export default function UnreadInboxPrompt() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { loading, isMemberView, session, isStaff } = useDashboardAuth();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return undefined;
    if (!isMemberView && !isStaff) return undefined;
    if (typeof window !== 'undefined' && sessionStorage.getItem(PROMPT_KEY) === '1') {
      return undefined;
    }

    const sessionToken = isMemberView ? session?.sessionToken : null;
    let cancelled = false;

    MensajesModel.fetchUnreadMensajeCount({ sessionToken }).then(({ data }) => {
      if (cancelled) return;
      const unread = Number(data) || 0;
      setCount(unread);
      if (unread > 0) {
        sessionStorage.setItem(PROMPT_KEY, '1');
        setOpen(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loading, isMemberView, isStaff, session?.sessionToken]);

  if (!open || count <= 0) return null;

  return (
    <FormModal
      open={open}
      title={t('mensajeUnreadPromptTitle')}
      onClose={() => setOpen(false)}
      maxWidth="460px"
    >
      <p>{t('mensajeUnreadPromptBody').replace('{count}', String(count))}</p>
      <div className="mensaje-compose-actions">
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
          {t('mensajeUnreadLater')}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setOpen(false);
            navigate('/dashboard/mensajes');
          }}
        >
          {t('mensajeOpenInbox')}
        </button>
      </div>
    </FormModal>
  );
}
