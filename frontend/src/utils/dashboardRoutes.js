/** Canonical post-login landing route */
export const DASHBOARD_HOME_PATH = '/dashboard/home';

export function isDashboardHomePath(pathname) {
  return pathname === '/dashboard'
    || pathname === '/dashboard/'
    || pathname === DASHBOARD_HOME_PATH
    || pathname === '/dashboard/inicio';
}
