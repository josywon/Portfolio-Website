// Asymmetric 3D harmonograph — the animated background.
//
// Each axis is a sum of damped sine pendulums:
//     A · sin(f·t + phase + drift·time) · e^(−damping·t)
// Frequencies sit near simple ratios but are slightly detuned, amplitudes and
// damping differ per axis, and x is sheared by y — so the figure never closes
// and never mirrors. Phases drift with time, which is what makes it move.
//
// Two things are drawn from those curves: hairline traces, and wide tapered
// ribbons with a glossy sky shader.

import * as THREE from 'three';

const TAU = Math.PI * 2;

// term = [amplitude, frequency, phase, damping, drift]
const LINES = [
  {
    n: 2200, T: 40, color: 0x3a4658, alpha: [0.07, 0.3], shear: 0.38,
    x: [[1.0, 2.0, 0.0, 0.016, 0.050], [0.55, 3.02, 1.3, 0.022, -0.031]],
    y: [[0.72, 3.0, 0.6, 0.018, 0.027], [0.42, 2.01, 2.1, 0.012, 0.043]],
    z: [[0.6, 1.0, 0.0, 0.010, 0.020], [0.25, 4.0, 1.0, 0.030, -0.015]],
  },
  {
    n: 1200, T: 26, color: 0x6f9be8, alpha: [0.08, 0.34], shear: -0.22,
    x: [[0.8, 3.0, 2.2, 0.03, -0.040], [0.5, 1.99, 0.4, 0.02, 0.022]],
    y: [[0.95, 2.0, 0.9, 0.025, 0.035], [0.3, 4.03, 0.0, 0.035, -0.026]],
    z: [[0.5, 1.5, 0.7, 0.02, 0.030]],
  },
];

const RIBBONS = [
  {
    n: 560, T: 15, width: 0.17, blades: 7, twist: 1.6, shear: 0.45, opacity: 0.5,
    x: [[1.3, 1.0, 0.3, 0.030, 0.034], [0.5, 2.03, 1.9, 0.045, -0.027]],
    y: [[0.8, 1.5, 1.1, 0.034, 0.021], [0.34, 0.52, 0.2, 0.020, 0.030]],
    z: [[0.85, 0.75, 0.0, 0.030, 0.024]],
  },
  {
    n: 440, T: 11, width: 0.11, blades: 5, twist: 2.4, shear: -0.3, opacity: 0.42,
    x: [[1.05, 1.5, 2.6, 0.040, -0.030], [0.6, 0.98, 0.5, 0.030, 0.019]],
    y: [[1.0, 1.0, 0.4, 0.045, 0.028], [0.3, 2.5, 1.2, 0.060, -0.022]],
    z: [[0.7, 1.25, 1.4, 0.035, -0.020]],
  },
];

function axis(terms, t, time, nudge) {
  let s = 0;
  for (let i = 0; i < terms.length; i++) {
    const k = terms[i];
    s += k[0] * Math.sin(k[1] * t + k[2] + k[4] * time + nudge) * Math.exp(-k[3] * t);
  }
  return s;
}

function sample(cfg, t, time, nx, ny, out, o) {
  const y = axis(cfg.y, t, time, ny);
  out[o] = axis(cfg.x, t, time, nx) + cfg.shear * y;
  out[o + 1] = y;
  out[o + 2] = axis(cfg.z, t, time, 0);
}

function makeLine(cfg) {
  const pos = new Float32Array(cfg.n * 3);
  const col = new Float32Array(cfg.n * 4);
  const c = new THREE.Color(cfg.color);
  for (let i = 0; i < cfg.n; i++) {
    const s = i / (cfg.n - 1);
    col[i * 4] = c.r; col[i * 4 + 1] = c.g; col[i * 4 + 2] = c.b;
    // strongest where the pendulum is freshest, fading as it damps out
    col[i * 4 + 3] = cfg.alpha[0] + (cfg.alpha[1] - cfg.alpha[0]) * Math.pow(1 - s, 0.8) * Math.min(1, s * 30);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false });
  const obj = new THREE.Line(geo, mat);
  obj.frustumCulled = false;
  return { cfg, pos, geo, obj };
}

const RIBBON_VERT = /* glsl */`
  varying vec3 vN; varying vec3 vV; varying vec2 vUv;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalMatrix * normal; vV = -mv.xyz; vUv = uv;
    gl_Position = projectionMatrix * mv;
  }`;

const RIBBON_FRAG = /* glsl */`
  uniform vec3 uWhite, uSky, uDeep, uInk; uniform float uOpacity;
  varying vec3 vN; varying vec3 vV; varying vec2 vUv;
  void main() {
    vec3 n = normalize(vN); vec3 v = normalize(vV);
    float f = abs(dot(n, v));                                  // 1 = facing the camera
    vec3 col = mix(uSky, uWhite, smoothstep(0.25, 0.85, f));   // glancing → sky, facing → white
    col = mix(uDeep, col, smoothstep(0.0, 0.32, f));           // edge-on → deep blue
    float streak = 0.5 + 0.5 * sin(vUv.y * 6.2832 + f * 7.0 + vUv.x * 46.0);
    col = mix(col, uSky, smoothstep(0.7, 1.0, streak) * (1.0 - f) * 0.4);

    float across = min(vUv.y, 1.0 - vUv.y);                    // ink outline along both edges
    float edge = 1.0 - smoothstep(0.0, fwidth(vUv.y) * 1.4, across);
    col = mix(col, uInk, edge * 0.6);
    gl_FragColor = vec4(col, mix(uOpacity, 0.45, edge));
    #include <colorspace_fragment>
  }`;

