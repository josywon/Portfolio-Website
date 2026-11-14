// Placeholder "CAD" parts, built procedurally so the carousel has something
// mechanical to show until real models are dropped in.
//
// Real parts are GLB files loaded by loadGlb() at the bottom. In those files
// each mesh is named after the house material it should wear (chrome / steel /
// blue / glass) and the drafting edges are stored as line segments.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const TAU = Math.PI * 2;

export function createMaterials() {
  const side = THREE.DoubleSide;
  return {
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xe9f1fb, metalness: 1, roughness: 0.16, envMapIntensity: 1.15, side }),
    steel: new THREE.MeshPhysicalMaterial({ color: 0xc2d2e6, metalness: 1, roughness: 0.36, side }),
    blue: new THREE.MeshPhysicalMaterial({ color: 0x1a6dff, metalness: 0.55, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, side }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x4f9dff, metalness: 0.2, roughness: 0.08, transparent: true, opacity: 0.32, depthWrite: false, side }),
    edge: new THREE.LineBasicMaterial({ color: 0x0b2a6b, transparent: true, opacity: 0.55 }),
  };
}

/* ── helpers ─────────────────────────────────────────────── */

// mesh + drafting-style feature edges
function part(geo, mat, M, angle = 28) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, angle), M.edge));
  return mesh;
}

// extrude a 2D shape, centred on its thickness
function ex(shape, depth, curveSegments = 40) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments });
  g.translate(0, 0, -depth / 2);
  return g;
}

function disc(r, x = 0, y = 0) {
  const s = new THREE.Shape();
  s.absarc(x, y, r, 0, TAU, false);
  return s;
}

function hole(r, x = 0, y = 0) {
  const p = new THREE.Path();
  p.absarc(x, y, r, 0, TAU, true);
  return p;
}

function rrect(w, h, r, x = -w / 2, y = -h / 2, Kind = THREE.Shape) {
  const s = new Kind();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// revolve a profile one straight segment at a time so creases stay crisp
function revolve(group, pts, mat, M, segs = 56) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new THREE.Vector2(pts[i][0], pts[i][1]);
    const b = new THREE.Vector2(pts[i + 1][0], pts[i + 1][1]);
    group.add(part(new THREE.LatheGeometry([a, b], segs), mat, M));
  }
}

function cyl(r, h, y = 0, segs = 40) {
  const g = new THREE.CylinderGeometry(r, r, h, segs);
  g.translate(0, y, 0);
  return g;
}

// centre, normalise to roughly unit radius, and wrap in a pose + spin group
function finish(inner, tilt = [0, 0, 0]) {
  const box = new THREE.Box3().setFromObject(inner);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const s = 1 / (0.5 * (size.length() / 2 + Math.max(size.x, size.y, size.z) / 2));
  inner.scale.setScalar(s);
  inner.position.copy(centre).multiplyScalar(-s);
  const pose = new THREE.Group();
  pose.add(inner);
  pose.rotation.set(tilt[0], tilt[1], tilt[2]);
  const outer = new THREE.Group();
  outer.add(pose);
  return outer;
}

/* ── parts ───────────────────────────────────────────────── */

function gear(M) {
  const g = new THREE.Group();
  const N = 20, rr = 0.84, rt = 1.0, p = TAU / N;
  const s = new THREE.Shape();
  for (let i = 0; i < N; i++) {
    const a = i * p;
    const tooth = [[rr, a], [rr, a + 0.22 * p], [rt, a + 0.34 * p], [rt, a + 0.66 * p], [rr, a + 0.78 * p]];
    tooth.forEach(([r, t], k) => {
      const x = r * Math.cos(t), y = r * Math.sin(t);
      if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y);
    });
  }
  s.closePath();
  s.holes.push(hole(0.2));
  for (let i = 0; i < 6; i++) s.holes.push(hole(0.14, 0.54 * Math.cos(i * TAU / 6), 0.54 * Math.sin(i * TAU / 6)));
  g.add(part(ex(s, 0.26), M.chrome, M));

  const hub = disc(0.33);
  hub.holes.push(hole(0.2));
  g.add(part(ex(hub, 0.52), M.blue, M));
  return finish(g, [-0.3, 0.5, 0]);
}

