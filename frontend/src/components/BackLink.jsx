import { useContext, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { ClubContext } from '../context/ClubContext';
import { DASHBOARD_HOME_PATH } from '../utils/dashboardRoutes';

export default function BackLink({ fallbackTo, className = 'page-back-link', labelKey = 'back' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { activeClub } = useContext(ClubContext);
  const { t } = useLanguage();

  const defaultFallback = useMemo(() => {
    if (fallbackTo) return fallbackTo;

    if (location.pathname.includes('/dashboard/miembro/')) {
      const clubId = params.get('club') || activeClub?.id;
      return clubId ? `/dashboard/miembros?club=${clubId}` : '/dashboard/miembros';
    }

    if (location.pathname.includes('/dashboard/club-directiva')) {
      return '/dashboard/clubes';
    }

    if (location.pathname.includes('/dashboard/unidades')) {
      return '/dashboard/clubes';
    }

    return DASHBOARD_HOME_PATH;
  }, [fallbackTo, location.pathname, params, activeClub?.id]);

  function handleClick() {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate(defaultFallback);
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      ← {t(labelKey)}
    </button>
  );
}
