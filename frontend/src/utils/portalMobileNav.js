import { isDashboardHomePath } from './dashboardRoutes';

export const PORTAL_BOTTOM_NAV = [
  {
    id: 'home',
    path: '/dashboard/home',
    labelKey: 'portalNavHome',
    shortLabelKey: 'portalNavHomeShort',
    icon: '🏠',
    blixIcon: 'home',
    isActive: pathname => isDashboardHomePath(pathname),
  },
  {
    id: 'profile',
    path: '/dashboard/profile',
    labelKey: 'portalNavProfile',
    shortLabelKey: 'portalNavProfileShort',
    icon: '👤',
    blixIcon: 'user',
    isActive: pathname => pathname.startsWith('/dashboard/profile'),
  },
  {
    id: 'noticias',
    path: '/dashboard/noticias',
    labelKey: 'portalNavNews',
    shortLabelKey: 'portalNavNewsShort',
    icon: '📰',
    blixIcon: 'blog',
    isActive: pathname => pathname.startsWith('/dashboard/noticias'),
  },
  {
    id: 'eventos',
    path: '/dashboard/eventos',
    labelKey: 'portalNavEvents',
    shortLabelKey: 'portalNavEventsShort',
    icon: '📅',
    blixIcon: 'events',
    isActive: pathname => pathname.startsWith('/dashboard/eventos'),
  },
  {
    id: 'calendario',
    path: '/dashboard/calendario',
    labelKey: 'portalNavCalendar',
    shortLabelKey: 'portalNavCalendarShort',
    icon: '🗓️',
    blixIcon: 'calendar',
    isActive: pathname => pathname.startsWith('/dashboard/calendario'),
  },
];

const PORTAL_PROFILE_TAB_LABELS = {
  datos: 'tabData',
  'datos-medicos': 'tabMedicalData',
  contactos: 'tabContacts',
  especialidades: 'tabSpecialties',
  cargos: 'tabCargos',
  clases: 'tabClasses',
  eventos: 'tabEvents',
  asistencia: 'tabAttendance',
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