function flange(M) {
  const g = new THREE.Group();
  const s = disc(1.0);
  s.holes.push(hole(0.42));
  for (let i = 0; i < 8; i++) s.holes.push(hole(0.085, 0.77 * Math.cos(i * TAU / 8), 0.77 * Math.sin(i * TAU / 8)));
  const plate = ex(s, 0.2);
  plate.rotateX(-Math.PI / 2);
  g.add(part(plate, M.chrome, M));

  revolve(g, [[0.42, 0.1], [0.7, 0.1], [0.7, 0.17], [0.56, 0.5], [0.56, 0.88], [0.42, 0.88], [0.42, -0.1]], M.chrome, M);
  const seal = new THREE.TorusGeometry(0.49, 0.036, 12, 56);
  seal.rotateX(Math.PI / 2); seal.translate(0, 0.89, 0);
  g.add(new THREE.Mesh(seal, M.blue));
  return finish(g, [0.42, 0, 0.12]);
}

function bracket(M) {
  const g = new THREE.Group();
  const t = 0.14, W = 1.0, L = 1.5, H = 1.25;

  const base = rrect(L, W, 0.1, 0, -W / 2);
  for (const y of [-0.25, 0.25]) base.holes.push(rrect(0.5, 0.16, 0.0799, 0.72, y - 0.08, THREE.Path));
  const baseGeo = ex(base, t);
  baseGeo.rotateX(-Math.PI / 2); baseGeo.translate(0, t / 2, 0);
  g.add(part(baseGeo, M.chrome, M));

  const wall = rrect(W, H, 0.1, -W / 2, 0);
  for (const x of [-0.25, 0.25]) wall.holes.push(hole(0.1, x, 0.86));
  const wallGeo = ex(wall, t);
  wallGeo.rotateY(Math.PI / 2); wallGeo.translate(t / 2, 0, 0);
  g.add(part(wallGeo, M.chrome, M));

  const gus = new THREE.Shape();
  gus.moveTo(t, t); gus.lineTo(t + 0.5, t); gus.lineTo(t, t + 0.62); gus.closePath();
  g.add(part(ex(gus, 0.1), M.blue, M));
  return finish(g, [0.1, -0.7, 0]);
}

function impeller(M) {
  const g = new THREE.Group();
  const hubY = (r) => 0.72 * Math.pow(1 - Math.min(1, Math.max(0, (r - 0.1) / 0.85)), 2.4);

  const prof = [new THREE.Vector2(0.1, 0.72)];
  for (let i = 1; i <= 18; i++) { const r = 0.1 + (0.85 * i) / 18; prof.push(new THREE.Vector2(r, hubY(r))); }
  g.add(part(new THREE.LatheGeometry(prof, 64), M.chrome, M));
  revolve(g, [[0.95, 0], [0.95, -0.07], [0.001, -0.07]], M.chrome, M, 64);

  const U = 16, V = 4, BLADES = 9;
  for (let b = 0; b < BLADES; b++) {
    const th0 = (b * TAU) / BLADES, pos = [], idx = [];
    for (let u = 0; u <= U; u++) {
      const k = u / U, r = 0.2 + 0.73 * k;
      const yb = hubY(r) - 0.01, yt = yb + 0.5 - 0.38 * k;
      for (let v = 0; v <= V; v++) {
        const j = v / V, th = th0 + 1.05 * Math.pow(k, 1.15) + 0.28 * j * (1 - k);
        pos.push(r * Math.cos(th), yb + (yt - yb) * j, r * Math.sin(th));
      }
    }
    for (let u = 0; u < U; u++) for (let v = 0; v < V; v++) {
      const a = u * (V + 1) + v, c = a + V + 1;
      idx.push(a, c, a + 1, a + 1, c, c + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    g.add(part(geo, M.chrome, M, 40));
  }

  const cap = new THREE.SphereGeometry(0.12, 28, 12, 0, TAU, 0, Math.PI / 2);
  cap.translate(0, 0.72, 0);
  g.add(new THREE.Mesh(cap, M.blue));
  return finish(g, [0.5, 0, 0.1]);
}

function heatsink(M) {
  const g = new THREE.Group();
  const base = new THREE.BoxGeometry(1.7, 0.16, 1.2);
  base.translate(0, 0.08, 0);
  g.add(part(base, M.chrome, M));
  const FINS = 13;
  for (let i = 0; i < FINS; i++) {
    const k = (i / (FINS - 1)) * 2 - 1;
    const h = 0.5 + 0.4 * Math.cos((k * Math.PI) / 2);
    const fin = new THREE.BoxGeometry(0.05, h, 1.2);
    fin.translate(k * 0.79, 0.16 + h / 2, 0);
    g.add(part(fin, M.steel, M));
  }
  for (const z of [-0.3, 0.3]) {
    const pipe = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 20);
    pipe.rotateZ(Math.PI / 2); pipe.translate(0, 0.42, z);
    g.add(new THREE.Mesh(pipe, M.blue));
  }
  return finish(g, [0.25, 0.6, 0]);
}

function conrod(M) {
  const g = new THREE.Group();
  const big = disc(0.46); big.holes.push(hole(0.3));
  g.add(part(ex(big, 0.3), M.chrome, M));
  const shell = disc(0.3); shell.holes.push(hole(0.25));
  g.add(part(ex(shell, 0.3), M.blue, M));
  const small = disc(0.27, 0, 1.55); small.holes.push(hole(0.15, 0, 1.55));
  g.add(part(ex(small, 0.3), M.chrome, M));

  const beam = new THREE.Shape();
  beam.moveTo(-0.2, 0.4); beam.lineTo(0.2, 0.4); beam.lineTo(0.13, 1.33); beam.lineTo(-0.13, 1.33); beam.closePath();
  const pocket = new THREE.Path();
  pocket.moveTo(-0.1, 0.56); pocket.lineTo(-0.06, 1.2); pocket.lineTo(0.06, 1.2); pocket.lineTo(0.1, 0.56); pocket.closePath();
  beam.holes.push(pocket);
  g.add(part(ex(beam, 0.18), M.steel, M));

  for (const x of [-0.52, 0.52]) {
    const boss = new THREE.BoxGeometry(0.16, 0.5, 0.26);
    boss.translate(x, 0, 0);
    g.add(part(boss, M.chrome, M));
  }
  return finish(g, [0, 0.5, 0.5]);
}

class Helix extends THREE.Curve {
  constructor(r, h, turns) { super(); this.r = r; this.h = h; this.turns = turns; }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * this.turns * TAU;
    // flatten the pitch at both ends like a closed-and-ground spring
    const y = this.h * (t - 0.045 * Math.sin(TAU * t)) - this.h / 2;
    return target.set(this.r * Math.cos(a), y, this.r * Math.sin(a));
  }
}

