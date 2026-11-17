// The blue "portal" between the two versions of the site.
//
// Leaving: a blue circle grows out of the name's dot until it fills the screen,
// then the other page loads. Arriving: that page starts fully blue (set up by a
// few lines inline in its <head>) and only shrinks the circle away once it is
// ready to show, so there is never a blank flash in between.

const KEY = 'portal';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const warmed = new Set();

/** Ask the browser to fetch the other page's files early, so the switch is quick. */
export function warm(urls) {
  for (const href of urls) {
    if (warmed.has(href)) continue;
    warmed.add(href);
    const l = document.createElement('link');
    l.rel = href.endsWith('.js') ? 'modulepreload' : 'prefetch';
    l.href = href;
    document.head.append(l);
  }
}

/** Grow the circle from `from` (an element) and go to `href`. */
export function leave(from, href) {
  const r = from.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const cover = document.createElement('div');
  cover.className = 'portal-leave';
  Object.assign(cover.style, {
    position: 'fixed', inset: '0', zIndex: '9999', pointerEvents: 'none', background: '#1a74ff',
    clipPath: `circle(0px at ${x}px ${y}px)`, transition: 'clip-path .6s cubic-bezier(.6, 0, .2, 1)',
  });
  document.body.append(cover);
  cover.getBoundingClientRect();                     // commit the start state before animating
  cover.style.clipPath = `circle(150vmax at ${x}px ${y}px)`;
  try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode: just no arrival effect */ }
  setTimeout(() => { location.href = href; }, reduce ? 0 : 600);
}

/** On the new page, once it is ready: shrink the circle into the point (x, y). */
export function arrive(x, y) {
  const root = document.documentElement;
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  if (!root.classList.contains('portal-in')) return;
  root.style.setProperty('--px', `${x}px`);
  root.style.setProperty('--py', `${y}px`);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('portal-out')));
  setTimeout(() => root.classList.remove('portal-in', 'portal-out'), reduce ? 0 : 800);
}

// Coming back with the browser's Back button can restore the old page as it was
// left, still covered in blue; clear that.
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  document.querySelectorAll('.portal-leave').forEach((n) => n.remove());
  document.documentElement.classList.remove('portal-in', 'portal-out');
});
