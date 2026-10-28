// Layout generator: turns (seed, style) into a node/link graph that obeys the movement limits.
// Styles: sprawl (open walk with a few hops), climb (spiral ascent), isles (gap hopping with vents/springs), canyon (steps and drops).
import { rng } from './levelgen.js';

const sub = (a, b) => [a.x - b.x, a.z - b.z];
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
function segCross(a, b, c, d) {
  const o = (p, q, r) => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

export function genLayout(o) {
  const R = rng((o.seed * 2654435761) % 2147483647 + 17);
  const rr = (a, b) => a + R() * (b - a);
  const S = o.size || 200, M = 28, style = o.style || 'sprawl';
  const nodes = {}, links = [], chain = [];
  let n = 0;
  const addNode = (x, z, r, h) => { const id = 'n' + n++; nodes[id] = { x, z, r, h }; return id; };
  const clearOfNodes = (x, z, r, ignore) => x > M && x < S - M && z > M && z < S - M && Object.entries(nodes).every(([k, q]) => k === ignore || Math.hypot(q.x - x, q.z - z) > q.r + r + 7);
  const linkClear = (A, B, ignoreA, ignoreB) => {
    for (const [k, q] of Object.entries(nodes)) {
      if (k === ignoreA || k === ignoreB) continue;
      if (segDist(q.x, q.z, A.x, A.z, B.x, B.z) < q.r + 4.5) return false;
    }
    for (const L of links) { const P = nodes[L.a], Q = nodes[L.b]; if (P === A || P === B || Q === A || Q === B) continue; if (segCross(A, B, P, Q)) return false; }
    return true;
  };
  const clampH = (h) => Math.max(o.minH === undefined ? 0 : o.minH, Math.min(o.maxH || 16, h));

  // try to place a node reached from `from` by link `type` heading near `ang`; returns id or null
  function extend(fromId, type, ang, opts = {}) {
    const A = nodes[fromId];
    for (let tries = 0; tries < 18; tries++) {
      const a = ang + (tries === 0 ? 0 : (R() - 0.5) * (0.6 + tries * 0.14));
      const rad = opts.r || rr(o.rMin || 7.5, o.rMax || 12);
      let gapEdge, dh, link = { type };
      if (type === 'ramp' || type === 'steps') {
        gapEdge = rr(11, 19);
        const run = gapEdge * 0.78;
        dh = rr(-2.6, 3.0); dh = Math.max(-0.32 * run, Math.min(0.32 * run, dh));
        link.w = rr(4.2, 6.5);
      } else if (type === 'gap') {
        gapEdge = rr(2.8, 4.2); dh = rr(-4.5, 0.7);
        if (dh < -1) gapEdge = Math.min(gapEdge + (-dh) * 1.3, 8.5);
      } else if (type === 'vent') {
        gapEdge = rr(6, 10); dh = rr(3.6, 7.5);
      } else if (type === 'spring') {
        gapEdge = rr(6, 9.5); dh = rr(1.8, 3.6);
      } else if (type === 'ferry' || type === 'bridge') {
        gapEdge = rr(14, 19); dh = 0; link.w = type === 'ferry' ? 4.2 : 3.6;
      }
      const h = clampH(A.h + dh);
      const realDh = h - A.h;
      const d = A.r + rad + gapEdge;
      const x = A.x + Math.cos(a) * d, z = A.z + Math.sin(a) * d;
      if (!clearOfNodes(x, z, rad, fromId)) continue;
      const B = { x, z, r: rad, h };
      if (!linkClear(A, B, fromId, null)) continue;
      const id = addNode(x, z, rad, h);
      link.a = fromId; link.b = id;
      if (type === 'gap' && realDh < -1.0) link.oneWay = true;
      if (type === 'vent') {
        const ux = Math.cos(a), uz = Math.sin(a);
        link.type = 'gap'; link.vent = { x: A.x + ux * A.r * 0.55, z: A.z + uz * A.r * 0.55, h: Math.max(8, realDh + 4.5) };
      }
      if (type === 'spring') {
        const ux = Math.cos(a), uz = Math.sin(a);
        link.type = 'gap'; link.spring = { x: A.x + ux * A.r * 0.55, z: A.z + uz * A.r * 0.55, power: 22 };
        if (realDh > 4) { /* too tall for the spring: fall back is rejected by the validator */ }
      }
      links.push(link);
      return id;
    }
    return null;
  }

  const pickType = (i) => {
    const w = o.mix || { ramp: 0.7, gap: 0.2, vent: 0.05, spring: 0.05 };
    let t = R(), acc = 0;
    for (const [k, v] of Object.entries(w)) { acc += v; if (t <= acc) return k; }
    return 'ramp';
  };

  // ---------------- chains
  if (style === 'sprawl' || style === 'isles' || style === 'canyon') {
    const sx = M + 4, sz = S / 2 + rr(-30, 30);
    const startR = 11;
    const first = addNode(sx, sz, startR, o.baseH === undefined ? 0.5 : o.baseH);
    chain.push(first);
    const N = o.count || 8;
    let heading = rr(-0.3, 0.3);
    for (let i = 1; i < N; i++) {
      const prev = chain[chain.length - 1], P = nodes[prev];
      // steer toward the far side and back toward the middle
      const wantZ = S / 2 + Math.sin(i * (style === 'canyon' ? 0.9 : 1.3) + o.seed) * (style === 'canyon' ? 48 : 36);
      const toward = Math.atan2(wantZ - P.z, 40);
      heading = heading * 0.4 + toward * 0.6 + rr(-0.25, 0.25);
      let type = i <= 1 && style !== 'isles' ? 'ramp' : pickType(i);
      if (style === 'isles') type = i === 1 ? 'gap' : (R() < 0.3 ? 'vent' : R() < 0.25 ? 'spring' : 'gap');
      if (style === 'canyon') type = R() < 0.35 ? 'steps' : 'ramp';
      if (o.liquid && style !== 'isles' && R() < (o.ferryChance || 0.12)) type = R() < 0.5 ? 'ferry' : 'bridge';
      // keep the end of the chain reasonable: heading east
      let id = extend(prev, type, heading);
      if (!id) id = extend(prev, 'ramp', heading + (R() < 0.5 ? 0.8 : -0.8));
      if (!id) id = extend(prev, 'gap', heading + (R() < 0.5 ? 1.2 : -1.2));
      if (!id) break;
      chain.push(id);
    }
  } else if (style === 'climb') {
    const C = { x: S / 2, z: S / 2 };
    const N = o.count || 9, R0 = o.radius || 62, R1 = R0 - 24;
    const top = o.maxH || 22, a0 = rr(0, 6.28);
    let a = a0;
    for (let i = 0; i < N; i++) {
      const rad = i === N - 1 ? 13 : rr(8.5, 11), Ri = R0 + (R1 - R0) * (i / (N - 1));
      const x = C.x + Math.cos(a) * Ri, z = C.z + Math.sin(a) * Ri, h = (i / (N - 1)) * top + (i === 0 ? (o.baseH || 0.5) : 0);
      const id = addNode(x, z, rad, h);
      if (i) {
        const prev = chain[chain.length - 1], A = nodes[prev];
        links.push({ a: prev, b: id, type: i % 3 === 0 ? 'steps' : 'ramp', w: rr(5, 6.5) });
      }
      chain.push(id);
      const chord = 40 + rr(-3, 4);
      a += 2 * Math.asin(Math.min(0.99, chord / (2 * Ri)));
    }
  }

  // ---------------- branches (dead ends)
  const branchIds = [];
  const wantBranches = o.branches === undefined ? 3 : o.branches;
  for (let b = 0, guard = 0; b < wantBranches && guard < 60; guard++) {
    if (chain.length < 4) break;
    const idx = 1 + Math.floor(R() * (chain.length - 2)), from = chain[idx], A = nodes[from];
    if (links.filter((l) => l.a === from || l.b === from).length > 3) continue;
    // perpendicular to the chain direction around idx
    const nb = nodes[chain[Math.min(chain.length - 1, idx + 1)]], pb = nodes[chain[idx - 1]];
    const dir = Math.atan2(nb.z - pb.z, nb.x - pb.x) + (R() < 0.5 ? 1 : -1) * (Math.PI / 2 + rr(-0.35, 0.35));
    const type = style === 'isles' ? (R() < 0.5 ? 'gap' : 'spring') : (R() < 0.75 ? 'ramp' : 'gap');
    const id = extend(from, type, dir, { r: rr(6.5, 8.5) });
    if (id) { branchIds.push(id); b++; }
  }

  // ---------------- roles
  const ids = Object.keys(nodes);
  const exit = chain[chain.length - 1];
  const high = ids.filter((k) => k !== chain[0]).sort((a, b) => nodes[b].h - nodes[a].h);
  const elders = [];
  for (const id of branchIds) if (elders.length < 3) elders.push(id);
  for (const id of chain.slice(2, -1).reverse()) if (elders.length < 3 && !elders.includes(id)) elders.push(id);
  const chest = high.find((k) => !elders.includes(k) && k !== exit) || high[0];
  const lanterns = chain.filter((_, i) => i % 2 === 1 && i < chain.length - 1);
  return { nodes, links, chain, branches: branchIds, spawn: chain[0], exit, roles: { elders, chest, lanterns } };
}
