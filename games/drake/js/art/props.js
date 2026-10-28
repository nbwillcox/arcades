// Procedural props and creatures (all primitives, flat shaded).
import * as THREE from 'three';
import { T, Bm, ico as kico, sph, cone as kcone, ink, eye as keye, bake } from './kit.js';

const M = (c, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c, flatShading: true }, o));
const B = (c, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o));
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);

// ---- shared soft glow sprite texture
let _glowTex = null;
function glowTex() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  _glowTex = new THREE.CanvasTexture(c); return _glowTex;
}
const glowSprite = (color, scale, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.setScalar(scale); return s;
};


// small helpers for the prop art below
function jit(g, a, seed = 0) {
  const p = g.attributes.position, h = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x + (h(x + seed, y, z) - 0.5) * a, y + (h(y + seed, z, x) - 0.5) * a, z + (h(z + seed, x, y) - 0.5) * a); }
  g.computeVertexNormals(); return g;
}
const shadeHex = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

export const GEM_COLORS = { 1: 0xff4d6a, 2: 0x3ee07f, 5: 0x4da6ff, 10: 0xffd23e, 25: 0xd36bff };
export const GEM_TIERS = [25, 10, 5, 2, 1];

// A faceted gem: flat table, flared crown, girdle, pavilion to a point. Six sides so every facet reads clearly.
// Facets are shaded by baked vertex colour (bright crown, mid girdle, deep pavilion, alternating sides) and the
// instance colour tints them. No specular: it only produced stray white streaks. A little emissive keeps it glowing in shade.
function gemGeometry() {
  const pts = [[0, 0.4], [0.12, 0.4], [0.27, 0.26], [0.3, 0.17], [0.3, 0.12], [0.15, -0.1], [0, -0.38]].map(([r, y]) => new THREE.Vector2(r, y));
  let g = new THREE.LatheGeometry(pts, 6);
  g = g.toNonIndexed();
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), n = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    n.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    const cy = (a.y + b.y + c.y) / 3, ang = Math.atan2((a.x + b.x + c.x) / 3, (a.z + b.z + c.z) / 3);
    const side = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 6 + 0.01) % 2 ? 0.9 : 1.08;
    let k = cy > 0.25 ? 1.35 : cy > 0.1 ? 1.08 : cy > -0.1 ? 0.88 : 0.7;
    k *= side;
    for (let j = 0; j < 3; j++) { col[(i + j) * 3] = k; col[(i + j) * 3 + 1] = k; col[(i + j) * 3 + 2] = k; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.scale(1.15, 1.15, 1.15);
  return g;
}

export function makeGemInstances(count) {
  const g = gemGeometry();
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor * 0.5;');
  };
  const im = new THREE.InstancedMesh(g, m, count);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  im.frustumCulled = false;
  im.count = 0;
  return im;
}

// Supply crates in three finishes (raw timber, red-painted, teal-painted) with iron corner brackets, a rope band,
// a lid with cross-planks and a gold gem stencil so they read as "loot inside".
const CRATE_STYLES = [{ plank: 0xc98a4b, plank2: 0xb67a40, trim: 0x6b3f1a }, { plank: 0xc4503e, plank2: 0xad4434, trim: 0xf4e8d0 }, { plank: 0x3fae96, plank2: 0x35998a, trim: 0xf4e8d0 }];
export function makeCrate() {
  const g = new THREE.Group();
  const st = CRATE_STYLES[Math.floor(Math.random() * CRATE_STYLES.length)];
  const plank = M(st.plank), plank2 = M(st.plank2), trim = M(st.trim), iron = M(0x3d3a4a), gold = M(0xffd23e), rope = M(0xd8c7a0);
  g.add(mesh(new THREE.BoxGeometry(0.86, 0.86, 0.86), plank2, 0, 0.45, 0));
  for (const [rx, rz, ry] of [[0, 0.44, 0], [0, -0.44, 0], [0.44, 0, Math.PI / 2], [-0.44, 0, Math.PI / 2]]) {
    const holder = new THREE.Group(); holder.position.set(rx, 0, rz); holder.rotation.y = ry; g.add(holder);
    for (let i = 0; i < 4; i++) holder.add(mesh(new THREE.BoxGeometry(0.84, 0.2, 0.05), i % 2 ? plank : plank2, 0, 0.13 + i * 0.21, 0));
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), trim, 0.43 * sx, 0.45, 0.43 * sz));
    for (const y of [0.06, 0.84]) { g.add(mesh(new THREE.BoxGeometry(0.2, 0.06, 0.2), iron, 0.4 * sx, y, 0.4 * sz)); g.add(mesh(ico(0.035, 0), gold, 0.5 * sx, y, 0.4 * sz), mesh(ico(0.035, 0), gold, 0.4 * sx, y, 0.5 * sz)); }
  }
  // rope band with a knot
  for (const [w, d, x, z] of [[0.96, 0.05, 0, 0.47], [0.96, 0.05, 0, -0.47], [0.05, 0.96, 0.47, 0], [0.05, 0.96, -0.47, 0]]) g.add(mesh(new THREE.BoxGeometry(w, 0.07, d), rope, x, 0.5, z));
  g.add(mesh(ico(0.07, 0), rope, 0.2, 0.52, 0.5), mesh(ico(0.05, 0), rope, 0.28, 0.45, 0.5));
  // gem stencil on the front
  const d = mesh(new THREE.OctahedronGeometry(0.17, 0), gold, 0, 0.3, 0.485); d.scale.set(1, 1.3, 0.25); g.add(d);
  g.add(mesh(new THREE.BoxGeometry(0.46, 0.46, 0.02), M(0x3a2a18), 0, 0.3, 0.472));
  // lid
  g.add(mesh(new THREE.BoxGeometry(0.98, 0.1, 0.98), trim, 0, 0.9, 0));
  for (const s of [-1, 1]) { const b = mesh(new THREE.BoxGeometry(0.08, 0.05, 1.04), plank, 0, 0.96, 0); b.rotation.y = s * Math.PI / 4; b.scale.x = 1; g.add(b); }
  g.rotation.y = (Math.random() - 0.5) * 0.4;
  return g;
}

// A glazed clay pot: foot ring, round belly with a painted band, narrow neck, flared lip and two loop handles.
const POT_GLAZES = [[0x5b86d8, 0xffd23e], [0xd9784a, 0x3b2a1a], [0x3fae96, 0xf4f0d8], [0x9a62c8, 0xffe27a], [0xc94a5a, 0xf4f0d8]];
export function makeVase() {
  const g = new THREE.Group();
  const [glaze, trim] = POT_GLAZES[Math.floor(Math.random() * POT_GLAZES.length)];
  const prof = [[0, 0], [0.22, 0], [0.27, 0.05], [0.4, 0.2], [0.5, 0.42], [0.47, 0.62], [0.33, 0.8], [0.22, 0.92], [0.2, 1.02], [0.3, 1.1], [0.3, 1.16], [0.22, 1.12], [0.14, 1.0], [0, 0.9]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(mesh(new THREE.LatheGeometry(prof, 10), M(glaze, { side: THREE.DoubleSide }), 0, 0, 0));
  g.add(mesh(new THREE.TorusGeometry(0.485, 0.04, 5, 14).rotateX(Math.PI / 2), M(trim), 0, 0.45, 0));
  g.add(mesh(new THREE.TorusGeometry(0.44, 0.03, 5, 14).rotateX(Math.PI / 2), M(trim), 0, 0.56, 0));
  g.add(mesh(new THREE.TorusGeometry(0.3, 0.035, 5, 12).rotateX(Math.PI / 2), M(trim), 0, 1.14, 0));
  // zig-zag pattern band
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const t = mesh(new THREE.ConeGeometry(0.05, 0.1, 3), M(trim), Math.cos(a) * 0.49, 0.5 + (i % 2) * 0.03, Math.sin(a) * 0.49); t.rotation.set(0, -a, Math.PI / 2); t.lookAt(Math.cos(a) * 2, 0.5, Math.sin(a) * 2); g.add(t); }
  for (const s of [-1, 1]) { const h = mesh(new THREE.TorusGeometry(0.15, 0.035, 5, 8, Math.PI), M(shadeHex(glaze, 0.85)), 0.26 * s, 0.9, 0); h.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; h.rotation.y = 0; g.add(h); }
  g.rotation.y = Math.random() * 6.28;
  return g;
}

