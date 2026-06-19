import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../../hooks/useLanguage';
import { PageHelpLink } from '../../components/PageHelp';
import '../../styles/carnet.css';

function LogoImg({ src, alt, className }) {
  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
}

export default function MiembroCarnetView({
  member,
  clubs,
  selectedClub,
  selectedClubId,
  setSelectedClubId,
  qrUrl,
  fullName,
  bloodType,
  expirationLabel,
  error,
  loading,
  printCard,
  getPhotoUrl,
  getAssetUrl,
}) {
  const { t } = useLanguage();

  if (loading) return <p>{t('loadingCarnet')}</p>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!member) return <p className="text-muted">{t('noMemberData')}</p>;

  const photoUrl = getPhotoUrl(member.foto_url);
  const clubLogo = getAssetUrl(selectedClub?.logo_url);
  const tipoLogo = getAssetUrl(selectedClub?.tipos_club?.logo_url);
  const tipoNombre = selectedClub?.tipos_club?.nombre;
  const qrSize = Math.round(36 * 3.78);
  const bloodSubtitle = bloodType
    ? `${t('bloodType')}: ${bloodType}`
    : (tipoNombre || selectedClub?.nombre || '');

  return (
    <div className="carnet-screen">
      <div className="carnet-toolbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '14px' }}>{t('tabCarnet')}</strong>
          <PageHelpLink pageId="memberCarnet" compact />
        </div>
        {clubs.length > 1 && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{t('carnetSelectClub')}</span>
            <select
              value={selectedClubId}
              onChange={e => setSelectedClubId(e.target.value)}
              className="form-input"
              style={{ maxWidth: '320px' }}
            >
              {clubs.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={printCard}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          🖨 {t('printCarnet')}
        </button>
        <p className="text-muted" style={{ fontSize: '13px', marginTop: '10px' }}>{t('carnetPrintHint')}</p>
      </div>

      <div className="carnet-print-area">
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
                  alt={selectedClub?.nombre || t('clubLocalLogo')}
                  className="carnet-club-logo"
                />
              </div>
              <div className="carnet-club-name">{selectedClub?.nombre || '—'}</div>
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

        <div className="carnet-page carnet-back">
          <div className="carnet-back-title">{t('carnetQrTitle')}</div>
          {qrUrl ? (
            <QRCodeSVG value={qrUrl} size={qrSize} level="M" includeMargin className="carnet-back-qr" />
          ) : (
            <p>{t('carnetQrUnavailable')}</p>
          )}
          <div className="carnet-back-name">{fullName}</div>
        </div>
      </div>
    </div>
  );
}