function coilover(M) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new Helix(0.46, 1.5, 6.5), 320, 0.065, 12), M.blue));
  g.add(part(cyl(0.24, 0.95, -0.42), M.chrome, M));
  g.add(part(cyl(0.08, 1.1, 0.5, 24), M.steel, M));
  for (const y of [-0.8, 0.8]) g.add(part(cyl(0.58, 0.07, y, 48), M.chrome, M));
  for (const y of [-1.0, 1.0]) g.add(part(cyl(0.1, 0.34, y, 24), M.steel, M));
  for (const y of [-1.28, 1.28]) {
    const eye = new THREE.TorusGeometry(0.15, 0.07, 14, 36);
    eye.translate(0, y, 0);
    g.add(new THREE.Mesh(eye, M.chrome));
  }
  return finish(g, [0, 0, 0.42]);
}

// "default profile picture" badge: head-and-shoulders relief on a round disc
function avatar(M) {
  const g = new THREE.Group();
  g.add(part(ex(disc(1.0), 0.2, 64), M.blue, M));

  const rim = disc(1.08); rim.holes.push(hole(0.94));
  g.add(part(ex(rim, 0.3, 64), M.chrome, M));

  const head = new THREE.SphereGeometry(0.31, 40, 24);
  head.scale(1, 1, 0.7); head.translate(0, 0.26, 0.2);
  g.add(new THREE.Mesh(head, M.chrome));

  // shoulders: half-ellipse on top, trimmed by a circle concentric with the disc
  const body = new THREE.Shape();
  const bx = 0.62, by = -0.5, br = Math.hypot(bx, by);
  body.absarc(0, 0, br, Math.atan2(by, -bx), Math.atan2(by, bx) + TAU, false);
  body.absellipse(0, by, bx, 0.44, 0, Math.PI, false);
  const bodyGeo = new THREE.ExtrudeGeometry(body, {
    depth: 0.16, curveSegments: 48, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.08, bevelSegments: 5,
  });
  bodyGeo.translate(0, 0, 0.08);
  g.add(new THREE.Mesh(bodyGeo, M.chrome));
  return finish(g, [-0.12, 0, 0]);
}

