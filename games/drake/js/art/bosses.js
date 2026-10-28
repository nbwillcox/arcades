// Boss art: cel-shaded with ink outlines (see kit.js). Each builder returns
// { root, body, head, arms, core, halo, [extra], animate } exactly as boss.js expects.
// Glow parts (core, halo, flames, visors) stay unlit so they read as light sources.
import * as THREE from 'three';
import { T, Bm, mesh, ico, sph, cone, cyl, ink, eye, brow } from './kit.js';

const TAU = Math.PI * 2;
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const halo = (r, color, x, y, z) => mesh(ico(r, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, depthWrite: false }), x, y, z);
const rivets = (parent, mat, n, r, y, rad, zs = 1) => { for (let i = 0; i < n; i++) { const a = (i / n) * TAU; parent.add(mesh(sph(r, 6, 5), mat, Math.cos(a) * rad, y, Math.sin(a) * rad * zs)); } };

// ---------------------------------------------------------------- Cinder Smith
export function buildSmith() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const iron = T(0x4a4e5e), iron2 = T(0x363a48), plate = T(0x6a6f84), steel = T(0xc0c4d4), glow = Bm(0xff8a2a), wood = T(0x6a4a2a);
  const torso = mesh(ico(2.2, 2), iron, 0, 2.7, 0); torso.scale.set(1.2, 1.05, 1); body.add(ink(torso, 0.035));
  // furnace chest: glowing core behind a grate
  const fur = mesh(ico(0.95, 2), glow, 0, 2.7, 1.8); body.add(fur);
  const hal = halo(1.35, 0xff8a2a, 0, 2.7, 1.8); body.add(hal);
  const frame = mesh(new THREE.TorusGeometry(1.0, 0.14, 6, 14), plate, 0, 2.7, 1.8); body.add(frame);
  for (let i = -2; i <= 2; i++) body.add(mesh(box(0.1, 1.8, 0.14), iron2, i * 0.34, 2.7, 2.35));
  // head: helm with glowing visor, brow plate and horns
  const head = mesh(ico(1.0, 2), iron2, 0, 5.0, 0.4); body.add(ink(head, 0.05));
  head.add(mesh(box(1.3, 0.22, 0.3), Bm(0xffc24a), 0, 0.1, 0.9));
  const bp = mesh(box(1.5, 0.22, 0.4), plate, 0, 0.36, 0.82); bp.rotation.x = 0.35; head.add(bp);
  for (const s of [-1, 1]) {
    const h1 = mesh(cone(0.27, 0.8, 6), steel, 0.72 * s, 0.7, -0.1); h1.rotation.z = -0.5 * s; head.add(h1);
    const h2 = mesh(cone(0.18, 0.7, 6), steel, 1.1 * s, 1.35, -0.1); h2.rotation.z = -0.15 * s; head.add(h2);
  }
  // smokestack with layered flame
  body.add(mesh(cyl(0.35, 0.5, 2.2, 8), iron2, -1.1, 5.3, -1.0));
  body.add(mesh(new THREE.TorusGeometry(0.42, 0.09, 6, 12).rotateX(Math.PI / 2), plate, -1.1, 6.35, -1.0));
  const flame = new THREE.Group(); flame.position.set(-1.1, 6.8, -1.0); body.add(flame);
  flame.add(mesh(cone(0.4, 1.0, 6), Bm(0xffa23a)), mesh(cone(0.22, 0.7, 6), Bm(0xffe27a), 0, -0.1, 0));
  // arms: pauldrons with spikes, forearms, hammer / fist
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(2.6 * s, 3.8, 0); body.add(sh);
    const pad = mesh(ico(1.0, 2), plate, 0, 0.1, 0); pad.scale.set(1.1, 0.85, 1.1); sh.add(ink(pad, 0.05));
    for (let i = 0; i < 3; i++) { const sp = mesh(cone(0.18, 0.7, 5), steel, 0.2 * s * (i - 1), 0.75, (i - 1) * 0.45); sp.rotation.z = -0.3 * s; sh.add(sp); }
    sh.add(ink(mesh(cyl(0.45, 0.5, 2.6, 8), iron2, 0.2 * s, -1.4, 0.4), 0.05));
    sh.add(mesh(cyl(0.52, 0.52, 0.3, 8), plate, 0.2 * s, -2.2, 0.4));
    if (s > 0) {
      const h = new THREE.Group(); h.position.set(0.3, -2.7, 0.7); sh.add(h);
      h.add(mesh(cyl(0.18, 0.2, 4.2, 6), wood, 0, 1.6, 0), ink(mesh(box(2.4, 1.4, 1.4), iron, 0, 3.6, 0), 0.04), mesh(box(2.5, 0.25, 1.5), glow, 0, 3.0, 0));
      h.add(mesh(box(0.5, 1.5, 1.5), plate, 1.0, 3.6, 0), mesh(box(0.5, 1.5, 1.5), plate, -1.0, 3.6, 0));
    } else { const f = mesh(ico(0.8, 2), iron, 0.2, -2.9, 0.7); sh.add(ink(f, 0.06)); for (let i = -1; i <= 1; i++) sh.add(mesh(cone(0.12, 0.35, 5), steel, 0.2 + i * 0.28, -3.1, 1.4).rotateX(Math.PI / 2)); }
    arms.push(sh);
  }
  for (const x of [-1.3, 1.3]) { const leg = mesh(ico(1.1, 2), iron2, x, 0.7, 0); root.add(ink(leg, 0.05)); }
  const core = fur;
  return { root, body, head, arms, core, halo: hal, extra: { flame }, animate(b, dt, k, st) { flame.scale.y = 1 + Math.sin(b.t_ * 14) * 0.25; if (st === 'atk') arms[1].rotation.x = -2.5 * k; else if (st !== 'dizzy') arms[1].rotation.x *= 0.9; } };
}