export function makeChest() {
  const g = new THREE.Group();
  const wood = M(0x7b4a2a), wood2 = M(0x8e5a32), iron = M(0x3d3a4a), gold = M(0xffd23e);
  // body (open top so the inside can glow when the lid lifts)
  g.add(mesh(new THREE.BoxGeometry(1.14, 0.1, 0.74), wood, 0, 0.05, 0));
  g.add(mesh(new THREE.BoxGeometry(1.1, 0.46, 0.08), wood, 0, 0.3, 0.33), mesh(new THREE.BoxGeometry(1.1, 0.46, 0.08), wood, 0, 0.3, -0.33));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.46, 0.7), wood, 0.51, 0.3, 0), mesh(new THREE.BoxGeometry(0.08, 0.46, 0.7), wood, -0.51, 0.3, 0));
  for (const x of [-0.34, 0.34]) g.add(mesh(new THREE.BoxGeometry(0.1, 0.5, 0.8), iron, x, 0.29, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(ico(0.06, 0), gold, 0.55 * sx, 0.5, 0.36 * sz), mesh(ico(0.06, 0), gold, 0.55 * sx, 0.08, 0.36 * sz));
  // treasure inside: golden glow plane + a little heap of gold
  const inner = mesh(new THREE.BoxGeometry(1.0, 0.04, 0.6), new THREE.MeshBasicMaterial({ color: 0xffd23e }), 0, 0.46, 0); g.add(inner);
  const heap = new THREE.Group(); heap.position.y = 0.5; heap.visible = false; g.add(heap);
  for (let i = 0; i < 7; i++) { const c = mesh(ico(0.1 + (i % 3) * 0.02, 0), B(i % 2 ? 0xffe27a : 0xffc23e), (i - 3) * 0.13, (i % 3) * 0.04, Math.sin(i * 2) * 0.12); heap.add(c); }
  // lid: half cylinder with iron straps and a lock plate, hinged at the back
  const lid = new THREE.Group(); lid.position.set(0, 0.53, -0.34); g.add(lid);
  const half = new THREE.CylinderGeometry(0.37, 0.37, 1.12, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2);
  lid.add(mesh(half, wood2, 0, 0, 0.34));
  for (const x of [-0.34, 0.34]) lid.add(mesh(new THREE.CylinderGeometry(0.385, 0.385, 0.1, 10, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).translate(x, 0, 0), iron, 0, 0, 0.34));
  lid.add(mesh(new THREE.BoxGeometry(0.2, 0.22, 0.06), gold, 0, 0.0, 0.73));
  lid.add(mesh(ico(0.04, 0), B(0x2a1a0a), 0, -0.02, 0.77));
  // glow
  const glow = glowSprite(0xffd860, 0.1, 0); glow.position.y = 0.75; g.add(glow);
  const rays = glowSprite(0xfff2b0, 0.1, 0); rays.position.y = 1.1; g.add(rays);
  g.userData.lid = lid;
  g.userData.setOpen = (k, t) => {
    const e = 1 - Math.pow(1 - k, 3), over = k >= 1 ? Math.sin(t * 5) * 0.02 : Math.sin(k * Math.PI) * 0.12;
    lid.rotation.x = -(1.95 * e + over);
    heap.visible = k > 0.15; heap.position.y = 0.5 + e * 0.12;
    glow.material.opacity = Math.min(0.95, k * 1.2) * (0.85 + Math.sin(t * 4) * 0.1); glow.scale.setScalar(0.6 + e * 2.6);
    rays.material.opacity = Math.min(0.7, k) * (0.7 + Math.sin(t * 6) * 0.2); rays.scale.setScalar(0.4 + e * 1.6);
  };
  // closed chests give off a faint golden shimmer so they read as treasure
  g.userData.shimmer = (t) => { glow.material.opacity = 0.14 + Math.sin(t * 2.4) * 0.07; glow.scale.setScalar(1.3 + Math.sin(t * 2.4) * 0.1); };
  return g;
}

// A wrought-iron pole light: stone foot, banded pole, glass lantern with a flame inside, roof and finial.
// Dark and cool until you touch or flame it (then it lights, pools gold light on the ground and becomes a checkpoint).
export function makeLantern() {
  const g = new THREE.Group();
  const stone = M(0x6c6480), iron = M(0x2e2a3c), gold = M(0xffd36a), roof = M(0x3b3052);
  g.add(mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.22, 8), stone, 0, 0.11, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.22, 8), M(0x857c9c), 0, 0.33, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.075, 1.75, 8), iron, 0, 1.2, 0));
  for (const y of [0.55, 1.2, 1.85]) g.add(mesh(new THREE.TorusGeometry(0.075, 0.025, 5, 10).rotateX(Math.PI / 2), gold, 0, y, 0));
  // curled brackets under the lantern
  for (const s of [-1, 1]) { const arm = mesh(new THREE.TorusGeometry(0.16, 0.02, 5, 10, Math.PI * 0.9), iron, 0.1 * s, 1.88, 0); arm.rotation.z = s > 0 ? 0.2 : Math.PI - 0.2; g.add(arm); }
  const cage = new THREE.Group(); cage.position.y = 2.2; g.add(cage);
  cage.add(mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.08, 6), iron, 0, -0.27, 0));
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x5a6a90, transparent: true, opacity: 0.55, depthWrite: false });
  cage.add(mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.5, 6, 1, true), glassMat, 0, 0, 0));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; cage.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.52, 4), iron, Math.cos(a) * 0.235, 0, Math.sin(a) * 0.235)); }
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x7a86b0 });
  const flame = mesh(new THREE.ConeGeometry(0.1, 0.32, 6), flameMat, 0, -0.03, 0); cage.add(flame);
  cage.add(mesh(new THREE.ConeGeometry(0.34, 0.26, 6), roof, 0, 0.38, 0), mesh(new THREE.TorusGeometry(0.28, 0.03, 4, 6).rotateX(Math.PI / 2), gold, 0, 0.27, 0), mesh(ico(0.06, 0), gold, 0, 0.56, 0));
  const halo = glowSprite(0xffc860, 2.2, 0); halo.position.y = 2.2; g.add(halo);
  const hint = glowSprite(0x9ab4ff, 0.9, 0.3); hint.position.y = 2.2; g.add(hint);
  const beam = mesh(new THREE.CylinderGeometry(0.1, 0.18, 3.4, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x9ab4ff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 0, 4.1, 0); g.add(beam);
  const pool = mesh(new THREE.CircleGeometry(2.4, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.07, 0); g.add(pool);
  g.userData.lamp = flame;
  g.userData.setLit = (on) => { glassMat.color.setHex(on ? 0xffe9a8 : 0x5a6a90); glassMat.opacity = on ? 0.35 : 0.55; flameMat.color.setHex(on ? 0xfff0b0 : 0x7a86b0); hint.visible = !on; beam.visible = !on; };
  g.userData.tick = (t, lit, seed = 0) => {
    if (!lit) { const p = 0.5 + Math.sin(t * 2 + seed) * 0.5; hint.material.opacity = 0.12 + p * 0.28; hint.scale.setScalar(0.8 + p * 0.3); beam.material.opacity = 0.1 + p * 0.16; halo.material.opacity = 0; pool.material.opacity = 0; return; }
    const f = 1 + Math.sin(t * 13 + seed) * 0.08 + Math.sin(t * 7.3 + seed) * 0.06;
    flame.scale.set(f, 0.9 + (f - 1) * 3, f);
    halo.material.opacity = 0.7 + Math.sin(t * 9 + seed) * 0.08; halo.scale.setScalar(2.3 * f);
    pool.material.opacity = 0.2 + Math.sin(t * 11 + seed) * 0.03;
  };
  return g;
}

function miniDrake(body, belly, wing, horn) {
  const g = new THREE.Group();
  const bm = M(body), be = M(belly), wm = M(wing, { side: THREE.DoubleSide });
  const torso = mesh(ico(0.5, 1), bm, 0, 0.62, 0); torso.scale.set(1, 0.85, 1.35); g.add(torso);
  const bel = mesh(ico(0.42, 1), be, 0, 0.5, 0.12); bel.scale.set(0.9, 0.6, 1.2); g.add(bel);
  const head = mesh(ico(0.34, 1), bm, 0, 1.08, 0.8); g.add(head);
  const snout = mesh(ico(0.2, 1), be, 0, -0.08, 0.3); snout.scale.set(1, 0.75, 1.2); head.add(snout);
  for (const s of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), B(0xffffff), 0.14 * s, 0.1, 0.2), mesh(new THREE.SphereGeometry(0.05, 6, 5), B(0x1a1a2a), 0.15 * s, 0.1, 0.27));
    const hn = mesh(new THREE.ConeGeometry(0.07, 0.34, 5), M(horn), 0.13 * s, 0.3, -0.05); hn.rotation.x = -0.5; hn.rotation.z = -0.2 * s; head.add(hn);
    const w = mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.9, 0.35, -0.2, 0.7, 0.0, -0.7, 0, 0, 0, 0.7, 0.0, -0.7, 0.2, 0, -0.55], 3)), wm, 0.28 * s, 0.95, -0.05);
    w.geometry.computeVertexNormals(); w.scale.x = s; w.rotation.z = 0.25 * s; g.add(w);
    for (const z of [-0.3, 0.38]) g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.34, 6), bm, 0.3 * s, 0.17, z), mesh(ico(0.12, 0), be, 0.3 * s, 0.05, z + 0.05));
  }
  let y = 0.55, z = -0.62, r = 0.28;
  for (let i = 0; i < 5; i++) { g.add(mesh(ico(r, 1), i % 2 ? be : bm, 0, y, z)); z -= r * 1.1; y += 0.02 + i * 0.03; r *= 0.78; }
  g.add(mesh(ico(0.1, 0), B(0xffd36a), 0, y + 0.02, z - 0.05));
  return g;
}