function makeRibbon(cfg) {
  const n = cfg.n;
  const pts = new Float32Array(n * 3);
  const pos = new Float32Array(n * 2 * 3);
  const nor = new Float32Array(n * 2 * 3);
  const uv = new Float32Array(n * 2 * 2);
  const idx = new Uint16Array((n - 1) * 6);
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1);
    uv[i * 4] = s; uv[i * 4 + 1] = 0; uv[i * 4 + 2] = s; uv[i * 4 + 3] = 1;
    if (i < n - 1) {
      const a = i * 2, o = i * 6;
      idx[o] = a; idx[o + 1] = a + 1; idx[o + 2] = a + 2;
      idx[o + 3] = a + 1; idx[o + 4] = a + 3; idx[o + 5] = a + 2;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: RIBBON_VERT, fragmentShader: RIBBON_FRAG,
    uniforms: {
      uWhite: { value: new THREE.Color(0xffffff) },
      uSky: { value: new THREE.Color(0xbcd6f3) },
      uDeep: { value: new THREE.Color(0x7fa6e0) },
      uInk: { value: new THREE.Color(0x4a5d80) },
      uOpacity: { value: cfg.opacity },
    },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const obj = new THREE.Mesh(geo, mat);
  obj.frustumCulled = false;
  return { cfg, pts, pos, nor, geo, obj, bx: 0, by: 1, bz: 0 };
}

export class Harmonograph {
  constructor() {
    this.group = new THREE.Group();
    this.lines = LINES.map(makeLine);
    this.ribbons = RIBBONS.map(makeRibbon);
    this.ribbons.forEach((r, i) => { r.obj.renderOrder = -3 + i; this.group.add(r.obj); });
    this.lines.forEach((l) => { l.obj.renderOrder = -1; this.group.add(l.obj); });
  }

  /** recolour for the light or dark theme */
  setTheme(dark) {
    const lineCols = dark ? [0xa9b9d2, 0x5f97ff] : LINES.map((c) => c.color);
    this.lines.forEach((l, i) => {
      const c = new THREE.Color(lineCols[i]), a = l.geo.attributes.color;
      for (let k = 0; k < l.cfg.n; k++) a.setXYZ(k, c.r, c.g, c.b);
      a.needsUpdate = true;
    });
    const [white, sky, deep, ink] = dark ? [0x31476f, 0x1d3f86, 0x0c2a66, 0x9db6e0] : [0xffffff, 0xbcd6f3, 0x7fa6e0, 0x4a5d80];
    for (const r of this.ribbons) {
      const u = r.obj.material.uniforms;
      u.uWhite.value.set(white); u.uSky.value.set(sky); u.uDeep.value.set(deep); u.uInk.value.set(ink);
    }
  }

  /** time in seconds; nx, ny are small phase nudges (pointer) */
  update(time, nx = 0, ny = 0) {
    // the figure drifts slowly, so traces and ribbons take turns: each is
    // recomputed every other frame, halving the per-frame maths
    this.flip = !this.flip;
    if (this.flip && this.primed) {
      for (const r of this.ribbons) this.#updateRibbon(r, time, nx, ny);
      return;
    }
    const all = !this.primed;
    this.primed = true;
    for (const l of this.lines) {
      const { cfg, pos } = l;
      for (let i = 0; i < cfg.n; i++) sample(cfg, (i / (cfg.n - 1)) * cfg.T, time, nx, ny, pos, i * 3);
      l.geo.attributes.position.needsUpdate = true;
    }
    if (all) for (const r of this.ribbons) this.#updateRibbon(r, time, nx, ny);
  }

  #updateRibbon(r, time, nx, ny) {
    const { cfg, pts, pos, nor } = r;
    const n = cfg.n;
    for (let i = 0; i < n; i++) sample(cfg, (i / (n - 1)) * cfg.T, time, nx, ny, pts, i * 3);

    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      const a = Math.max(i - 1, 0) * 3, b = Math.min(i + 1, n - 1) * 3, p = i * 3;
      let tx = pts[b] - pts[a], ty = pts[b + 1] - pts[a + 1], tz = pts[b + 2] - pts[a + 2];
      const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;

      // slowly rotating reference axis → the ribbon twists along its length
      const ang = cfg.twist * s * TAU + time * 0.06;
      const ax = Math.sin(ang) * 0.6, ay = Math.cos(ang) * 0.6, az = 0.8;
      let bx = ty * az - tz * ay, by = tz * ax - tx * az, bz = tx * ay - ty * ax;
      const bl = Math.hypot(bx, by, bz);
      if (bl > 1e-4) { bx /= bl; by /= bl; bz /= bl; r.bx = bx; r.by = by; r.bz = bz; }
      else { bx = r.bx; by = r.by; bz = r.bz; }
      const nxn = by * tz - bz * ty, nyn = bz * tx - bx * tz, nzn = bx * ty - by * tx;

      // blades: width swells and pinches to a hairline several times
      const w = cfg.width * Math.pow(Math.abs(Math.sin(cfg.blades * Math.PI * s + 0.4)), 1.7) * (0.3 + 0.7 * Math.sin(Math.PI * s));

      const o = i * 6;
      pos[o] = pts[p] + bx * w; pos[o + 1] = pts[p + 1] + by * w; pos[o + 2] = pts[p + 2] + bz * w;
      pos[o + 3] = pts[p] - bx * w; pos[o + 4] = pts[p + 1] - by * w; pos[o + 5] = pts[p + 2] - bz * w;
      nor[o] = nor[o + 3] = nxn; nor[o + 1] = nor[o + 4] = nyn; nor[o + 2] = nor[o + 5] = nzn;
    }
    r.geo.attributes.position.needsUpdate = true;
    r.geo.attributes.normal.needsUpdate = true;
  }
}
