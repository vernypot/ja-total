import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useLanguage } from '../hooks/useLanguage';
import { parseTokenFromQrPayload } from '../mvc/models/carnet.model';

export default function EventCheckinScanner({ eventoId, onCheckin, disabled, scannerId }) {
  const { t } = useLanguage();
  const lastScanRef = useRef('');
  const onCheckinRef = useRef(onCheckin);
  onCheckinRef.current = onCheckin;
  const elementId = scannerId || `event-checkin-qr-reader-${eventoId || 'default'}`;

  useEffect(() => {
    if (!eventoId || disabled) return undefined;

    const scanner = new Html5QrcodeScanner(
      elementId,
      { fps: 8, qrbox: { width: 220, height: 220 } },
      false
    );

    scanner.render(
      async (decodedText) => {
        const token = parseTokenFromQrPayload(decodedText);
        if (!token || token === lastScanRef.current) return;
        lastScanRef.current = token;
        await onCheckinRef.current(token);
        setTimeout(() => {
          lastScanRef.current = '';
        }, 3000);
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [eventoId, disabled, elementId]);

  if (!eventoId) return null;

  return (
    <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{t('scanMemberQr')}</h4>
      <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#166534' }}>{t('scanMemberQrHint')}</p>
      {disabled ? (
        <p className="text-muted">{t('checkinDisabled')}</p>
      ) : (
        <div id={elementId} />
      )}
    </div>
  );
}