export function makeElder() {
  const g = new THREE.Group();
  // crystal prison: a faceted spire with the elder drake frozen inside
  const crystal = new THREE.Group(); g.add(crystal);
  const shellM = new THREE.MeshLambertMaterial({ color: 0x8fe9ff, flatShading: true, transparent: true, opacity: 0.5, emissive: 0x2a8aa8, depthWrite: false });
  const frozen = miniDrake(0x8a9ab8, 0xb8c4d8, 0x7a8aa8, 0xdde6f2); frozen.scale.setScalar(1.05); frozen.position.y = 0.25; crystal.add(frozen);
  crystal.add(mesh(jit(new THREE.CylinderGeometry(1.0, 1.25, 2.1, 6), 0.1, 2), shellM, 0, 1.15, 0), mesh(jit(new THREE.ConeGeometry(1.0, 1.1, 6), 0.1, 3), shellM, 0, 2.75, 0));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.4, r = 1.35 + (i % 2) * 0.25; const s = mesh(jit(new THREE.ConeGeometry(0.3, 1.1 + (i % 3) * 0.4, 5), 0.06, 10 + i), shellM, Math.cos(a) * r, 0.5, Math.sin(a) * r); s.rotation.z = Math.cos(a) * 0.35; s.rotation.x = -Math.sin(a) * 0.35; crystal.add(s); }
  const sparkle = glowSprite(0xbff4ff, 4.0, 0.35); sparkle.position.y = 1.5; crystal.add(sparkle);
  // freed elder: golden drake with a glow
  const free = new THREE.Group(); free.visible = false; g.add(free);
  const gold = miniDrake(0xffb23e, 0xffe3a8, 0xff8a3e, 0xffffff); gold.scale.setScalar(1.55); free.add(gold);
  free.add(glowSprite(0xffd860, 5.0, 0.45).translateY(1.2));
  g.userData.crystal = crystal; g.userData.free = free;
  return g;
}

export { makeEnemy } from './enemies.js';

// Glowmoth: fuzzy body, antennae, and two scalloped wing pairs with a cool-to-violet edge.
let mothWing = null;
function mothWingGeometry() {
  if (mothWing) return mothWing;
  const root = new THREE.Color(0xe8fdff), mid = new THREE.Color(0x7be8ff), edge = new THREE.Color(0xb48cff);
  const pos = [], col = [];
  const tri = (a, ca, b, cb, c, cc) => { for (const [v, cl] of [[a, ca], [b, cb], [c, cc]]) { pos.push(...v); col.push(cl.r, cl.g, cl.b); } };
  const O = [0, 0, 0.0];
  // forewing: leading edge swept forward, scalloped outer edge
  const fore = [[0.16, 0.01, 0.17], [0.3, 0.02, 0.14], [0.37, 0.02, 0.05], [0.34, 0.0, -0.05], [0.2, 0, -0.04]];
  for (let i = 0; i < fore.length - 1; i++) tri(O, root, fore[i], i % 2 ? edge : mid, fore[i + 1], (i + 1) % 2 ? edge : mid);
  // hindwing: shorter, rounder, tucked behind
  const hind = [[0.2, 0, -0.05], [0.3, 0, -0.14], [0.24, 0, -0.24], [0.12, 0, -0.26], [0.04, 0, -0.14]];
  for (let i = 0; i < hind.length - 1; i++) tri(O, root, hind[i], i % 2 ? mid : edge, hind[i + 1], (i + 1) % 2 ? mid : edge);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  mothWing = g;
  return g;
}

export function makeMoth() {
  const g = new THREE.Group();
  const wingMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
  const geo = mothWingGeometry();
  const wl = new THREE.Group(), wr = new THREE.Group();
  wl.add(new THREE.Mesh(geo, wingMat));
  const mirror = new THREE.Mesh(geo, wingMat); mirror.scale.x = -1; wr.add(mirror);
  g.add(wl, wr);
  // body, head and antennae merged into one mesh
  const fur = Bm(0xffffff), dark = Bm(0x3a3a66);
  const thorax = mesh(ico(0.07, 1), fur, 0, 0, 0.02); thorax.scale.set(0.9, 0.9, 1.3);
  const head = mesh(ico(0.045, 1), fur, 0, 0.01, 0.13);
  const body = new THREE.Group(); body.add(thorax, head, mesh(ico(0.012, 0), dark, 0.03, 0.03, 0.17), mesh(ico(0.012, 0), dark, -0.03, 0.03, 0.17));
  for (const s of [-1, 1]) { const a = mesh(kcone(0.006, 0.16, 3), dark, 0.05 * s, 0.1, 0.2); a.rotation.set(-0.9, 0, -0.5 * s); body.add(a); }
  g.add(bake(body)); 
  g.userData.wl = wl; g.userData.wr = wr;
  return g;
}

export function makeBolt() { return mesh(ico(0.16, 1), B(0xff5fb0)); }

// Wick: a firefly. The glowing abdomen ("core") and halo are recoloured by the game to show health.
export function makeWick() {
  const g = new THREE.Group();
  const core = mesh(ico(0.1, 2), B(0xffe27a), 0, -0.025, -0.08); core.scale.set(0.95, 0.9, 1.3); g.add(core);
  // dark thorax, head, antennae and legs (merged)
  const shell = T(0x6a5ea0), horn = T(0x4a4078);
  const parts = new THREE.Group();
  const thorax = mesh(kico(0.055, 1), shell, 0, 0.0, 0.05); thorax.scale.set(1, 0.9, 1.1);
  const head = mesh(kico(0.04, 1), shell, 0, 0.005, 0.12);
  parts.add(ink(thorax, 0.12), ink(head, 0.14));
  for (const s of [-1, 1]) {
    parts.add(mesh(sph(0.016, 6, 5), Bm(0xffffff), 0.026 * s, 0.025, 0.15), mesh(sph(0.008, 5, 4), Bm(0x111122), 0.026 * s, 0.025, 0.162));
    const an = mesh(kcone(0.005, 0.12, 3), horn, 0.03 * s, 0.07, 0.17); an.rotation.set(-1.0, 0, -0.45 * s); parts.add(an);
    for (const z of [0.0, 0.05]) { const lg = mesh(kcone(0.005, 0.07, 3), horn, 0.04 * s, -0.045, z); lg.rotation.z = 0.7 * s; parts.add(lg); }
  }
  g.add(bake(parts));
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color: 0xffd860, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.position.z = -0.05; halo.scale.setScalar(0.9); g.add(halo);
  // veined wings that flap about their root (the game rotates wl/wr around z)
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.16, 0.1, 0.02, 0.26, 0.06, -0.02, 0.22, 0.0, -0.06, 0.08, -0.01, -0.04], 3));
  wingGeo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4]);
  const wm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const wl = new THREE.Group(), wr = new THREE.Group();
  wl.position.set(0.03, 0.045, 0.02); wr.position.set(-0.03, 0.045, 0.02);
  wl.add(new THREE.Mesh(wingGeo, wm));
  const mw = new THREE.Mesh(wingGeo, wm); mw.scale.x = -1; wr.add(mw);
  g.add(wl, wr);
  g.userData = { core, halo, wl, wr };
  return g;
}

