import { applyFill, linkTrails } from './levelfill.js';

// Level generator (pure, runs in Node and browser).
// A level is described as plateau NODES joined by LINKS (ramps, steps or jump gaps) over a LOWLAND.
// buildSpec(def) turns that into a heightfield function, collision boxes, decor and entities, so
// layouts are valid by construction and the validator can walk the node graph.

const sm = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

export function hash2(a, b, seed = 0) {
  let h = (a * 374761393 + b * 668265263 + seed * 1442695041) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export function vnoise(x, z, seed = 0) {
  const xi = Math.floor(x), zi = Math.floor(z), u = sm(0, 1, x - xi), v = sm(0, 1, z - zi);
  const a = hash2(xi, zi, seed), b = hash2(xi + 1, zi, seed), c = hash2(xi, zi + 1, seed), d = hash2(xi + 1, zi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967295; }; }

// Signed-ish distance from (x,z) to a node's footprint (0 inside).
function nodeDist(nd, x, z) {
  if (nd.w) { // rectangle centred on (x,z), size w x d
    const dx = Math.max(Math.abs(x - nd.x) - nd.w / 2, 0), dz = Math.max(Math.abs(z - nd.z) - (nd.d || nd.w) / 2, 0);
    return Math.hypot(dx, dz);
  }
  return Math.max(0, Math.hypot(x - nd.x, z - nd.z) - nd.r);
}
const nodeRadius = (nd) => (nd.w ? Math.min(nd.w, nd.d || nd.w) / 2 : nd.r);

export const LIMITS = { rampSlope: 0.55, jumpGap: 7.5, glideGap: 34 };

export function buildSpec(def) {
  const cs = def.cs || 1;
  const size = def.size || 160;
  const n = Math.round(size / cs);
  const nodes = def.nodes;
  for (const k of Object.keys(nodes)) { const nd = nodes[k]; nd.id = k; nd.edge = nd.edge === undefined ? 2.4 : nd.edge; nd.bump = nd.bump === undefined ? 0.18 : nd.bump; }
  const links = def.links || [];
  const low = Object.assign({ h: 0, amp: 0.7, scale: 0.06 }, def.low);
  const seed = def.seed || 1;

  // pre-compute link geometry: segment from edge of A to edge of B
  const segs = [];
  for (const L of links) {
    const A = nodes[L.a], B = nodes[L.b];
    let dx = B.x - A.x, dz = B.z - A.z; const len = Math.hypot(dx, dz); dx /= len; dz /= len;
    const ra = nodeRadius(A) * 0.9, rb = nodeRadius(B) * 0.9;
    const s = { L, A, B, dx, dz, len, ra, rb, w: L.w || 4.5, edge: L.edge === undefined ? 1.6 : L.edge, type: L.type || 'ramp' };
    s.run = Math.max(0.01, len - ra - rb);
    s.slope = Math.abs(B.h - A.h) / s.run;
    segs.push(s);
  }

  const bumpy = (x, z, a) => (vnoise(x * 0.35, z * 0.35, seed + 7) - 0.5) * 2 * a;

  function height(x, z) {
    let h = low.h + (vnoise(x * low.scale, z * low.scale, seed) - 0.5) * 2 * low.amp + (vnoise(x * 0.23, z * 0.23, seed + 3) - 0.5) * 0.35;
    for (const nd of Object.values(nodes)) {
      const d = nodeDist(nd, x, z);
      if (d > nd.edge) continue;
      const t = sm(nd.edge, 0, d);
      h = lerp(h, nd.h + bumpy(x, z, nd.bump), t);
    }
    for (const s of segs) {
      if (s.type === 'gap' || s.type === 'bridge' || s.type === 'ferry') continue;
      const px = x - s.A.x, pz = z - s.A.z;
      const along = px * s.dx + pz * s.dz, lat = Math.abs(px * s.dz - pz * s.dx);
      if (along < s.ra - s.edge || along > s.len - s.rb + s.edge || lat > s.w / 2 + s.edge) continue;
      const u = Math.min(1, Math.max(0, (along - s.ra) / s.run));
      let target = lerp(s.A.h, s.B.h, u);
      if (s.type === 'steps') target = s.A.h + Math.round((s.B.h - s.A.h) * u / 0.4) * 0.4;
      const t = sm(s.w / 2 + s.edge, s.w / 2, lat) * (along < s.ra ? sm(s.ra - s.edge, s.ra, along) : 1) * (along > s.len - s.rb ? sm(s.len - s.rb + s.edge, s.len - s.rb, along) : 1);
      h = lerp(h, target + bumpy(x, z, 0.08), t);
    }
    // ring of hills around the map edge
    const edge = Math.min(x, z, size - x, size - z);
    h += (1 - sm(0, def.rim || 14, edge)) * (def.rimH === undefined ? 14 : def.rimH) + (vnoise(x * 0.12, z * 0.12, seed + 9) - 0.5) * (1 - sm(0, 20, edge)) * 5;
    if (def.shape) h = def.shape(x, z, h);
    return h;
  }

  const at = (id, angDeg = 0, rad = 0) => {
    const nd = nodes[id], a = (angDeg * Math.PI) / 180;
    return [nd.x + Math.cos(a) * rad, nd.z + Math.sin(a) * rad];
  };
  const ctx = { at, nodes, height, size, spec: null, node: (id) => nodes[id] };

  const entities = typeof def.entities === 'function' ? def.entities(ctx) : (def.entities || []);
  const boxes = typeof def.boxes === 'function' ? def.boxes(ctx) : (def.boxes || []);
  const sp = nodes[def.spawn];
  const spec = {
    id: def.id, name: def.name, world: def.world, kind: def.kind || 'level',
    n, cs, size, height, nodes, links, segs, boxes, entities, decor: [],
    theme: def.theme, music: def.music, liquid: def.liquid || null,
    spawn: [sp.x + (def.spawnOff ? def.spawnOff[0] : 0), 0, sp.z + (def.spawnOff ? def.spawnOff[1] : 0), def.spawnYaw || 0],
    killY: def.killY === undefined ? (def.low && def.low.h !== undefined ? def.low.h - 30 : -30) : def.killY,
    def, seed,
  };
  spec.spawn[1] = height(spec.spawn[0], spec.spawn[2]) + 0.2;
  ctx.spec = spec;
  // bridges: a chain of thin planks (axis-aligned boxes) from edge to edge
  for (const sg of segs) {
    if (sg.type !== 'bridge') continue;
    const step = sg.w * 0.75, cnt = Math.max(1, Math.ceil(sg.run / step));
    for (let i = 0; i <= cnt; i++) {
      const along = sg.ra + sg.run * (i / cnt), x = sg.A.x + sg.dx * along, z = sg.A.z + sg.dz * along;
      const top = lerp(sg.A.h, sg.B.h, i / cnt), hw = sg.w / 2;
      spec.boxes.push({ min: [x - hw, top - 0.35, z - hw], max: [x + hw, top, z + hw], color: def.bridgeColor || 0xb98a55, edge: 0x7a5530, plank: true, hidden: true });
    }
  }
  // ferries: a moving platform shuttling between two nodes of equal height
  for (const sg of segs) {
    if (sg.type !== 'ferry') continue;
    const mid = sg.ra + sg.run / 2, x = sg.A.x + sg.dx * mid, z = sg.A.z + sg.dz * mid, top = sg.A.h, hw = sg.w / 2;
    const amp = Math.max(0, sg.run / 2 - hw - 0.3);
    spec.boxes.push({ min: [x - hw, top - 0.4, z - hw], max: [x + hw, top, z + hw], color: def.ferryColor || 0xe39a4b, edge: 0x8a4f1f, raft: true, move: { amp: [sg.dx * amp, 0, sg.dz * amp], period: sg.L.period || 9, phase: 0 } });
  }
  // vent columns attached to links
  for (const L of links) if (L.vent) spec.entities.push({ t: 'vent', x: L.vent.x, z: L.vent.z, r: L.vent.r || 2.4, h: L.vent.h, power: L.vent.power || 8.5 });
  for (const L of links) if (L.spring) spec.entities.push({ t: 'spring', x: L.spring.x, z: L.spring.z, power: L.spring.power || 21 });
  if (def.decor) for (const d of def.decor(ctx)) { d.y = d.y === undefined ? height(d.x, d.z) : d.y; spec.decor.push(Object.assign({ s: 1, ry: 0, v: 0.5 }, d)); if (d.solid) { const hw = d.solid * d.s * 0.5; spec.boxes.push({ min: [d.x - hw, d.y - 0.5, d.z - hw], max: [d.x + hw, d.y + (d.solidH || 3) * d.s, d.z + hw], hidden: true }); } }
  if (def.fill) applyFill(spec, def.fill);
  if (def.trails) linkTrails(spec, def.trails);
  scatter(spec, def.scatter || []);
  return spec;
}

// Place decor (trees, rocks, flowers) where it won't block play.
function scatter(spec, rules) {
  const r = rng(spec.seed * 7919 + 13), H = spec.height, size = spec.size;
  const clearPts = [];
  for (const e of spec.entities) if (e.x !== undefined) clearPts.push([e.x, e.z, 1.6]);
  for (const s of spec.segs) {
    if (s.type === 'gap') continue;
    for (let t = 0; t <= s.len; t += 2) clearPts.push([s.A.x + s.dx * t, s.A.z + s.dz * t, s.w / 2 + 1.5]);
  }
  for (const nd of Object.values(spec.nodes)) clearPts.push([nd.x, nd.z, nodeRadius(nd) * (nd.keepClear === undefined ? 0.5 : nd.keepClear)]);
  const liquidY = spec.liquid ? spec.liquid.y : -1e9;
  for (const rule of rules) {
    let placed = 0, tries = 0;
    while (placed < rule.n && tries++ < rule.n * 40) {
      const x = 4 + r() * (size - 8), z = 4 + r() * (size - 8);
      const h = H(x, z);
      if (h < liquidY + 0.5 + (rule.minH || 0)) continue;
      if (rule.maxH !== undefined && h > rule.maxH) continue;
      const g = Math.hypot(H(x + 1, z) - H(x - 1, z), H(x, z + 1) - H(x, z - 1)) / 2;
      if (g > (rule.maxSlope === undefined ? 0.3 : rule.maxSlope)) continue;
      if (rule.where === 'low' && h > spec.def.low.h + 1.6) continue;
      if (rule.where === 'high' && h < spec.def.low.h + 1.6) continue;
      let bad = false;
      for (const c of clearPts) if (Math.hypot(x - c[0], z - c[1]) < c[2]) { bad = true; break; }
      if (bad) continue;
      if (rule.spacing) for (const d of spec.decor) if (d.k === rule.k && Math.hypot(d.x - x, d.z - z) < rule.spacing) { bad = true; break; }
      if (bad) continue;
      const s = (rule.s0 || 0.8) + r() * ((rule.s1 || 1.3) - (rule.s0 || 0.8));
      spec.decor.push({ k: rule.k, x, y: h, z, s, ry: r() * 6.283, v: r() });
      if (rule.solid) {
        const hw = rule.solid * s * 0.5;
        spec.boxes.push({ min: [x - hw, h - 0.5, z - hw], max: [x + hw, h + 2.4 * s, z + hw], hidden: true });
      }
      placed++;
    }
  }
}

// Expected reach check used by the validator: can a jump / glide bridge a gap between two nodes?
export function gapInfo(spec, link) {
  const A = spec.nodes[link.a], B = spec.nodes[link.b];
  const edgeA = nodeRadius(A) * 0.9, edgeB = nodeRadius(B) * 0.9;
  const gap = Math.max(0, Math.hypot(B.x - A.x, B.z - A.z) - nodeRadius(A) - nodeRadius(B));
  return { gap, dh: B.h - A.h, edgeA, edgeB };
}
export { nodeRadius, nodeDist };
