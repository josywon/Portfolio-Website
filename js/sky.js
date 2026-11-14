// Procedural sky textures — no image assets.
// One tileable noise function feeds the CSS cloud panels, the dithered
// "bitmap" panel, the paper grain, and the reflection map for the chrome parts.

const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function hash(x, y, s) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// value noise that repeats every `period` cells
function vnoise(x, y, period, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const w = (v) => ((v % period) + period) % period;
  const a = hash(w(x0), w(y0), seed), b = hash(w(x0 + 1), w(y0), seed);
  const c = hash(w(x0), w(y0 + 1), seed), d = hash(w(x0 + 1), w(y0 + 1), seed);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
}

// fractal noise, tileable over u,v in [0,1)
function fbm(u, v, seed, base = 3, octaves = 5) {
  let amp = 0.5, f = base, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(u * f, v * f, f, seed + o * 17);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** White clouds on transparent, tileable. Sits over a CSS sky gradient. */
export function makeCloudTile(w = 512, h = 256, seed = 11) {
  const c = canvasOf(w, h), ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const n = fbm(u, v, seed, 3, 5);
      const body = sstep(0.5, 0.7, n);
      const core = sstep(0.58, 0.82, n);
      const i = (y * w + x) * 4;
      d[i] = lerp(214, 255, core);
      d[i + 1] = lerp(231, 255, core);
      d[i + 2] = lerp(252, 255, core);
      d[i + 3] = body * 245;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Two-tone ordered-dither clouds for the pixelated panel. */
export function makeDitherTile(size = 192, seed = 29) {
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const c = canvasOf(size, size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / size, y / size, seed, 3, 4);
      const val = sstep(0.36, 0.74, n);
      const on = val > (bayer[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      const i = (y * size + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = on ? 255 : 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Faint paper grain. */
export function makeGrain(size = 128) {
  const c = canvasOf(size, size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 20; d[i + 1] = 30; d[i + 2] = 50;
    d[i + 3] = Math.random() * 20;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * Equirectangular environment for reflections: deep blue zenith, bright
 * horizon, one dark band under it (gives chrome its hard line), pale floor.
 */
export function makeEnvCanvas(w = 512, h = 256, seed = 5) {
  const c = canvasOf(w, h), ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h), d = img.data;
  const zenith = [8, 52, 205], mid = [38, 128, 255], haze = [236, 245, 255];
  const band = [9, 24, 72], floorA = [250, 252, 255], floorB = [196, 208, 224];
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      let col;
      if (v < 0.5) {
        const t = v / 0.5;                       // 0 zenith → 1 horizon
        col = t < 0.6 ? mix(zenith, mid, t / 0.6) : mix(mid, haze, sstep(0.6, 1, t));
        const n = fbm(u, v * 2, seed, 4, 5);
        const cloud = sstep(0.52, 0.74, n) * sstep(0.02, 0.3, t);
        col = mix(col, [255, 255, 255], cloud);
      } else {
        const t = (v - 0.5) / 0.5;               // 0 horizon → 1 nadir
        col = mix(floorA, floorB, sstep(0.15, 1, t));
        const bandAmt = sstep(0.0, 0.03, t) * (1 - sstep(0.08, 0.2, t));
        col = mix(col, band, bandAmt * 0.92);
      }
      const i = (y * w + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