// temporary stand-in for the space mouse until its real model is in
function spacemouse(M) {
  const g = new THREE.Group();
  revolve(g, [[0.001, 0], [0.92, 0], [1.0, 0.08], [1.0, 0.3], [0.9, 0.4], [0.5, 0.4]], M.chrome, M, 72);
  revolve(g, [[0.5, 0.4], [0.5, 0.5]], M.steel, M, 72);
  const ring = new THREE.TorusGeometry(0.56, 0.05, 14, 72);
  ring.rotateX(Math.PI / 2); ring.translate(0, 0.47, 0);
  g.add(new THREE.Mesh(ring, M.blue));
  revolve(g, [[0.5, 0.54], [0.66, 0.6], [0.7, 0.74], [0.6, 0.98], [0.62, 1.12], [0.52, 1.22], [0.001, 1.24]], M.chrome, M, 72);
  return finish(g, [0.42, 0, 0.1]);
}

// generic long liquid-propellant sounding rocket (illustrative, not a real design)
function rocket(M, opts = {}) {
  const g = new THREE.Group();
  const r = 0.3;

  // ogive nose
  const nose = [];
  for (let i = 0; i <= 20; i++) {
    const k = i / 20;
    nose.push(new THREE.Vector2(Math.max(0.001, r * Math.sqrt(1 - Math.pow(1 - k, 2.1))), 4.1 - 1.3 * (k - 1) - 1.3));
  }
  g.add(part(new THREE.LatheGeometry(nose.reverse(), 48), M.blue, M));

  // airframe: payload bay, oxidiser tank, intertank, fuel tank, engine bay
  const sections = [[2.35, 2.8, M.chrome], [0.95, 2.3, M.steel], [0.7, 0.92, M.chrome], [-0.35, 0.66, M.steel], [-1.25, -0.39, M.chrome]];
  for (const [y0, y1, mat] of sections) revolve(g, [[r, y0], [r, y1]], mat, M, 48);
  for (const y of [2.325, 0.935, 0.68, -0.37]) {
    const band = new THREE.TorusGeometry(r + 0.004, 0.018, 8, 48);
    band.rotateX(Math.PI / 2); band.translate(0, y, 0);
    g.add(new THREE.Mesh(band, M.blue));
  }
  revolve(g, [[r, -1.25], [0.2, -1.36], [0.001, -1.36]], M.chrome, M, 48);

  // team logo on the oxidiser tank, on two opposite sides
  if (opts.logo) {
    const logoTex = new THREE.TextureLoader().load(opts.logo);
    logoTex.colorSpace = THREE.SRGBColorSpace; logoTex.anisotropy = 8;
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, depthWrite: false });
    const size = 0.6;                                    // square patch: arc length = height
    for (const turn of [0, Math.PI]) {
      const patch = new THREE.CylinderGeometry(r + 0.004, r + 0.004, size, 24, 1, true, turn - size / r / 2, size / r);
      patch.translate(0, 1.625, 0);
      const mesh = new THREE.Mesh(patch, logoMat);
      mesh.renderOrder = 1;
      g.add(mesh);
    }
  }

  // engine bell
  const bell = [];
  for (let i = 0; i <= 14; i++) { const k = i / 14; bell.push(new THREE.Vector2(0.08 + 0.17 * Math.pow(k, 0.6), -1.36 - 0.42 * k)); }
  g.add(part(new THREE.LatheGeometry(bell, 40), M.steel, M));

  // four swept fins
  const fin = new THREE.Shape();
  fin.moveTo(r - 0.01, -0.45); fin.lineTo(r + 0.46, -1.02); fin.lineTo(r + 0.46, -1.32); fin.lineTo(r - 0.01, -1.22); fin.closePath();
  for (let i = 0; i < 4; i++) {
    const geo = ex(fin, 0.03);
    geo.rotateY((i * Math.PI) / 2 + Math.PI / 4);
    g.add(part(geo, M.blue, M));
  }
  return finish(g, [0, 0, -0.5]);
}

const BUILDERS = { gear, flange, bracket, impeller, heatsink, conrod, coilover, avatar, spacemouse, rocket };

const gltfLoader = new GLTFLoader();

/** Load a converted CAD model and dress it in the house materials. */
export async function loadGlb(src, M, tilt = [0.3, 0.6, 0]) {
  const gltf = await gltfLoader.loadAsync(src);
  const root = gltf.scene;
  root.traverse((o) => {
    if (o.isLineSegments) { o.material = M.edge; }
    else if (o.isMesh) { o.material = M[o.name] || M.chrome; if (o.material === M.glass) o.renderOrder = 2; }
  });
  return finish(root, tilt);
}

export function buildModel(kind, M, opts) {
  return (BUILDERS[kind] || gear)(M, opts);
}
