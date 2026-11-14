import * as THREE from 'three';
import { projects, contact } from './projects.js';
import { buildModel, loadGlb, createMaterials } from './models.js';
import { Harmonograph } from './harmonograph.js';
import { makeCloudTile, makeGrain, makeEnvCanvas } from './sky.js';
import { Sound } from './audio.js';

const $ = (s) => document.querySelector(s);
const sound = new Sound();
const TAU = Math.PI * 2;
const n = projects.length;
const R = 4.2;                 // carousel radius
const SLOTS = Math.max(n, 6);  // angular spacing never gets wider than a 6-item ring
const FOV = 34;
const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const noHover = matchMedia('(hover: none)').matches;
const motion = reduceMotion ? 0.15 : 1;

// modest hardware starts at a lower render resolution and skips the costly glass blur;
// the frame loop also steps resolution down on its own if frames run slow
const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
let pixelRatio = Math.min(devicePixelRatio || 1, lowEnd ? 1.5 : 2);
if (lowEnd) document.body.classList.add('lite');
if (noHover) {
  $('#p-cta').textContent = 'tap to open';
  $('.hint').lastChild.textContent = 'tap to open';
  $('.hint').childNodes[1].textContent = 'swipe to spin';
}

const mod = (a, m) => ((a % m) + m) % m;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const ease = (t) => t * t * (3 - 2 * t);
const h = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

/* ── procedural textures for the CSS layers ─────────────── */
const rootStyle = document.documentElement.style;
rootStyle.setProperty('--clouds', `url(${makeCloudTile().toDataURL()})`);
rootStyle.setProperty('--grain', `url(${makeGrain().toDataURL()})`);

/* ── renderer / scene ───────────────────────────────────── */
const canvas = $('#gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  document.body.classList.add('failed');
  throw err;
}
renderer.setPixelRatio(pixelRatio);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf2f4f7, 10, 24);
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 300);

{
  const envTex = new THREE.CanvasTexture(makeEnvCanvas());
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose(); pmrem.dispose();
}
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(3, 6, 5);
scene.add(sun);

/* ── harmonograph background ────────────────────────────── */
const harmo = new Harmonograph();
scene.add(harmo.group);

/* ── carousel ───────────────────────────────────────────── */
const M = createMaterials();
const items = projects.map((p, i) => {
  // holder that the frame loop moves; the part itself goes inside it
  const obj = new THREE.Group();
  scene.add(obj);
  if (p.glb) {
    loadGlb(p.glb, M, p.tilt)
      .then((part) => { part.scale.setScalar(p.scale || 1); obj.add(part); })
      .catch((err) => { console.error(`Could not load ${p.glb}`, err); obj.add(buildModel(p.model, M)); });
  } else {
    obj.add(buildModel(p.model, M, { logo: p.logo }));
  }
  return { obj, spin: p.sway ? 0 : i * 0.9, yaw: 0, pitch: 0, w: 0, sx: 0, sy: 0, sr: 0, depth: 0, focus: 0 };
});

let floor, floorMat;
{ // orbit rings + slot ticks on the "floor"
  const mat = (floorMat = new THREE.LineBasicMaterial({ color: 0x0b2a6b, transparent: true, opacity: 0.3 }));
  floor = new THREE.Group();
  floor.position.set(0, -1.3, -R);
  floor.rotation.x = Math.PI / 2;
  for (const r of [R, R + 0.32]) {
    const pts = new THREE.Path().absarc(0, 0, r, 0, TAU).getSpacedPoints(200);
    floor.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
  const ticks = [];
  for (let i = 0; i < SLOTS * 6; i++) {
    const a = (i / (SLOTS * 6)) * TAU, r0 = R + 0.32, r1 = r0 + (i % 6 === 0 ? 0.28 : 0.1);
    ticks.push(new THREE.Vector3(r0 * Math.cos(a), r0 * Math.sin(a), 0), new THREE.Vector3(r1 * Math.cos(a), r1 * Math.sin(a), 0));
  }
  floor.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), mat));
  scene.add(floor);
}

