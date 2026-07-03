import { QRCodeSVG } from 'qrcode.react';
import * as CarnetModel from '../mvc/models/carnet.model';
import * as MiembrosModel from '../mvc/models/miembros.model';

function LogoImg({ src, alt, className }) {
  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
}

export default function CarnetCard({
  member,
  club,
  medical,
  token,
  expirationLabel,
  t,
  sides = 'both',
  getPhotoUrl = MiembrosModel.getMiembroPhotoDisplayUrl,
  getAssetUrl = CarnetModel.getCarnetAssetUrl,
}) {
  const showFront = sides === 'both' || sides === 'front';
  const showBack = sides === 'both' || sides === 'back';
  const fullName = CarnetModel.memberFullName(member);
  const photoUrl = getPhotoUrl(member?.foto_url);
  const clubLogo = getAssetUrl(club?.logo_url);
  const tipoLogo = getAssetUrl(club?.tipos_club?.logo_url);
  const tipoNombre = club?.tipos_club?.nombre;
  const bloodType = CarnetModel.formatBloodType(medical?.tipo_sangre, medical?.factor_rh);
  const qrUrl = token ? CarnetModel.buildCheckinQrUrl(token) : '';
  const qrSize = Math.round(36 * 3.78);
  const bloodSubtitle = bloodType
    ? `${t('bloodType')}: ${bloodType}`
    : (tipoNombre || club?.nombre || '');

  return (
    <>
      {showFront && (
      <div className="carnet-page carnet-front">
        <div className="carnet-front-bg" aria-hidden="true">
          <div className="carnet-watermark">
            <LogoImg src={tipoLogo} alt="" className="carnet-watermark-logo carnet-watermark-type" />
            <LogoImg src={clubLogo} alt="" className="carnet-watermark-logo carnet-watermark-club" />
          </div>
          <div className="carnet-front-patterns">
            <div className="carnet-pattern carnet-pattern-navy-top" />
            <div className="carnet-pattern carnet-pattern-cyan-bl" />
            <div className="carnet-pattern carnet-pattern-cyan-br" />
            <div className="carnet-pattern carnet-pattern-navy-br" />
            <div className="carnet-pattern carnet-pattern-line carnet-pattern-line-1" />
            <div className="carnet-pattern carnet-pattern-line carnet-pattern-line-2" />
            <div className="carnet-pattern carnet-pattern-line carnet-pattern-line-3" />
            <div className="carnet-pattern carnet-pattern-line carnet-pattern-line-4" />
          </div>
        </div>

        <div className="carnet-front-content">
          <div className="carnet-top-row">
            <div className="carnet-club-logo-wrap">
              <LogoImg
                src={clubLogo}
                alt={club?.nombre || t('clubLocalLogo')}
                className="carnet-club-logo"
              />
            </div>
            <div className="carnet-club-name">{club?.nombre || '—'}</div>
          </div>

          <div className="carnet-photo-section">
            <div className="carnet-photo-wrap">
              {photoUrl ? (
                <img src={photoUrl} alt={fullName} className="carnet-photo" />
              ) : (
                <div className="carnet-photo carnet-photo-empty">👤</div>
              )}
            </div>
          </div>

          <div className="carnet-body">
            <div className="carnet-name">{fullName}</div>
            {bloodSubtitle && (
              <div className="carnet-subtitle">{bloodSubtitle}</div>
            )}
            <div className="carnet-footer">
              {expirationLabel && (
                <div className="carnet-expiration">
                  <span className="carnet-expiration-label">{t('carnetExpires')}</span>
                  <span className="carnet-expiration-value">{expirationLabel}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {showBack && (
      <div className="carnet-page carnet-back">
        <div className="carnet-back-title">{t('carnetQrTitle')}</div>
        {qrUrl ? (
          <QRCodeSVG value={qrUrl} size={qrSize} level="M" includeMargin className="carnet-back-qr" />
        ) : (
          <p>{t('carnetQrUnavailable')}</p>
        )}
        <div className="carnet-back-name">{fullName}</div>
      </div>
      )}
    </>
  );
}