// A stone portal gateway: carved pillars with pennants, a gold ring, a swirling disc, a rotating glyph ring on the dais,
// a floating keystone and a light beam so it can be spotted from far away. Locked portals go dark and wear chains and a padlock.
function spiralTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.translate(128, 128); x.lineCap = 'round';
  for (let arm = 0; arm < 4; arm++) {
    for (let r = 6; r < 124; r += 2) {
      const a = r * 0.052 + arm * Math.PI / 2, f = r / 124;
      x.strokeStyle = `rgba(255,255,255,${0.55 * (1 - f * 0.55) * Math.min(1, r / 24)})`; x.lineWidth = 3 + f * 9;
      x.beginPath(); x.moveTo(Math.cos(a) * r, Math.sin(a) * r); x.lineTo(Math.cos(a + 0.05) * (r + 2), Math.sin(a + 0.05) * (r + 2)); x.stroke();
    }
  }
  const gr = x.createRadialGradient(0, 0, 0, 0, 0, 40); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(-128, -128, 256, 256);
  return new THREE.CanvasTexture(c);
}
function glyphTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  x.translate(256, 256); x.strokeStyle = '#fff'; x.lineWidth = 7; x.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    x.save(); x.rotate((i / 16) * Math.PI * 2); x.translate(0, -214);
    const s = (n) => Math.sin(i * 12.9 + n) * 0.5 + 0.5;
    x.beginPath(); x.moveTo(-10, -20 + s(1) * 8); x.lineTo(10 * (s(2) - 0.5) * 2, 0); x.lineTo(-8, 20 - s(3) * 8); x.moveTo(0, -22); x.lineTo(0, 22); if (s(4) > 0.5) { x.moveTo(-12, 4); x.lineTo(12, -6); } x.stroke();
    x.restore();
  }
  x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 250, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, 176, 0, 7); x.stroke();
  return new THREE.CanvasTexture(c);
}
let _spiral = null, _glyph = null;
export function makePortal(color, label, sub = '') {
  const g = new THREE.Group();
  _spiral = _spiral || spiralTex(); _glyph = _glyph || glyphTex();
  const stone = M(0x6c6480), stone2 = M(0x8a82a2), dark = M(0x4a4262), gold = M(0xffd36a), iron = M(0x2e2a3c);
  g.add(mesh(new THREE.CylinderGeometry(3.0, 3.3, 0.34, 10), dark, 0, 0.17, 0), mesh(new THREE.CylinderGeometry(2.5, 2.8, 0.26, 10), stone, 0, 0.47, 0));
  const glyphMat = new THREE.MeshBasicMaterial({ map: _glyph, color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const glyphs = mesh(new THREE.RingGeometry(1.1, 2.55, 48).rotateX(-Math.PI / 2), glyphMat, 0, 0.62, 0);
  // RingGeometry UVs are planar so the texture maps across the full square: scale it to the ring
  const uv = glyphs.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) { const x = glyphs.geometry.attributes.position.getX(i), z = glyphs.geometry.attributes.position.getZ(i); uv.setXY(i, 0.5 + x / 5.1, 0.5 + z / 5.1); }
  g.add(glyphs);
  const R = 2.0, cy = 2.9, px = R + 0.35;
  const pennants = [];
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(1.3, 0.55, 1.3), dark, s * px, 0.8, 0), mesh(new THREE.CylinderGeometry(0.42, 0.55, 4.0, 8), stone2, s * px, 2.8, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.6, 0.45, 0.32, 8), stone, s * px, 4.9, 0), mesh(new THREE.BoxGeometry(1.2, 0.22, 1.2), stone, s * px, 5.15, 0));
    g.add(mesh(new THREE.ConeGeometry(0.3, 0.8, 5), new THREE.MeshBasicMaterial({ color }), s * px, 5.7, 0), mesh(new THREE.TorusGeometry(0.46, 0.05, 5, 10).rotateX(Math.PI / 2), gold, s * px, 2.2, 0));
    for (const y of [1.4, 3.4]) g.add(mesh(new THREE.BoxGeometry(0.14, 0.5, 0.06), new THREE.MeshBasicMaterial({ color }), s * px, y, 0.5));
    const pen = mesh(new THREE.PlaneGeometry(0.7, 1.6, 1, 4), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }), s * px + s * 0.55, 4.0, 0); g.add(pen); pennants.push({ m: pen, s });
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4), iron, s * px + s * 0.3, 4.75, 0).rotateZ(Math.PI / 2 * 0));
  }
  const ring = mesh(new THREE.TorusGeometry(R, 0.2, 8, 36), gold, 0, cy, 0); g.add(ring);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.add(mesh(ico(0.07, 0), new THREE.MeshBasicMaterial({ color }), Math.cos(a) * R, cy + Math.sin(a) * R, 0.2)); }
  const glowRing = mesh(new THREE.TorusGeometry(R - 0.2, 0.08, 6, 36), new THREE.MeshBasicMaterial({ color }), 0, cy, 0); g.add(glowRing);
  const sp1 = mesh(new THREE.CircleGeometry(R - 0.2, 40), new THREE.MeshBasicMaterial({ map: _spiral, color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), 0, cy, 0); g.add(sp1);
  const sp2 = mesh(new THREE.CircleGeometry(R - 0.5, 40), new THREE.MeshBasicMaterial({ map: _spiral, color: 0xffffff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), 0, cy, 0.03); g.add(sp2);
  const disc = mesh(new THREE.CircleGeometry(R - 0.2, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), 0, cy, -0.02); g.add(disc);
  const key = mesh(new THREE.OctahedronGeometry(0.34, 0), new THREE.MeshBasicMaterial({ color }), 0, cy + R + 0.65, 0); key.scale.y = 1.5; g.add(key);
  const halo = glowSprite(color, 6.0, 0.45); halo.position.y = cy; g.add(halo);
  const beam = mesh(new THREE.CylinderGeometry(0.5, 1.3, 16, 12, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 8.4, 0); g.add(beam);
  const motes = [];
  for (let i = 0; i < 10; i++) { const m = glowSprite(color, 0.28, 0.9); g.add(m); motes.push({ m, a: Math.random() * 6.28, o: Math.random(), r: 0.6 + Math.random() * 1.2 }); }
  // locked state: padlock and chains across the opening
  const lock = new THREE.Group(); lock.visible = false; g.add(lock);
  for (const s of [-1, 1]) { const ch = mesh(new THREE.TorusGeometry(R - 0.1, 0.07, 5, 24, Math.PI * 0.9), iron, 0, cy, 0.06); ch.rotation.z = s * 0.5 + (s > 0 ? 0 : Math.PI) - 0.2; lock.add(ch); }
  for (let i = 0; i < 9; i++) { const l = mesh(new THREE.TorusGeometry(0.14, 0.04, 4, 8), iron, -1.6 + i * 0.4, cy + (i % 2 ? 0.1 : -0.1) + Math.sin(i * 0.7) * 0.15, 0.1); l.rotation.y = i % 2 ? 0 : Math.PI / 2; lock.add(l); }
  lock.add(mesh(new THREE.BoxGeometry(0.7, 0.6, 0.3), gold, 0, cy - 0.15, 0.14), mesh(new THREE.TorusGeometry(0.24, 0.07, 5, 10, Math.PI), gold, 0, cy + 0.15, 0.14), mesh(ico(0.07, 0), iron, 0, cy - 0.15, 0.3));
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const x = c.getContext('2d'); x.textAlign = 'center'; x.fillStyle = '#fff'; x.shadowColor = '#000'; x.shadowBlur = 8;
  x.font = 'bold 54px system-ui, sans-serif'; x.fillText(label, 256, 70);
  if (sub) { x.font = '600 36px system-ui, sans-serif'; x.fillStyle = '#ffe27a'; x.fillText(sub, 256, 124); }
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  spr.scale.set(5.4, 1.7, 1); spr.position.y = 7.3; g.add(spr);
  const tint = new THREE.Color(color), grey = new THREE.Color(0x5a5a70);
  let locked = false;
  g.userData.setLocked = (v) => {
    if (v === locked) return; locked = v; lock.visible = v;
    const c0 = v ? grey : tint;
    for (const m of [glyphMat, sp1.material, disc.material, halo.material, beam.material, glowRing.material, key.material]) m.color.copy(c0);
    beam.visible = !v; sp2.visible = !v; sp1.material.opacity = v ? 0.25 : 0.85; disc.material.opacity = v ? 0.08 : 0.25; spr.material.opacity = 1;
  };
  g.userData.spin = (t) => {
    sp1.rotation.z = locked ? t * 0.05 : t * 0.9; sp2.rotation.z = -t * 1.4; glyphs.rotation.y = locked ? 0 : t * 0.25; key.rotation.y = t * 1.2; key.position.y = cy + R + 0.65 + Math.sin(t * 2) * 0.1;
    if (!locked) { disc.material.opacity = 0.22 + Math.sin(t * 3) * 0.06; halo.material.opacity = 0.4 + Math.sin(t * 2.2) * 0.1; beam.material.opacity = 0.09 + Math.sin(t * 1.6) * 0.03; }
    pennants.forEach((p, i) => { const pos = p.m.geometry.attributes.position; for (let k = 0; k < pos.count; k++) { const y = pos.getY(k); pos.setZ(k, Math.sin(t * 4 + y * 3 + i) * 0.1 * (0.8 - y)); } pos.needsUpdate = true; });
    motes.forEach((m) => { const f = ((t * 0.35 + m.o) % 1), a = m.a + t * 0.8; m.m.position.set(Math.cos(a) * m.r, cy - 1.4 + f * 3.0, Math.sin(a) * 0.3); m.m.material.opacity = (locked ? 0.2 : 0.9) * Math.sin(f * Math.PI); });
  };
  g.userData.label = spr;
  return g;
}

export function makeSunstone() {
  const g = new THREE.Group();
  const core = mesh(jit(ico(0.42, 1), 0.1, 3), B(0xffd23e), 0, 0, 0); core.scale.set(0.8, 1.25, 0.8); g.add(core);
  const hot = mesh(ico(0.22, 1), B(0xfff6c0), 0, 0, 0); g.add(hot);
  const shell = mesh(jit(ico(0.6, 1), 0.12, 5), new THREE.MeshBasicMaterial({ color: 0xffa23e, transparent: true, opacity: 0.38, wireframe: true }), 0, 0, 0); shell.scale.set(0.82, 1.2, 0.82); g.add(shell);
  const shards = [];
  for (let i = 0; i < 5; i++) { const s = mesh(new THREE.OctahedronGeometry(0.1, 0), B(i % 2 ? 0xffe27a : 0xffb23e), 0, 0, 0); g.add(s); shards.push(s); }
  const halo = glowSprite(0xffc860, 3.2, 0.7); g.add(halo);
  const rays = glowSprite(0xfff2b0, 1.6, 0.5); g.add(rays);
  g.scale.setScalar(1.35);
  g.userData.spin = (t) => {
    core.rotation.y = t * 2; shell.rotation.y = -t * 1.4; shell.rotation.x = Math.sin(t) * 0.2;
    shards.forEach((s, i) => { const a = t * 1.8 + i * 1.256; s.position.set(Math.cos(a) * 0.62, Math.sin(t * 2 + i) * 0.35, Math.sin(a) * 0.62); s.rotation.set(t * 3, t * 2, 0); });
    halo.scale.setScalar(3.0 + Math.sin(t * 4) * 0.35); rays.material.opacity = 0.4 + Math.sin(t * 7) * 0.15;
  };
  return g;
}

export function makeVent(r, h) {
  const g = new THREE.Group();
  const stone = M(0x6f8aa8), dark = M(0x2f3a52);
  g.add(mesh(new THREE.CylinderGeometry(r * 1.0, r * 1.15, 0.3, 14), stone, 0, 0.15, 0), mesh(new THREE.TorusGeometry(r * 0.92, 0.1, 5, 18).rotateX(Math.PI / 2), M(0xa8c4e0), 0, 0.32, 0));
  g.add(mesh(new THREE.CircleGeometry(r * 0.85, 16).rotateX(-Math.PI / 2), dark, 0, 0.31, 0));
  for (let i = -3; i <= 3; i++) g.add(mesh(new THREE.BoxGeometry(r * 1.6 * Math.cos(Math.asin(Math.min(0.99, Math.abs(i) / 3.6))), 0.04, 0.09), M(0x8aa6c8), 0, 0.34, i * r * 0.22));
  const col = mesh(new THREE.CylinderGeometry(r * 0.9, r * 1.0, h, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), 0, h / 2 + 0.3, 0); g.add(col);
  const rings = [], streaks = [];
  for (let i = 0; i < 6; i++) { const ring = mesh(new THREE.TorusGeometry(r * 0.8, 0.06, 5, 20).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xeaffff, transparent: true, opacity: 0.6, depthWrite: false }), 0, 0, 0); g.add(ring); rings.push(ring); }
  for (let i = 0; i < 10; i++) { const s = mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }), 0, 0, 0); g.add(s); streaks.push({ m: s, a: (i / 10) * Math.PI * 2, o: Math.random() }); }
  const glow = glowSprite(0xbff4ff, r * 2.6, 0.5); glow.position.y = 0.6; g.add(glow);
  g.userData.spin = (t) => {
    rings.forEach((rg, i) => { const f = ((t * 0.5 + i / 6) % 1); rg.position.y = 0.4 + f * h; const s = 1 - f * 0.35; rg.scale.set(s, 1, s); rg.material.opacity = 0.7 * Math.sin(f * Math.PI); });
    streaks.forEach((s) => { const f = ((t * 0.7 + s.o) % 1), a = s.a + t * 1.6 + f * 2.5, rr = r * (0.75 - f * 0.25); s.m.position.set(Math.cos(a) * rr, 0.5 + f * h, Math.sin(a) * rr); s.m.material.opacity = 0.7 * Math.sin(f * Math.PI); });
    glow.material.opacity = 0.4 + Math.sin(t * 5) * 0.1;
  };
  return g;
}

