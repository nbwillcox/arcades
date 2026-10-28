// Pure collision world (no three.js): a triangulated heightfield plus axis-aligned boxes.
// Triangle layout matches art/terrain.js exactly so physics and mesh agree.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class World {
  // spec: { n (cells per side), cs (cell size m), heights (Float32Array (n+1)^2), boxes, killY }
  constructor(spec) {
    this.n = spec.n;
    this.cs = spec.cs;
    this.size = spec.n * spec.cs;
    this.H = spec.heights;
    this.boxes = spec.boxes || [];
    this.killY = spec.killY === undefined ? -25 : spec.killY;
    this._s = { h: 0, nx: 0, ny: 1, nz: 0, gx: 0, gz: 0 };
    this.time = 0;
    for (const b of this.boxes) {
      b.dx = 0; b.dy = 0; b.dz = 0;
      if (b.move) { b.min0 = b.min.slice(); b.max0 = b.max.slice(); b.off = [0, 0, 0]; }
    }
    this.moving = this.boxes.filter((b) => b.move);
    this._buildGrid();
    this.updateBoxes(0);
    this.liquid = spec.liquid || null; // { y, kind: 'water' | 'lava' }
  }

  // Broad phase: static boxes hashed into 8 m cells; moving boxes are always candidates.
  _buildGrid() {
    this.gc = 8; this.grid = new Map(); this._out = []; this._stamp = 0;
    let id = 0;
    for (const b of this.boxes) {
      b.id = id++; b.stamp = 0;
      if (b.move) continue;
      const x0 = Math.floor(b.min[0] / this.gc), x1 = Math.floor(b.max[0] / this.gc), z0 = Math.floor(b.min[2] / this.gc), z1 = Math.floor(b.max[2] / this.gc);
      for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
        const k = cx * 4096 + cz; let a = this.grid.get(k); if (!a) { a = []; this.grid.set(k, a); } a.push(b);
      }
    }
  }

  // Add a static box at runtime (gates, barriers).
  addBox(b) {
    b.dx = b.dy = b.dz = 0; b.stamp = 0; b.id = this.boxes.length;
    this.boxes.push(b);
    const x0 = Math.floor(b.min[0] / this.gc), x1 = Math.floor(b.max[0] / this.gc), z0 = Math.floor(b.min[2] / this.gc), z1 = Math.floor(b.max[2] / this.gc);
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      const k = cx * 4096 + cz; let a = this.grid.get(k); if (!a) { a = []; this.grid.set(k, a); } a.push(b);
    }
    return b;
  }
  // Opening a gate: sink the box far below the world so no query sees it.
  removeBox(b) { b.min = [-1e5, -1e6, -1e5]; b.max = [-1e5 + 1, -1e6 + 1, -1e5 + 1]; b.removed = true; }

  // Candidate boxes near an xz rectangle (shared output array, valid until next call).
  near(x0, z0, x1, z1) {
    const out = this._out; out.length = 0;
    const st = ++this._stamp, g = this.gc;
    const cx0 = Math.floor(x0 / g), cx1 = Math.floor(x1 / g), cz0 = Math.floor(z0 / g), cz1 = Math.floor(z1 / g);
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
      const a = this.grid.get(cx * 4096 + cz); if (!a) continue;
      for (const b of a) if (b.stamp !== st) { b.stamp = st; out.push(b); }
    }
    for (const b of this.moving) if (b.stamp !== st) { b.stamp = st; out.push(b); }
    return out;
  }

  // Advance moving boxes. b.move = { amp:[x,y,z], period (s), phase (0..1) }. Stores per-step deltas.
  updateBoxes(dt) {
    this.time += dt;
    for (const b of this.moving) {
      const m = b.move, a = Math.sin((this.time / m.period + (m.phase || 0)) * Math.PI * 2);
      for (let k = 0; k < 3; k++) {
        const o = m.amp[k] * a, d = o - b.off[k];
        b.off[k] = o;
        b.min[k] = b.min0[k] + o; b.max[k] = b.max0[k] + o;
        if (k === 0) b.dx = d; else if (k === 1) b.dy = d; else b.dz = d;
      }
    }
  }

  // Height and slope of the terrain at (x,z). Writes into `o` (shared scratch by default).
  sample(x, z, o) {
    o = o || this._s;
    const n = this.n, cs = this.cs, W = n + 1, H = this.H;
    const fx = clamp(x / cs, 0, n - 1e-6), fz = clamp(z / cs, 0, n - 1e-6);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    const h00 = H[j * W + i], h10 = H[j * W + i + 1], h01 = H[(j + 1) * W + i], h11 = H[(j + 1) * W + i + 1];
    let gx, gz;
    if (u >= v) { gx = h10 - h00; gz = h11 - h10; } else { gx = h11 - h01; gz = h01 - h00; }
    const h = h00 + gx * u + gz * v;
    gx /= cs; gz /= cs;
    const inv = 1 / Math.sqrt(gx * gx + 1 + gz * gz);
    o.h = h; o.nx = -gx * inv; o.ny = inv; o.nz = -gz * inv; o.gx = gx; o.gz = gz;
    return o;
  }

  // Highest standable surface under (x,z): terrain or a box top no more than stepUp above yRef.
  groundAt(x, z, yRef, stepUp, o, margin) {
    o = o || {};
    const m = margin === undefined ? 0.22 : margin;
    const t = this.sample(x, z);
    o.y = t.h; o.nx = t.nx; o.ny = t.ny; o.nz = t.nz; o.box = null;
    for (const b of this.near(x - m, z - m, x + m, z + m)) {
      const top = b.max[1];
      if (top > yRef + stepUp || top <= o.y) continue;
      if (x < b.min[0] - m || x > b.max[0] + m || z < b.min[2] - m || z > b.max[2] + m) continue;
      o.y = top; o.nx = 0; o.ny = 1; o.nz = 0; o.box = b;
    }
    return o;
  }

  // Push a vertical cylinder (radius r, height h, feet at y) out of boxes that act as walls.
  // Returns number of contacts; writes the last contact normal into out.
  pushOut(p, r, h, stepUp, out) {
    let hits = 0;
    for (const b of this.near(p.x - r, p.z - r, p.x + r, p.z + r)) {
      if (b.max[1] <= p.y + stepUp || b.min[1] >= p.y + h) continue;
      const cx = clamp(p.x, b.min[0], b.max[0]), cz = clamp(p.z, b.min[2], b.max[2]);
      let dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      let nx, nz, pen;
      if (d2 > 1e-10) {
        const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; pen = r - d;
      } else {
        // centre inside the box: leave by the nearest face
        const l = p.x - b.min[0], rr = b.max[0] - p.x, f = p.z - b.min[2], bk = b.max[2] - p.z;
        const m = Math.min(l, rr, f, bk);
        if (m === l) { nx = -1; nz = 0; } else if (m === rr) { nx = 1; nz = 0; } else if (m === f) { nx = 0; nz = -1; } else { nx = 0; nz = 1; }
        pen = m + r;
      }
      p.x += nx * pen; p.z += nz * pen;
      if (out) { out.nx = nx; out.nz = nz; }
      hits++;
    }
    return hits;
  }

  // Lowest box underside above the head within the xz footprint, between y0 and y1 (ceiling test).
  ceilingAt(x, z, r, y0, y1) {
    let best = Infinity;
    for (const b of this.near(x - r, z - r, x + r, z + r)) {
      const bot = b.min[1];
      if (bot < y0 || bot > y1) continue;
      if (x < b.min[0] - r * 0.5 || x > b.max[0] + r * 0.5 || z < b.min[2] - r * 0.5 || z > b.max[2] + r * 0.5) continue;
      if (bot < best) best = bot;
    }
    return best;
  }

  // First solid hit along a segment, as t in [0,1] (1 = clear). margin grows boxes / lifts terrain.
  raycast(ax, ay, az, bx, by, bz, margin) {
    const m = margin || 0;
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.hypot(dx, dy, dz) || 1e-6;
    let best = 1;
    const steps = Math.ceil(len / 0.25);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = ax + dx * t, y = ay + dy * t, z = az + dz * t;
      if (y < this.sample(x, z).h + m) { best = (i - 1) / steps; break; }
    }
    for (const b of this.near(Math.min(ax, bx) - m, Math.min(az, bz) - m, Math.max(ax, bx) + m, Math.max(az, bz) + m).slice()) {
      let t0 = 0, t1 = best;
      const mn = b.min, mx = b.max;
      const o = [ax, ay, az], d = [dx, dy, dz];
      let ok = true;
      for (let k = 0; k < 3; k++) {
        const lo = mn[k] - m, hi = mx[k] + m;
        if (Math.abs(d[k]) < 1e-9) {
          if (o[k] < lo || o[k] > hi) { ok = false; break; }
        } else {
          let a = (lo - o[k]) / d[k], c = (hi - o[k]) / d[k];
          if (a > c) { const s = a; a = c; c = s; }
          if (a > t0) t0 = a;
          if (c < t1) t1 = c;
          if (t0 > t1) { ok = false; break; }
        }
      }
      if (ok && t0 < best) best = t0;
    }
    return best;
  }
}

// Build the heightfield for a level spec by sampling its height function.
export function buildHeights(n, cs, fn) {
  const W = n + 1, H = new Float32Array(W * W);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) H[j * W + i] = fn(i * cs, j * cs);
  return H;
}
