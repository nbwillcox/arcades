// Instanced scenery: vertex-coloured merged geometries, one InstancedMesh per kind.
// Shapes are hand-jittered (hash-based vertex noise) so nothing is a perfect cone or sphere, and every part
// gets baked top-light / bottom-shadow shading so forms read even in flat light.
import * as THREE from 'three';
import { landmarkKinds, landmarkAnim } from './landmarks.js';

// deterministic noise on position -> identical vertices move together, so indexed meshes never crack
const hash3 = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
function jitter(g, amt, seed = 0) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setXYZ(i, x + (hash3(x + seed, y, z) - 0.5) * amt, y + (hash3(y + seed, z, x) - 0.5) * amt, z + (hash3(z + seed, x, y) - 0.5) * amt);
  }
  g.computeVertexNormals();
  return g;
}

// parts: { g, c, m?, sh? }  sh = how strongly faces are lit by their upward-ness (default 0.28)
function merge(parts) {
  let total = 0;
  const geos = parts.map(({ g, c, m, sh }) => {
    let geo = g.index ? g.toNonIndexed() : g.clone();
    if (m) geo.applyMatrix4(m);
    geo.computeVertexNormals();
    total += geo.attributes.position.count;
    return { geo, c: new THREE.Color(c), sh: sh === undefined ? 0.28 : sh };
  });
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
  let o = 0;
  for (const { geo, c, sh } of geos) {
    const n = geo.attributes.position.count, nrm = geo.attributes.normal;
    pos.set(geo.attributes.position.array, o * 3); nor.set(nrm.array, o * 3);
    for (let i = 0; i < n; i++) {
      const px = geo.attributes.position.getX(i), py = geo.attributes.position.getY(i), pz = geo.attributes.position.getZ(i);
      const grain = 1 + (hash3(Math.floor(px * 2.3), Math.floor(py * 2.3), Math.floor(pz * 2.3)) - 0.5) * 0.14; // mottling so big surfaces are not flat colour
      const k = Math.max(0.55, 1 + sh * nrm.getY(i)) * grain;
      col[(o + i) * 3] = Math.min(1, c.r * k); col[(o + i) * 3 + 1] = Math.min(1, c.g * k); col[(o + i) * 3 + 2] = Math.min(1, c.b * k);
    }
    o += n;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
const S = (x, y, z) => new THREE.Matrix4().makeScale(x, y, z);
const RY = (a) => new THREE.Matrix4().makeRotationY(a);
const RZ = (a) => new THREE.Matrix4().makeRotationZ(a);
const RX = (a) => new THREE.Matrix4().makeRotationX(a);
const mul = (...ms) => ms.reduce((a, b) => a.clone().multiply(b));
const cone = (r, h, seg = 6) => new THREE.ConeGeometry(r, h, seg);
const cyl = (r0, r1, h, seg = 6) => new THREE.CylinderGeometry(r0, r1, h, seg);
const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const J = (g, a, s) => jitter(g, a, s);
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

// Each kind: function(palette) -> merged geometry (base at y=0, ~1 unit scale)
const KINDS = {
  // layered pine: uneven tiers, drooping skirts, thick flared trunk
  tree(p) {
    const leaf = p.leaf || 0x2fae5a, leaf2 = p.leaf2 || 0x3cc46a, trunk = p.trunk || 0x7a4f2e;
    const parts = [
      { g: J(cyl(0.2, 0.34, 1.6, 7), 0.06, 1), c: trunk, m: T(0, 0.8, 0), sh: 0.1 },
      { g: J(cone(0.46, 0.5, 7), 0.06, 2), c: shade(trunk, 0.85), m: T(0, 0.22, 0), sh: 0.1 },
    ];
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const r = 1.38 - i * 0.24, h = 1.25 - i * 0.1, y = 1.35 + i * 0.72;
      const ox = (hash3(i, 3, 1) - 0.5) * 0.14, oz = (hash3(i, 7, 2) - 0.5) * 0.14;
      parts.push({ g: J(cone(r, h, 8), 0.2, 10 + i), c: i % 2 ? leaf2 : leaf, m: mul(T(ox, y, oz), RY(i * 0.7), S(1, 0.9, 1)), sh: 0.45 });
      parts.push({ g: J(cone(r * 0.72, 0.5, 8), 0.12, 20 + i), c: shade(i % 2 ? leaf2 : leaf, 0.62), m: mul(T(ox, y - 0.42, oz), RY(i * 0.7 + 0.4), RX(Math.PI)), sh: 0.1 });
    }
    parts.push({ g: J(cone(0.2, 0.7, 6), 0.05, 30), c: leaf2, m: T(0, 1.35 + tiers * 0.72 - 0.1, 0), sh: 0.4 });
    return merge(parts);
  },
  // broadleaf: leaning forked trunk, a clustered crown of lumpy blobs with a sunlit top
  roundtree(p) {
    const leaf = p.leaf || 0x44c46c, leaf2 = p.leaf2 || 0x66d984, trunk = p.trunk || 0x7a4f2e;
    const blob = (r, x, y, z, c, seed, sy = 0.88) => ({ g: J(ico(r, 1), r * 0.3, seed), c, m: mul(T(x, y, z), S(1, sy, 1)), sh: 0.5 });
    return merge([
      { g: J(cyl(0.2, 0.36, 1.5, 7), 0.07, 1), c: trunk, m: mul(T(0.04, 0.75, 0), RZ(-0.05)), sh: 0.1 },
      { g: J(cone(0.5, 0.5, 7), 0.07, 2), c: shade(trunk, 0.85), m: T(0, 0.2, 0), sh: 0.1 },
      { g: J(cyl(0.08, 0.15, 1.1, 5), 0.04, 3), c: trunk, m: mul(T(0.42, 1.8, 0.04), RZ(-0.75)), sh: 0.1 },
      { g: J(cyl(0.07, 0.13, 0.95, 5), 0.04, 4), c: trunk, m: mul(T(-0.38, 1.75, -0.05), RZ(0.7)), sh: 0.1 },
      blob(1.05, 0, 2.55, 0, leaf, 5), blob(0.8, 0.85, 2.25, 0.25, shade(leaf, 0.92), 6), blob(0.78, -0.8, 2.2, -0.2, shade(leaf, 0.9), 7),
      blob(0.7, 0.2, 2.35, 0.8, shade(leaf, 0.86), 8), blob(0.66, -0.15, 2.3, -0.82, shade(leaf, 0.88), 9), blob(0.62, 0.15, 3.25, 0.05, leaf2, 10, 0.8),
    ]);
  },
  // craggy boulder cluster: angular chunks, a pale sunlit cap and a mossy fringe
  rock(p) {
    const base = p.rock || 0x8f95a8, hi = p.rock2 || 0xb5bccd, moss = p.moss || shade(hi, 0.95);
    const chunk = (r, x, y, z, sx, sy, sz, c, seed, ry = 0) => ({ g: J(ico(r, 0), r * 0.5, seed), c, m: mul(T(x, y, z), RY(ry), S(sx, sy, sz)), sh: 0.55 });
    return merge([
      chunk(0.72, 0, 0.3, 0, 1.25, 0.72, 1.0, base, 1, 0.5), chunk(0.5, 0.62, 0.18, 0.22, 1.0, 0.8, 1.1, shade(base, 1.08), 2, 1.2),
      chunk(0.4, -0.55, 0.14, -0.3, 1.1, 0.75, 0.9, shade(base, 0.92), 3, 2.1), chunk(0.26, 0.12, 0.65, -0.1, 1.2, 0.5, 1.0, hi, 4, 0.3),
      { g: J(ico(0.2, 0), 0.12, 5), c: moss, m: mul(T(0.5, 0.42, 0.18), S(1.4, 0.4, 1.2)), sh: 0.5 },
    ]);
  },
  flower(p) {
    return merge([
      { g: cyl(0.02, 0.025, 0.4, 4), c: 0x3b9b4d, m: T(0, 0.2, 0) },
      { g: ico(0.1, 0), c: p.flower || 0xff7ab8, m: T(0, 0.44, 0) },
      { g: ico(0.05, 0), c: 0xffe27a, m: T(0, 0.52, 0) },
    ]);
  },
  tuft(p) {
    return merge([
      { g: cone(0.09, 0.5, 4), c: p.tuft || 0x62d27b, m: T(0, 0.25, 0) },
      { g: cone(0.08, 0.4, 4), c: p.tuft2 || 0x7ee590, m: T(0.1, 0.2, 0.05) },
      { g: cone(0.08, 0.45, 4), c: p.tuft || 0x62d27b, m: T(-0.08, 0.22, -0.06) },
    ]);
  },
  mushroom(p) {
    return merge([
      { g: J(cyl(0.11, 0.17, 0.7, 7), 0.04, 1), c: 0xf3ead0, m: T(0, 0.35, 0) },
      { g: J(ico(0.5, 1), 0.08, 2), c: p.cap || 0xff6a9b, m: mul(T(0, 0.8, 0), S(1, 0.55, 1)), sh: 0.4 },
      { g: ico(0.1, 0), c: 0xffffff, m: T(0.22, 0.98, 0.1) },
      { g: ico(0.07, 0), c: 0xffffff, m: T(-0.18, 0.95, -0.2) },
    ]);
  },
  crystal(p) {
    return merge([
      { g: J(cone(0.28, 1.6, 5), 0.04, 1), c: p.crystal || 0x7fd8ff, m: mul(T(0, 0.8, 0), RZ(0.05)), sh: 0.5 },
      { g: J(cone(0.2, 1.0, 5), 0.04, 2), c: p.crystal2 || 0xb7a8ff, m: mul(T(0.4, 0.5, 0.1), RZ(-0.3)), sh: 0.5 },
      { g: J(cone(0.18, 0.8, 5), 0.04, 3), c: p.crystal || 0x7fd8ff, m: mul(T(-0.3, 0.4, -0.2), RZ(0.35)), sh: 0.5 },
    ]);
  },
  // fluted column: stepped base, tapered shaft with a weathered band, capital with an abacus slab
  pillar(p) {
    const st = p.stone || 0xb9b6c8, st2 = p.stone2 || 0xd2cfe0;
    return merge([
      { g: J(box(1.5, 0.22, 1.5), 0.04, 1), c: shade(st, 0.9), m: T(0, 0.11, 0), sh: 0.3 },
      { g: J(box(1.2, 0.2, 1.2), 0.04, 2), c: st, m: T(0, 0.32, 0), sh: 0.3 },
      { g: J(cyl(0.38, 0.46, 2.45, 10), 0.04, 3), c: st2, m: T(0, 1.65, 0), sh: 0.25 },
      { g: J(cyl(0.4, 0.47, 0.5, 10), 0.05, 4), c: shade(st2, 0.82), m: T(0, 0.67, 0), sh: 0.2 },
      { g: J(cyl(0.5, 0.4, 0.24, 10), 0.03, 5), c: st, m: T(0, 2.98, 0), sh: 0.3 },
      { g: J(box(1.15, 0.2, 1.15), 0.04, 6), c: shade(st, 1.05), m: T(0, 3.2, 0), sh: 0.3 },
    ]);
  },
  // broken column with a jagged top and a fallen drum beside it
  ruin(p) {
    const st = p.stone || 0xb9b6c8, st2 = p.stone2 || 0xd2cfe0, moss = p.moss || 0x6aa85c;
    return merge([
      { g: J(box(1.5, 0.22, 1.5), 0.05, 1), c: shade(st, 0.9), m: T(0, 0.11, 0), sh: 0.3 },
      { g: J(cyl(0.38, 0.46, 1.5, 9), 0.1, 3), c: st2, m: T(0, 0.95, 0), sh: 0.25 },
      { g: J(cone(0.4, 0.5, 6), 0.18, 4), c: shade(st2, 0.95), m: T(0.05, 1.8, 0), sh: 0.3 },
      { g: J(cyl(0.4, 0.4, 0.8, 9), 0.06, 5), c: st2, m: mul(T(1.2, 0.4, 0.6), RZ(Math.PI / 2), RY(0.5)), sh: 0.3 },
      { g: J(ico(0.45, 0), 0.2, 6), c: moss, m: mul(T(0, 0.3, 0.1), S(1.3, 0.4, 1.3)), sh: 0.4 },
      { g: J(ico(0.3, 0), 0.15, 7), c: shade(st, 0.95), m: T(-0.8, 0.15, 0.7), sh: 0.4 },
    ]);
  },
  // a real arch: two pillars joined by wedge stones over a semicircle, with a keystone
  archgate(p) {
    const st = p.stone || 0x5a4a6a, st2 = p.stone2 || 0x7a6a8a, W = 8, R = 3.6, H = 7;
    const parts = [];
    for (const s of [-1, 1]) {
      parts.push({ g: J(box(2.0, 0.5, 2.4), 0.05, 1), c: shade(st, 0.85), m: T(s * (R + 0.9), 0.25, 0) });
      parts.push({ g: J(box(1.6, H, 2.0), 0.06, 2), c: st2, m: T(s * (R + 0.9), H / 2 + 0.4, 0), sh: 0.2 });
      parts.push({ g: J(box(2.0, 0.4, 2.4), 0.05, 3), c: st, m: T(s * (R + 0.9), H + 0.6, 0) });
    }
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = Math.PI - (i + 0.5) * (Math.PI / n);
      const key = i === (n - 1) / 2;
      parts.push({ g: J(box(1.15, key ? 1.7 : 1.4, 2.1), 0.05, 10 + i), c: key ? shade(st2, 1.18) : (i % 2 ? st : st2), m: mul(T(Math.cos(a) * R, H + 0.7 + Math.sin(a) * R, 0), RZ(a - Math.PI / 2)), sh: 0.3 });
    }
    parts.push({ g: J(box(2 * (R + 1.8), 0.5, 2.5), 0.05, 40), c: st, m: T(0, 0.15, 0), sh: 0.2 });
    return merge(parts);
  },
  // ambient globe lamp: round frosted globe on a curved neck (deliberately NOT the checkpoint pole)
  lamppost(p) {
    return merge([
      { g: cyl(0.14, 0.2, 0.2, 7), c: 0x4a4258, m: T(0, 0.1, 0) },
      { g: cyl(0.04, 0.055, 1.7, 6), c: 0x5a4a3a, m: T(0, 1.05, 0) },
      { g: cyl(0.035, 0.035, 0.5, 5), c: 0x5a4a3a, m: mul(T(0.2, 1.88, 0), RZ(-1.0)) },
      { g: cyl(0.1, 0.07, 0.1, 6), c: 0xc08a3a, m: T(0.4, 2.0, 0) },
      { g: ico(0.24, 1), c: p.lamp || 0xfff1b8, m: T(0.4, 2.26, 0), sh: 0 },
    ]);
  },
};