export function makeSpring() {
  const g = new THREE.Group();
  const stone = M(0x6c6480), dark = M(0x4a4262), metal = M(0xc8ccd8), rim = M(0xffd23e);
  g.add(mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.22, 10), dark, 0, 0.11, 0), mesh(new THREE.CylinderGeometry(0.7, 0.82, 0.18, 10), stone, 0, 0.3, 0));
  const coil = new THREE.Group(); coil.position.y = 0.38; g.add(coil);
  for (let i = 0; i < 5; i++) { const t = mesh(new THREE.TorusGeometry(0.34, 0.06, 5, 12).rotateX(Math.PI / 2), metal, 0, 0.09 + i * 0.12, 0); t.rotation.y = i * 0.6; coil.add(t); }
  coil.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 5), M(0x8a8fa0), 0, 0.35, 0));
  const top = new THREE.Group(); top.position.y = 1.0; g.add(top);
  top.add(mesh(new THREE.CylinderGeometry(0.72, 0.66, 0.2, 12), M(0xff5a8f), 0, 0, 0), mesh(new THREE.TorusGeometry(0.7, 0.07, 5, 16).rotateX(Math.PI / 2), rim, 0, 0.06, 0));
  for (let i = 0; i < 3; i++) top.add(mesh(new THREE.ConeGeometry(0.2 - i * 0.04, 0.18, 4), B(0xfff2a0), 0, 0.14 + i * 0.12, 0));
  const glow = glowSprite(0xff7aa8, 1.6, 0.45); glow.position.y = 1.0; g.add(glow);
  g.userData.top = top; g.userData.coil = coil;
  g.userData.setSquash = (sq, t = 0) => { top.position.y = 1.0 - sq * 0.55; coil.scale.y = 1 - sq * 0.62; glow.material.opacity = 0.3 + sq * 0.5 + Math.sin(t * 4) * 0.08; };
  return g;
}

