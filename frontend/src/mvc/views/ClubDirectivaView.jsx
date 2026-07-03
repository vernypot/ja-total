import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { clubDisplayName } from '../../utils/club';
import { PageHelpLink } from '../../components/PageHelp';
import BackLink from '../../components/BackLink';
import '../../styles/form.css';

function formatStartDate(value, t) {
  return value || t('cargoStartUnknown');
}

export default function ClubDirectivaView({
  club,
  rows,
  error,
  loading,
  clubId,
  navigateToMember,
  memberDisplayName,
  getCargoPath,
}) {
  const { t } = useLanguage();

  return (
    <div className="container">
      <BackLink fallbackTo={clubId ? `/dashboard/clubes` : '/dashboard/clubes'} />
      <div className="page-header">
        <div>
          <h1>🎖️ {t('clubDirectiva')} <PageHelpLink pageId="clubDirectiva" /></h1>
          {club && (
            <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              {t('clubLabel')}: <strong>{clubDisplayName(club)}</strong>
              {club.tipos_club?.nombre && (
                <span style={{ marginLeft: '8px', color: '#3730a3' }}>({club.tipos_club.nombre})</span>
              )}
            </p>
          )}
        </div>
        {clubId && (
          <Link to={`/dashboard/miembros?club=${clubId}`} className="btn btn-secondary">
            👥 {t('membersBtn')}
          </Link>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">{t('loadingData')}</div>
      ) : rows.length === 0 ? (
        <p className="text-muted">{t('noClubDirectiva')}</p>
      ) : (
        <div className="card">
          <div style={{ display: 'grid', gap: '10px' }}>
            {rows.map(row => {
              const cargo = row.cargos;
              const path = getCargoPath(cargo?.id).map(c => c.nombre).join(' › ');
              const name = memberDisplayName(row.miembros);

              return (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(160px, 1fr) minmax(180px, 1.2fr) minmax(120px, 0.8fr) auto',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '12px 15px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                  }}
                >
                  <div>
                    <strong>{cargo?.nombre || t('notAvailable')}</strong>
                    {path && path !== cargo?.nombre && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        {path}
                      </div>
                    )}
                  </div>
                  <div>{name || t('notAvailable')}</div>
                  <div style={{ fontSize: '13px', color: '#4b5563' }}>
                    {t('planStartDate')}: {formatStartDate(row.fecha_inicio, t)}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToMember(row.miembro_id)}
                    className="btn btn-sm btn-edit"
                  >
                    📋 {t('details')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
