import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { getPortalProfileDefaultTab } from '../../utils/dashboardRoutes';
import PortalProfileHeader from './PortalProfileHeader';

function isProfileTabActive(pathname, tabPath, defaultTab) {
  if (tabPath === defaultTab) {
    return /\/dashboard\/profile\/?$/.test(pathname)
      || pathname.endsWith(`/dashboard/profile/${tabPath}`);
  }
  return pathname.endsWith(`/dashboard/profile/${tabPath}`);
}

const SCROLL_EDGE_THRESHOLD = 4;

function useScrollTabIndicators(scrollRef, deps = []) {
  const [indicators, setIndicators] = useState({ left: false, right: false });

  const updateIndicators = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    if (maxScrollLeft <= SCROLL_EDGE_THRESHOLD) {
      setIndicators({ left: false, right: false });
      return;
    }

    setIndicators({
      left: el.scrollLeft > SCROLL_EDGE_THRESHOLD,
      right: el.scrollLeft < maxScrollLeft - SCROLL_EDGE_THRESHOLD,
    });
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    updateIndicators();
    el.addEventListener('scroll', updateIndicators, { passive: true });

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateIndicators)
      : null;
    resizeObserver?.observe(el);

    window.addEventListener('resize', updateIndicators);

    return () => {
      el.removeEventListener('scroll', updateIndicators);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateIndicators);
    };
  }, [scrollRef, updateIndicators, ...deps]);

  return { indicators, updateIndicators };
}

export default function PortalProfileTabs({ tabs, defaultTab }) {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const resolvedDefaultTab = defaultTab || getPortalProfileDefaultTab(isMobile);

  const activeTab = tabs.find(tab => isProfileTabActive(pathname, tab.path, resolvedDefaultTab)) || tabs[0];
  const activePath = activeTab?.path || resolvedDefaultTab;
  const scrollTabsRef = useRef(null);
  const { indicators, updateIndicators } = useScrollTabIndicators(scrollTabsRef, [tabs, activePath]);

  useEffect(() => {
    const el = scrollTabsRef.current;
    if (!el) return;

    const activeLink = el.querySelector('a.active');
    activeLink?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });

    const frame = window.requestAnimationFrame(updateIndicators);
    return () => window.cancelAnimationFrame(frame);
  }, [activePath, tabs, updateIndicators]);

  function scrollTabs(direction) {
    const el = scrollTabsRef.current;
    if (!el) return;

    const distance = Math.max(el.clientWidth * 0.75, 120);
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  }

  return (
    <div className="portal-profile-tabs no-print">
      <div className="portal-profile-tabs--desktop tabs">
        {tabs.map(tab => (
          <Link
            key={tab.path}
            to={tab.path}
            className={isProfileTabActive(pathname, tab.path, resolvedDefaultTab) ? 'active' : ''}
          >
            {t(tab.labelKey)}
          </Link>
        ))}
      </div>

      <div className="portal-profile-tabs--mobile">
        <div className="portal-profile-hero">
          <PortalProfileHeader />
          <div
            className={`portal-profile-scroll-tabs-wrap${
              indicators.left ? ' is-overflow-left' : ''
            }${indicators.right ? ' is-overflow-right' : ''}`}
          >
            <button
              type="button"
              className="portal-profile-scroll-edge portal-profile-scroll-edge--start"
              aria-label={t('portalProfileTabsScrollLeft')}
              disabled={!indicators.left}
              onClick={() => scrollTabs('left')}
            >
              ‹
            </button>
            <div
              ref={scrollTabsRef}
              className="portal-profile-scroll-tabs"
              aria-label={t('portalProfileSectionLabel')}
            >
              {tabs.map(tab => {
                const isActive = tab.path === activePath;
                return (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    className={isActive ? 'active' : ''}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {t(tab.labelKey)}
                  </Link>
                );
              })}
            </div>
            <button
              type="button"
              className="portal-profile-scroll-edge portal-profile-scroll-edge--end"
              aria-label={t('portalProfileTabsScrollRight')}
              disabled={!indicators.right}
              onClick={() => scrollTabs('right')}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