/* ── state ──────────────────────────────────────────────── */
const state = {
  pos: 0, vel: 0, target: 0,     // carousel rotation, in item units
  detail: false, d: 0, sel: 0,   // detail view + its tween
  hover: false, hoverT: 0,
  drag: null,
};
const pointer = { x: -1, y: -1, inside: false, nx: 0, ny: 0, sx: 0, sy: 0 };
let W = 1, H = 1, aspect = 1, fit = 1, boost = 1, detailScale = 1.7;
const detailPos = new THREE.Vector3();
const tmp = new THREE.Vector3();
const carPos = new THREE.Vector3();

const currentIndex = () => mod(Math.round(state.target), n);

/* ── DOM refs ───────────────────────────────────────────── */
const el = {
  pName: $('#p-name'), pBlurb: $('#p-blurb'),
  detail: $('#detail'), dTitle: $('#d-title'), dBlurb: $('#d-blurb'), dMeta: $('#d-meta'),
  dOverviewTitle: $('#d-overview-title'), dOverview: $('#d-overview'),
  dToolsSection: $('#d-tools-section'), dToolsTitle: $('#d-tools-title'), dTools: $('#d-tools'),
  dGallerySection: $('#d-gallery-section'), dGallery: $('#d-gallery'), dScroll: $('#d-scroll'),
  lightbox: $('#lightbox'), lightboxImg: $('#lightbox-img'), lightboxCaption: $('#lightbox-caption'), lightboxVideo: $('#lightbox-video'),
  dOverviewSection: $('#d-overview-section'), dLinksSection: $('#d-links-section'), dLinksTitle: $('#d-links-title'), dLinks: $('#d-links'),
};
const parallax = [...document.querySelectorAll('[data-depth]')].map((e) => ({ e, depth: +e.dataset.depth }));

function syncIndex() {
  const p = projects[currentIndex()];
  el.pName.textContent = p.name;
  el.pBlurb.textContent = p.blurb;
}

const GALLERY_SLOTS = 0;      // set above 0 to pad short galleries with empty placeholders

