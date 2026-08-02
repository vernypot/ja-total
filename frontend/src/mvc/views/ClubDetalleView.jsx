import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import { clubDisplayName } from '../../utils/club';
import { PageHelpLink } from '../../components/PageHelp';
import BackLink from '../../components/BackLink';
import LogoAssetField from '../../components/LogoAssetField';
import { ChurchOrgPath } from '../../components/ChurchOrgFields';
import { iglesiaHierarchyLabel } from '../models/iglesias.model';
import '../../styles/form.css';
import '../../styles/club-detalle.css';

function StatCard({ label, value, hint }) {
  return (
    <div className="club-detalle-stat">
      <span className="club-detalle-stat__value">{value}</span>
      <span className="club-detalle-stat__label">{label}</span>
      {hint && <span className="club-detalle-stat__hint">{hint}</span>}
    </div>
  );
}

function formatCreatedDate(value, language) {
  if (!value) return '—';
  const locale = language === 'en' ? 'en-US' : 'es-CO';
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ClubDetalleView({
  club,
  iglesia,
  stats,
  error,
  loading,
  canManage,
  logoUploading,
  backToListing,
  navigateToMiembros,
  navigateToEventos,
  navigateToUnidades,
  navigateToDirectiva,
  handleClubLogoUpload,
  handleClubLogoRemove,
  handleTipoLogoUpload,
  handleTipoLogoRemove,
}) {
  const { t, language } = useLanguage();
  const tipoNombre = club?.tipos_club?.nombre;
  const detailStats = stats || {
    memberCount: 0,
    boardCount: 0,
    unidadCount: 0,
    unidadCountTotal: 0,
    eventCount: 0,
    eventCountTotal: 0,
  };

  return (
    <div className="container">
      <BackLink onClick={backToListing} fallbackTo="/dashboard/clubes" />

      <div className="page-header">
        <div>
          <h1>🎯 {clubDisplayName(club) || t('clubDetailsTitle')} <PageHelpLink pageId="clubs" /></h1>
          {tipoNombre && (
            <span className="club-list-item__type-badge" style={{ marginTop: '8px', display: 'inline-block' }}>
              {tipoNombre}
            </span>
          )}
          {club && (
            <div style={{ marginTop: '10px' }}>
              <span className={`badge badge-${club.estado}`}>{estadoLabel(club.estado, t)}</span>
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">{t('loadingClubs')}</div>
      ) : !club ? (
        <p className="text-muted">{t('clubDetailsMissingClub')}</p>
      ) : (
        <div className="club-detalle-grid">
          <section className="card club-detalle-section">
            <h2>{t('clubDetailsStatistics')}</h2>
            <div className="club-detalle-stats">
              <StatCard
                label={t('members')}
                value={detailStats.memberCount}
              />
              <StatCard
                label={t('clubDirectiva')}
                value={detailStats.boardCount}
              />
              <StatCard
                label={t('unidades')}
                value={detailStats.unidadCount}
                hint={detailStats.unidadCountTotal !== detailStats.unidadCount
                  ? t('clubDetailsTotalHint').replace('{{count}}', String(detailStats.unidadCountTotal))
                  : ''}
              />
              <StatCard
                label={t('events')}
                value={detailStats.eventCount}
                hint={detailStats.eventCountTotal !== detailStats.eventCount
                  ? t('clubDetailsTotalHint').replace('{{count}}', String(detailStats.eventCountTotal))
                  : ''}
              />
            </div>
          </section>

          <section className="card club-detalle-section">
            <h2>{t('clubDetailsInfo')}</h2>
            <dl className="club-detalle-info">
              <div>
                <dt>{t('name')}</dt>
                <dd>{club.nombre}</dd>
              </div>
              <div>
                <dt>{t('clubType')}</dt>
                <dd>{tipoNombre || t('notAvailable')}</dd>
              </div>
              <div>
                <dt>{t('churchLabel')}</dt>
                <dd>{iglesia?.nombre || club.iglesias?.nombre || t('notAvailable')}</dd>
              </div>
              {iglesia && (
                <div className="club-detalle-info__path">
                  <dt>{t('orgStructure')}</dt>
                  <dd><ChurchOrgPath label={iglesiaHierarchyLabel(iglesia)} /></dd>
                </div>
              )}
              <div>
                <dt>{t('status')}</dt>
                <dd>{estadoLabel(club.estado, t)}</dd>
              </div>
              <div>
                <dt>{t('clubCreatedLabel')}</dt>
                <dd>{formatCreatedDate(club.created_at, language)}</dd>
              </div>
            </dl>
          </section>

          <section className="card club-detalle-section club-detalle-section--logos">
            <h2>{t('clubDetailsLogos')}</h2>
            <div className="club-detalle-logos">
              <LogoAssetField
                label={tipoNombre
                  ? t('clubTypeLogoNamed').replace('{type}', tipoNombre)
                  : t('clubTypeLogo')}
                logoUrl={club.tipos_club?.logo_url}
                canManage={canManage && Boolean(club.tipo_id)}
                uploading={logoUploading.kind === 'tipo'}
                onUpload={handleTipoLogoUpload}
                onRemove={handleTipoLogoRemove}
                uploadLabel={t('uploadLogo')}
                changeLabel={t('changeLogo')}
                removeLabel={t('removeLogo')}
                emptyLabel={t('noLogo')}
                hint={club.tipo_id ? t('clubTypeLogoHint') : t('clubTypeLogoMissing')}
              />
              <LogoAssetField
                label={t('clubLocalLogo')}
                logoUrl={club.logo_url}
                canManage={canManage}
                uploading={logoUploading.kind === 'club'}
                onUpload={handleClubLogoUpload}
                onRemove={handleClubLogoRemove}
                uploadLabel={t('uploadLogo')}
                changeLabel={t('changeLogo')}
                removeLabel={t('removeLogo')}
                emptyLabel={t('noLogo')}
                hint={t('clubLocalLogoHint')}
              />
            </div>
          </section>

          <section className="card club-detalle-section">
            <h2>{t('clubDetailsQuickLinks')}</h2>
            <div className="club-detalle-links">
              <button type="button" className="btn btn-secondary" onClick={navigateToMiembros}>
                👥 {t('membersBtn')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={navigateToUnidades}>
                🧩 {t('unidadBtn')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={navigateToDirectiva}>
                🎖️ {t('directivaBtn')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={navigateToEventos}>
                📅 {t('eventsBtn')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
