// Minimal one-pager. Reads the same project data, models and photos as the
// main site (../js, ../assets) so there is one source of truth.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { projects, contact } from '../js/projects.js';
import { buildModel, loadGlb, createMaterials } from '../js/models.js';
import { makeEnvCanvas } from '../js/sky.js';
import { warm, leave, arrive } from '../js/portal.js';

const $ = (s) => document.querySelector(s);
const h = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const asset = (p) => (p && !/^(https?:|\.\.\/|\/|data:)/.test(p) ? `../${p}` : p);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pad = (n) => String(n).padStart(2, '0');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = matchMedia('(max-width: 860px)');

// short tab labels; anything not listed uses its full name
const SHORT = {
  'Open Return Wind Tunnel': 'Open-Return Tunnel',
  'Modular Cart Mounted Wind Tunnel': 'Closed-Return Tunnel',
  '6 Degree of Freedom Space Mouse': '6DoF Space Mouse',
  'Waterloo Rocketry': 'Rocketry',
  'About Me': 'About',
};
// even shorter labels for narrow laptop screens
const TINY = { 'Open Return Wind Tunnel': 'Open-Return', 'Modular Cart Mounted Wind Tunnel': 'Closed-Return', '6 Degree of Freedom Space Mouse': 'Space Mouse' };

// projects first (what a reviewer came for), About last
const about = projects.find((p) => p.model === 'avatar');
const work = projects.filter((p) => p !== about);
const entries = [...work, about].filter(Boolean);
let current = -1;

/* ── identity + tabs ────────────────────────────────────── */
{
  const seen = new Set();
  for (const c of contact) {
    const label = c.user ? 'Email' : c.label === 'linkedin' ? 'LinkedIn' : c.label === 'github' ? 'GitHub' : c.text;
    if (seen.has(label)) continue;                // one email link is enough here
    seen.add(label);
    const a = h('a', label);
    a.href = c.user ? `mailto:${c.user}@${c.domain}` : c.href;
    if (!c.user) { a.target = '_blank'; a.rel = 'noopener'; }
    $('#contact').append(a);
  }

  const tabs = $('#tabs');
  tabs.setAttribute('role', 'tablist');
  entries.forEach((p, i) => {
    const b = h('button');
    b.setAttribute('role', 'tab');
    if (p !== about) b.append(h('span', pad(i + 1), 'n'));
    const label = SHORT[p.name] || p.name;
    b.append(h('span', label, 'long'), h('span', TINY[p.name] || label, 'tiny'));
    b.setAttribute('aria-label', p.name);
    b.addEventListener('click', () => show(i));
    tabs.append(b);
  });
  $('#prev').addEventListener('click', () => show(current - 1));
  $('#next').addEventListener('click', () => show(current + 1));
}

/* ── text quarter ───────────────────────────────────────── */
function renderText(p) {
  const kids = [h('h2', p.name), h('p', p.blurb, 'blurb')];

  // one line of facts: date · role · status · repo
  const facts = h('p', null, 'facts');
  const rows = (p.rows || []).filter(([, v]) => !(v && v.action));
  rows.forEach(([k, v], i) => {
    if (i) facts.append(h('span', '·', 'sep'));
    if (v && v.href) {
      const a = h('a', 'GitHub ↗');
      a.href = v.href; a.target = '_blank'; a.rel = 'noopener';
      facts.append(a);
    } else if (k === 'status') {
      facts.append(h('span', v, 'status'));
    } else {
      facts.append(h('span', v));
    }
  });
  if (rows.length) kids.push(facts);

  if (p.overview && p.overview.length) {
    const ul = h('ul', null, 'points');
    let last = null;
    for (const item of p.overview) {
      if (Array.isArray(item)) {
        const sub = h('ul');
        sub.append(...item.map((t) => h('li', t)));
        (last || ul).append(sub);
      } else {
        last = h('li', item);
        ul.append(last);
      }
    }
    kids.push(ul);
  }

  if (p.tools && p.tools.length) kids.push(h('p', p.tools.join(' · '), 'tools'));

  $('#text').replaceChildren(...kids);
  $('#text').scrollTop = 0;
}