function fillDetail(i) {
  const p = projects[i];
  el.dTitle.textContent = p.name;
  el.dBlurb.textContent = p.blurb;

  const rows = p.rows || [['date', p.date], ['role', p.role], ['status', p.status]];
  el.dMeta.replaceChildren(...rows.map(([k, v]) => {
    const d = h('div'), dd = h('dd');
    if (v && v.action === 'contact') {       // a row can open the contact pop-up
      const b = h('button', v.label, 'rowlink');
      b.type = 'button';
      b.addEventListener('click', openContact);
      dd.append(b);
    } else if (v && v.href) {                // …or be a link: { label, href }
      const a = h('a', v.label);
      a.href = v.href; a.target = '_blank'; a.rel = 'noopener';
      dd.append(a);
    } else dd.textContent = v;
    d.append(h('dt', k), dd);
    return d;
  }));
  $('#model-note').textContent = p.modelNote || '';

  el.dOverviewSection.hidden = !(p.overview && p.overview.length);
  el.dOverviewTitle.textContent = p.overviewTitle || 'overview';
  // overview entries: a string is a paragraph, an array is a bulleted list
  el.dOverview.replaceChildren(...(p.overview || []).map((t) => {
    if (!Array.isArray(t)) return h('p', t);
    const ul = h('ul');
    ul.append(...t.map((item) => h('li', item)));
    return ul;
  }));

  // chips: a flat list, or groups that each start with a label
  const groups = p.toolGroups || (p.tools && p.tools.length ? [[null, p.tools]] : []);
  el.dToolsSection.hidden = !groups.length;
  el.dToolsTitle.textContent = p.toolsTitle || 'tools';
  el.dTools.replaceChildren(...groups.flatMap(([label, chips]) => [
    ...(label ? [h('li', label, 'group')] : []),
    ...chips.map((t) => h('li', t)),
  ]));

  // extra bulleted sections (awards, leadership, …)
  $('#d-extra').replaceChildren(...(p.sections || []).map(([title, items]) => {
    // résumé-style entries: name + date on one line, organisation in italics, then the detail
    const sec = h('section'), ul = h('ul', null, 'entries');
    ul.append(...items.map((it) => {
      const li = h('li'), head = h('div', null, 'head');
      head.append(h('strong', it.title), h('span', it.date, 'date'));
      li.append(head);
      if (it.org) li.append(h('em', it.org));
      if (it.text) li.append(h('p', it.text));
      return li;
    }));
    sec.append(h('h3', title), ul);
    return sec;
  }));

  el.dLinksSection.hidden = !(p.links && p.links.length);
  el.dLinksTitle.textContent = p.linksTitle || 'links';
  el.dLinks.replaceChildren(...(p.links || []).map((l) => {
    if (l.action === 'contact') {
      const b = h('button', l.label, 'pill');
      b.type = 'button';
      b.addEventListener('click', openContact);
      return b;
    }
    const a = h('a', l.label, 'pill');
    a.href = l.href;
    if (!l.href.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }));

  el.dGallerySection.hidden = !p.gallery;
  if (p.gallery) {
    const cells = p.gallery.map((img) => {
      const b = h('button', null, 'shot');
      b.type = 'button';
      const isVideo = img.type === 'video';
      b.setAttribute('aria-label', `${isVideo ? 'Play video' : 'Enlarge image'}: ${img.alt || p.name}`);
      const im = h('img');
      im.src = img.thumb || img.src; im.alt = img.alt || ''; im.loading = 'lazy';
      b.append(im);
      if (isVideo) b.append(h('span', null, 'play'));
      b.addEventListener('click', () => openLightbox(img));
      return b;
    });
    while (cells.length < GALLERY_SLOTS) cells.push(h('div', 'image', 'ph'));
    el.dGallery.replaceChildren(...cells);
  }
  el.dScroll.scrollTop = 0;
}

// contact pop-up: addresses are joined here, at the moment of opening
function openContact() {
  $('#contact-list').replaceChildren(...contact.map((c) => {
    const row = h('div'), dd = h('dd');
    const text = c.user ? `${c.user}@${c.domain}` : c.text;
    const a = h('a', text);
    a.href = c.user ? `mailto:${text}` : c.href;
    if (!c.user) { a.target = '_blank'; a.rel = 'noopener'; }
    dd.append(a);
    row.append(h('dt', c.label), dd);
    return row;
  }));
  $('#contact').showModal();
  sound.open();
}
$('#btn-mail').addEventListener('click', openContact);
$('#contact').addEventListener('click', (e) => { if (e.target === $('#contact')) $('#contact').close(); });
$('#contact').addEventListener('close', () => sound.back());

function openLightbox(img) {
  const isVideo = img.type === 'video';
  el.lightboxImg.hidden = isVideo;
  el.lightboxVideo.hidden = !isVideo;
  if (isVideo) {
    el.lightboxVideo.poster = img.thumb || '';
    el.lightboxVideo.src = img.src;
  } else {
    el.lightboxImg.src = img.src;
    el.lightboxImg.alt = img.alt || '';
  }
  el.lightboxCaption.textContent = img.caption || '';
  el.lightboxCaption.hidden = !img.caption;
  el.lightbox.showModal();
  sound.click();
}
el.lightbox.addEventListener('close', () => { el.lightboxVideo.pause(); el.lightboxVideo.removeAttribute('src'); el.lightboxVideo.load(); });
// click the image or the backdrop to close
el.lightbox.addEventListener('click', (e) => { if (e.target === el.lightbox || e.target === el.lightboxImg) el.lightbox.close(); });

/* ── actions ────────────────────────────────────────────── */
function step(dir) {
  sound.move(dir);
  state.target = Math.round(state.target) + dir;
  if (state.detail) { state.sel = currentIndex(); fillDetail(state.sel); }
  syncIndex();
}

function openDetail() {
  if (state.detail) return;
  sound.open();
  state.target = Math.round(state.target);
  state.detail = true;
  state.sel = currentIndex();
  fillDetail(state.sel);
  document.body.classList.add('is-detail');
  document.body.classList.remove('is-hover');
  el.detail.inert = false;
  el.detail.setAttribute('aria-hidden', 'false');
  $('#d-back').focus({ preventScroll: true });
}

function closeDetail() {
  if (!state.detail) return;
  sound.back();
  state.detail = false;
  document.body.classList.remove('is-detail');
  el.detail.inert = true;
  el.detail.setAttribute('aria-hidden', 'true');
  canvas.focus({ preventScroll: true });
}

// which carousel item is under a screen point (front-most wins)
function pick(x, y) {
  let best = -1, bestDepth = Infinity;
  for (let i = 0; i < n; i++) {
    const it = items[i];
    if (it.focus < 0.02 || it.sr < 4) continue;
    if (Math.hypot(x - it.sx, y - it.sy) < it.sr && it.depth < bestDepth) { best = i; bestDepth = it.depth; }
  }
  return best;
}

/* ── input ──────────────────────────────────────────────── */
let wheelAcc = 0, wheelReset;
addEventListener('wheel', (e) => {
  if (state.detail || document.querySelector('dialog[open]')) return;         // let the panel scroll
  e.preventDefault();
  let d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (e.deltaMode === 1) d *= 33;
  if (Math.abs(d) >= 40) { step(Math.sign(d)); wheelAcc = 0; return; }   // mouse wheel notch
  wheelAcc += d;                                                         // trackpad: accumulate
  if (Math.abs(wheelAcc) >= 110) { step(Math.sign(wheelAcc)); wheelAcc = 0; }
  clearTimeout(wheelReset);
  wheelReset = setTimeout(() => { wheelAcc = 0; }, 220);
}, { passive: false });

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  canvas.setPointerCapture(e.pointerId);
  const it = items[state.sel];
  state.drag = { x: e.clientX, y: e.clientY, t0: state.target, yaw0: it.yaw, pitch0: it.pitch, moved: false };
});

