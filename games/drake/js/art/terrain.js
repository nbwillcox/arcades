// Terrain + box meshes. Triangle layout must match collide.js World.sample.
import * as THREE from 'three';
import { makeRaft } from './bridges.js';

const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

export function buildTerrainMesh(world, theme) {
  const n = world.n, cs = world.cs, W = n + 1, H = world.H;
  const tris = n * n * 2;
  const pos = new Float32Array(tris * 9), col = new Float32Array(tris * 9);
  const c = new THREE.Color();
  let o = 0;
  const grass = new THREE.Color(theme.grass), grass2 = new THREE.Color(theme.grass2 || theme.grass);
  const rock = new THREE.Color(theme.rock), sand = new THREE.Color(theme.sand || theme.grass);
  const tri = (i0, j0, i1, j1, i2, j2, seed) => {
    const ax = i0 * cs, ay = H[j0 * W + i0], az = j0 * cs;
    const bx = i1 * cs, by = H[j1 * W + i1], bz = j1 * cs;
    const cx = i2 * cs, cy = H[j2 * W + i2], cz = j2 * cs;
    pos.set([ax, ay, az, bx, by, bz, cx, cy, cz], o);
    // face normal for colour choice
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az, e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const l = Math.hypot(nx, ny, nz) || 1; ny /= l;
    const avgY = (ay + by + cy) / 3;
    const r = hash(i0 * 3 + seed, j0 * 7 + seed);
    if (ny < 0.72) c.copy(rock).multiplyScalar(0.85 + r * 0.25);
    else if (avgY < (theme.sandBelow ?? -99)) c.copy(sand).multiplyScalar(0.92 + r * 0.16);
    else { c.copy(grass).lerp(grass2, ((i0 + j0) & 1) * 0.5 + r * 0.25).multiplyScalar(0.9 + r * 0.2); }
    for (let k = 0; k < 3; k++) { col[o + k * 3] = c.r; col[o + k * 3 + 1] = c.g; col[o + k * 3 + 2] = c.b; }
    o += 9;
  };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    tri(i, j, i + 1, j + 1, i + 1, j, 0); // A = (00,11,10)
    tri(i, j, i, j + 1, i + 1, j + 1, 1); // B = (00,01,11)
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  return m;
}

export function buildBoxMeshes(world, group) {
  const meshes = [];
  for (const b of world.boxes) {
    if (b.hidden) continue;
    const w = b.max[0] - b.min[0], h = b.max[1] - b.min[1], d = b.max[2] - b.min[2];
    if (b.raft) { const m = makeRaft(w, d, h); m.position.set(b.min[0] + w / 2, b.min[1] + h / 2, b.min[2] + d / 2); b.mesh = m; group.add(m); meshes.push(m); continue; }
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: b.color || 0x9aa3b5, flatShading: true }));
    m.position.set(b.min[0] + w / 2, b.min[1] + h / 2, b.min[2] + d / 2);
    b.mesh = m; group.add(m); meshes.push(m);
    // neon top edge
    if (b.glow !== false) {
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: b.edge || 0x6ff5ff }));
      m.add(e);
    }
  }
  return meshes;
}
