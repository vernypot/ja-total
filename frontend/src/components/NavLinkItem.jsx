import { Link } from 'react-router-dom';
import { isBlixLayoutTheme } from '../constants/uiThemes';
import { useTheme } from '../hooks/useTheme';
import BlixIcon from './icons/BlixIcon';

const EMOJI_BY_ICON = {
  home: '🏠',
  user: '👤',
  blog: '📰',
  calendar: '🗓️',
  events: '📅',
  clubs: '🎯',
  members: '👥',
  plan: '📋',
  book: '📚',
  star: '⭐',
  badge: '🎖️',
  church: '⛪',
  tag: '🏷️',
  idcard: '🪪',
  globe: '🌎',
  key: '🔑',
  edit: '📝',
  web: '🌐',
  settings: '⚙️',
};

export default function NavLinkItem({ to, active, icon, className = '', onClick, children, reloadOnActive = true }) {
  const { theme } = useTheme();
  const useBlixIcons = isBlixLayoutTheme(theme);
  const emoji = EMOJI_BY_ICON[icon] || '•';

  function handleClick(event) {
    if (reloadOnActive && active) {
      event.preventDefault();
      window.location.reload();
      return;
    }
    onClick?.(event);
  }

  return (
    <Link
      to={to}
      className={`nav-link${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
    >
      {useBlixIcons ? (
        <>
          <span className="nav-link-icon" aria-hidden="true">
            <BlixIcon name={icon} size={18} />
          </span>
          <span className="nav-link-label">{children}</span>
        </>
      ) : (
        <>
          <span className="nav-link-emoji" aria-hidden="true">{emoji}</span>
          <span className="nav-link-label">{children}</span>
        </>
      )}
    </Link>
  );
}
