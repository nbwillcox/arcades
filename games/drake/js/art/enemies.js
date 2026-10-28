// Enemy art: seven distinct silhouettes, cel-shaded with ink outlines (see kit.js).
// Contract with game.js: group.userData.body (bobs in y), .legs (two foot meshes whose z swings),
// and for the spitter .head (group scaled to telegraph a shot). Keep body radius near 0.4 (brute 0.8).
import * as THREE from 'three';
import { T, Bm, mesh, ico, sph, cone, cyl, ink, eye, brow, bake } from './kit.js';

const TAU = Math.PI * 2;

// Two feet that the game swings fore/aft; each gets little toe claws.
function feet(g, color, claw, x = 0.2, y = 0.1, s = 1) {
  const legs = [];
  for (const sx of [-1, 1]) {
    const fg = new THREE.Group(); fg.position.set(x * sx, y, 0.1);
    const f = mesh(ico(0.11 * s, 1), T(color)); f.scale.set(1, 0.6, 1.45);
    fg.add(ink(f, 0.12));
    for (const dx of [-0.045, 0, 0.045]) { const c = mesh(cone(0.017 * s, 0.06 * s, 4), T(claw), dx * s, -0.003, 0.17 * s); c.rotation.x = Math.PI / 2; fg.add(c); }
    bake(fg);
    g.add(fg); legs.push(fg);
  }
  g.userData.legs = legs;
}

const arm = (body, color, x, y, z, s = 1) => {
  const a = mesh(ico(0.085 * s, 1), T(color), x, y, z); a.scale.set(0.9, 1.25, 0.9); a.rotation.z = -0.5 * Math.sign(x) * -1;
  body.add(a); return a;
};

const mouth = (body, y, z, w, fangs = true) => {
  const m = mesh(sph(0.1, 10, 6), Bm(0x2a0f1c), 0, y, z); m.scale.set(w, 0.5, 0.5); body.add(m);
  if (fangs) for (const s of [-1, 1]) { const f = mesh(cone(0.022, 0.07, 4), T(0xfff6dc), 0.045 * w * s * 1.6, y + 0.03, z + 0.045); f.rotation.x = Math.PI; body.add(f); }
};

const blob = (color, r = 0.42, sx = 1, sy = 0.92, sz = 1.1, y = 0.5) => {
  const b = mesh(ico(r, 2), T(color), 0, y, 0); b.scale.set(sx, sy, sz); return ink(b, 0.06);
};