// Stone: a rough-laid wall of irregular blocks with a glowing crack (it will smash). Ice: a cluster of frozen crystal spikes.
export function makeBarrier(w, h, d, by) {
  const g = new THREE.Group(), root = new THREE.Group(); g.add(root);
  const along = w >= d, span = along ? w : d, thick = along ? d : w;
  if (!along) root.rotation.y = Math.PI / 2;
  if (by === 'flame') {
    const mat = new THREE.MeshLambertMaterial({ color: 0xaee8ff, flatShading: true, transparent: true, opacity: 0.82, emissive: 0x2a7a9a });
    const inner = new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.35, depthWrite: false });
    root.add(mesh(new THREE.BoxGeometry(span, 0.35, thick + 0.4), mat, 0, 0.17, 0));
    const n = Math.max(5, Math.round(span / 0.9));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n - 0.5, hh = h * (0.55 + 0.45 * Math.abs(Math.sin(i * 2.3 + 1))) * (1 - Math.abs(u) * 0.35), rr = 0.5 + 0.18 * Math.abs(Math.cos(i * 1.7));
      const c = mesh(new THREE.ConeGeometry(rr, hh, 5), mat, u * span, hh / 2 + 0.2, Math.sin(i * 3.1) * thick * 0.3); c.rotation.z = Math.sin(i * 1.9) * 0.12; c.rotation.x = Math.cos(i * 2.7) * 0.1; root.add(c);
      root.add(mesh(new THREE.ConeGeometry(rr * 0.45, hh * 0.8, 5), inner, c.position.x, hh * 0.45 + 0.2, c.position.z));
    }
    return g;
  }
  // ---- cracked stone wall: a fissure runs top to bottom with branches. Blocks along it are heaved out of line, the
  // top edge is broken, and a hot glow shows through the gap. Rubble piles up at the foot.
  const stones = [M(0x8e8480), M(0x9a908a), M(0x7f7672), M(0xa39a92)], mortar = M(0x4a423c), hot = new THREE.MeshBasicMaterial({ color: 0xff8a2a });
  const rows = Math.max(3, Math.round(h / 0.85)), rh = h / rows;
  // crack polyline (x,y in wall space), main fissure plus two branches
  const main = []; { let cx = -0.55; const n = 9; for (let i = 0; i <= n; i++) { const y = h * (0.97 - 0.94 * (i / n)); main.push([cx, y]); cx += Math.sin(i * 2.1 + 1.3) * 0.32 + 0.1; } }
  const br1 = [main[2], [main[2][0] - 0.55, main[2][1] - 0.25], [main[2][0] - 1.05, main[2][1] - 0.7], [main[2][0] - 1.35, main[2][1] - 1.25]];
  const br2 = [main[5], [main[5][0] + 0.5, main[5][1] - 0.2], [main[5][0] + 0.95, main[5][1] - 0.62], [main[5][0] + 1.4, main[5][1] - 0.7]];
  const dseg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)); return Math.hypot(px - (ax + dx * t), py - (ay + dy * t)); };
  const distCrack = (px, py) => { let d = 9; for (const pl of [main, br1, br2]) for (let i = 0; i < pl.length - 1; i++) d = Math.min(d, dseg(px, py, pl[i][0], pl[i][1], pl[i + 1][0], pl[i + 1][1])); return d; };
  // hot core visible through the gaps
  root.add(mesh(new THREE.BoxGeometry(span, h, thick * 0.55), mortar, 0, h / 2, 0));
  root.add(mesh(new THREE.BoxGeometry(span * 0.5, h * 0.92, thick * 0.3), hot, -0.3, h / 2, 0));
  for (let r = 0; r < rows; r++) {
    let x = -span / 2 + (r % 2 ? 0.45 : 0), i = 0;
    while (x < span / 2 - 0.05) {
      const bw = Math.min(span / 2 - x, 0.85 + 0.55 * Math.abs(Math.sin(r * 5.1 + i * 2.3))), hh = rh - 0.06 - 0.05 * Math.abs(Math.cos(i + r));
      const cx = x + bw / 2, cy = r * rh + rh / 2, dc = distCrack(cx, cy);
      x += bw; i++;
      // ragged top: the top row loses a few blocks near the fissure
      if (r === rows - 1 && dc < 0.75 && (i + r) % 2 === 0) continue;
      const g0 = jit(new THREE.BoxGeometry(bw - 0.06, hh, thick * (0.9 + 0.12 * Math.sin(i * 3 + r))), 0.07, i + r * 11);
      const b = mesh(g0, stones[(i + r) % 4], cx, cy, 0);
      b.rotation.y = Math.sin(i * 7 + r) * 0.03; b.rotation.z = Math.sin(i * 4 + r * 2) * 0.02;
      if (dc < 0.65) { // heaved out of line, tilted, a little loose
        const side = Math.sin(i * 5.3 + r) > 0 ? 1 : -1, k = 1 - dc / 0.65;
        b.position.z += side * (0.06 + 0.12 * k); b.position.x += Math.sin(i + r * 3) * 0.05; b.rotation.z += Math.sin(i * 3 + r) * 0.1 * k; b.rotation.y += side * 0.06 * k;
        b.material = stones[(i + r + 2) % 4];
      }
      root.add(b);
    }
  }
  // the fissure itself, on both faces: dark gash with a glowing seam and chipped bits beside it
  const gash = M(0x1a1410), splint = M(0x2a221c);
  for (const side of [1, -1]) {
    const z = side * (thick * 0.5 + 0.05);
    for (const [pl, wd] of [[main, 0.15], [br1, 0.1], [br2, 0.1]]) {
      for (let i = 0; i < pl.length - 1; i++) {
        const [ax, ay] = pl[i], [bx, by] = pl[i + 1], len = Math.hypot(bx - ax, by - ay), ang = -Math.atan2(bx - ax, by - ay), t = 1 - i / pl.length * 0.5;
        const dk = mesh(new THREE.BoxGeometry(wd * t, len + 0.06, 0.05), gash, (ax + bx) / 2, (ay + by) / 2, z); dk.rotation.z = ang; root.add(dk);
        const gl = mesh(new THREE.BoxGeometry(wd * t * 0.38, len + 0.03, 0.05), hot, (ax + bx) / 2, (ay + by) / 2, z + side * 0.012); gl.rotation.z = ang; root.add(gl);
        if (i % 2 === 0) { const ch = mesh(jit(new THREE.IcosahedronGeometry(0.1, 0), 0.05, i), splint, (ax + bx) / 2 + (i % 4 ? 0.16 : -0.14), (ay + by) / 2 - 0.05, z + side * 0.03); ch.scale.set(1, 0.8, 0.5); root.add(ch); }
      }
    }
    // hairline cracks across a few neighbouring blocks
    for (let k = 0; k < 5; k++) {
      const hx = main[1 + k][0] + (k % 2 ? 0.75 : -0.7), hy = main[1 + k][1];
      const sg = mesh(new THREE.BoxGeometry(0.035, 0.42, 0.03), gash, hx, hy, z - side * 0.02); sg.rotation.z = (k % 2 ? 0.5 : -0.5) + k * 0.2; root.add(sg);
    }
  }
  // rubble and fallen blocks at the foot, both sides
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.28, front = i % 2 ? 1 : -1, x = -1.4 + (i / 11) * 3.0 + Math.sin(i * 3.7) * 0.4, rr = 0.1 + 0.16 * Math.abs(Math.sin(i * 2.9));
    const r = mesh(jit(new THREE.IcosahedronGeometry(rr, 0), rr * 0.8, i), stones[i % 4], x, rr * 0.55, front * (thick * 0.5 + 0.3 + 0.35 * Math.abs(Math.sin(i * 1.9))));
    r.scale.set(1.2, 0.7, 1); r.rotation.y = a; root.add(r);
  }
  for (const [x, side] of [[-1.7, 1], [1.3, -1]]) { const fb = mesh(jit(new THREE.BoxGeometry(0.7, 0.4, 0.5), 0.07, 90), stones[1], x, 0.2, side * (thick * 0.5 + 0.55)); fb.rotation.y = 0.5 * side; fb.rotation.z = 0.12; root.add(fb); }
  root.add(mesh(new THREE.BoxGeometry(span + 0.2, 0.18, thick + 0.12), mortar, 0, 0.04, 0));
  return g;
}

