import { Link, useSearchParams, useLocation } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { useLanguage } from "../hooks/useLanguage";
import { AuthContext } from "../context/AuthContext";
import { IglesiaContext } from "../context/IglesiaContext";
import { ClubContext } from "../context/ClubContext";
import { clubDisplayName } from "../utils/club";
import { getUserRole, isSuperAdmin, isAdminOrAbove } from "../utils/permissions";
import { DASHBOARD_HOME_PATH, isDashboardHomePath } from "../utils/dashboardRoutes";
import { useDashboardAuth } from "../hooks/useDashboardAuth";
import * as IglesiasModel from "../mvc/models/iglesias.model";

const PORTAL_PAGE_LABELS = {
  '/dashboard/profile': 'portalNavProfile',
  '/dashboard/noticias': 'portalNavNews',
  '/dashboard/eventos': 'portalNavEvents',
  '/dashboard/calendario': 'portalNavCalendar',
};

const PORTAL_PROFILE_TAB_LABELS = {
  datos: 'tabData',
  'datos-medicos': 'tabMedicalData',
  contactos: 'tabContacts',
  especialidades: 'tabSpecialties',
  cargos: 'tabCargos',
  clases: 'tabClasses',
  eventos: 'tabEvents',
  asistencia: 'tabAttendance',
  carnet: 'tabCarnet',
};

export default function Breadcrumb() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const { isPortalOnly } = useDashboardAuth();
  const { activeIglesia } = useContext(IglesiaContext);
  const { activeClub } = useContext(ClubContext);
  const [iglesiaNombre, setIglesiaNombre] = useState('');
  const superadmin = isSuperAdmin(getUserRole(user, userData));
  const adminOrAbove = isAdminOrAbove(getUserRole(user, userData));

  const iglesiaId = params.get("iglesia") || activeIglesia;
  const clubId = params.get("club") || activeClub?.id;
  const onMembersPage = location.pathname.includes('/miembros');
  const onBloquesPage = location.pathname.includes('/bloques-completados');
  const onUnidadesPage = location.pathname.includes('/unidades');
  const onMemberDetailPage = /\/dashboard\/miembro\//.test(location.pathname);

  useEffect(() => {
    if (!iglesiaId) {
      setIglesiaNombre(userData?.iglesia_nombre || '');
      return;
    }
    IglesiasModel.fetchIglesiaById(iglesiaId).then(({ data }) => {
      setIglesiaNombre(data?.nombre || userData?.iglesia_nombre || '');
    });
  }, [iglesiaId, userData?.iglesia_nombre]);

  const churchLabel = iglesiaNombre || t('clubs');

  const onHomePage = isDashboardHomePath(location.pathname);
  const portalPageLabelKey = PORTAL_PAGE_LABELS[location.pathname];
  const profileTabMatch = location.pathname.match(/^\/dashboard\/profile\/([^/]+)/);
  const profileTabLabelKey = profileTabMatch
    ? PORTAL_PROFILE_TAB_LABELS[profileTabMatch[1]]
    : null;
  const onPortalProfile = location.pathname.startsWith('/dashboard/profile');

  if (isPortalOnly) {
    if (onHomePage) return null;

    return (
      <div style={{ marginBottom: "10px", fontSize: '14px' }}>
        <Link to={DASHBOARD_HOME_PATH}>{t('home')}</Link>
        {onPortalProfile && (
          <>
            {' > '}
            {profileTabLabelKey ? (
              <Link to="/dashboard/profile">{t('portalNavProfile')}</Link>
            ) : (
              <span style={{ color: 'var(--color-text-secondary)' }}>{t('portalNavProfile')}</span>
            )}
          </>
        )}
        {!onPortalProfile && portalPageLabelKey && (
          <>
            {' > '}
            <span style={{ color: 'var(--color-text-secondary)' }}>{t(portalPageLabelKey)}</span>
          </>
        )}
        {profileTabLabelKey && (
          <>
            {' > '}
            <span style={{ color: 'var(--color-text-secondary)' }}>{t(profileTabLabelKey)}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "10px", fontSize: '14px' }}>
      {!onHomePage && (
        <>
          <Link to={DASHBOARD_HOME_PATH}>{t('home')}</Link>
          {(iglesiaId || clubId || onMembersPage) && ' > '}
        </>
      )}

      {superadmin ? (
        iglesiaId ? (
          <Link to={`/dashboard/clubes?iglesia=${iglesiaId}`}>{churchLabel}</Link>
        ) : null
      ) : adminOrAbove ? (
        iglesiaId ? <span>{churchLabel}</span> : null
      ) : (
        iglesiaId ? null : (
          <Link to="/dashboard/clubes">{t('clubs')}</Link>
        )
      )}

      {clubId && activeClub && (
        <>
          {" > "}
          <Link to={`/dashboard/miembros?club=${clubId}`}>
            {clubDisplayName(activeClub)}
          </Link>
        </>
      )}

      {onMembersPage && clubId && (
        <>
          {" > "}
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('members')}</span>
        </>
      )}

      {onUnidadesPage && (
        <>
          {clubId && activeClub ? (
            <>
              {" > "}
              <Link to={`/dashboard/miembros?club=${clubId}`}>
                {clubDisplayName(activeClub)}
              </Link>
            </>
          ) : null}
          {" > "}
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('unidades')}</span>
        </>
      )}

      {onBloquesPage && (
        <>
          {clubId && activeClub ? (
            <>
              {" > "}
              <Link to={`/dashboard/miembros?club=${clubId}`}>
                {clubDisplayName(activeClub)}
              </Link>
            </>
          ) : null}
          {" > "}
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('completedBlocks')}</span>
        </>
      )}

      {onMemberDetailPage && (
        <>
          {" > "}
          <Link to={clubId ? `/dashboard/miembros?club=${clubId}` : '/dashboard/miembros'}>
            {t('members')}
          </Link>
          {" > "}
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('memberDetail')}</span>
        </>
      )}
    </div>
  );
}
