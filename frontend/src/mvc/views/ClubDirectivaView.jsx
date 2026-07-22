import { Link } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { clubDisplayName } from '../../utils/club';
import { PageHelpLink } from '../../components/PageHelp';
import ListPagination from '../../components/ListPagination';
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
  listPagination,
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
          <ListPagination {...listPagination} />
          <div
            className="club-directiva-header"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(160px, 0.9fr) minmax(220px, 1.4fr) auto',
              gap: '12px',
              padding: '0 15px 10px',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <div>{t('clubDirectivaMember')}</div>
            <div>{t('clubDirectivaCargos')}</div>
            <div />
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {rows.map(group => {
              const name = memberDisplayName(group.miembros);

              return (
                <div
                  key={group.miembro_id}
                  className="club-directiva-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(160px, 0.9fr) minmax(220px, 1.4fr) auto',
                    gap: '12px',
                    alignItems: 'start',
                    padding: '12px 15px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                  }}
                >
                  <div>
                    <strong>{name || t('notAvailable')}</strong>
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {(group.assignments || []).map((assignment, index) => {
                      const cargo = assignment.cargos;
                      const path = getCargoPath(cargo?.id).map(c => c.nombre).join(' › ');

                      return (
                        <div key={assignment.id || `${group.miembro_id}-${assignment.cargo_id || index}`}>
                          <strong>{cargo?.nombre || t('notAvailable')}</strong>
                          {path && path !== cargo?.nombre && (
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              {path}
                            </div>
                          )}
                          <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>
                            {t('planStartDate')}: {formatStartDate(assignment.fecha_inicio, t)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToMember(group.miembro_id)}
                    className="btn btn-sm btn-edit"
                    style={{ justifySelf: 'end' }}
                  >
                    📋 {t('details')}
                  </button>
                </div>
              );
            })}
          </div>
          {listPagination?.totalPages > 1 && <ListPagination {...listPagination} />}
        </div>
      )}
    </div>
  );
}
