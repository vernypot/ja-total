const SCROLL_STEP_RATIO = 0.8;
const SCROLL_EDGE_THRESHOLD = 4;

export const HORIZONTAL_SCROLL_SELECTORS = [
  '.table-responsive',
  '.member-list-item__main',
  '.event-attendance-list-item',
  '.noticia-list-item-row',
  '.checkin-session-registry-item',
  '.list-item',
  '.member-events-toolbar',
  '.member-events-filter',
  '.event-checkin-actions--inline',
  '.calendario-event-detail-member',
].join(', ');

function isAlreadyEnhanced(track) {
  return Boolean(track?.dataset?.horizontalScrollEnhanced);
}

function isEnhancerNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  return node.classList?.contains('horizontal-scroll-row')
    || node.classList?.contains('horizontal-scroll-row__arrow')
    || node.classList?.contains('horizontal-scroll-row__track');
}

function mutationIsRelevant(mutation) {
  if (mutation.type === 'attributes' && mutation.target?.dataset?.horizontalScrollEnhanced) {
    return false;
  }

  const target = mutation.target;
  if (target?.nodeType === Node.ELEMENT_NODE && target.closest('.horizontal-scroll-row')) {
    return false;
  }

  const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
  if (nodes.length && nodes.every(isEnhancerNode)) {
    return false;
  }

  return nodes.some(node => node.nodeType === Node.ELEMENT_NODE && !isEnhancerNode(node));
}

function updateArrows(wrapper, track, prev, next) {
  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
  const scrollLeft = track.scrollLeft;
  const canScroll = maxScroll > SCROLL_EDGE_THRESHOLD;

  wrapper.classList.toggle('horizontal-scroll-row--scrollable', canScroll);
  prev.disabled = !canScroll || scrollLeft <= SCROLL_EDGE_THRESHOLD;
  next.disabled = !canScroll || scrollLeft >= maxScroll - SCROLL_EDGE_THRESHOLD;
}

function scrollTrackBy(track, direction) {
  const delta = direction * Math.max(track.clientWidth * SCROLL_STEP_RATIO, 120);
  track.scrollTo({
    left: track.scrollLeft + delta,
    behavior: 'smooth',
  });
}

export function enhanceHorizontalScrollTrack(track, labels = {}) {
  if (!track || isAlreadyEnhanced(track)) return null;

  const prevLabel = labels.prevLabel || 'Scroll left';
  const nextLabel = labels.nextLabel || 'Scroll right';

  const wrapper = document.createElement('div');
  wrapper.className = 'horizontal-scroll-row';
  track.parentNode.insertBefore(wrapper, track);
  wrapper.appendChild(track);

  track.classList.add('horizontal-scroll-row__track');
  track.dataset.horizontalScrollEnhanced = 'true';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'horizontal-scroll-row__arrow horizontal-scroll-row__arrow--prev';
  prev.setAttribute('aria-label', prevLabel);
  prev.innerHTML = '<span aria-hidden="true">‹</span>';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'horizontal-scroll-row__arrow horizontal-scroll-row__arrow--next';
  next.setAttribute('aria-label', nextLabel);
  next.innerHTML = '<span aria-hidden="true">›</span>';

  wrapper.insertBefore(prev, track);
  wrapper.appendChild(next);

  const onScroll = () => updateArrows(wrapper, track, prev, next);

  const onPrevClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    scrollTrackBy(track, -1);
  };

  const onNextClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    scrollTrackBy(track, 1);
  };

  prev.addEventListener('click', onPrevClick);
  next.addEventListener('click', onNextClick);
  track.addEventListener('scroll', onScroll, { passive: true });

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => onScroll())
    : null;
  resizeObserver?.observe(track);
  Array.from(track.children).forEach(child => resizeObserver?.observe(child));

  requestAnimationFrame(() => {
    requestAnimationFrame(onScroll);
  });

  return () => {
    resizeObserver?.disconnect();
    track.removeEventListener('scroll', onScroll);
    prev.removeEventListener('click', onPrevClick);
    next.removeEventListener('click', onNextClick);

    delete track.dataset.horizontalScrollEnhanced;
    track.classList.remove('horizontal-scroll-row__track');

    if (wrapper.parentNode) {
      wrapper.parentNode.insertBefore(track, wrapper);
      wrapper.remove();
    }
  };
}

export function enhanceHorizontalScrollTargets(root, labels = {}) {
  const scope = root || document;
  const cleanups = [];

  scope.querySelectorAll(HORIZONTAL_SCROLL_SELECTORS).forEach((track) => {
    const cleanup = enhanceHorizontalScrollTrack(track, labels);
    if (cleanup) cleanups.push(cleanup);
  });

  return cleanups;
}

export function shouldRefreshHorizontalScroll(mutations) {
  return mutations.some(mutationIsRelevant);
}
