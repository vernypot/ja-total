export const SITE_CONTENT_PAGES = [
  {
    id: 'landing',
    path: '/',
    titleKey: 'siteContentPageLanding',
    descKey: 'siteContentPageLandingDesc',
    editors: [
      {
        id: 'landing-cms',
        labelKey: 'siteContentEditLandingCms',
        path: '/dashboard/landing-cms',
      },
      {
        id: 'landing-labels',
        labelKey: 'siteContentEditLandingLabels',
        path: '/dashboard/advanced-settings?q=landing',
      },
    ],
  },
  {
    id: 'modulos',
    path: '/modulos',
    titleKey: 'siteContentPageModules',
    descKey: 'siteContentPageModulesDesc',
    editors: [
      {
        id: 'modules-labels',
        labelKey: 'siteContentEditCopy',
        path: '/dashboard/advanced-settings?q=systemModule',
      },
    ],
  },
  {
    id: 'login',
    path: '/login',
    titleKey: 'siteContentPageLogin',
    descKey: 'siteContentPageLoginDesc',
    editors: [
      {
        id: 'login-labels',
        labelKey: 'siteContentEditCopy',
        path: '/dashboard/advanced-settings?q=login',
      },
    ],
  },
];

export function getSiteContentPages() {
  return SITE_CONTENT_PAGES;
}
