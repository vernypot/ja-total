import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  enhanceHorizontalScrollTargets,
  shouldRefreshHorizontalScroll,
} from '../utils/horizontalScrollEnhancer';

export default function HorizontalScrollEnhancer() {
  const { t } = useLanguage();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const cleanupsRef = useRef([]);

  useEffect(() => {
    if (!isMobile) {
      cleanupsRef.current.forEach(cleanup => cleanup());
      cleanupsRef.current = [];
      return undefined;
    }

    let observer;
    let debounceTimer;
    let resizeTimer;

    const labels = {
      prevLabel: t('scrollLeft'),
      nextLabel: t('scrollRight'),
    };

    function resetAll() {
      cleanupsRef.current.forEach(cleanup => cleanup());
      cleanupsRef.current = [];
    }

    function enhanceNewTargets() {
      const added = enhanceHorizontalScrollTargets(document, labels);
      cleanupsRef.current.push(...added);
    }

    function fullRefresh() {
      resetAll();
      enhanceNewTargets();
    }

    function incrementalRefresh() {
      enhanceNewTargets();
    }

    fullRefresh();

    const contentRoot = document.querySelector('.content') || document.body;
    observer = new MutationObserver((mutations) => {
      if (!shouldRefreshHorizontalScroll(mutations)) return;
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(incrementalRefresh, 180);
    });

    observer.observe(contentRoot, { childList: true, subtree: true });

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(fullRefresh, 150);
    };
    window.addEventListener('resize', onResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
      window.clearTimeout(debounceTimer);
      window.clearTimeout(resizeTimer);
      resetAll();
    };
  }, [isMobile, location.pathname, t]);

  return null;
}