// ---------------------------------------------------------------- Storm Roc
export function buildRoc() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const white = T(0xe8f0ff), blue = T(0x5a86e8), blueD = T(0x3a5fc0), beakM = T(0xffa23a), beakD = T(0xd9791a);
  const torso = mesh(ico(1.9, 2), white, 0, 2.2, 0); torso.scale.set(1, 0.9, 1.55); body.add(ink(torso, 0.04));
  const back = mesh(ico(1.1, 2), blue, 0, 2.0, -0.6); back.scale.set(1.1, 0.8, 1.4); body.add(ink(back, 0.05));
  // head, crest, two-part beak, real eyes
  const head = mesh(ico(0.95, 2), white, 0, 3.6, 2.2); body.add(ink(head, 0.05));
  const upper = mesh(cone(0.4, 1.5, 5), beakM, 0, -0.05, 1.15); upper.rotation.x = Math.PI / 2; head.add(upper);
  const lower = mesh(cone(0.3, 1.1, 5), beakD, 0, -0.38, 0.95); lower.rotation.x = Math.PI / 2; head.add(lower);
  for (const s of [-1, 1]) {
    eye(head, 0.5 * s, 0.22, 0.62, 3.0, 0xd6a21a, 1);
    brow(head, 0.5 * s, 0.62, 0.7, 0.55, blueD, 0.55, s);
  }
  for (let i = 0; i < 5; i++) { const c = mesh(cone(0.2 - Math.abs(i - 2) * 0.03, 1.0 + (2 - Math.abs(i - 2)) * 0.35, 4), i % 2 ? blue : blueD, (i - 2) * 0.28, 1.0, -0.25 - Math.abs(i - 2) * 0.1); c.rotation.x = -0.5; c.rotation.z = (i - 2) * 0.2; head.add(c); }
  // wings: layered tapering feathers
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(1.4 * s, 2.7, 0); body.add(w);
    w.add(ink(mesh(ico(0.8, 1), white, 0.9 * s, 0, -0.3), 0.06));
    for (let i = 0; i < 6; i++) {
      const L = 4.4 - i * 0.35, th = 0.1 + i * 0.13, ax = 0.9 * s, az = -0.3 - i * 0.12;
      const f = mesh(cone(0.5, L, 4), i % 2 ? white : blue, ax + s * Math.cos(th) * L / 2, 0, az - Math.sin(th) * L / 2);
      f.rotation.z = -s * Math.PI / 2; f.rotation.y = s * th; f.scale.z = 0.14; w.add(f);
    }
    wings.push(w);
  }
  // tail fan
  for (let i = 0; i < 5; i++) { const f = mesh(cone(0.32, 3.0, 4), i % 2 ? white : blue, (i - 2) * 0.6, 2.0, -4.2); f.rotation.x = -Math.PI / 2; f.rotation.y = (i - 2) * 0.12; body.add(f); }
  // legs with talons
  for (const s of [-1, 1]) {
    body.add(mesh(cyl(0.16, 0.12, 1.2, 5), beakD, 0.7 * s, 0.9, 0.6));
    for (let i = -1; i <= 1; i++) { const t = mesh(cone(0.08, 0.5, 4), beakD, 0.7 * s + i * 0.18, 0.35, 0.95); t.rotation.x = Math.PI / 2 + 0.3; body.add(t); }
  }
  const core = mesh(ico(0.6, 2), Bm(0xffe27a), 0, 2.4, 1.9); body.add(core);
  const hal = halo(0.95, 0xffe27a, 0, 2.4, 1.9); body.add(hal);
  return { root, body, head, arms: wings, core, halo: hal, animate(b, dt, k, st) { const f = st === 'dizzy' ? 0.2 : Math.sin(b.t_ * 7) * 0.6 + (st === 'atk' ? 0.4 : 0); wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * f; }); } };
}

