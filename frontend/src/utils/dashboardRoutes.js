/** Canonical post-login landing route */
export const DASHBOARD_HOME_PATH = '/dashboard/home';
export const PORTAL_PROFILE_PATH = '/dashboard/profile';
export const PORTAL_MOBILE_PROFILE_TAB = 'inicio';
export const PORTAL_DESKTOP_PROFILE_TAB = 'eventos';

export function getPortalLandingPath(isMobile = false) {
  return isMobile
    ? `${PORTAL_PROFILE_PATH}/${PORTAL_MOBILE_PROFILE_TAB}`
    : `${PORTAL_PROFILE_PATH}/${PORTAL_DESKTOP_PROFILE_TAB}`;
}

export function getPortalProfileDefaultTab(isMobile = false) {
  return isMobile ? PORTAL_MOBILE_PROFILE_TAB : PORTAL_DESKTOP_PROFILE_TAB;
}

export function isDashboardHomePath(pathname) {
  return pathname === '/dashboard'
    || pathname === '/dashboard/'
    || pathname === DASHBOARD_HOME_PATH
    || pathname === '/dashboard/inicio';
}
