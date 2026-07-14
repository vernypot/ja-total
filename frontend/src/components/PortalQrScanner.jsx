import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useLanguage } from '../hooks/useLanguage';
import { parseTokenFromQrPayload } from '../mvc/models/carnet.model';

export default function PortalQrScanner({
  onToken,
  disabled,
  scannerId = 'portal-qr-reader',
  variant = 'default',
}) {
  const { t } = useLanguage();
  const lastScanRef = useRef('');
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const isHero = variant === 'hero';

  useEffect(() => {
    if (disabled) return undefined;

    const scanner = new Html5QrcodeScanner(
      scannerId,
      {
        fps: 10,
        qrbox: isHero ? { width: 260, height: 260 } : { width: 220, height: 220 },
      },
      false
    );

    scanner.render(
      async (decodedText) => {
        const token = parseTokenFromQrPayload(decodedText);
        if (!token || token === lastScanRef.current) return;
        lastScanRef.current = token;
        await onTokenRef.current(token);
        setTimeout(() => {
          lastScanRef.current = '';
        }, 3000);
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [disabled, scannerId, isHero]);

  if (isHero) {
    return (
      <div className="portal-qr-scanner portal-qr-scanner--hero">
        <div className="portal-qr-scanner-icon" aria-hidden="true">📱</div>
        <p className="portal-qr-scanner-hint">{t('portalScanQrHint')}</p>
        {disabled ? (
          <p className="portal-qr-scanner-disabled">{t('portalScannerDisabled')}</p>
        ) : (
          <div id={scannerId} className="portal-qr-scanner-frame" />
        )}
      </div>
    );
  }

  return (
    <div className="portal-qr-scanner">
      <h4>{t('portalScanQr')}</h4>
      <p>{t('portalScanQrHint')}</p>
      {disabled ? (
        <p className="portal-qr-scanner-disabled">{t('portalScannerDisabled')}</p>
      ) : (
        <div id={scannerId} />
      )}
    </div>
  );
}
