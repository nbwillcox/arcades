// Procedural Cinder: a small teal dragon built from primitives and animated by transforms.
// Local forward = +z, up = +y, feet at y=0. About 0.9 m tall.
// Cel-shaded with ink outlines (see kit.js); body parts animate by transform, no skeleton.
import * as THREE from 'three';
import { T, Bm, mesh, ico, sph, cone, cyl, ink, eye, brow, gradient } from './kit.js';

export function createDragon() {
  const teal = T(0x16b8a4), tealD = T(0x0e8f86), tealL = T(0x4fe6cf);
  const amber = T(0xffb83e), amberD = T(0xd9791a), cream = T(0xfff1c9);
  const horn = T(0xffe2a0), pink = T(0xff7a8a);
  const glowMat = Bm(0xffd36a);

  const root = new THREE.Group();
  const rig = new THREE.Group(); root.add(rig);

  // ---- body
  const body = new THREE.Group(); body.position.y = 0.44; rig.add(body);
  const torso = mesh(ico(0.34, 2), teal); torso.scale.set(0.86, 0.76, 1.55); body.add(ink(torso, 0.055));
  // belly: amber plates down the underside
  const belly = mesh(ico(0.3, 2), amber, 0, -0.09, 0.05); belly.scale.set(0.7, 0.55, 1.4); body.add(belly);
  for (let i = 0; i < 5; i++) {
    const p = mesh(ico(0.2, 1), amberD, 0, -0.2 + i * 0.002, 0.34 - i * 0.14);
    p.scale.set(0.52 - i * 0.03, 0.2, 0.2); body.add(p);
  }

  // ---- neck + head
  const neck = new THREE.Group(); neck.position.set(0, 0.14, 0.34); body.add(neck);
  const neckMesh = mesh(ico(0.17, 1), teal, 0, 0.04, 0.05); neckMesh.scale.set(1, 1.05, 1.25); neck.add(neckMesh);
  const head = new THREE.Group(); head.position.set(0, 0.17, 0.15); head.scale.setScalar(1.3); neck.add(head);
  const skull = mesh(ico(0.25, 2), teal, 0, 0.03, 0); skull.scale.set(1.12, 1.0, 0.98); head.add(ink(skull, 0.06));
  const snout = mesh(ico(0.14, 2), tealL, 0, -0.07, 0.2); snout.scale.set(1.0, 0.7, 1.05); head.add(ink(snout, 0.07));
  // nostrils on the snout tip
  for (const s of [-1, 1]) head.add(mesh(sph(0.021, 6, 5), Bm(0x0d3b3a), 0.045 * s, -0.03, 0.31));
  // upper cheek patch + brow ridge give the face structure
  
  for (const s of [-1, 1]) {
    eye(head, 0.125 * s, 0.09, 0.15, 1.1, 0xe0891a, 1);
    brow(head, 0.13 * s, 0.215, 0.18, 0.13, tealD, 0.25, s);
    // curved horn: two cones so it sweeps back
    const h1 = mesh(cone(0.06, 0.24, 6), horn, 0.12 * s, 0.24, -0.04); h1.rotation.x = -0.55; h1.rotation.z = -0.2 * s; head.add(h1);
    const h2 = mesh(cone(0.04, 0.2, 6), horn, 0.15 * s, 0.38, -0.16); h2.rotation.x = -1.05; h2.rotation.z = -0.35 * s; head.add(h2);
    // ear fin
    const ear = mesh(cone(0.045, 0.2, 4), tealL, 0.2 * s, 0.0, -0.08); ear.rotation.z = -1.25 * s; ear.rotation.x = -0.5; ear.scale.z = 0.4; head.add(ear);
    // blush cheek
    head.add(mesh(ico(0.05, 1), pink, 0.21 * s, -0.06, 0.1));
  }
  // lower jaw (rotates open to breathe fire) with a tongue and two little fangs
  const jaw = new THREE.Group(); jaw.position.set(0, -0.14, 0.1); head.add(jaw);
  const jawM = mesh(ico(0.1, 1), tealD, 0, 0, 0.08); jawM.scale.set(0.95, 0.42, 1.2); jaw.add(jawM);
  const tongue = mesh(ico(0.06, 1), pink, 0, 0.015, 0.1); tongue.scale.set(0.9, 0.35, 1.4); jaw.add(tongue);
  for (const s of [-1, 1]) { const f = mesh(cone(0.014, 0.05, 4), cream, 0.05 * s, 0.045, 0.15); f.rotation.x = Math.PI; jaw.add(f); }

  // ---- back crest: graduated spikes that continue onto the tail
  const crest = [];
  for (let i = 0; i < 6; i++) {
    const c = mesh(cone(0.062 - i * 0.006, 0.19 - i * 0.016, 5), amber, 0, 0.34 - i * 0.012, 0.3 - i * 0.12);
    c.rotation.x = -0.3; body.add(c); crest.push(c);
  }

  // ---- legs: thigh + shin + foot with claws (hip group rotates)
  const legs = [];
  const legAt = (x, z) => {
    const hip = new THREE.Group(); hip.position.set(x, -0.1, z); body.add(hip);
    const thigh = mesh(ico(0.1, 1), teal, 0, -0.07, 0); thigh.scale.set(1, 1.3, 1.1);
    const shin = mesh(cyl(0.062, 0.05, 0.2, 6), tealD, 0, -0.2, 0.01);
    const foot = mesh(ico(0.095, 1), amber, 0, -0.28, 0.06); foot.scale.set(1.05, 0.55, 1.5);
    hip.add(ink(thigh, 0.1), shin, ink(foot, 0.1));
    for (const dx of [-0.045, 0, 0.045]) { const c = mesh(cone(0.016, 0.055, 4), cream, dx, -0.275, 0.17); c.rotation.x = Math.PI / 2; hip.add(c); }
    legs.push(hip); return hip;
  };
  legAt(0.18, 0.25); legAt(-0.18, 0.25); legAt(0.18, -0.25); legAt(-0.18, -0.25);

  // ---- wings: arm + elbow, four fingers, scalloped membrane with an amber edge
  const WS = 2.1;
  const V = (x, y, z) => new THREE.Vector3(x * WS, y * WS, z * WS);
  const P = {
    root: V(0, 0, 0), elbow: V(0.28, 0.24, -0.04),
    tipA: V(0.8, 0.5, -0.16), tipB: V(0.84, 0.18, -0.46), tipC: V(0.58, -0.02, -0.58), tipD: V(0.26, -0.04, -0.46),
  };
  const mid = (a, b, pull) => a.clone().add(b).multiplyScalar(0.5).lerp(P.root, pull);
  const m1 = mid(P.tipA, P.tipB, 0.34), m2 = mid(P.tipB, P.tipC, 0.36), m3 = mid(P.tipC, P.tipD, 0.34);
  const ring = [P.tipA, m1, P.tipB, m2, P.tipC, m3, P.tipD];
  const pos = [], col = [];
  const cRoot = new THREE.Color(0x1aa8c8), cEdge = new THREE.Color(0xff9a3e);
  const push = (v, c) => { pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); };
  for (let i = 0; i < ring.length - 1; i++) { push(P.root, cRoot); push(ring[i], cEdge); push(ring[i + 1], cEdge); }
  // fill the arm side so the leading edge has membrane too
  push(P.root, cRoot); push(P.elbow, cRoot); push(P.tipA, cEdge);
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  wingGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  wingGeo.computeVertexNormals();
  const wingMat = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.94, gradientMap: gradient() });
  const bone = (a, b, r, m) => {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const o = mesh(cyl(r, r * 0.6, len, 5), m);
    o.position.copy(a).addScaledVector(d, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return o;
  };
  const wings = [];
  for (const s of [1, -1]) {
    const pivot = new THREE.Group(); pivot.position.set(0.16 * s, 0.24, 0.02); body.add(pivot);
    const inner = new THREE.Group(); inner.scale.x = s; pivot.add(inner);
    inner.add(mesh(wingGeo, wingMat));
    inner.add(bone(P.root, P.elbow, 0.034, amberD), bone(P.elbow, P.tipA, 0.025, amberD), bone(P.root, P.tipB, 0.014, amberD));
    inner.add(bone(P.elbow, P.tipB, 0.016, amberD), bone(P.root, P.tipC, 0.014, amberD), bone(P.root, P.tipD, 0.012, amberD));
    inner.add(mesh(cone(0.035, 0.14, 4), cream, P.tipA.x + 0.04, P.tipA.y + 0.05, P.tipA.z - 0.01).rotateZ(-0.9));
    wings.push(pivot);
  }

  // ---- tail: tapering segments with spikes, ending in a glowing spade
  const tail = [];
  let parent = body, off = -0.4, rad = 0.15;
  const N = 10;
  for (let i = 0; i < N; i++) {
    const seg = new THREE.Group(); seg.position.set(0, i === 0 ? -0.03 : 0, off); parent.add(seg);
    const sm = mesh(ico(rad, 1), i > 3 ? tealD : teal, 0, 0, -rad * 0.6);
    seg.add(ink(sm, 0.07));
    if (i > 0 && i < 9) { const sp = mesh(cone(0.05 - i * 0.004, 0.16 - i * 0.012, 4), amber, 0, rad * 0.75, -rad * 0.6); sp.rotation.x = -0.4; seg.add(sp); }
    tail.push(seg); parent = seg; off = -rad * 1.05; rad *= 0.86;
  }
  const spade = mesh(new THREE.OctahedronGeometry(0.1, 0), amber, 0, 0, -0.22); spade.scale.set(1.9, 0.3, 2.6); tail[N - 1].add(ink(spade, 0.12));
  for (const s of [-1, 1]) { const bb = mesh(cone(0.04, 0.16, 4), amberD, 0.12 * s, 0, -0.14); bb.rotation.z = -1.3 * s; bb.rotation.x = -0.5; tail[N - 1].add(bb); }
  const tipGlow = mesh(ico(0.07, 1), glowMat, 0, 0, -0.42); tail[N - 1].add(tipGlow);

  const st = { phase: 0, squash: 0, flap: 0, lean: 0, wing: 0, wingY: 1.3, t: 0, bob: 0, blink: 3 };
  const eyeGroups = head.children.filter((c) => c.isGroup && c.children.length === 4);

  function update(dt, p) {
    st.t += dt;
    const sp = Math.hypot(p.vx, p.vz);
    const run = p.onGround && !p.sliding ? Math.min(1, sp / 6) : 0;
    st.phase += dt * (6 + sp * 1.3) * (p.onGround ? 1 : 0.2);
    st.squash += (0 - st.squash) * (1 - Math.exp(-14 * dt));

    // legs
    for (let i = 0; i < 4; i++) {
      const diag = (i === 0 || i === 3) ? 0 : Math.PI;
      let r = Math.sin(st.phase + diag) * 0.9 * run;
      if (!p.onGround) r = p.gliding ? 0.6 : (p.vy > 0 ? -0.5 : 0.5);
      if (p.charging) r = 0.9;
      legs[i].rotation.x += (r - legs[i].rotation.x) * (1 - Math.exp(-18 * dt));
    }
    // body bob + lean
    const bob = p.onGround ? Math.abs(Math.sin(st.phase)) * 0.045 * run : 0;
    const idle = Math.sin(st.t * 2) * 0.012;
    const tl = p.charging ? 0.38 : p.gliding ? 0.2 : !p.onGround ? (p.vy > 2 ? -0.1 : 0.12) : 0.14 * run;
    st.lean += (tl - st.lean) * (1 - Math.exp(-12 * dt));
    body.rotation.x = st.lean;
    body.position.y = 0.44 + bob + idle - st.squash * 0.08;
    body.scale.set(1 + st.squash * 0.15, 1 - st.squash * 0.2, 1 + st.squash * 0.1);
    const yr = (p.yawRate || 0);
    body.rotation.z += ((-yr * 0.04) - body.rotation.z) * (1 - Math.exp(-10 * dt));

    // wings: swept back and folded on the ground, flapping in the air, spread to glide
    let wz, wyT;
    if (p.gliding) { wz = 0.08 + Math.sin(st.t * 14) * 0.03; wyT = 0.18; }
    else if (!p.onGround) { st.flap += dt * (p.vy > 0 ? 18 : 9); wz = 0.35 + Math.sin(st.flap) * 0.6; wyT = 0.15; }
    else if (p.charging) { wz = -0.55; wyT = 1.5; }
    else { wz = -0.45 + Math.sin(st.t * 3) * 0.04; wyT = 1.3; }
    st.wing += (wz - st.wing) * (1 - Math.exp(-16 * dt));
    st.wingY += (wyT - st.wingY) * (1 - Math.exp(-12 * dt));
    wings[0].rotation.z = st.wing; wings[1].rotation.z = -st.wing;
    wings[0].rotation.y = st.wingY; wings[1].rotation.y = -st.wingY;

    // head: look up when flaming, down when charging; jaw opens with a flicker
    const hp = p.flaming ? -0.45 : p.charging ? 0.4 : (p.vy > 3 ? -0.15 : 0.05);
    head.rotation.x += (hp - head.rotation.x) * (1 - Math.exp(-(p.flaming ? 40 : 14) * dt));
    const jt = p.flaming ? 0.5 + Math.sin(st.t * 30) * 0.1 : (Math.sin(st.t * 1.7) > 0.96 ? 0.12 : 0);
    jaw.rotation.x += (jt - jaw.rotation.x) * (1 - Math.exp(-(p.flaming ? 50 : 20) * dt));
    neck.rotation.x = -st.lean * 0.5;

    // blink every few seconds
    st.blink -= dt;
    const bl = st.blink < 0.1 && st.blink > 0 ? 0.12 : 1;
    if (st.blink <= 0) st.blink = 2.5 + Math.random() * 3;
    for (const g of eyeGroups) g.scale.y = 0.95 * bl;

    // tail sway, with a little follow-through
    for (let i = 0; i < tail.length; i++) {
      const a = Math.sin(st.t * 3 + i * 0.7) * 0.15 + Math.sin(st.phase * 0.5 + i) * 0.12 * run - (yr * 0.045);
      tail[i].rotation.y += (a - tail[i].rotation.y) * (1 - Math.exp(-10 * dt));
      tail[i].rotation.x = p.charging ? -0.1 : (!p.onGround ? 0.09 : Math.sin(st.t * 2 + i * 0.5) * 0.03);
    }
    tipGlow.scale.setScalar(1 + Math.sin(st.t * 9) * 0.2);
    crest.forEach((c, i) => { c.rotation.x = -0.3 + Math.sin(st.t * 4 + i) * 0.05 + st.lean * 0.3; });
  }

  return {
    root, update,
    pulse(type) { if (type === 'land') st.squash = 1; else if (type === 'jump') st.squash = -0.5; },
    snoutWorld(out, yaw) { out.x = Math.sin(yaw) * 0.95; out.z = Math.cos(yaw) * 0.95; out.y = 0.78; },
  };
}