// ---------------------------------------------------------------- Glowmaw
export function buildGlowmaw() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const teal = T(0x2a6a8a), tealL = T(0x3f8fb0), dark = T(0x1a3a5a), tooth = T(0xf4f4ff), gum = T(0x7a2a4a);
  const torso = mesh(ico(2.7, 2), teal, 0, 2.8, -0.4); torso.scale.set(1.2, 1, 1.4); body.add(ink(torso, 0.03));
  // belly + glowing spots along the flanks
  const belly = mesh(ico(2.3, 1), tealL, 0, 1.9, 0.2); belly.scale.set(1.0, 0.6, 1.3); body.add(belly);
  for (let i = 0; i < 9; i++) { const a = i * 0.72; body.add(mesh(sph(0.16, 6, 5), Bm(0x7ff0ff), Math.cos(a) * 3.2 * (i % 2 ? 1 : -1), 2.8 + Math.sin(a * 2) * 0.6, -1.2 + (i % 4) * 0.7)); }
  // jaws with a gum line and teeth
  const jaw = new THREE.Group(); jaw.position.set(0, 1.5, 2.3); body.add(jaw);
  jaw.add(ink(mesh(box(3.6, 0.8, 2.4), dark, 0, -0.3, 0.6), 0.04), mesh(box(3.3, 0.2, 2.2), gum, 0, 0.12, 0.6));
  for (let i = 0; i < 7; i++) jaw.add(mesh(cone(0.2, 0.9 + (i % 2) * 0.3, 4), tooth, (i - 3) * 0.5, 0.45, 1.7));
  const upper = new THREE.Group(); upper.position.set(0, 2.9, 2.3); body.add(upper);
  upper.add(ink(mesh(box(3.6, 0.8, 2.4), dark, 0, 0.3, 0.4), 0.04), mesh(box(3.3, 0.2, 2.2), gum, 0, -0.1, 0.4));
  for (let i = 0; i < 7; i++) { const t = mesh(cone(0.2, 0.9 + (i % 2) * 0.3, 4), tooth, (i - 3) * 0.5, -0.5, 1.5); t.rotation.x = Math.PI; upper.add(t); }
  // big eyes with brows
  for (const s of [-1, 1]) {
    const e = eye(body, 1.5 * s, 4.3, 1.55, 6.0, 0xffb23e, 1);
    brow(body, 1.5 * s, 5.0, 1.8, 1.4, dark, 0.35, s);
  }
  // lure: curved stalk ending in the glowing core
  const stalk = mesh(cyl(0.14, 0.22, 3.4, 6), dark, 0, 5.5, 0.8); stalk.rotation.x = 0.7; body.add(stalk);
  body.add(mesh(cyl(0.1, 0.14, 2.0, 6), dark, 0, 6.8, 1.55).rotateX(1.2));
  const core = mesh(ico(0.75, 2), Bm(0x7ff0ff), 0, 7.0, 2.1); body.add(core);
  const hal = halo(1.2, 0x7ff0ff, 0, 7.0, 2.1); body.add(hal);
  // fins with ridges + tail
  for (const s of [-1, 1]) {
    const fin = mesh(cone(0.9, 3.4, 4), teal, 3.2 * s, 2.6, -0.4); fin.rotation.z = -s * 1.2; body.add(ink(fin, 0.06));
    for (let i = 0; i < 3; i++) { const r = mesh(cone(0.12, 3.0 - i * 0.5, 3), tealL, (3.2 + i * 0.35) * s, 2.5 - i * 0.2, -0.4 + i * 0.3); r.rotation.z = -s * 1.2; body.add(r); }
  }
  for (let i = 0; i < 4; i++) { const d = mesh(cone(0.4 - i * 0.05, 1.2, 4), tealL, 0, 5.4 - i * 0.2, -0.6 - i * 1.1); d.rotation.x = -0.3; body.add(d); }
  body.add(ink(mesh(cone(1.2, 3.4, 5), teal, 0, 3.2, -4.4).rotateX(-Math.PI / 2), 0.05));
  return { root, body, head: upper, arms: [jaw], core, halo: hal, animate(b, dt, k, st) { jaw.rotation.x = st === 'dizzy' ? 0.6 : st === 'atk' ? 0.4 * k : 0.05 + Math.sin(b.t_ * 2) * 0.05; core.scale.setScalar(st === 'dizzy' ? 0.4 : 1 + Math.sin(b.t_ * 6) * 0.1); } };
}