canvas.addEventListener('pointermove', (e) => {
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.inside = true;
  pointer.nx = (e.clientX / W) * 2 - 1; pointer.ny = (e.clientY / H) * 2 - 1;
  const g = state.drag;
  if (!g) return;
  const dx = e.clientX - g.x, dy = e.clientY - g.y;
  if (!g.moved && Math.hypot(dx, dy) > 6) g.moved = true;
  if (!g.moved) return;
  if (state.detail) {
    const it = items[state.sel];
    it.yaw = g.yaw0 + dx * 0.01;
    it.pitch = THREE.MathUtils.clamp(g.pitch0 + dy * 0.008, -1.2, 1.2);
  } else {
    state.target = g.t0 - dx / Math.max(160, W * 0.2);
  }
});

function endDrag(e) {
  const g = state.drag;
  if (!g) return;
  state.drag = null;
  if (g.moved) {
    if (!state.detail) { state.target = Math.round(state.target); syncIndex(); }
    return;
  }
  if (intro.t < 1) return;
  if (state.detail) { closeDetail(); return; }          // a tap anywhere off the panel goes back
  const hit = pick(e.clientX, e.clientY);
  // a tap on a side part spins it to the front; a tap anywhere else opens the centre one
  if (hit < 0 || hit === currentIndex()) { openDetail(); return; }
  const rel = mod(hit - state.target + n / 2, n) - n / 2;   // spin the clicked part to the front
  state.target = Math.round(state.target + rel);
  sound.move(Math.sign(rel));
  syncIndex();
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', () => { state.drag = null; state.target = Math.round(state.target); });
canvas.addEventListener('pointerleave', () => { pointer.inside = false; });

addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]')) return;
  if (e.key === 'Escape') { closeDetail(); return; }
  if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
  else if ((e.key === 'Enter' || e.key === ' ') && !state.detail && (document.activeElement === canvas || document.activeElement === document.body)) {
    openDetail(); e.preventDefault();
  }
});

$('#btn-prev').addEventListener('click', () => step(-1));
$('#btn-next').addEventListener('click', () => step(1));
$('#btn-open').addEventListener('click', openDetail);
$('#d-back').addEventListener('click', closeDetail);
$('#d-prev').addEventListener('click', () => step(-1));
$('#d-next').addEventListener('click', () => step(1));
/* ── sound ──────────────────────────────────────────────── */
// audio may only start after a real click / tap / key press
for (const type of ['pointerdown', 'keydown', 'touchend']) addEventListener(type, () => sound.unlock(), { passive: true });

