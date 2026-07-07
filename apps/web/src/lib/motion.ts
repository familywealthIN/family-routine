import { animate } from 'motion/mini';
import { inView, stagger } from 'motion';

const REVEAL_OFFSET = '-10% 0px';
const REVEAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// If the observer hasn't fired for an element within this window (e.g.,
// because the user never scrolled there, or because a screenshot/crawler
// captured the page without exercising IntersectionObserver), force it
// visible. Keeps the marketing site from ever showing blank sections.
const FALLBACK_REVEAL_MS = 1200;

function markVisible(el: Element) {
  el.classList.add('is-visible');
}

function inViewportRoughly(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight * 1.1 && rect.bottom > 0;
}

function revealNow(el: HTMLElement, delay = 0) {
  animate(
    el,
    { opacity: [0, 1], transform: ['translateY(24px)', 'translateY(0)'] },
    { duration: 0.7, delay, ease: REVEAL_EASE }
  );
  markVisible(el);
}

function init() {
  document.documentElement.classList.add('js-ready');

  // Phase 1 — reveal anything already visible on page load (hero, etc.)
  // so first paint has motion immediately.
  const reveals = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  reveals.forEach((el) => {
    if (inViewportRoughly(el)) {
      revealNow(el);
    } else {
      inView(el, () => revealNow(el), { margin: REVEAL_OFFSET });
    }
  });

  // Phase 1b — same for grouped (staggered) reveals.
  document.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
    const items = Array.from(group.querySelectorAll<HTMLElement>('[data-reveal-item]'));
    if (items.length === 0) return;

    const runStagger = () => {
      animate(
        items,
        { opacity: [0, 1], transform: ['translateY(20px)', 'translateY(0)'] },
        { duration: 0.6, delay: stagger(0.08), ease: REVEAL_EASE }
      );
      items.forEach(markVisible);
    };

    if (inViewportRoughly(group)) {
      runStagger();
    } else {
      inView(group, runStagger, { margin: REVEAL_OFFSET });
    }
  });

  // Phase 2 — safety net. If something still hasn't been revealed after
  // the fallback window (no scroll, headless screenshot, slow IO), force
  // it visible without an animation.
  window.setTimeout(() => {
    document
      .querySelectorAll('[data-reveal]:not(.is-visible), [data-reveal-item]:not(.is-visible)')
      .forEach(markVisible);
  }, FALLBACK_REVEAL_MS);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

document.addEventListener('astro:page-load', init);