export function makeEnemy(kind) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  g.userData.body = body;

  if (kind === 'stroller') {
    body.add(blob(0xe0703a));
    const belly = mesh(ico(0.3, 1), T(0xffd9a0), 0, 0.42, 0.14); belly.scale.set(0.8, 0.85, 0.7); body.add(belly);
    for (const s of [-1, 1]) {
      eye(body, 0.155 * s, 0.64, 0.33, 0.78, 0x3a2410);
      brow(body, 0.155 * s, 0.75, 0.37, 0.12, T(0x7a3a20), 0.45, s);
      const h = mesh(cone(0.07, 0.24, 5), T(0xf6e3b4), 0.22 * s, 0.93, 0.0); h.rotation.z = -0.35 * s; h.rotation.x = -0.15; body.add(h);
      arm(body, 0xc9582a, 0.4 * s, 0.45, 0.14);
    }
    mouth(body, 0.45, 0.4, 1.2);
    for (let i = -1; i <= 1; i++) { const t = mesh(cone(0.035, 0.14, 4), T(0x7a3a20), i * 0.07, 0.92, -0.12); t.rotation.x = -0.4; body.add(t); }
    const tail = mesh(ico(0.09, 1), T(0xc9582a), 0, 0.3, -0.45); body.add(tail);
    feet(g, 0x7a3a20, 0xf6e3b4);
  } else if (kind === 'shield') {
    body.add(blob(0x6f5fd0));
    // dome helmet with nose guard and plume
    const helm = mesh(new THREE.SphereGeometry(0.34, 12, 7, 0, TAU, 0, Math.PI * 0.55), T(0xb8c4d8), 0, 0.66, 0.0); helm.scale.set(1.12, 1, 1.15); body.add(ink(helm, 0.07));
    const rim = mesh(new THREE.TorusGeometry(0.36, 0.03, 5, 14), T(0x8794ad), 0, 0.64, 0.02); rim.rotation.x = Math.PI / 2; rim.scale.set(1.12, 1.15, 1); body.add(rim);
    const plume = mesh(cone(0.08, 0.34, 5), T(0xe0408f), 0, 1.06, -0.1); plume.rotation.x = -0.6; body.add(plume);
    const nose = mesh(cone(0.04, 0.2, 4), T(0x8794ad), 0, 0.55, 0.38); nose.rotation.x = Math.PI; body.add(nose);
    for (const s of [-1, 1]) eye(body, 0.14 * s, 0.56, 0.31, 0.6, 0x2a1f5a);
    // round shield: dome boss, rim, rivets
    const sh = new THREE.Group(); sh.position.set(0, 0.52, 0.56); body.add(sh);
    const disc = mesh(cyl(0.5, 0.5, 0.1, 14).rotateX(Math.PI / 2), T(0xb8c4d8)); sh.add(ink(disc, 0.04));
    const edge = mesh(new THREE.TorusGeometry(0.5, 0.045, 6, 18), T(0x7d89a3), 0, 0, 0.0); sh.add(edge);
    sh.add(mesh(sph(0.15, 10, 6), T(0xffd23e), 0, 0, 0.07));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; sh.add(mesh(sph(0.03, 5, 4), T(0x7d89a3), Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0.06)); }
    for (const s of [-1, 1]) arm(body, 0x4f43a8, 0.42 * s, 0.4, 0.2);
    feet(g, 0x362c6a, 0xb8c4d8);
  } else if (kind === 'spiked') {
    body.add(blob(0xb44fd0));
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * 4 - 2, row = i % 2;
      const sp = mesh(cone(0.085 - row * 0.015, 0.4 - row * 0.1, 5), T(row ? 0xffb83e : 0xf7e36b), Math.sin(a) * 0.34, 0.86 + Math.cos(a) * 0.1 - row * 0.1, -0.1 - Math.abs(a) * 0.05);
      sp.rotation.z = -a * 0.5; sp.rotation.x = -0.35; body.add(sp);
    }
    for (const s of [-1, 1]) {
      eye(body, 0.15 * s, 0.63, 0.34, 0.76, 0xd6a21a);
      brow(body, 0.15 * s, 0.745, 0.38, 0.13, T(0x5c2470), 0.55, s);
      const claw = arm(body, 0x8f3aa8, 0.42 * s, 0.42, 0.18);
      for (const dx of [-0.03, 0.03]) claw.add(mesh(cone(0.018, 0.08, 4), T(0xf7e36b), dx, -0.08, 0.04));
    }
    mouth(body, 0.45, 0.4, 1.35);
    feet(g, 0x5c2470, 0xf7e36b);
  } else if (kind === 'hopper') {
    const b = mesh(ico(0.38, 2), T(0x4fcf5a), 0, 0.4, 0); b.scale.set(1.12, 0.82, 1.2); body.add(ink(b, 0.06));
    for (const [x, z] of [[-0.14, -0.08], [0.18, -0.2], [0.02, 0.05]]) { const sp = mesh(ico(0.06, 1), T(0x2f9f46), x, 0.65, z); sp.scale.y = 0.5; body.add(sp); }
    // throat pouch + wide mouth
    const pouch = mesh(ico(0.17, 1), T(0xff8fa6), 0, 0.28, 0.4); pouch.scale.set(1, 0.8, 0.8); body.add(pouch);
    mouth(body, 0.4, 0.4, 2.1, false);
    // bulging eyes with heavy lids
    for (const s of [-1, 1]) {
      const bump = mesh(ico(0.13, 1), T(0x4fcf5a), 0.2 * s, 0.7, 0.16); body.add(ink(bump, 0.1));
      eye(body, 0.2 * s, 0.73, 0.22, 0.95, 0x9a6a14);
      const lid = mesh(new THREE.SphereGeometry(0.105, 10, 6, 0, TAU, 0, Math.PI * 0.42), T(0x3fae4a), 0.2 * s, 0.735, 0.222); lid.rotation.x = 0.35; lid.scale.setScalar(1.02); body.add(lid);
      // folded hind legs
      const th = mesh(ico(0.14, 1), T(0x3fae4a), 0.34 * s, 0.22, -0.2); th.scale.set(0.7, 1, 1.4); body.add(ink(th, 0.09));
      const ft = mesh(ico(0.1, 1), T(0x2f9f46), 0.36 * s, 0.06, 0.02); ft.scale.set(0.9, 0.45, 1.8); body.add(ft);
      body.add(mesh(ico(0.07, 1), T(0x3fae4a), 0.3 * s, 0.14, 0.4));
    }
  } else if (kind === 'spitter') {
    // bendy stalk of three tilted segments with leaves at the base
    const seg = (y, r0, r1, h, tx) => { const s = mesh(cyl(r0, r1, h, 6), T(0x2b8f4d), tx, y, 0); s.rotation.z = -tx * 0.9; g.add(s); return s; };
    seg(0.2, 0.17, 0.14, 0.4, 0); seg(0.55, 0.14, 0.11, 0.4, 0.03); seg(0.88, 0.11, 0.1, 0.34, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4, leaf = mesh(cone(0.13, 0.62, 4), T(0x3fae4a), Math.cos(a) * 0.2, 0.15, Math.sin(a) * 0.2);
      leaf.scale.z = 0.3; leaf.rotation.y = -a; leaf.rotation.z = -1.15; g.add(leaf);
    }
    const head = new THREE.Group(); head.position.y = 1.05; body.add(head);
    head.add(ink(mesh(ico(0.3, 2), T(0xe0408f)), 0.07));
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; head.add(mesh(sph(0.045, 6, 5), T(0xff8fc0), Math.cos(a) * 0.19, 0.17 + Math.sin(a * 2) * 0.07, Math.sin(a) * 0.19)); }
    // petal collar behind the head
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU, p = mesh(cone(0.11, 0.34, 4), T(i % 2 ? 0xffb83e : 0xff8a2a), Math.cos(a) * 0.3, -0.04, Math.sin(a) * 0.3);
      p.scale.z = 0.35; p.rotation.y = -a; p.rotation.z = -1.0; head.add(p);
    }
    // open mouth: dark throat with a ring of teeth
    const tube = mesh(cyl(0.12, 0.17, 0.3, 8).rotateX(Math.PI / 2), T(0x7a1f4a), 0, -0.02, 0.3); head.add(ink(tube, 0.06));
    head.add(mesh(sph(0.1, 8, 6), Bm(0x1a0710), 0, -0.02, 0.45));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, t = mesh(cone(0.02, 0.07, 4), T(0xfff6dc), Math.cos(a) * 0.14, -0.02 + Math.sin(a) * 0.14, 0.45); t.rotation.x = Math.PI / 2; head.add(t); }
    for (const s of [-1, 1]) { eye(head, 0.13 * s, 0.18, 0.2, 0.62, 0x2a1030); brow(head, 0.13 * s, 0.27, 0.23, 0.1, T(0x7a1f4a), 0.45, s); }
    g.userData.head = head;
  } else if (kind === 'thief') {
    body.add(blob(0x7d8fb5, 0.3, 1, 0.9, 1.15, 0.42));
    // hood pulled over the head, face shadowed, glowing eyes
    const hood = mesh(cone(0.27, 0.5, 8), T(0x3b3560), 0, 0.82, -0.04); hood.rotation.x = -0.25; body.add(ink(hood, 0.07));
    const face = mesh(sph(0.2, 10, 8), Bm(0x15101f), 0, 0.58, 0.17); face.scale.set(1.1, 0.85, 0.7); body.add(face);
    for (const s of [-1, 1]) {
      const e = mesh(sph(0.045, 8, 6), Bm(0xffe14a), 0.09 * s, 0.6, 0.29); e.scale.set(1.3, 0.8, 0.6); e.rotation.z = -0.35 * s; body.add(e);
      const ear = mesh(cone(0.05, 0.2, 4), T(0x7d8fb5), 0.2 * s, 0.7, -0.04); ear.rotation.z = -0.8 * s; body.add(ear);
      arm(body, 0x5a6a90, 0.3 * s, 0.4, 0.1, 0.9);
    }
    body.add(mesh(new THREE.BoxGeometry(0.46, 0.05, 0.2), T(0x1b1730), 0, 0.5, 0.22));
    // striped tail curling behind
    for (let i = 0; i < 5; i++) {
      const sgm = mesh(ico(0.07 - i * 0.004, 1), T(i % 2 ? 0x2c2744 : 0xb7c3de), 0, 0.28 + i * 0.07, -0.32 - Math.sin(i * 0.55) * 0.14);
      body.add(sgm);
    }
    // loot sack with a coin poking out
    const sack = mesh(ico(0.24, 2), T(0xc9a55c), 0.0, 0.52, -0.36); sack.scale.set(1, 1.05, 0.95); body.add(ink(sack, 0.07));
    const knot = mesh(cone(0.07, 0.18, 5), T(0xa8863f), 0, 0.77, -0.36); body.add(knot);
    const coin = mesh(cyl(0.09, 0.09, 0.025, 10).rotateX(Math.PI / 2), Bm(0xffd23e), 0.06, 0.74, -0.3); coin.rotation.y = 0.5; body.add(coin);
    feet(g, 0x3f4a66, 0xb7c3de, 0.15, 0.09, 0.85);
  } else if (kind === 'brute') {
    // hulking torso, small sunk head, big fists and shoulder boulders
    const torso = mesh(ico(0.78, 2), T(0x8a5f4a), 0, 0.85, -0.04); torso.scale.set(1.08, 0.95, 1.0); body.add(ink(torso, 0.05));
    const belly = mesh(ico(0.5, 1), T(0xc99a7a), 0, 0.7, 0.28); belly.scale.set(0.9, 0.9, 0.55); body.add(belly);
    const head = new THREE.Group(); head.position.set(0, 1.4, 0.28); body.add(head);
    head.add(ink(mesh(ico(0.36, 2), T(0x9c6d56)), 0.07));
    const ridge = mesh(cyl(0.07, 0.07, 0.62, 6), T(0x6b4636), 0, 0.12, 0.28); ridge.rotation.z = Math.PI / 2; head.add(ridge);
    for (const s of [-1, 1]) {
      eye(head, 0.14 * s, 0.04, 0.27, 0.62, 0xc03a1f);
      brow(head, 0.14 * s, 0.14, 0.31, 0.16, T(0x4a2f22), 0.5, s);
      const tusk = mesh(cone(0.05, 0.26, 5), T(0xf2e6c4), 0.13 * s, -0.2, 0.3); tusk.rotation.x = -0.4; head.add(tusk);
      const hn = mesh(cone(0.09, 0.4, 5), T(0xe8d6a8), 0.26 * s, 0.34, 0.0); hn.rotation.z = -0.55 * s; head.add(hn);
      // shoulder boulder + fist
      const pad = mesh(ico(0.34, 1), T(0x7a7a86), 0.82 * s, 1.2, 0.0); pad.scale.y = 0.85; body.add(ink(pad, 0.07));
      const fist = mesh(ico(0.3, 1), T(0x9c6d56), 0.92 * s, 0.5, 0.16); body.add(ink(fist, 0.07));
      const fore = mesh(cyl(0.15, 0.2, 0.55, 6), T(0x8a5f4a), 0.88 * s, 0.85, 0.08); fore.rotation.z = 0.12 * s; body.add(fore);
    }
    const jaw = mesh(ico(0.2, 1), T(0x6b4636), 0, -0.2, 0.26); jaw.scale.set(1.5, 0.5, 0.9); head.add(jaw);
    // belt of bones and a loincloth
    const belt = mesh(new THREE.TorusGeometry(0.62, 0.05, 5, 14), T(0xf2e6c4), 0, 0.42, 0); belt.rotation.x = Math.PI / 2; body.add(belt);
    body.add(mesh(new THREE.BoxGeometry(0.5, 0.36, 0.06), T(0xa83a3a), 0, 0.26, 0.56));
    feet(g, 0x3f2c22, 0xe8d6a8, 0.4, 0.18, 1.7);
  }
  // Collapse the static parts into a few meshes per material (the head keeps its own so it can scale).
  const head = g.userData.head, keep = new Set(head ? [head] : []);
  if (head) bake(head);
  bake(body, keep);
  bake(g, new Set([body, ...(g.userData.legs || [])]));
  return g;
}
