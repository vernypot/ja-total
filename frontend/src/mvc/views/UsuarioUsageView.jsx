import ListSearchInput from '../../components/ListSearchInput';
import ListPagination from '../../components/ListPagination';
import { PageHelpLink } from '../../components/PageHelp';
import { useLanguage } from '../../hooks/useLanguage';
import { roleLabel, estadoLabel } from '../../i18n/helpers';
import '../../styles/usuarioUsage.css';

function SummaryCard({ label, value, tone = 'neutral' }) {
  return (
    <div className={`usage-stat-card usage-stat-card--${tone}`}>
      <div className="usage-stat-card__value">{value}</div>
      <div className="usage-stat-card__label">{label}</div>
    </div>
  );
}

function ActiveBadge({ active, t }) {
  if (!active) return null;
  return <span className="usage-active-badge">{t('usageActiveNow')}</span>;
}

export default function UsuarioUsageView({
  canView,
  tab,
  setTab,
  memberFilter,
  setMemberFilter,
  days,
  setDays,
  periodOptions,
  searchQuery,
  setSearchQuery,
  loading,
  error,
  summary,
  rows,
  listPagination,
  reload,
  formatUsageDuration,
  formatUsageTimestamp,
  staffDisplayName,
  memberDisplayName,
}) {
  const { t } = useLanguage();

  if (!canView) {
    return (
      <div className="container">
        <div className="alert alert-warning">{t('usageStatsNoPermission')}</div>
      </div>
    );
  }

  return (
    <div className="container usage-stats-page">
      <div className="page-header">
        <div>
          <h1>📊 {t('usageStatsTitle')} <PageHelpLink pageId="usage-stats" /></h1>
          <p className="text-muted usage-stats-subtitle">{t('usageStatsSubtitle')}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={reload} disabled={loading}>
          {loading ? t('loading') : t('pageHelpRefresh')}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="usage-stats-toolbar card">
        <div className="usage-stats-tabs" role="tablist" aria-label={t('usageStatsTitle')}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'staff'}
            className={`usage-stats-tab${tab === 'staff' ? ' usage-stats-tab--active' : ''}`}
            onClick={() => setTab('staff')}
          >
            {t('usageStatsStaffTab')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'members'}
            className={`usage-stats-tab${tab === 'members' ? ' usage-stats-tab--active' : ''}`}
            onClick={() => setTab('members')}
          >
            {t('usageStatsMembersTab')}
          </button>
        </div>

        <div className="usage-stats-filters">
          <label className="usage-stats-period">
            <span>{t('usageStatsPeriodLabel')}</span>
            <select
              value={days}
              onChange={event => setDays(Number(event.target.value))}
              className="form-input"
            >
              {periodOptions.map(option => (
                <option key={option} value={option}>
                  {t('usageStatsPeriodDays').replace('{count}', String(option))}
                </option>
              ))}
            </select>
          </label>
          <ListSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('search')}
          />
          {tab === 'members' && (
            <label className="usage-stats-period">
              <span>{t('usageStatsMemberFilterLabel')}</span>
              <select
                value={memberFilter}
                onChange={event => setMemberFilter(event.target.value)}
                className="form-input"
              >
                <option value="all">{t('usageStatsMemberFilterAll')}</option>
                <option value="card">{t('usageStatsMemberFilterCard')}</option>
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="usage-stats-summary">
        <SummaryCard
          label={tab === 'staff' ? t('usageStatTrackedStaff') : t('usageStatTrackedMembers')}
          value={summary.trackedUsers}
          tone="info"
        />
        {tab === 'members' && (
          <SummaryCard
            label={t('usageStatCardScans')}
            value={summary.totalCardScans}
            tone="warning"
          />
        )}
        {tab === 'members' && (
          <SummaryCard
            label={t('usageStatQrLogins')}
            value={summary.totalQrLogins}
            tone="success"
          />
        )}
        <SummaryCard
          label={t('usageStatWithLogin')}
          value={summary.usersWithLogin}
          tone="neutral"
        />
        <SummaryCard
          label={t('usageStatActiveNow')}
          value={summary.activeNow}
          tone="success"
        />
        <SummaryCard
          label={t('usageStatTotalLogins')}
          value={summary.totalLogins}
          tone="warning"
        />
        <SummaryCard
          label={t('usageStatTotalTime')}
          value={formatUsageDuration(summary.totalUsageSeconds)}
          tone="info"
        />
      </div>

      {loading ? (
        <div className="loading">{t('usageStatsLoading')}</div>
      ) : rows.length === 0 ? (
        <p className="text-muted">{t('usageStatsEmpty')}</p>
      ) : (
        <div className="card usage-stats-table-wrap">
          <table className="usage-stats-table">
            <thead>
              <tr>
                <th>{t('name')}</th>
                {tab === 'staff' && <th>{t('email')}</th>}
                <th>{tab === 'staff' ? t('churchLabel') : t('clubLabel')}</th>
                {tab === 'staff' && <th>{t('role')}</th>}
                {tab === 'members' && <th>{t('usageCardScans')}</th>}
                {tab === 'members' && <th>{t('usageQrLogins')}</th>}
                <th>{t('usageLastLogin')}</th>
                <th>{t('usageLoginCount')}</th>
                <th>{t('usageTotalTime')}</th>
                <th>{t('usageLastSeen')}</th>
                <th>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const key = tab === 'staff' ? row.usuario_id : row.miembro_id;
                const name = tab === 'staff'
                  ? staffDisplayName(row)
                  : memberDisplayName(row);

                return (
                  <tr key={key}>
                    <td>
                      <div className="usage-stats-name-cell">
                        <strong>{name}</strong>
                        <ActiveBadge active={row.active_now} t={t} />
                      </div>
                    </td>
                    {tab === 'staff' && <td>{row.email || '—'}</td>}
                    <td>{tab === 'staff' ? (row.iglesia_nombre || '—') : (row.club_nombre || '—')}</td>
                    {tab === 'staff' && <td>{roleLabel(row.rol, t)}</td>}
                    {tab === 'members' && (
                      <td>
                        <div>{row.card_scan_count ?? 0}</div>
                        <div className="usage-stats-submetric">
                          {t('usageLastCardScan')}: {formatUsageTimestamp(row.last_card_scan_at)}
                        </div>
                      </td>
                    )}
                    {tab === 'members' && <td>{row.qr_login_count ?? 0}</td>}
                    <td>{formatUsageTimestamp(row.last_login_at)}</td>
                    <td>{row.login_count ?? 0}</td>
                    <td>{formatUsageDuration(row.total_usage_seconds)}</td>
                    <td>{formatUsageTimestamp(row.last_seen_at)}</td>
                    <td>
                      {tab === 'staff'
                        ? estadoLabel(row.estado, t)
                        : estadoLabel(row.estado, t)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {listPagination?.totalPages > 1 && <ListPagination {...listPagination} />}
    </div>
  );
}
