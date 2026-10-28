// Visual bridges and ferry rafts. Collision stays as simple boxes (levelgen); these are the meshes drawn over them.
import * as THREE from 'three';

const M = (c, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c, flatShading: true }, o));
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
const hash = (n) => { const v = Math.sin(n * 91.7 + 3.1) * 43758.5453; return v - Math.floor(v); };

// A rope-and-plank bridge between two nodes: boards across, two side ropes on posts, and support beams underneath.
export function buildBridges(spec, color = 0xb98a55) {
  const group = new THREE.Group();
  for (const sg of spec.segs) {
    if (sg.type !== 'bridge') continue;
    const A = sg.A, B = sg.B, dx = sg.dx, dz = sg.dz, w = sg.w, yaw = Math.atan2(dx, dz);
    const along0 = sg.ra, len = sg.run, y = (u) => A.h + (B.h - A.h) * u;
    const root = new THREE.Group(); root.rotation.y = yaw; root.position.set(A.x + dx * along0, 0, A.z + dz * along0); group.add(root);
    const wood = [M(color), M(0xa97a48), M(0xc79a62), M(0x9a6e40)], dark = M(0x5e3f24), rope = M(0xd8c7a0);
    // boards
    const nb = Math.max(2, Math.round(len / 0.5));
    for (let i = 0; i <= nb; i++) {
      const u = i / nb, b = mesh(new THREE.BoxGeometry(w + 0.1 * Math.sin(i * 2.3), 0.12, 0.44), wood[i % 4], (hash(i) - 0.5) * 0.06, y(u) - 0.06, u * len);
      b.rotation.y = (hash(i + 7) - 0.5) * 0.05; root.add(b);
    }
    // support beams and cross ties
    for (const s of [-1, 1]) {
      const sl = Math.atan2(B.h - A.h, len);
      const beam = mesh(new THREE.BoxGeometry(0.2, 0.22, Math.hypot(len, B.h - A.h)), dark, s * (w / 2 - 0.15), (A.h + B.h) / 2 - 0.25, len / 2); beam.rotation.x = -sl; root.add(beam);
    }
    // rope rails on posts
    const np = Math.max(2, Math.round(len / 2.2));
    for (const s of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= np; i++) {
        const u = i / np, post = mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.15, 6), dark, s * (w / 2 + 0.02), y(u) + 0.5, u * len); root.add(post);
        if (i === 0 || i === np) root.add(mesh(new THREE.SphereGeometry(0.13, 6, 5), M(0xffd36a), s * (w / 2 + 0.02), y(u) + 1.1, u * len));
        pts.push(new THREE.Vector3(s * (w / 2 + 0.02), y(u) + 1.0 - 0.06 * Math.sin(Math.PI * u), u * len));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      root.add(mesh(new THREE.TubeGeometry(curve, np * 4, 0.035, 5, false), rope));
      const low = pts.map((p) => new THREE.Vector3(p.x, p.y - 0.45, p.z));
      root.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(low), np * 4, 0.028, 5, false), rope));
    }
  }
  return group;
}

// A wooden raft for ferries: log hull, plank deck, corner posts with a rope and a little lantern.
// Built around the centre of its collision box; the deck surface sits at the box top.
export function makeRaft(w, d, h) {
  const g = new THREE.Group();
  const log = M(0x7a4f2e), log2 = M(0x8e5e36), plank = M(0xc9955a), plank2 = M(0xb7834c), dark = M(0x5e3f24), rope = M(0xd8c7a0);
  const top = h / 2;
  // logs underneath
  const n = Math.max(3, Math.round(d / 0.9));
  for (let i = 0; i < n; i++) { const z = (i / (n - 1) - 0.5) * (d - 0.5); g.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, w + 0.5, 7).rotateZ(Math.PI / 2), i % 2 ? log : log2, 0, -top + 0.05 - 0.05, z)); }
  // deck planks
  const np = Math.max(4, Math.round(w / 0.45));
  for (let i = 0; i < np; i++) { const x = (i / (np - 1) - 0.5) * (w - 0.3); g.add(mesh(new THREE.BoxGeometry(w / np - 0.04, 0.12, d - 0.2), i % 2 ? plank : plank2, x, top - 0.08, 0)); }
  for (const z of [-d / 2 + 0.3, d / 2 - 0.3]) g.add(mesh(new THREE.BoxGeometry(w + 0.1, 0.1, 0.2), dark, 0, top - 0.02, z));
  // posts and rope rails
  const pts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.95, 6), dark, sx * (w / 2 - 0.15), top + 0.42, sz * (d / 2 - 0.15)); g.add(p);
    g.add(mesh(new THREE.SphereGeometry(0.12, 6, 5), M(0xffd36a), sx * (w / 2 - 0.15), top + 0.92, sz * (d / 2 - 0.15)));
  }
  for (const sx of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * (w / 2 - 0.15), top + 0.8, -(d / 2 - 0.15)), new THREE.Vector3(sx * (w / 2 - 0.15), top + 0.7, 0), new THREE.Vector3(sx * (w / 2 - 0.15), top + 0.8, d / 2 - 0.15)]);
    g.add(mesh(new THREE.TubeGeometry(c, 8, 0.03, 5, false), rope));
  }
  // bow lantern
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.5, 5), dark, 0, top + 0.75, d / 2 - 0.2), mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd36a }), 0, top + 1.6, d / 2 - 0.2));
  return g;
}