/* ── right half: gallery, or skills + record for About ─── */
let gallery = [];          // what the lightbox steps through for the current tab

function tile(g, i, label) {
  const fig = h('figure', null, 'tile');
  fig.dataset.ar = g.ar || 4 / 3;                 // replaced by the real shape once loaded
  const btn = h('button', null, 'frame');
  btn.type = 'button';
  const video = g.type === 'video';
  btn.setAttribute('aria-label', `${video ? 'Play video' : 'Enlarge image'}: ${g.alt || label}`);
  const setAr = (w, hgt) => {
    if (!w || !hgt) return;
    fig.dataset.ar = w / hgt;
    g.ar = w / hgt;
    const grid = fig.closest('.gallery');
    if (grid) layout(grid);
  };
  if (video && !reduceMotion) {
    // videos play silently on a loop right in the tile
    const v = h('video');
    Object.assign(v, { src: g.src, poster: g.thumb || '', muted: true, loop: true, autoplay: true, playsInline: true, preload: 'auto' });
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.addEventListener('loadedmetadata', () => setAr(v.videoWidth, v.videoHeight));
    btn.append(v);
  } else {
    const img = h('img');
    img.alt = g.alt || ''; img.decoding = 'async';
    img.addEventListener('load', () => setAr(img.naturalWidth, img.naturalHeight));
    img.src = g.thumb || g.src;
    btn.append(img);
    if (video) btn.append(h('span', null, 'play'));
  }
  if (g.caption) btn.append(h('span', g.caption, 'cap'));
  if (g.pdf) btn.append(h('span', 'PDF', 'badge'));
  btn.addEventListener('click', () => openLightbox(i));
  fig.append(btn);
  return fig;
}

/* Justified layout: every photo keeps its own shape (nothing cropped). Tries
   every row count, scales the result down to fit the pane, and keeps the
   arrangement where the photos come out largest. */
