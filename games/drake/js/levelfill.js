// Reachability flood-fill and automatic entity filling (pure).
import { World, buildHeights } from './collide.js';
import { P } from './controller.js';
import { rng, nodeRadius } from './levelgen.js';

export function makeWorld(spec) {
  const heights = buildHeights(spec.n, spec.cs, spec.height);
  return new World({ n: spec.n, cs: spec.cs, heights, boxes: spec.boxes, killY: spec.killY, liquid: spec.liquid });
}

// Cells (1 m) reachable on foot from (sx,sz), plus virtual edges (gap/bridge links) supplied as pairs of node ids.
export function flood(spec, world, starts, opts = {}) {
  const n = spec.n, cs = spec.cs;
  const seen = new Uint8Array(n * n);
  const liq = spec.liquid ? spec.liquid.y + 0.25 : -1e9;
  const q = [];
  const push = (i, j) => { if (i < 1 || j < 1 || i >= n - 1 || j >= n - 1) return; const k = j * n + i; if (seen[k]) return; seen[k] = 1; q.push(i, j); };
  const hAt = (i, j) => world.sample((i + 0.5) * cs, (j + 0.5) * cs).h;
  const ok = (i, j) => { const s = world.sample((i + 0.5) * cs, (j + 0.5) * cs); return s.h > liq && s.ny >= P.walkN; };
  const run = () => {
    while (q.length) {
      const j = q.pop(), i = q.pop(), h = hAt(i, j);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (ni < 1 || nj < 1 || ni >= n - 1 || nj >= n - 1 || seen[nj * n + ni]) continue;
        const step = Math.hypot(di, dj) * cs;
        if (!ok(ni, nj)) continue;
        if (Math.abs(hAt(ni, nj) - h) > 0.62 * step) continue;
        seen[nj * n + ni] = 1; q.push(ni, nj);
      }
    }
  };
  for (const [x, z] of starts) push(Math.floor(x / cs), Math.floor(z / cs));
  run();
  // virtual links: iterate until stable
  const vlinks = (spec.links || []).filter((l) => l.type === 'gap' || l.type === 'bridge' || l.type === 'ferry');
  let changed = true;
  while (changed) {
    changed = false;
    for (const l of vlinks) {
      for (const [a, b] of (l.oneWay ? [[l.a, l.b]] : [[l.a, l.b], [l.b, l.a]])) {
        const A = spec.nodes[a], B = spec.nodes[b];
        if (seen[Math.floor(A.z / cs) * n + Math.floor(A.x / cs)] && !seen[Math.floor(B.z / cs) * n + Math.floor(B.x / cs)]) {
          push(Math.floor(B.x / cs), Math.floor(B.z / cs)); run(); changed = true;
        }
      }
    }
  }
  return seen;
}