// A stone-and-bronze brazier. Cold: dull coals that pulse faintly. Lit: layered flame, halo and rising embers.
export function makeBrazier() {
  const g = new THREE.Group();
  const stone = M(0x6c6480), stone2 = M(0x857c9c), bronze = M(0xb8793a), gold = M(0xffd36a);
  g.add(mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.22, 8), stone, 0, 0.11, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.44, 0.58, 0.2, 8), stone2, 0, 0.32, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.75, 8), stone, 0, 0.8, 0));
  g.add(mesh(new THREE.TorusGeometry(0.27, 0.06, 5, 12).rotateX(Math.PI / 2), gold, 0, 0.62, 0));
  g.add(mesh(new THREE.TorusGeometry(0.24, 0.05, 5, 12).rotateX(Math.PI / 2), gold, 0, 1.0, 0));
  // bowl: lathe profile
  const prof = [[0, 0], [0.22, 0.04], [0.42, 0.18], [0.56, 0.38], [0.58, 0.46], [0.5, 0.44], [0.4, 0.3], [0.0, 0.2]].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = mesh(new THREE.LatheGeometry(prof, 12), M(0x8a5a2c, { side: THREE.DoubleSide }), 0, 1.06, 0); g.add(bowl);
  g.add(mesh(new THREE.TorusGeometry(0.56, 0.055, 6, 18).rotateX(Math.PI / 2), bronze, 0, 1.52, 0));
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; g.add(mesh(new THREE.ConeGeometry(0.07, 0.3, 4), gold, Math.cos(a) * 0.5, 1.64, Math.sin(a) * 0.5)); }
  // coals
  const coalMat = new THREE.MeshBasicMaterial({ color: 0x4a2a22 });
  const coals = new THREE.Group(); coals.position.y = 1.3;
  for (let i = 0; i < 5; i++) { const a = i * 1.3, r = i ? 0.22 : 0; const c = mesh(ico(0.13, 0), coalMat, Math.cos(a) * r, i * 0.01, Math.sin(a) * r); c.scale.y = 0.7; coals.add(c); }
  g.add(coals);
  // "light me" hint ring (cold only)
  const hint = glowSprite(0xff9a4a, 1.5, 0.35); hint.position.y = 1.5; g.add(hint);
  // flame (lit only)
  const fl = new THREE.Group(); fl.position.y = 1.5; fl.visible = false; g.add(fl);
  const fm = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
  const outer = mesh(new THREE.ConeGeometry(0.42, 1.3, 8), fm(0xff6a1a, 0.7), 0, 0.65, 0), mid = mesh(new THREE.ConeGeometry(0.3, 1.0, 8), fm(0xffa82e, 0.85), 0, 0.5, 0), core = mesh(new THREE.ConeGeometry(0.16, 0.65, 7), fm(0xfff4b0, 0.95), 0, 0.33, 0);
  const tongue = [0, 1, 2].map((i) => { const t = mesh(new THREE.ConeGeometry(0.14, 0.7, 6), fm(0xff8a2a, 0.7), Math.cos(i * 2.1) * 0.22, 0.4, Math.sin(i * 2.1) * 0.22); fl.add(t); return t; });
  fl.add(outer, mid, core);
  const glow = glowSprite(0xffa040, 4.2, 0.65); glow.position.y = 0.6; fl.add(glow);
  const embers = [];
  for (let i = 0; i < 7; i++) { const e = glowSprite(0xffc060, 0.22, 0.9); fl.add(e); embers.push({ s: e, p: Math.random(), x: (Math.random() - 0.5) * 0.7, z: (Math.random() - 0.5) * 0.7, sp: 0.4 + Math.random() * 0.5 }); }
  g.userData.flame = fl; g.userData.cold = coals;
  g.userData.setLit = (on) => { fl.visible = on; hint.visible = !on; coalMat.color.setHex(on ? 0xff5a1a : 0x4a2a22); };
  g.userData.tick = (t, lit) => {
    if (!lit) { const p = 0.5 + Math.sin(t * 2.2) * 0.5; coalMat.color.setRGB(0.3 + p * 0.25, 0.14 + p * 0.06, 0.12); hint.material.opacity = 0.18 + p * 0.3; hint.scale.setScalar(1.3 + p * 0.4); return; }
    const w = (k, sp) => 1 + Math.sin(t * sp + k) * 0.12;
    outer.scale.set(w(0, 11), w(1, 13) * 1.05, w(0, 11)); mid.scale.set(w(2, 14), w(3, 17), w(2, 14)); core.scale.set(w(4, 19), w(5, 21), w(4, 19));
    tongue.forEach((tg, i) => { tg.scale.y = 0.7 + Math.abs(Math.sin(t * 9 + i * 2)) * 0.7; tg.position.y = 0.3 + tg.scale.y * 0.25; });
    fl.rotation.y = t * 0.8; glow.material.opacity = 0.55 + Math.sin(t * 17) * 0.1;
    for (const e of embers) { const f = ((t * e.sp + e.p) % 1); e.s.position.set(e.x * (1 + f), 0.4 + f * 2.2, e.z * (1 + f)); e.s.material.opacity = 0.9 * (1 - f); e.s.scale.setScalar(0.24 * (1 - f * 0.6)); }
  };
  return g;
}

// A stone gateway with a rising iron portcullis: two capped pillars, a heavy lintel with a keystone, and iron bars.
// The portcullis retracts up into the lintel when the braziers are lit (userData.setOpen(k), k in 0..1).
export function makeGate(w, h, d) {
  const g = new THREE.Group(), root = new THREE.Group(); g.add(root);
  const along = w >= d, span = along ? w : d;
  if (!along) root.rotation.y = Math.PI / 2;
  const stone = M(0x7a7490), stone2 = M(0x948eaa), dark = M(0x58526c), iron = M(0x2c2d3c), gold = M(0xffd36a);
  const px = span / 2 - 0.6;
  for (const s of [-1, 1]) {
    root.add(mesh(new THREE.BoxGeometry(1.5, 0.5, 1.5), dark, s * px, 0.1, 0));
    root.add(mesh(new THREE.CylinderGeometry(0.5, 0.58, h + 0.4, 8), stone2, s * px, (h + 0.4) / 2 + 0.3, 0));
    root.add(mesh(new THREE.CylinderGeometry(0.66, 0.5, 0.3, 8), stone, s * px, h + 0.85, 0));
    root.add(mesh(new THREE.BoxGeometry(1.5, 0.22, 1.5), stone, s * px, h + 1.1, 0));
    root.add(mesh(ico(0.22, 1), gold, s * px, h + 1.4, 0));
    for (const y of [0.9, h * 0.55]) root.add(mesh(new THREE.TorusGeometry(0.52, 0.05, 5, 12).rotateX(Math.PI / 2), dark, s * px, y, 0));
  }
  // lintel with a keystone and a row of teeth
  root.add(mesh(new THREE.BoxGeometry(span - 0.4, 0.8, 1.3), stone, 0, h + 0.55, 0));
  root.add(mesh(new THREE.BoxGeometry(1.2, 1.15, 1.45), stone2, 0, h + 0.62, 0));
  root.add(mesh(new THREE.BoxGeometry(0.5, 0.4, 0.1), gold, 0, h + 0.66, 0.76));
  for (let i = -3; i <= 3; i++) if (i) root.add(mesh(new THREE.BoxGeometry(0.34, 0.2, 1.34), dark, i * (span - 2.4) / 6.5, h + 1.05, 0));
  // portcullis (pivot at the underside of the lintel so scale.y retracts it upward)
  const port = new THREE.Group(); port.position.set(0, h + 0.15, 0); root.add(port);
  const inner = span - 2 * 0.6 - 1.0, bars = Math.max(4, Math.round(inner / 0.5));
  for (let i = 0; i <= bars; i++) {
    const x = (i / bars - 0.5) * inner;
    port.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, h + 0.1, 5), iron, x, -h / 2, 0));
    port.add(mesh(new THREE.ConeGeometry(0.075, 0.28, 5).rotateX(Math.PI), iron, x, -h - 0.06, 0));
  }
  for (const y of [0.15, h * 0.45, h * 0.8]) port.add(mesh(new THREE.BoxGeometry(inner + 0.1, 0.1, 0.14), iron, 0, -y - 0.05, 0));
  port.add(mesh(new THREE.BoxGeometry(0.9, 0.5, 0.18), M(0x3e3a52), 0, -h * 0.5, 0.06), mesh(ico(0.14, 0), gold, 0, -h * 0.5, 0.16));
  g.userData.setOpen = (k) => { const e = k * k * (3 - 2 * k); port.scale.y = Math.max(0.03, 1 - e * 0.97); port.position.y = h + 0.15; };
  return g;
}