for (const b of document.querySelectorAll('.arrow, .orb, .pill')) {
  b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') sound.hover(); });
}
for (const b of document.querySelectorAll('a.orb')) b.addEventListener('click', () => sound.click());
el.dLinks.addEventListener('click', (e) => { if (e.target.closest('a')) sound.click(); });
el.lightbox.addEventListener('close', () => sound.back());

const channels = [
  { key: 'music', vol: () => sound.musicVol, muted: () => sound.musicMuted, set: (v) => sound.setMusic(v), mute: (on) => sound.muteMusic(on) },
  { key: 'sfx', vol: () => sound.sfxVol, muted: () => sound.sfxMuted, set: (v) => sound.setSfx(v), mute: (on) => sound.muteSfx(on) },
];
for (const ch of channels) {
  const input = $(`#vol-${ch.key}`), btn = $(`#mute-${ch.key}`), row = $(`#row-${ch.key}`);
  const paint = () => {
    input.style.setProperty('--fill', `${input.value * 100}%`);
    row.classList.toggle('is-muted', ch.muted());
    btn.setAttribute('aria-pressed', String(ch.muted()));
  };
  input.value = ch.vol(); paint();
  let lastTick = 0;
  input.addEventListener('input', () => {
    ch.set(+input.value); paint();
    const now = performance.now();
    if (ch.key === 'sfx' && now - lastTick > 70) { lastTick = now; sound.tick(); }
  });
  btn.addEventListener('click', () => {            // the icon toggles mute
    ch.mute(!ch.muted()); paint();
    sound.click();
  });
}

/* ── theme ──────────────────────────────────────────────── */
const themeBtn = $('#btn-theme');
let dark = document.documentElement.dataset.theme === 'dark';

function applyTheme() {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeBtn.setAttribute('aria-pressed', String(dark));
  themeBtn.setAttribute('aria-label', dark ? 'Light mode' : 'Dark mode');
  document.querySelector('meta[name="theme-color"]').content = dark ? '#060a13' : '#f2f4f7';
  scene.fog.color.set(dark ? 0x060a13 : 0xf2f4f7);
  M.edge.color.set(dark ? 0x9cc4ff : 0x0b2a6b);
  floorMat.color.set(dark ? 0x8fb4ee : 0x0b2a6b);
  harmo.setTheme(dark);
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* private mode */ }
}
if (dark) applyTheme();

themeBtn.addEventListener('click', () => {
  dark = !dark;
  sound.click();
  // the new theme opens as a circle growing out of the button
  const r = themeBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  rootStyle.setProperty('--px', `${x}px`);
  rootStyle.setProperty('--py', `${y}px`);
  rootStyle.setProperty('--pr', `${Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)))}px`);
  if (!document.startViewTransition || reduceMotion) { applyTheme(); return; }
  document.startViewTransition(() => { applyTheme(); renderer.render(scene, camera); });
});

/* ── launch animation ───────────────────────────────────── */
// ring whirls, parts spin fast, camera pulls back — all easing out together
const intro = { t: reduceMotion ? 1 : 0, dur: 3.4, k: reduceMotion ? 0 : 1, shown: false };
const INTRO_TURNS = 1.25;      // ring revolutions
const INTRO_SPINS = 3;         // extra turns of each part
const INTRO_ZOOM = 0.4;        // camera starts at 40% of its final distance

/* ── layout ─────────────────────────────────────────────── */
const camBase = new THREE.Vector3();
function placeCamera(zoom) {
  camera.position.copy(camBase).multiplyScalar(zoom);
  camera.lookAt(0, -0.25, 0);
  camera.updateMatrixWorld();
}