// Turn def.fill rules into entities placed on reachable cells.
export function applyFill(spec, rules) {
  const world = makeWorld(spec);
  const seen = flood(spec, world, [[spec.spawn[0], spec.spawn[2]]]);
  spec.reach = seen;
  const r = rng(spec.seed * 104729 + 3), n = spec.n;
  const taken = [];
  for (const e of spec.entities) if (e.x !== undefined) taken.push([e.x, e.z, 1.3]);
  for (const b of spec.boxes) taken.push([(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2, Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2]) / 2 + 1.2]);
  for (const nd of Object.values(spec.nodes)) if (nd.noFill) taken.push([nd.x, nd.z, nodeRadius(nd)]);
  const low = spec.def.low.h;

  const cellsFor = (rule) => {
    const out = [];
    for (let j = 2; j < n - 2; j++) for (let i = 2; i < n - 2; i++) {
      if (!seen[j * n + i]) continue;
      const x = (i + 0.5) * spec.cs, z = (j + 0.5) * spec.cs, h = world.sample(x, z).h;
      if (rule.where === 'low' && h > low + 1.5) continue;
      if (rule.where === 'high' && h <= low + 1.5) continue;
      if (rule.node) { const nd = spec.nodes[rule.node]; if (Math.hypot(x - nd.x, z - nd.z) > nodeRadius(nd) * (rule.frac || 1)) continue; }
      if (rule.near) { const [nx, nz, nr] = rule.near; if (Math.hypot(x - nx, z - nz) > nr) continue; }
      // keep 3 m clear of cliff edges for piles/crates so they never dangle
      const e = Math.max(Math.abs(world.sample(x + 2.5, z).h - h), Math.abs(world.sample(x - 2.5, z).h - h), Math.abs(world.sample(x, z + 2.5).h - h), Math.abs(world.sample(x, z - 2.5).h - h));
      if (e > 1.4) continue;
      out.push([x, z]);
    }
    return out;
  };
  const free = (x, z, rad) => { for (const t of taken) if (Math.hypot(x - t[0], z - t[1]) < Math.max(rad, t[2])) return false; return true; };

  for (const rule of rules) {
    const cells = cellsFor(rule);
    if (!cells.length) continue;
    let placed = 0, tries = 0;
    const want = rule.n || 1;
    while (placed < want && tries++ < want * 60) {
      const [x, z] = cells[Math.floor(r() * cells.length)];
      if (!free(x, z, rule.gap || 2.5)) continue;
      const sd = Math.hypot(x - spec.spawn[0], z - spec.spawn[2]);
      if (rule.t === 'enemy' && sd < 18) continue;
      if (sd < 3) continue;
      const add = [];
      switch (rule.t) {
        case 'pile': for (let i = 0; i < (rule.count || 5); i++) { const a = i * 2.4, rr = 0.38 * Math.sqrt(i); add.push({ t: 'gem', x: x + Math.cos(a) * rr, z: z + Math.sin(a) * rr, v: rule.v || 1 }); } break;
        case 'ring': for (let i = 0; i < (rule.count || 8); i++) { const a = (i / (rule.count || 8)) * 6.283; add.push({ t: 'gem', x: x + Math.cos(a) * (rule.r || 2), z: z + Math.sin(a) * (rule.r || 2), v: rule.v || 1 }); } break;
        case 'line': { const a = r() * 6.283, len = rule.len || 5, cnt = rule.count || 6; for (let i = 0; i < cnt; i++) add.push({ t: 'gem', x: x + Math.cos(a) * len * (i / (cnt - 1) - 0.5), z: z + Math.sin(a) * len * (i / (cnt - 1) - 0.5), v: rule.v || 1 }); break; }
        case 'crate': case 'vase': case 'chest': add.push({ t: rule.t, x, z, gems: rule.gems || [1, 1], yaw: r() * 6.283 }); break;
        case 'enemy': add.push({ t: 'enemy', kind: rule.kind, x, z, patrol: rule.patrol === undefined ? 5 : rule.patrol }); break;
        case 'moth': add.push({ t: 'moth', x, z, h: 1.4 + r() * 0.8 }); break;
        case 'lantern': add.push({ t: 'lantern', x, z, yaw: rule.yaw || 0 }); break;
        default: break;
      }
      // reject entities that fall off reachable cells
      if (add.some((e) => { const k = Math.floor(e.z / spec.cs) * n + Math.floor(e.x / spec.cs); return !seen[k]; })) continue;
      for (const e of add) { spec.entities.push(e); }
      taken.push([x, z, rule.t === 'ring' ? (rule.r || 2) + 0.5 : rule.gap || 2.5]);
      placed++;
    }
  }
}

// Gem trails along every link: on the ground for ramps, an arc through the air for gaps.
export function linkTrails(spec, v = 1) {
  for (const s of spec.segs) {
    const cnt = Math.max(3, Math.floor(s.run / 1.8));
    for (let i = 0; i <= cnt; i++) {
      const u = i / cnt, along = s.ra + s.run * u;
      const x = s.A.x + s.dx * along, z = s.A.z + s.dz * along;
      const h = s.A.h + (s.B.h - s.A.h) * u;
      if (s.type === 'gap' || s.type === 'bridge' || s.type === 'ferry') {
        const arc = s.type === 'gap' ? Math.sin(u * Math.PI) * Math.min(3.2, s.run * 0.35) : 0;
        spec.entities.push({ t: 'gem', x, z, y: h + 0.9 + arc, v });
      } else spec.entities.push({ t: 'gem', x, z, v });
    }
  }
}
