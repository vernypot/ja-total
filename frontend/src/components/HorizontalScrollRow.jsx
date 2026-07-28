import { useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { useMediaQuery } from '../hooks/useMediaQuery';

const SCROLL_STEP_RATIO = 0.8;
const SCROLL_EDGE_THRESHOLD = 4;

export default function HorizontalScrollRow({
  as: Tag = 'div',
  className = '',
  children,
  ...props
}) {
  const { t } = useLanguage();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const trackRef = useRef(null);
  const wrapperRef = useRef(null);
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  const updateArrows = useCallback(() => {
    const track = trackRef.current;
    const wrapper = wrapperRef.current;
    const prev = prevRef.current;
    const next = nextRef.current;
    if (!track || !wrapper || !prev || !next) return;

    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const scrollLeft = track.scrollLeft;
    const canScroll = maxScroll > SCROLL_EDGE_THRESHOLD;

    wrapper.classList.toggle('horizontal-scroll-row--scrollable', canScroll);
    prev.disabled = !canScroll || scrollLeft <= SCROLL_EDGE_THRESHOLD;
    next.disabled = !canScroll || scrollLeft >= maxScroll - SCROLL_EDGE_THRESHOLD;
  }, []);

  const scrollByDirection = useCallback((direction) => {
    const track = trackRef.current;
    if (!track) return;

    const delta = direction * Math.max(track.clientWidth * SCROLL_STEP_RATIO, 120);
    track.scrollTo({
      left: track.scrollLeft + delta,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    if (!isMobile) return undefined;

    const track = trackRef.current;
    if (!track) return undefined;

    track.addEventListener('scroll', updateArrows, { passive: true });

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateArrows)
      : null;
    resizeObserver?.observe(track);
    Array.from(track.children).forEach(child => resizeObserver?.observe(child));

    requestAnimationFrame(() => {
      requestAnimationFrame(updateArrows);
    });

    return () => {
      track.removeEventListener('scroll', updateArrows);
      resizeObserver?.disconnect();
    };
  }, [isMobile, updateArrows, children]);

  if (!isMobile) {
    return (
      <Tag className={className} {...props}>
        {children}
      </Tag>
    );
  }

  const trackClassName = ['horizontal-scroll-row__track', className].filter(Boolean).join(' ');

  return (
    <div ref={wrapperRef} className="horizontal-scroll-row">
      <button
        ref={prevRef}
        type="button"
        className="horizontal-scroll-row__arrow horizontal-scroll-row__arrow--prev"
        aria-label={t('scrollLeft')}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          scrollByDirection(-1);
        }}
      >
        <span aria-hidden="true">‹</span>
      </button>
      <Tag ref={trackRef} className={trackClassName} {...props}>
        {children}
      </Tag>
      <button
        ref={nextRef}
        type="button"
        className="horizontal-scroll-row__arrow horizontal-scroll-row__arrow--next"
        aria-label={t('scrollRight')}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          scrollByDirection(1);
        }}
      >
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