function resize() {
  W = innerWidth; H = innerHeight; aspect = W / H;
  renderer.setSize(W, H, false);

  // pull the camera back on narrow screens so the ring still fits
  fit = Math.max(1, 1.3 / aspect);
  boost = 1 + (fit - 1) * 0.55;
  camera.aspect = aspect;
  camBase.set(0, 2.5 * fit, 9.2 * fit);
  camera.updateProjectionMatrix();
  placeCamera(1);

  const dist = camBase.length();
  scene.fog.near = dist + 1.5;
  scene.fog.far = dist + R * 2 + 5;

  harmo.group.position.set(2.0 * fit, 1.6 * fit, -15);
  harmo.group.scale.setScalar(6.4 * fit);

  // where the front slot lands on screen → reticle, prompt, arrows
  tmp.set(0, 0, 0).applyMatrix4(camera.matrixWorldInverse);
  const ppu = (H / 2) / (-tmp.z * tanHalf);
  const cx = W / 2 + tmp.x * ppu, cy = H / 2 - tmp.y * ppu;
  rootStyle.setProperty('--cx', `${cx.toFixed(1)}px`);
  rootStyle.setProperty('--cy', `${cy.toFixed(1)}px`);
  rootStyle.setProperty('--cr', `${(1.0 * boost * ppu).toFixed(1)}px`);

  // where the selected part sits in the detail view
  const portrait = aspect < 1.05;
  const ndcZ = tmp.set(0, 0, 0).project(camera).z;
  detailPos.set(portrait ? 0 : -0.42, portrait ? 0.52 : -0.06, ndcZ).unproject(camera);
  detailScale = portrait ? 0.95 * fit : 1.45;

  // dock silhouette: a raised centre plateau for the link buttons,
  // drawn in real pixels so the curves never stretch
  const dh = $('.dock').offsetHeight, top = 12, low = Math.round(dh * 0.56);
  const half = Math.min(150, W * 0.3), cw = Math.min(130, W * 0.17), k = cw * 0.5;
  const a = W / 2 - half - cw, b = W / 2 - half, c = W / 2 + half, d = W / 2 + half + cw;
  const edge = `M0,${low} L${a},${low} C${a + k},${low} ${b - k},${top} ${b},${top} L${c},${top} C${c + k},${top} ${d - k},${low} ${d},${low} L${W},${low}`;
  $('#dock-bg').setAttribute('viewBox', `0 0 ${W} ${dh}`);
  $('#dock-edge').setAttribute('d', edge);
  $('#dock-fill').setAttribute('d', `${edge} L${W},${dh} L0,${dh} Z`);
  if (intro.t < 1) placeCamera(lerp(INTRO_ZOOM, 1, 1 - intro.k));
}
addEventListener('resize', resize);
resize();
syncIndex();

/* ── frame loop ─────────────────────────────────────────── */
let last = performance.now() / 1000, clock = 0;
const perf = { sum: 0, n: 0 };

