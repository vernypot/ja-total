import { useLanguage } from '../../hooks/useLanguage';
import { estadoLabel } from '../../i18n/helpers';
import { clubDisplayName } from '../../utils/club';
import { PageHelpLink } from '../../components/PageHelp';
import BackLink from '../../components/BackLink';
import LogoAssetField from '../../components/LogoAssetField';
import { ChurchOrgPath } from '../../components/ChurchOrgFields';
import { iglesiaHierarchyLabel } from '../models/iglesias.model';
import { cuotaFrequencyLabel } from '../../constants/cuotaFrequencies';
import { clubHasDefaultCuota, formatCuotaMonto } from '../../utils/cuota';
import FormField from '../../components/FormField';
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
  navigateToReglamento,
  handleClubLogoUpload,
  handleClubLogoRemove,
  handleTipoLogoUpload,
  handleTipoLogoRemove,
  cuotaForm,
  setCuotaForm,
  cuotaFieldErrors = {},
  savingCuota,
  saveClubCuota,
  cuotaFrequencyOptions = [],
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

          <section className="card club-detalle-section club-detalle-section--cuota">
            <h2>{t('clubDetailsCuota')}</h2>
            <p className="text-muted club-detalle-cuota-intro">{t('clubDetailsCuotaHint')}</p>
            {!canManage ? (
              <dl className="club-detalle-info">
                <div>
                  <dt>{t('clubCuotaEnabled')}</dt>
                  <dd>{club.cuota_activa ? t('yes') : t('no')}</dd>
                </div>
                {clubHasDefaultCuota(club) && (
                  <>
                    <div>
                      <dt>{t('clubCuotaAmount')}</dt>
                      <dd>{formatCuotaMonto(club.cuota_monto, { language, club, includeCurrencyName: true })}</dd>
                    </div>
                    <div>
                      <dt>{t('clubCuotaCurrencyName')}</dt>
                      <dd>{club.cuota_moneda_nombre || t('notAvailable')}</dd>
                    </div>
                    <div>
                      <dt>{t('clubCuotaCurrencySymbol')}</dt>
                      <dd>{club.cuota_moneda_simbolo || t('notAvailable')}</dd>
                    </div>
                    <div>
                      <dt>{t('clubCuotaFrequency')}</dt>
                      <dd>{cuotaFrequencyLabel(club.cuota_frecuencia, t, club.cuota_frecuencia_otro)}</dd>
                    </div>
                  </>
                )}
              </dl>
            ) : (
              <div className="club-detalle-cuota-form">
                <label className="club-detalle-cuota-toggle">
                  <input
                    type="checkbox"
                    checked={cuotaForm.cuota_activa}
                    onChange={e => setCuotaForm(prev => ({ ...prev, cuota_activa: e.target.checked }))}
                  />
                  {t('clubCuotaEnabled')}
                </label>
                {cuotaForm.cuota_activa && (
                  <div className="form-grid club-detalle-cuota-fields">
                    <FormField
                      label={t('clubCuotaAmount')}
                      htmlFor="club-cuota-monto"
                      error={cuotaFieldErrors.cuota_monto}
                      required
                    >
                      <input
                        id="club-cuota-monto"
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input"
                        value={cuotaForm.cuota_monto}
                        onChange={e => setCuotaForm(prev => ({ ...prev, cuota_monto: e.target.value }))}
                      />
                    </FormField>
                    <FormField
                      label={t('clubCuotaCurrencySymbol')}
                      htmlFor="club-cuota-moneda-simbolo"
                      error={cuotaFieldErrors.cuota_moneda_simbolo}
                      required
                    >
                      <input
                        id="club-cuota-moneda-simbolo"
                        type="text"
                        maxLength={12}
                        className="form-input"
                        value={cuotaForm.cuota_moneda_simbolo}
                        onChange={e => setCuotaForm(prev => ({ ...prev, cuota_moneda_simbolo: e.target.value }))}
                        placeholder={t('clubCuotaCurrencySymbolPlaceholder')}
                      />
                    </FormField>
                    <FormField
                      label={t('clubCuotaCurrencyName')}
                      htmlFor="club-cuota-moneda-nombre"
                      error={cuotaFieldErrors.cuota_moneda_nombre}
                      required
                    >
                      <input
                        id="club-cuota-moneda-nombre"
                        type="text"
                        maxLength={80}
                        className="form-input"
                        value={cuotaForm.cuota_moneda_nombre}
                        onChange={e => setCuotaForm(prev => ({ ...prev, cuota_moneda_nombre: e.target.value }))}
                        placeholder={t('clubCuotaCurrencyNamePlaceholder')}
                      />
                    </FormField>
                    <FormField label={t('clubCuotaFrequency')} htmlFor="club-cuota-frecuencia">
                      <select
                        id="club-cuota-frecuencia"
                        className="form-input"
                        value={cuotaForm.cuota_frecuencia}
                        onChange={e => setCuotaForm(prev => ({ ...prev, cuota_frecuencia: e.target.value }))}
                      >
                        {cuotaFrequencyOptions.map(value => (
                          <option key={value} value={value}>
                            {cuotaFrequencyLabel(value, t)}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    {cuotaForm.cuota_frecuencia === 'otro' && (
                      <FormField
                        label={t('clubCuotaFrequencyOther')}
                        htmlFor="club-cuota-frecuencia-otro"
                        error={cuotaFieldErrors.cuota_frecuencia_otro}
                        className="form-grid-full"
                        required
                      >
                        <input
                          id="club-cuota-frecuencia-otro"
                          type="text"
                          className="form-input"
                          value={cuotaForm.cuota_frecuencia_otro}
                          onChange={e => setCuotaForm(prev => ({ ...prev, cuota_frecuencia_otro: e.target.value }))}
                        />
                      </FormField>
                    )}
                  </div>
                )}
                <div className="club-detalle-cuota-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={saveClubCuota}
                    disabled={savingCuota}
                  >
                    {savingCuota ? t('saving') : t('save')}
                  </button>
                </div>
              </div>
            )}
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
              <button type="button" className="btn btn-secondary" onClick={navigateToReglamento}>
                📜 {t('reglamentoNav')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