// ---------------------------------------------------------------- Lantern Queen
export function buildQueen() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const robe = T(0x6a3aa8), robe2 = T(0x8a5ac8), gold = T(0xffd36a), pale = T(0xf0e0ff), blush = T(0xff9ab0);
  const skirt = mesh(cone(1.8, 4.6, 12), robe, 0, 2.3, 0); body.add(ink(skirt, 0.03));
  for (let i = 0; i < 2; i++) { const tr = mesh(new THREE.TorusGeometry(1.7 - i * 0.55, 0.07, 5, 18).rotateX(Math.PI / 2), gold, 0, 0.5 + i * 1.5, 0); body.add(tr); }
  body.add(ink(mesh(cyl(1.0, 1.4, 1.2, 10), robe2, 0, 4.7, 0), 0.04));
  body.add(mesh(new THREE.TorusGeometry(1.1, 0.09, 5, 16).rotateX(Math.PI / 2), gold, 0, 4.1, 0));
  const head = mesh(ico(0.85, 2), pale, 0, 5.8, 0.1); body.add(ink(head, 0.05));
  for (const s of [-1, 1]) {
    eye(head, 0.3 * s, 0.1, 0.7, 1.3, 0x7a3aa8, 1);
    brow(head, 0.3 * s, 0.42, 0.75, 0.3, robe, -0.15, s);
    head.add(mesh(ico(0.12, 1), blush, 0.5 * s, -0.12, 0.62));
  }
  head.add(mesh(sph(0.06, 6, 5), Bm(0xc0507a), 0, -0.3, 0.8));
  // hair swept back
  for (let i = 0; i < 5; i++) { const h = mesh(cone(0.25, 1.6 - Math.abs(i - 2) * 0.2, 5), robe, (i - 2) * 0.3, -0.1, -0.7); h.rotation.x = 2.5; head.add(h); }
  // crown of lanterns
  const crown = new THREE.Group(); crown.position.set(0, 6.6, 0); body.add(crown);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, x = Math.cos(a) * 0.85, z = Math.sin(a) * 0.85;
    crown.add(mesh(cone(0.12, 0.8, 4), gold, x, 0.1, z), mesh(ico(0.28, 2), Bm(0xffd36a), x, 0.7, z), mesh(sph(0.05, 5, 4), gold, x, 1.05, z));
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(1.5 * s, 4.7, 0.2); body.add(a);
    a.add(ink(mesh(cone(0.55, 2.4, 7), robe2, 0.4 * s, -0.9, 0.5).rotateX(Math.PI), 0.05));
    a.add(ink(mesh(ico(0.38, 1), pale, 0.7 * s, -2.1, 1.0), 0.08));
    // a little hand lantern
    a.add(mesh(sph(0.22, 8, 6), Bm(0xffd36a), 0.7 * s, -2.6, 1.0));
    arms.push(a);
  }
  const core = mesh(ico(0.55, 2), Bm(0xff7af0), 0, 4.2, 1.5); body.add(core);
  const hal = halo(0.9, 0xff7af0, 0, 4.2, 1.5); body.add(hal);
  return { root, body, head, arms, core, halo: hal, extra: { crown }, animate(b, dt, k, st) { crown.rotation.y += dt * 1.5; arms.forEach((a, i) => { a.rotation.x = st === 'atk' ? -1.8 * k : Math.sin(b.t_ * 3 + i) * 0.1; }); } };
}

