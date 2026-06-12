import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { parseTokenFromQrPayload } from '../mvc/models/carnet.model';
import * as EventosModel from '../mvc/models/eventos.model';

export default function Checkin() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = parseTokenFromQrPayload(params.get('t') || '');
    const eventoId = params.get('evento') || params.get('e') || '';

    if (!token || !eventoId) {
      setMessage(t('checkinLandingHint'));
      return;
    }

    async function run() {
      setError('');
      const { error: checkinError } = await EventosModel.checkinEventoByToken(eventoId, token);
      if (checkinError) {
        setError(checkinError.message);
        return;
      }
      setMessage(t('checkinSuccess'));
    }

    run();
  }, [params, t]);

  return (
    <div className="container" style={{ padding: '24px' }}>
      <h1>{t('memberCheckin')}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {message && !error && <div className="alert" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>{message}</div>}
    </div>
  );
}