const HELP = { merge, J, T, S, RY, RZ, RX, mul, cone, cyl, ico, box, shade, THREE };
Object.assign(KINDS, landmarkKinds(HELP));
const ANIM = landmarkAnim(HELP);

export function buildDecor(spec, theme) {
  const group = new THREE.Group();
  const byKind = {};
  for (const d of spec.decor) (byKind[d.k] = byKind[d.k] || []).push(d);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const tints = new THREE.Color();
  const anims = [];
  for (const [k, list] of Object.entries(byKind)) {
    if (ANIM[k]) { for (const d of list) { const a = ANIM[k](theme.palette || {}); const holder = new THREE.Group(); holder.position.set(d.x, d.y, d.z); holder.rotation.y = d.ry; holder.scale.setScalar(d.s); holder.add(a.obj); group.add(holder); anims.push(a); } continue; }
    if (!KINDS[k]) continue;
    const geo = KINDS[k](theme.palette || {});
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((d, i) => {
      q.setFromAxisAngle(up, d.ry); pos.set(d.x, d.y, d.z); sc.set(d.s * (0.92 + d.v * 0.16), d.s * (0.9 + d.v * 0.25), d.s * (0.92 + d.v * 0.16));
      m4.compose(pos, q, sc); im.setMatrixAt(i, m4);
      tints.setScalar(0.88 + d.v * 0.26); im.setColorAt(i, tints);
    });
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  }
  group.userData.update = (t) => { for (const a of anims) a.update(t); };
  return group;
}
