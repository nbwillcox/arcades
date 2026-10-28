// Shared helpers for character art: cel-shaded materials, ink outlines, and expressive eyes.
// Characters only; terrain and props keep their own look.
import * as THREE from 'three';

let ramp = null;
export function gradient() {
  if (!ramp) {
    // four soft bands; the floor stays high so the shadow side is tinted, not dead.
    ramp = new THREE.DataTexture(new Uint8Array([120, 170, 220, 255]), 4, 1, THREE.RedFormat);
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
    ramp.needsUpdate = true;
  }
  return ramp;
}

const mats = new Map();
// Shared toon material by colour (+ options key). Do not mutate the result.
export function T(color, o = null) {
  const key = color + (o ? JSON.stringify(o) : '');
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradient() }, o));
    mats.set(key, m);
  }
  return m;
}
const basic = new Map();
export function Bm(color, o = null) {
  const key = color + (o ? JSON.stringify(o) : '');
  let m = basic.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial(Object.assign({ color }, o)); basic.set(key, m); }
  return m;
}

export const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };

const geoCache = new Map();
const cached = (key, make) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };
export const ico = (r, d = 1) => cached(`i${r}/${d}`, () => new THREE.IcosahedronGeometry(r, d));
export const sph = (r, w = 10, h = 8) => cached(`s${r}/${w}/${h}`, () => new THREE.SphereGeometry(r, w, h));
export const cone = (r, h, s = 6) => cached(`c${r}/${h}/${s}`, () => new THREE.ConeGeometry(r, h, s));
export const cyl = (a, b, h, s = 6) => cached(`y${a}/${b}/${h}/${s}`, () => new THREE.CylinderGeometry(a, b, h, s));

const inkMat = new Map();
// Back-face ink hull around a mesh; call after the mesh has its final scale.
export function ink(m, k = 0.07, color = 0x1a1230) {
  let mat = inkMat.get(color);
  if (!mat) { mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }); inkMat.set(color, mat); }
  const h = new THREE.Mesh(m.geometry, mat);
  h.scale.setScalar(1 + k);
  m.add(h);
  return m;
}

// A friendly eye: white, tinted iris, pupil and a catch-light. `look` nudges the gaze forward.
export function eye(parent, x, y, z, s = 1, iris = 0x3a2a14, look = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
  g.add(mesh(sph(0.1, 10, 8), Bm(0xffffff)));
  g.add(mesh(sph(0.066, 12, 8), Bm(iris), 0, 0, 0.05 * look));
  g.add(mesh(sph(0.04, 10, 8), Bm(0x0a0a12), 0, 0, 0.082 * look));
  g.add(mesh(sph(0.018, 5, 4), Bm(0xffffff), 0.026, 0.03, 0.098 * look));
  parent.add(g);
  return g;
}

// A heavy brow wedge over an eye. tilt > 0 angles the inner end down (angry), < 0 up (worried).
export function brow(parent, x, y, z, w, color, tilt = 0.4, side = 1) {
  const b = mesh(cyl(0.028, 0.03, w, 5), color, x, y, z);
  b.rotation.z = Math.PI / 2 + tilt * side;
  parent.add(b);
  return b;
}

// Merge a static subtree into one mesh per material so a many-part character costs a handful
// of draw calls. Anything in `keep` (and its subtree) is left alone, so animated parts still move.
export function bake(root, keep = null) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const parts = new Map(); // material -> { pos[], nor[] }
  const doomed = [];
  const walk = (o) => {
    if (keep && keep.has(o)) return;
    if (o.isMesh && o !== root) {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      const nm = new THREE.Matrix3().getNormalMatrix(m);
      const p = g.attributes.position, n = g.attributes.normal;
      let e = parts.get(o.material);
      if (!e) { e = { pos: [], nor: [] }; parts.set(o.material, e); }
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(m); e.pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); e.nor.push(v.x, v.y, v.z);
      }
      if (g !== o.geometry) g.dispose();
      doomed.push(o);
    }
    for (const c of o.children) walk(c);
  };
  walk(root);
  for (const o of doomed) o.parent.remove(o);
  for (const [mat, e] of parts) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(e.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(e.nor, 3));
    root.add(new THREE.Mesh(geo, mat));
  }
  return root;
}