const GAP = 6;
function layout(grid) {
  const tiles = [...grid.children];
  if (!tiles.length) return;
  const W = grid.clientWidth;
  // phones: aim for roughly one screen of photos instead of one long column
  const H = narrow.matches ? W * 1.45 : grid.clientHeight;
  if (!W || !H) return;
  const ar = tiles.map((t) => +t.dataset.ar || 4 / 3);
  let best = null;
  for (let k = 1; k <= tiles.length; k++) {
    // split into k consecutive rows of roughly equal total width
    const total = ar.reduce((a, b) => a + b, 0), rows = [];
    let row = [], acc = 0;
    ar.forEach((a, i) => {
      const left = tiles.length - i, need = k - rows.length - 1;
      row.push(i); acc += a;
      if (rows.length < k - 1 && (acc >= total / k || left - 1 === need)) { rows.push(row); row = []; acc = 0; }
    });
    if (row.length) rows.push(row);
    if (rows.length !== k) continue;
    const heights = rows.map((r) => (W - GAP * (r.length - 1)) / r.reduce((s, i) => s + ar[i], 0));
    const tall = heights.reduce((a, b) => a + b, 0) + GAP * (k - 1);
    const s = Math.min(1, H / tall);
    const area = rows.reduce((sum, r, ri) => sum + r.reduce((x, i) => x + (heights[ri] * s) ** 2 * ar[i], 0), 0);
    if (!best || area > best.area) best = { rows, heights, s, tall, area };
  }
  if (!best) return;
  const { rows, heights, s, tall } = best;
  let y = 0;
  rows.forEach((r, ri) => {
    const hgt = heights[ri] * s;
    const rowW = r.reduce((x, i) => x + ar[i] * hgt, 0) + GAP * (r.length - 1);
    let x = (W - rowW) / 2;
    for (const i of r) {
      const w = ar[i] * hgt;
      Object.assign(tiles[i].style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${hgt}px` });
      x += w + GAP;
    }
    y += hgt + GAP;
  });
  grid.style.height = narrow.matches ? `${tall * s}px` : '';
}
new ResizeObserver(() => { const g = $('#side .gallery'); if (g) layout(g); }).observe($('#side'));

const prep = (g) => ({ ...g, src: asset(g.src), thumb: asset(g.thumb), pdf: asset(g.pdf) });

function renderSide(p) {
  const pane = $('#side');

  if (p === about) {
    gallery = [];
    const kids = [];
    for (const [title, items] of p.sections || []) {
      const block = h('section', null, 'block');
      block.append(h('h3', title, 'label'));
      for (const it of items) {
        const e = h('div', null, 'entry'), body = h('div', null, 'body'), head = h('div', null, 'head');
        head.append(h('strong', it.title), h('span', it.date, 'date'));
        body.append(head);
        if (it.org) body.append(h('em', it.org));
        if (it.text) body.append(h('p', it.text));
        e.append(body);
        if (it.photos && it.photos.length) {        // photos sit beside the entry they belong to
          e.classList.add('has-shots');
          const row = h('div', null, 'shots');
          for (const ph of it.photos) {
            const g = prep(ph);
            row.append(tile(g, gallery.length, it.title));
            gallery.push(g);
          }
          e.append(row);
        }
        block.append(e);
      }
      kids.push(block);
    }
    pane.replaceChildren(...kids);
    pane.scrollTop = 0;
    return;
  }

  gallery = (p.gallery || []).map(prep);
  const grid = h('div', null, 'gallery');
  gallery.forEach((g, i) => grid.append(tile(g, i, p.name)));
  pane.replaceChildren(gallery.length ? grid : h('p', 'Photos coming soon.', 'empty'));
  pane.scrollTop = 0;
  if (gallery.length) requestAnimationFrame(() => layout(grid));
}

/* ── lightbox ───────────────────────────────────────────── */
const lb = $('#lb'), lbImg = $('#lb-img'), lbVideo = $('#lb-video');
let lbIndex = 0;

function openLightbox(i) {
  lbIndex = (i + gallery.length) % gallery.length;
  const g = gallery[lbIndex];
  const video = g.type === 'video';
  lbImg.hidden = video; lbVideo.hidden = !video;
  if (video) { lbVideo.poster = g.thumb || ''; lbVideo.src = g.src; lbVideo.loop = true; lbVideo.play().catch(() => {}); }
  else { lbVideo.pause(); lbVideo.removeAttribute('src'); lbImg.src = g.src; lbImg.alt = g.alt || ''; }
  $('#lb-cap').textContent = g.caption || '';
  $('#lb-count').textContent = gallery.length > 1 ? `${lbIndex + 1} / ${gallery.length}` : '';
  $('#lb-prev').hidden = $('#lb-next').hidden = gallery.length < 2;
  const pdf = $('#lb-pdf');
  pdf.hidden = !g.pdf;
  if (g.pdf) pdf.href = g.pdf;
  if (!lb.open) lb.showModal();
}
$('#lb-prev').addEventListener('click', () => openLightbox(lbIndex - 1));
$('#lb-next').addEventListener('click', () => openLightbox(lbIndex + 1));
$('#lb-close').addEventListener('click', () => lb.close());
lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
lb.addEventListener('close', () => { lbVideo.pause(); lbVideo.removeAttribute('src'); lbVideo.load(); });

// browsers pause muted loops while the tab is hidden; nudge them when it comes back
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) document.querySelectorAll('.tile video').forEach((v) => v.play().catch(() => {}));
});

/* ── model quarter ──────────────────────────────────────── */
const stage = $('#stage'), canvas = $('#gl');
let renderer, scene, camera, controls, M;
const models = new Map();          // loaded once, then reused
let shown = null, token = 0, idle;

try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0, 0);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  const env = new THREE.CanvasTexture(makeEnvCanvas());
  env.mapping = THREE.EquirectangularReflectionMapping; env.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(env).texture;
  env.dispose(); pmrem.dispose();
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 6, 5);
  scene.add(sun);

  M = createMaterials();
  M.edge.opacity = 0.35;

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false; controls.minDistance = 2.2; controls.maxDistance = 9;
  controls.autoRotate = !reduceMotion; controls.autoRotateSpeed = 1.4;
  controls.addEventListener('start', () => { clearTimeout(idle); controls.autoRotate = false; });
  controls.addEventListener('end', () => { idle = setTimeout(() => { controls.autoRotate = !reduceMotion; }, 4000); });

  new ResizeObserver(fit).observe(stage);
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
} catch {
  stage.querySelector('.stage-label').textContent = '3D view unavailable on this device';
}

function resetView() {
  const d = 4.4 * Math.max(1, 1.35 / (camera.aspect || 1));   // pull back on tall, narrow panes
  camera.position.set(0, d * 0.22, d);
  controls.target.set(0, 0, 0);
  controls.update();
}

function fit() {
  const { width, height } = stage.getBoundingClientRect();
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (!shown) resetView();
}

// a project can offer several models (e.g. the assembly and its PCB)
const variantsOf = (p) => p.models || [{ label: null, glb: p.glb, model: p.model, tilt: p.tilt, scale: p.scale, logo: p.logo }];

function renderVariants(p, pick) {
  const box = $('#variants');
  const list = variantsOf(p);
  box.replaceChildren(...(list.length > 1 ? list.map((v, i) => {
    const b = h('button', v.label);
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(i === pick));
    b.addEventListener('click', () => { renderVariants(p, i); showModel(p, i); });
    return b;
  }) : []));
}

async function showModel(p, vi = 0) {
  if (!renderer) return;
  const my = ++token;
  if (shown) { scene.remove(shown); shown = null; }
  $('#note').textContent = p.modelNote || '';
  const v = variantsOf(p)[vi];
  const key = `${p.name}#${vi}`;
  let part = models.get(key);
  if (!part) {
    stage.classList.add('is-loading');
    try {
      if (v.glb) {
        part = await loadGlb(asset(v.glb), M, v.tilt);
        part.scale.setScalar(v.scale || 1);
      } else {
        part = buildModel(v.model, M, { logo: asset(v.logo) });
      }
    } catch (err) {
      console.error(err);
      part = buildModel(v.model || p.model, M, { logo: asset(v.logo) });
    }
    models.set(key, part);
  }
  if (my !== token) return;          // a newer pick happened while this one loaded
  stage.classList.remove('is-loading');
  scene.add(part);
  shown = part;
  resetView();
}

/* ── About: skills as bubbles in the model's place ─────── */
function renderSkills(p) {
  const kids = [h('h3', 'Skills', 'label')];
  for (const [label, chips] of p.toolGroups || []) {
    const group = h('div', null, 'group');
    const ul = h('ul', null, 'bubbles');
    ul.append(h('li', label, 'k'), ...chips.map((c) => h('li', c)));
    group.append(ul);
    kids.push(group);
  }
  $('#skills').replaceChildren(...kids);
}

/* ── switching projects ─────────────────────────────────── */
function show(i, push = true) {
  i = (i + entries.length) % entries.length;
  if (i === current) return;
  const dir = current < 0 ? 0 : Math.sign(i - current);
  current = i;
  const p = entries[i];
  document.querySelectorAll('#tabs button').forEach((b, j) => {
    b.setAttribute('aria-selected', String(j === i));
    if (j === i) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  $('#count').textContent = `${pad(i + 1)} / ${pad(entries.length)}`;
  renderText(p);
  renderSide(p);
  const isAbout = p === about;
  stage.hidden = isAbout;
  $('#skills').hidden = !isAbout;
  let ready = Promise.resolve();
  if (isAbout) {
    renderSkills(p);
    ++token;                                   // cancel a model that is still loading
  } else {
    renderVariants(p, 0);
    ready = showModel(p, 0);
  }
  if (dir && !reduceMotion) {
    for (const el of [$('#text'), $('#side')]) {
      el.animate([{ opacity: 0, transform: `translateY(${dir * 10}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.25,1)' });
    }
  }
  if (push) history.replaceState(null, '', `#${slug(p.name)}`);
  return ready;
}

/* ── scroll, swipe or arrow keys to move between projects ─ */
// A wheel gesture flips one project, unless it is scrolling a pane that still
// has room to scroll; the 3D view keeps the wheel for zoom.
let wheelAcc = 0, wheelLock = false, wheelQuiet;
addEventListener('wheel', (e) => {
  if (lb.open || narrow.matches || e.target.closest('#stage')) return;
  const pane = e.target.closest('.pane');
  if (pane && pane.scrollHeight > pane.clientHeight + 2) {
    const atTop = pane.scrollTop <= 0, atEnd = pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 2;
    if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atEnd)) return;
  }
  e.preventDefault();
  clearTimeout(wheelQuiet);
  wheelQuiet = setTimeout(() => { wheelLock = false; wheelAcc = 0; }, 260);   // gesture over
  if (wheelLock) return;
  const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  wheelAcc += e.deltaMode === 1 ? d * 33 : d;
  if (Math.abs(wheelAcc) >= 50) { show(current + Math.sign(wheelAcc)); wheelLock = true; wheelAcc = 0; }
}, { passive: false });

// horizontal swipe anywhere except the 3D view
let touch = null;
addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1 || e.target.closest('#stage') || lb.open) { touch = null; return; }
  touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
addEventListener('touchend', (e) => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
}, { passive: true });

addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (lb.open) {
    if (e.key === 'ArrowRight') openLightbox(lbIndex + 1);
    if (e.key === 'ArrowLeft') openLightbox(lbIndex - 1);
    return;
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { show(current + 1); e.preventDefault(); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { show(current - 1); e.preventDefault(); }
});

const start = entries.findIndex((p) => `#${slug(p.name)}` === location.hash);
const firstReady = show(start >= 0 ? start : 0, false);
// if we came through the portal, open it once the first model is in (or after 1.5 s at most)
Promise.race([firstReady, new Promise((r) => setTimeout(r, 1500))])
  .then(() => document.fonts.ready)
  .then(() => { const r = $('#egg').getBoundingClientRect(); arrive(r.left + r.width / 2, r.top + r.height / 2); });
// links to a project (#waterloo-rocketry) also work once the page is open
addEventListener('hashchange', () => {
  const i = entries.findIndex((p) => `#${slug(p.name)}` === location.hash);
  if (i >= 0) show(i, false);
});

/* ── easter egg: the blue dot opens the full experience ── */
const FULL = ['../', '../css/style.css', '../js/main.js', '../js/harmonograph.js', '../js/audio.js', '../js/sky.js', '../assets/models/modular-tunnel.glb'];
const egg = $('#egg');
for (const t of ['pointerenter', 'focus', 'touchstart']) egg.addEventListener(t, () => warm(FULL), { passive: true });
setTimeout(() => warm(FULL), 5000);               // and anyway once the page has settled
egg.addEventListener('click', () => leave(egg, '../'));

/* ── light / dark, opened as a circle from the button ──── */
const themeBtn = $('#theme');
let dark = document.documentElement.dataset.theme === 'dark';
function applyTheme(save = true) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeBtn.setAttribute('aria-pressed', String(dark));
  themeBtn.setAttribute('aria-label', dark ? 'Light mode' : 'Dark mode');
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0b0d12' : '#fafafa';
  if (M) M.edge.color.set(dark ? 0x9cc4ff : 0x0b2a6b);
  // only remember a theme the visitor picked themselves
  if (save) { try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* private mode */ } }
}
if (dark) applyTheme(false);
// no choice made on this site yet → follow the device's light/dark setting, live
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const chosen = () => { try { return localStorage.getItem('theme'); } catch { return null; } };
systemDark.addEventListener('change', (e) => {
  if (chosen()) return;
  dark = e.matches;
  applyTheme(false);
});

themeBtn.addEventListener('click', () => {
  dark = !dark;
  const r = themeBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const root = document.documentElement.style;
  root.setProperty('--tx', `${x}px`);
  root.setProperty('--ty', `${y}px`);
  root.setProperty('--tr', `${Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)))}px`);
  if (!document.startViewTransition || reduceMotion) { applyTheme(); return; }
  document.startViewTransition(() => { applyTheme(); if (renderer) renderer.render(scene, camera); });
});