export function makeSpikes(w, d) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w + 0.5, 0.16, d + 0.5), M(0x4a4262), 0, 0.08, 0));
  g.add(mesh(new THREE.BoxGeometry(w + 0.2, 0.2, d + 0.2), M(0x2e2a3c), 0, 0.14, 0));
  const nx = Math.max(2, Math.round(w / 0.55)), nz = Math.max(2, Math.round(d / 0.55));
  const sm = M(0xcfd3e2), tip = new THREE.MeshBasicMaterial({ color: 0xff7a3a });
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = (i / (nx - 1) - 0.5) * w * 0.94, z = (j / (nz - 1) - 0.5) * d * 0.94, hh = 0.75 + 0.2 * Math.abs(Math.sin(i * 3.1 + j * 1.7));
    const sp = mesh(new THREE.ConeGeometry(0.14, hh, 5), sm, x, 0.2 + hh / 2, z); sp.rotation.set(Math.sin(i + j * 2) * 0.07, 0, Math.cos(i * 2 + j) * 0.07); g.add(sp);
    g.add(mesh(new THREE.ConeGeometry(0.06, 0.28, 5), tip, x, 0.2 + hh - 0.1, z));
  }
  g.add(glowSprite(0xff7a3a, Math.max(w, d) * 1.1, 0.12).translateY(0.5));
  return g;
}

// ---- flight course props
export function makeFlightRing(r) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x6ff5ff });
  const tor = mesh(new THREE.TorusGeometry(r, 0.24, 8, 40), mat); g.add(tor);
  const outer = mesh(new THREE.TorusGeometry(r + 0.3, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); g.add(outer);
  const disc = mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshBasicMaterial({ color: 0x6ff5ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }), 0, 0, 0); g.add(disc);
  const beads = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const b = mesh(ico(0.2, 1), B(0xffffff), Math.cos(a) * (r + 0.55), Math.sin(a) * (r + 0.55), 0); g.add(b); beads.push(b); }
  const halo = glowSprite(0x6ff5ff, r * 3.2, 0.3); g.add(halo);
  let state = 0;
  g.userData.tick = (t) => { disc.material.opacity = 0.1 + Math.sin(t * 3) * 0.04; beads.forEach((b, i) => { const k = 0.5 + 0.5 * Math.sin(t * 5 - i * 0.55); b.scale.setScalar(state === 2 ? 0.5 : 0.6 + k * 0.6); }); outer.rotation.z = t * 0.4; };
  g.userData.hit = () => { state = 1; mat.color.setHex(0xffd23e); disc.material.color.setHex(0xffd23e); halo.material.color.setHex(0xffd23e); beads.forEach((b) => b.material.color.setHex(0xfff2a0)); };
  g.userData.miss = () => { state = 2; mat.color.setHex(0x8a8aa0); disc.visible = false; halo.visible = false; beads.forEach((b) => b.material.color.setHex(0x8a8aa0)); };
  return g;
}

export function makeFlightTarget(heavy) {
  const g = new THREE.Group();
  if (!heavy) {
    // a ribbed paper lantern with gold caps and a tassel
    const paper = new THREE.MeshLambertMaterial({ color: 0xff6a3a, emissive: 0x7a2a10, flatShading: true });
    const body = mesh(jit(ico(0.85, 1), 0.05, 4), paper, 0, 0, 0); body.scale.set(1, 1.2, 1); g.add(body);
    const inner = mesh(ico(0.6, 1), B(0xffd36a), 0, 0, 0); inner.scale.set(1, 1.2, 1); inner.material.transparent = true; inner.material.opacity = 0.85; g.add(inner);
    for (const y of [-0.5, 0, 0.5]) g.add(mesh(new THREE.TorusGeometry(0.82 - Math.abs(y) * 0.28, 0.025, 4, 14).rotateX(Math.PI / 2), M(0xffd36a), 0, y * 1.2, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.2, 8), M(0xffd36a), 0, 1.05, 0), mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.2, 8), M(0xffd36a), 0, -1.05, 0));
    const tas = mesh(new THREE.ConeGeometry(0.12, 0.4, 6), M(0xff3a3a), 0, -1.78, 0); tas.rotation.x = Math.PI;
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), M(0x8a2a1a), 0, -1.4, 0), tas);
    g.add(mesh(new THREE.TorusGeometry(0.18, 0.025, 4, 10), M(0xffd36a), 0, 1.3, 0));
    g.add(glowSprite(0xffa040, 3.2, 0.55));
  } else {
    // an iron-bound lantern with spikes and a glowing slit: needs a longer flame
    g.add(mesh(jit(ico(1.3, 1), 0.08, 6), M(0x8794ad), 0, 0, 0));
    for (const y of [-0.6, 0.6]) g.add(mesh(new THREE.TorusGeometry(1.28 - Math.abs(y) * 0.28, 0.07, 5, 16).rotateX(Math.PI / 2), M(0x3d4458), 0, y, 0));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const sp = mesh(new THREE.ConeGeometry(0.2, 0.7, 5), M(0xd8dde8), Math.cos(a) * 1.35, Math.sin(a * 2) * 0.5, Math.sin(a) * 1.35); sp.lookAt(Math.cos(a) * 3, Math.sin(a * 2) * 1.2, Math.sin(a) * 3); sp.rotateX(Math.PI / 2); g.add(sp); }
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.16, 0.2), B(0xff8a3a), 0, 0, 1.28), glowSprite(0xff8a3a, 2.4, 0.4));
  }
  g.userData.spin = (t) => { g.rotation.y = t * 0.8; };
  return g;
}

export function makeFlightRock(r) {
  // a small floating island: grassy top, jagged underside, a lone tree
  const g = new THREE.Group();
  const under = mesh(jit(new THREE.ConeGeometry(r * 1.0, r * 1.9, 7), r * 0.4, 5), M(0x8f95a8), 0, -r * 0.55, 0); under.rotation.x = Math.PI; g.add(under);
  g.add(mesh(jit(ico(r * 0.7, 1), r * 0.3, 6), M(0xa4abbd), r * 0.35, -r * 0.1, r * 0.2));
  g.add(mesh(new THREE.CylinderGeometry(r * 1.0, r * 0.9, r * 0.35, 9), M(0x5fcf72), 0, r * 0.35, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.14, r * 0.8, 5), M(0x7a4f2e), r * 0.15, r * 0.9, 0), mesh(jit(new THREE.ConeGeometry(r * 0.55, r * 1.1, 6), 0.1, 7), M(0x2fae5a), r * 0.15, r * 1.55, 0));
  for (let i = 0; i < 3; i++) { const sp = mesh(new THREE.ConeGeometry(0.1, 0.5, 4), M(0x7a8aa0), (i - 1) * r * 0.4, -r * 1.45 - i * 0.1, (i - 1) * r * 0.1); sp.rotation.x = Math.PI; g.add(sp); }
  return g;
}

export function makeGust(r, h, dx, dz) {
  const g = new THREE.Group();
  const lines = [];
  const mat = new THREE.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 14; i++) {
    const l = mesh(new THREE.PlaneGeometry(2.6, 0.08), mat.clone());
    l.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
    g.add(l); lines.push({ m: l, a: Math.random() * 6.28, rr: Math.random() * r * 0.9, y: Math.random() * h, s: 0.5 + Math.random() });
  }
  g.userData.spin = (t) => { for (const l of lines) { const f = ((t * l.s * 0.35 + l.a) % 1); l.m.position.set(Math.cos(l.a * 7) * l.rr + dx * (f - 0.5) * r * 2, l.y, Math.sin(l.a * 7) * l.rr + dz * (f - 0.5) * r * 2); l.m.material.opacity = 0.5 * Math.sin(f * Math.PI); } };
  return g;
}
