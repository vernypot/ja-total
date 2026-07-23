import { isDashboardHomePath, PORTAL_PROFILE_PATH } from './dashboardRoutes';

export const PORTAL_BOTTOM_NAV = [
  {
    id: 'home',
    path: '/dashboard/home',
    labelKey: 'portalNavHome',
    shortLabelKey: 'portalNavHomeShort',
    icon: '🏠',
    blixIcon: 'home',
    isActive: pathname => isDashboardHomePath(pathname),
    mobileOnly: false,
  },
  {
    id: 'profile',
    path: PORTAL_PROFILE_PATH,
    labelKey: 'portalNavProfile',
    shortLabelKey: 'portalNavProfileShort',
    icon: '👤',
    blixIcon: 'user',
    isActive: pathname => pathname.startsWith(PORTAL_PROFILE_PATH),
    mobileOnly: false,
  },
  {
    id: 'noticias',
    path: '/dashboard/noticias',
    labelKey: 'portalNavNews',
    shortLabelKey: 'portalNavNewsShort',
    icon: '📰',
    blixIcon: 'blog',
    isActive: pathname => pathname.startsWith('/dashboard/noticias'),
    mobileOnly: false,
  },
  {
    id: 'eventos',
    path: '/dashboard/eventos',
    labelKey: 'portalNavEvents',
    shortLabelKey: 'portalNavEventsShort',
    icon: '📅',
    blixIcon: 'events',
    isActive: pathname => pathname.startsWith('/dashboard/eventos'),
    mobileOnly: false,
  },
  {
    id: 'calendario',
    path: '/dashboard/calendario',
    labelKey: 'portalNavCalendar',
    shortLabelKey: 'portalNavCalendarShort',
    icon: '🗓️',
    blixIcon: 'calendar',
    isActive: pathname => pathname.startsWith('/dashboard/calendario'),
    mobileOnly: false,
  },
];

export function getPortalBottomNav(isMobile = false) {
  return PORTAL_BOTTOM_NAV.filter(item => !isMobile || item.id !== 'home');
}

const PORTAL_PROFILE_TAB_LABELS = {
  inicio: 'portalNavHome',
  eventos: 'tabEvents',
  asistencia: 'tabAttendance',
  clases: 'tabProgressiveClasses',
  especialidades: 'tabSpecialties',
  registro: 'tabRegistro',
  datos: 'tabData',
  'datos-medicos': 'tabMedicalData',
  contactos: 'tabContacts',
  cargos: 'tabCargos',
};

export function getPortalPageTitle(pathname, t) {
  const item = PORTAL_BOTTOM_NAV.find(nav => nav.isActive(pathname));
  if (item) return t(item.labelKey);

  const profileMatch = pathname.match(/^\/dashboard\/profile\/([^/]+)/);
  if (profileMatch) {
    const tabKey = PORTAL_PROFILE_TAB_LABELS[profileMatch[1]];
    if (tabKey) return t(tabKey);
    return t('portalNavProfile');
  }

  if (pathname.startsWith('/dashboard/profile')) {
    return t('portalNavProfile');
  }

  return t('portalNavHome');
}
