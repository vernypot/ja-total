import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { isBlixLayoutTheme } from '../../constants/uiThemes';
import BlixIcon from '../icons/BlixIcon';
import { getPortalBottomNav } from '../../utils/portalMobileNav';

export default function PortalBottomNav() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const useBlixIcons = isBlixLayoutTheme(theme);
  const navItems = getPortalBottomNav(isMobile);

  return (
    <nav className="portal-bottom-nav no-print" aria-label={t('portalMobileNavAria')}>
      <ul
        className="portal-bottom-nav__list"
        style={{ '--portal-nav-count': navItems.length }}
      >
        {navItems.map(item => {
          const active = item.isActive(pathname);
          function handleClick(event) {
            if (active) {
              event.preventDefault();
              window.location.reload();
            }
          }
          return (
            <li key={item.id}>
              <Link
                to={item.path}
                className={`portal-bottom-nav__link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={handleClick}
              >
                {useBlixIcons ? (
                  <BlixIcon name={item.blixIcon} className="portal-bottom-nav__icon-svg" size={22} />
                ) : (
                  <span className="portal-bottom-nav__icon" aria-hidden="true">{item.icon}</span>
                )}
                <span className="portal-bottom-nav__label">{t(item.shortLabelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
