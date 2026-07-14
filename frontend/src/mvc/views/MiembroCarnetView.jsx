import { useLanguage } from '../../hooks/useLanguage';
import { PageHelpLink } from '../../components/PageHelp';
import CarnetCard from '../../components/CarnetCard';
import MemberPortalPinAdmin from '../../components/MemberPortalPinAdmin';
import '../../styles/carnet.css';

export default function MiembroCarnetView({
  member,
  medical,
  clubs,
  selectedClub,
  selectedClubId,
  setSelectedClubId,
  token,
  setToken,
  expirationLabel,
  canManage,
  error,
  loading,
  printCard,
}) {
  const { t } = useLanguage();

  if (loading) return <p>{t('loadingCarnet')}</p>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!member) return <p className="text-muted">{t('noMemberData')}</p>;

  return (
    <div className="carnet-screen">
      <div className="carnet-toolbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '14px' }}>{t('tabCarnet')}</strong>
          <PageHelpLink pageId="memberCarnet" compact />
        </div>
        {canManage && (
          <div style={{ marginBottom: '16px' }}>
            <MemberPortalPinAdmin
              miembroId={member.id}
              canManage={canManage}
              showQrRegenerate
              onTokenRegenerated={setToken}
            />
          </div>
        )}
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
        <CarnetCard
          member={member}
          club={selectedClub}
          medical={medical}
          token={token}
          expirationLabel={expirationLabel}
          t={t}
        />
      </div>
    </div>
  );
}