function frame(nowMs) {
  const now = nowMs / 1000;
  const raw = now - last;
  const dt = Math.min(0.05, Math.max(0, raw));
  if (raw > 0 && raw < 0.25) {                      // ignore tab-switch gaps
    perf.sum += raw;
    if (++perf.n >= 45) {
      // averaging under ~40 fps → render fewer pixels and drop the blur
      if (perf.sum / perf.n > 0.025 && pixelRatio > 1) {
        pixelRatio = Math.max(1, pixelRatio - 0.25);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(W, H, false);
        document.body.classList.add('lite');
      }
      perf.sum = 0; perf.n = 0;
    }
  }
  last = now; clock += dt * motion;

  // carousel: slightly under-damped spring → a small Wii-style overshoot
  if (intro.t < 1) {
    intro.t = Math.min(1, intro.t + dt / intro.dur);
    const e = 1 - Math.pow(1 - intro.t, 4);
    intro.k = 1 - e;
    state.pos = state.target - intro.k * n * INTRO_TURNS;
    state.vel = 0;
    placeCamera(lerp(INTRO_ZOOM, 1, e));
  } else {
    state.vel += ((state.target - state.pos) * 95 - state.vel * 15) * dt;
    state.pos += state.vel * dt;
  }
  if (!intro.shown && intro.t > 0.62) {      // parts are easing home → bring in name + dock
    intro.shown = true;
    document.body.classList.add('intro-done');
  }
  const settled = Math.abs(state.target - state.pos) < 0.22;

  state.d = damp(state.d, state.detail ? 1 : 0, 6.5, dt);
  const dE = ease(state.d);
  const cur = currentIndex();

  pointer.sx = damp(pointer.sx, pointer.inside ? pointer.nx : 0, 4, dt);
  pointer.sy = damp(pointer.sy, pointer.inside ? pointer.ny : 0, 4, dt);

  state.hoverT = damp(state.hoverT, state.hover ? 1 : 0, 10, dt);

  for (let i = 0; i < n; i++) {
    const it = items[i];
    const rel = mod(i - state.pos + n / 2, n) - n / 2;
    const th = (rel * TAU) / SLOTS;
    // with few items the ring is not full: fade a part out at the back before it wraps round
    const wrapFade = n < SLOTS ? 1 - ease(Math.min(1, Math.max(0, (Math.abs(rel) - (n / 2 - 0.5)) / 0.5))) : 1;
    const focus = Math.pow(Math.max(0, Math.cos(th)), 2.2);
    const bob = Math.sin(clock * 0.9 + i * 1.9) * 0.09;

    carPos.set(R * Math.sin(th), bob, R * Math.cos(th) - R - 6 * dE);
    let s = (0.6 + 0.6 * focus) * boost * (1 - dE) * wrapFade;
    if (i === cur) s *= 1 + 0.07 * state.hoverT;

    const isSel = state.detail && i === state.sel;
    it.w = damp(it.w, isSel ? 1 : 0, 6.5, dt);
    const wE = ease(it.w);
    it.obj.position.lerpVectors(carPos, detailPos, wE);
    it.obj.position.y += bob * 0.5 * wE;
    const sc = lerp(s, detailScale, wE);
    it.obj.scale.setScalar(Math.max(sc, 0.0001));
    it.obj.visible = sc > 0.004;

    const dragging = isSel && state.drag && state.drag.moved;
    if (!dragging) it.spin += dt * motion * (0.3 + 0.45 * focus + (i === cur ? 0.5 * state.hoverT : 0));
    if (!isSel) it.pitch = damp(it.pitch, 0, 5, dt);
    const lean = i === cur && !state.detail ? pointer.sy * 0.14 : 0;
    // flat badges (the about-me avatar) rock side to side instead of turning their back
    const turn = projects[i].sway ? Math.sin(it.spin) * 0.6 : it.spin;
    it.obj.rotation.set(it.pitch + lean, turn + it.yaw + intro.k * TAU * INTRO_SPINS, 0);

    // screen-space footprint for hit testing
    tmp.copy(it.obj.position).applyMatrix4(camera.matrixWorldInverse);
    const depth = -tmp.z, ppu = (H / 2) / (depth * tanHalf);
    it.sx = W / 2 + tmp.x * ppu; it.sy = H / 2 - tmp.y * ppu;
    it.sr = sc * ppu * 0.85; it.depth = depth; it.focus = focus;
  }

  // the floor ring turns with the parts, so it whirls with them at launch
  floor.rotation.z = (state.pos * TAU) / SLOTS;

  // hover: only the settled front part prompts
  const canPoint = intro.t >= 1 && !state.detail && !(state.drag && state.drag.moved);
  const hit = canPoint && pointer.inside ? pick(pointer.x, pointer.y) : -1;
  const hover = canPoint && settled && (noHover || hit === cur);
  if (hover !== state.hover) {
    state.hover = hover;
    if (hover && !noHover) sound.hover();
    document.body.classList.toggle('is-hover', hover);
  }
  canvas.style.cursor = state.detail ? (state.drag && state.drag.moved ? 'grabbing' : 'grab') : intro.t >= 1 ? 'pointer' : 'default';

  // background
  harmo.group.rotation.set(0.22 + Math.sin(clock * 0.07) * 0.12 + pointer.sy * 0.04, Math.sin(clock * 0.05) * 0.4 + pointer.sx * 0.08, -0.36);
  harmo.group.updateMatrixWorld();
  harmo.update(clock, pointer.sx * 0.35, pointer.sy * 0.35);

  if (!noHover) for (const p of parallax) {
    p.e.style.transform = `translate3d(${(-pointer.sx * p.depth).toFixed(2)}px, ${(-pointer.sy * p.depth * 0.7).toFixed(2)}px, 0)`;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame((t) => {
  last = t / 1000;
  document.body.classList.add('ready');
  frame(t);
});