// ---------------------------------------------------------------- Warlord Gloam
export function buildGloam() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const black = T(0x2a2232), steel = T(0x4a4458), steelL = T(0x6a647c), blade = T(0xc4c8e0), red = Bm(0xff3a4a);
  const torso = mesh(ico(2.3, 2), black, 0, 3.0, 0); torso.scale.set(1.15, 1.2, 0.95); body.add(ink(torso, 0.035, 0x0a0710));
  const chest = mesh(ico(1.3, 2), steel, 0, 3.4, 1.2); chest.scale.set(1.1, 0.9, 0.5); body.add(ink(chest, 0.05, 0x0a0710));
  for (let i = 0; i < 3; i++) body.add(mesh(box(2.0 - i * 0.3, 0.12, 0.2), steelL, 0, 2.8 + i * 0.55, 1.62));
  const head = mesh(ico(1.1, 2), steel, 0, 5.8, 0.4); body.add(ink(head, 0.05, 0x0a0710));
  head.add(mesh(box(1.3, 0.2, 0.3), red, 0, 0.15, 0.95));
  for (const s of [-1, 1]) {
    head.add(mesh(sph(0.1, 6, 5), red, 0.35 * s, 0.15, 1.0));
    const br = mesh(box(0.7, 0.14, 0.22), black, 0.38 * s, 0.4, 0.92); br.rotation.z = 0.4 * s; head.add(br);
    const h1 = mesh(cone(0.3, 1.3, 6), T(0xc4c0d4), 0.9 * s, 0.7, 0); h1.rotation.z = -0.6 * s; head.add(h1);
    const h2 = mesh(cone(0.2, 1.1, 6), T(0xc4c0d4), 1.55 * s, 1.5, 0); h2.rotation.z = -0.2 * s; head.add(h2);
  }
  head.add(mesh(cone(0.18, 1.0, 4), black, 0, 1.25, -0.3).rotateX(-0.4));
  const core = mesh(ico(0.7, 2), red, 0, 3.4, 1.7); body.add(core);
  const hal = halo(1.1, 0xff3a4a, 0, 3.4, 1.7); body.add(hal);
  // ragged cape
  const capeGeo = new THREE.PlaneGeometry(4.4, 6.0, 6, 8); const cp = capeGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) { const y = cp.getY(i); if (y < -2.2) cp.setY(i, y - (Math.sin(cp.getX(i) * 3.1) + 1) * 0.35); }
  capeGeo.computeVertexNormals();
  const cape = mesh(capeGeo, T(0x5a1a3a, { side: THREE.DoubleSide }), 0, 3.0, -1.5); cape.rotation.x = 0.12; body.add(cape);
  body.add(mesh(new THREE.PlaneGeometry(4.5, 0.2).rotateY(0), red, 0, 5.95, -1.45));
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(2.9 * s, 4.2, 0); body.add(sh);
    const pad = mesh(ico(1.1, 2), steel, 0, 0, 0); pad.scale.set(1.1, 0.85, 1.1); sh.add(ink(pad, 0.05, 0x0a0710));
    for (let i = 0; i < 3; i++) { const sp = mesh(cone(0.22, 1.1 - i * 0.2, 5), steelL, 0.3 * s * (i - 1) + 0.2 * s, 0.9, (i - 1) * 0.5); sp.rotation.z = -0.4 * s; sh.add(sp); }
    sh.add(ink(mesh(cyl(0.5, 0.55, 2.8, 8), black, 0.2 * s, -1.6, 0.4), 0.05, 0x0a0710));
    sh.add(mesh(cyl(0.58, 0.58, 0.3, 8), steelL, 0.2 * s, -2.4, 0.4));
    if (s > 0) {
      const sw = new THREE.Group(); sw.position.set(0.3, -3.0, 0.9); sh.add(sw);
      sw.add(mesh(box(0.5, 8, 0.2), blade, 0, 3.8, 0), mesh(box(1.6, 0.3, 0.4), T(0x8a5a2a), 0, -0.2, 0), mesh(box(0.14, 7.4, 0.3), red, 0, 3.8, 0));
      sw.add(mesh(cone(0.25, 0.7, 4), blade, 0, 8.1, 0), mesh(sph(0.22, 6, 5), T(0x8a5a2a), 0, -0.7, 0));
    } else { const f = mesh(ico(0.8, 2), black, 0.2, -3.0, 0.7); sh.add(ink(f, 0.06, 0x0a0710)); }
    arms.push(sh);
  }
  for (const x of [-1.4, 1.4]) root.add(ink(mesh(ico(1.2, 2), black, x, 0.8, 0), 0.05, 0x0a0710));
  root.scale.setScalar(1.05);
  return { root, body, head, arms, core, halo: hal, animate(b, dt, k, st) { cape.rotation.x = 0.12 + Math.sin(b.t_ * 3) * 0.06; if (st === 'atk') arms[1].rotation.x = -2.3 * k; else if (st !== 'dizzy') arms[1].rotation.x *= 0.9; } };
}

