import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';

function isProfileTabActive(pathname, tabPath) {
  if (tabPath === 'datos') {
    return /\/dashboard\/profile\/?$/.test(pathname) || pathname.endsWith('/dashboard/profile/datos');
  }
  return pathname.endsWith(`/dashboard/profile/${tabPath}`);
}

export default function PortalProfileTabs({ tabs }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const activeTab = tabs.find(tab => isProfileTabActive(pathname, tab.path)) || tabs[0];
  const activePath = activeTab?.path || 'datos';

  return (
    <div className="portal-profile-tabs no-print">
      <div className="portal-profile-tabs--desktop tabs">
        {tabs.map(tab => (
          <Link
            key={tab.path}
            to={tab.path}
            className={isProfileTabActive(pathname, tab.path) ? 'active' : ''}
          >
            {t(tab.labelKey)}
          </Link>
        ))}
      </div>

      <div className="portal-profile-tabs--mobile">
        <div className="portal-profile-tab-select">
          <label htmlFor="portal-profile-tab-select">{t('portalProfileSectionLabel')}</label>
          <select
            id="portal-profile-tab-select"
            value={activePath}
            onChange={event => navigate(`/dashboard/profile/${event.target.value}`)}
          >
            {tabs.map(tab => (
              <option key={tab.path} value={tab.path}>
                {t(tab.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div className="portal-profile-scroll-tabs" aria-label={t('portalProfileSectionLabel')}>
          {tabs.map(tab => {
            const isActive = tab.path === activePath;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={isActive ? 'active' : ''}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(tab.labelKey)}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
