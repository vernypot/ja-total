import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { PORTAL_BOTTOM_NAV } from '../../utils/portalMobileNav';

export default function PortalBottomNav() {
  const { pathname } = useLocation();
  const { t } = useLanguage();

  return (
    <nav className="portal-bottom-nav no-print" aria-label={t('portalMobileNavAria')}>
      <ul className="portal-bottom-nav__list">
        {PORTAL_BOTTOM_NAV.map(item => {
          const active = item.isActive(pathname);
          return (
            <li key={item.id}>
              <Link
                to={item.path}
                className={`portal-bottom-nav__link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="portal-bottom-nav__icon" aria-hidden="true">{item.icon}</span>
                <span className="portal-bottom-nav__label">{t(item.shortLabelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