// ---------------------------------------------------------------- Moss Golem
// Returns the parts GolemBoss wires up: { root, body, head, arms, core, halo }.
export function buildGolemArt() {
  const stone = T(0x8b919e), stone2 = T(0x727886), moss = T(0x4fb860), mossD = T(0x3a9a4c), dark = T(0x30343c);
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const torso = mesh(ico(2.1, 2), stone, 0, 2.6, 0); torso.scale.set(1.15, 1.05, 0.95); body.add(ink(torso, 0.04));
  // moss growing on the back and shoulders, with hanging vines
  body.add(mesh(ico(1.1, 2), moss, -0.5, 4.0, -0.7), mesh(ico(0.8, 2), mossD, 0.9, 3.7, -0.8), mesh(ico(0.6, 1), moss, 1.5, 3.0, 0.4));
  for (let i = 0; i < 6; i++) { const v = mesh(cone(0.09, 1.2 + (i % 3) * 0.4, 4), mossD, -1.2 + i * 0.5, 3.0, -1.5); v.rotation.x = Math.PI; body.add(v); }
  // carved glowing runes down the chest
  for (let i = 0; i < 3; i++) body.add(mesh(box(0.12, 0.45 - i * 0.07, 0.1), Bm(0xffc24a), 0, 1.5 - i * 0.0 + i * 0.0 - 0.1 - i * 0.5, 1.9));
  const head = new THREE.Group(); head.position.set(0, 4.6, 0.6); body.add(head);
  head.add(ink(mesh(ico(1.1, 2), stone2), 0.05));
  for (const s of [-1, 1]) {
    head.add(mesh(sph(0.36, 8, 6), Bm(0xffb23e), 0.42 * s, 0.18, 0.92));
    head.add(mesh(sph(0.14, 6, 5), Bm(0x3a1a08), 0.45 * s, 0.18, 1.2));
    const br = mesh(box(0.8, 0.28, 0.4), stone, 0.42 * s, 0.55, 0.9); br.rotation.z = 0.45 * s; head.add(br);
  }
  head.add(mesh(box(0.9, 0.22, 0.25), dark, 0, -0.4, 1.0));
  for (let i = 0; i < 5; i++) head.add(mesh(cone(0.2, 0.9, 5), i % 2 ? moss : mossD, (i - 2) * 0.35, 1.2, -0.2));
  const core = mesh(ico(0.6, 2), Bm(0xffc24a), 0, 2.7, 1.55); body.add(core);
  const hal = halo(0.95, 0xffb23e, 0, 2.7, 1.55); body.add(hal);
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(2.2 * s, 3.4, 0); body.add(sh);
    sh.add(ink(mesh(ico(0.8, 2), stone, 0.3 * s, -0.8, 0.2), 0.06));
    const fist = mesh(ico(1.25, 2), stone2, 0.4 * s, -2.1, 0.6); sh.add(ink(fist, 0.05));
    for (let i = -1; i <= 1; i++) sh.add(mesh(ico(0.3, 1), stone, 0.4 * s + i * 0.55, -2.9, 1.3));
    sh.add(mesh(ico(0.5, 1), moss, 0.5 * s, -1.7, 0.2));
    arms.push(sh);
  }
  for (const x of [-1.2, 1.2]) root.add(ink(mesh(ico(1.1, 2), stone2, x, 0.7, 0), 0.05));
  return { root, body, head, arms, core, halo: hal };
}
