/* Level builder: a turtle that lays tracks cell by cell. Headings: 0 = +x (down-right on screen), 1 = +y (down-left), 2 = -x (up-left), 3 = -y (up-right). */
(function (G) {
  'use strict';
  const C = G.C, S = C.S, World = G.World, BIT = World.BIT;
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const key = (x, y) => (y + 4096) * 8192 + (x + 4096);

  function Builder(theme) {
    this.theme = theme;
    this.cells = new Map();
    this.pos = { x: 0, y: 0 }; this.dir = 0; this.z = 0; this.w = 3;
    this.rails = true; this.mat = 0; this.surf = S.NORMAL;
    this.path = []; this.haz = []; this.foes = []; this.gems = [];
    this.start = null; this.goalCells = []; this.seg = null; this.group = 0;
  }
  const B = Builder.prototype;

  B.put = function (ix, iy, h, sx, sy, o) {
    const k = key(ix, iy);
    if (o.keep && this.cells.has(k)) return;
    if (this.cells.has(k)) this.overlaps = (this.overlaps || 0) + 1; this.overlapAt = this.overlapAt || [ix, iy, this.group];                      /* the track crossed itself: a design slip */
    this.cells.set(k, { x: ix, y: iy, h, sx, sy, surf: o.surf === undefined ? this.surf : o.surf, aux: o.aux || 0, mat: o.mat === undefined ? this.mat : o.mat, want: o.want, grp: this.group, ex: o.ex });
  };

  /* lay `len` cells along the heading; o.dz = total rise, o.w, o.surf, o.mat, o.rails, o.capStart, o.capEnd, o.aux */
  B.strip = function (len, o) {
    o = o || {};
    const a = DIRS[this.dir], alongX = a[0] !== 0, w = o.w || this.w, slope = (o.dz || 0) / len, z0 = this.z;
    const snap = (v) => (w % 2 ? Math.floor(v) + 0.5 : Math.round(v));                          /* centre line sits on a tile centre for odd widths, a grid line for even ones */
    if (alongX) this.pos.y = snap(this.pos.y); else this.pos.x = snap(this.pos.x);
    const cc = alongX ? this.pos.y : this.pos.x;
    const lo = Math.ceil(cc - w / 2 - 0.5 + 1e-6);
    const useRails = o.rails === undefined ? this.rails : o.rails;
    this.group++;
    for (let k = 0; k < len; k++) {
      const ax = alongX ? (a[0] > 0 ? this.pos.x + k : this.pos.x - 1 - k) : 0;
      const ay = alongX ? 0 : (a[1] > 0 ? this.pos.y + k : this.pos.y - 1 - k);
      for (let r = 0; r < w; r++) {
        const ix = alongX ? ax : lo + r, iy = alongX ? lo + r : ay;
        const h = z0 + slope * (a[0] * (ix - this.pos.x) + a[1] * (iy - this.pos.y));
        let want = 0;
        if (useRails) {
          if (alongX) { if (r === 0) want |= BIT.N; if (r === w - 1) want |= BIT.S; if (o.capStart && k === 0) want |= a[0] > 0 ? BIT.W : BIT.E; if (o.capEnd && k === len - 1) want |= a[0] > 0 ? BIT.E : BIT.W; }
          else { if (r === 0) want |= BIT.W; if (r === w - 1) want |= BIT.E; if (o.capStart && k === 0) want |= a[1] > 0 ? BIT.N : BIT.S; if (o.capEnd && k === len - 1) want |= a[1] > 0 ? BIT.S : BIT.N; }
        }
        this.put(ix, iy, h, slope * a[0], slope * a[1], { surf: o.surf, aux: o.aux === undefined ? (o.surf === S.BOOST || o.surf === S.CONVEY ? this.dir : 0) : o.aux, mat: o.mat, want, keep: o.keep });
      }
      if (o.path !== false) {
        const t = k + 0.5, z = z0 + slope * t;
        this.path.push({ x: this.pos.x + a[0] * t + (alongX ? 0 : cc - this.pos.x), y: this.pos.y + a[1] * t + (alongX ? cc - this.pos.y : 0), z, air: false, safe: o.surf !== S.CRUMBLE && o.surf !== S.GLASS && o.surf !== S.ACID && o.safe !== false, grp: this.group });
      }
    }
    this.seg = { x0: this.pos.x, y0: this.pos.y, dir: this.dir, len, z0, slope, w, cc };
    this.pos = { x: this.pos.x + a[0] * len, y: this.pos.y + a[1] * len };
    this.z = z0 + (o.dz || 0);
    return this;
  };
  B.flat = function (len, o) { return this.strip(len, o); };
  B.ramp = function (len, dz, o) { return this.strip(len, Object.assign({}, o, { dz })); };

  /* a w x w block at the end of the current run, then the heading turns: s = +1 turns toward +dir, -1 toward -dir */
  B.turn = function (s, o) {
    o = o || {};
    const a = DIRS[this.dir], w = o.w || this.w, nd = (this.dir + (s > 0 ? 1 : 3)) & 3, b = DIRS[nd];
    const cx = this.pos.x + a[0] * w / 2, cy = this.pos.y + a[1] * w / 2;                    /* block centre */
    const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - w / 2);
    const useRails = o.rails === undefined ? this.rails : o.rails;
    this.group++;
    for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) {
      let want = 0;
      if (useRails) { if (j === 0) want |= BIT.N; if (j === w - 1) want |= BIT.S; if (i === 0) want |= BIT.W; if (i === w - 1) want |= BIT.E; }
      this.put(x0 + i, y0 + j, this.z, 0, 0, { surf: o.surf, mat: o.mat, want, keep: o.keep });
    }
    if (o.path !== false) this.path.push({ x: cx, y: cy, z: this.z, air: false, safe: true, grp: this.group });
    this.dir = nd;
    this.pos = { x: cx + b[0] * w / 2, y: cy + b[1] * w / 2 };
    return this;
  };
  B.left = function (o) { return this.turn(-1, o); };
  B.right = function (o) { return this.turn(1, o); };

  /* skip empty space (a jump) */
  B.gap = function (len, dz) {
    const a = DIRS[this.dir], alongX = a[0] !== 0, cc = alongX ? this.pos.y : this.pos.x;
    for (let k = 0; k < len; k += 1) {
      const t = k + 0.5;
      this.path.push({ x: this.pos.x + a[0] * t + (alongX ? 0 : cc - this.pos.x), y: this.pos.y + a[1] * t + (alongX ? cc - this.pos.y : 0), z: this.z, air: true, safe: false, grp: this.group });
    }
    this.pos = { x: this.pos.x + a[0] * len, y: this.pos.y + a[1] * len };
    this.z += dz || 0;
    return this;
  };
  /* change the track width, keeping it centred (an even <-> odd change slides the centre line half a tile) */
  B.width = function (nw) {
    if (((nw - this.w) % 2) !== 0) { const a = DIRS[this.dir]; if (a[0] !== 0) this.pos.y += 0.5; else this.pos.x += 0.5; }
    this.w = nw; return this;
  };
  B.shift = function (dc) { const a = DIRS[this.dir]; if (a[0] !== 0) this.pos.y += dc; else this.pos.x += dc; return this; };
  B.setPos = function (x, y, dir, z) { this.pos = { x, y }; if (dir !== undefined) this.dir = dir; if (z !== undefined) this.z = z; return this; };
  B.stairs = function (n, drop, run, o) { for (let i = 0; i < n; i++) { this.strip(run, o); this.z -= drop; } return this; };

  /* point on the last strip: t tiles from its start along the heading, c tiles off the centre line (c > 0 is toward +y on an x run and toward +x on a y run) */
  B.on = function (t, c) {
    const s = this.seg, a = DIRS[s.dir];
    c = c || 0;
    return a[0] !== 0 ? { x: s.x0 + a[0] * t, y: s.cc + c, z: s.z0 + s.slope * t } : { x: s.cc + c, y: s.y0 + a[1] * t, z: s.z0 + s.slope * t };
  };

  /* cells of the last strip between t0 and t1 (tiles along the heading) and c0..c1 (tile centres off the centre line): [[ix, iy], ...] */
  B.segCells = function (t0, t1, c0, c1) {
    const s = this.seg, a = DIRS[s.dir], alongX = a[0] !== 0, out = [];
    const lo = Math.ceil(s.cc - s.w / 2 - 0.5 + 1e-6);
    if (c0 === undefined) { c0 = -s.w; c1 = s.w; }
    for (let k = Math.max(0, Math.floor(t0)); k < Math.min(s.len, Math.ceil(t1)); k++) {
      for (let r = 0; r < s.w; r++) {
        const off = lo + r + 0.5 - s.cc;
        if (off < c0 - 1e-6 || off > c1 + 1e-6) continue;
        const ax = alongX ? (a[0] > 0 ? s.x0 + k : s.x0 - 1 - k) : lo + r, ay = alongX ? lo + r : (a[1] > 0 ? s.y0 + k : s.y0 - 1 - k);
        out.push([ax, ay]);
      }
    }
    return out;
  };
  /* change the surface of part of the last strip (an acid pool across the middle, an ice patch, a gate section...) */
  B.paint = function (t0, t1, c0, c1, props) {
    for (const [x, y] of this.segCells(t0, t1, c0, c1)) { const c = this.cells.get(key(x, y)); if (c) Object.assign(c, props); }
    return this;
  };
  /* rectangle {x, y, w, h} (min corner and size, world units) covering t0..t1 along the last strip and c0..c1 across it */
  B.rect = function (t0, t1, c0, c1) {
    const s = this.seg, a = DIRS[s.dir];
    if (a[0] !== 0) { const xa = s.x0 + a[0] * t0, xb = s.x0 + a[0] * t1; return { x: Math.min(xa, xb), y: s.cc + c0, w: Math.abs(t1 - t0), h: c1 - c0 }; }
    const ya = s.y0 + a[1] * t0, yb = s.y0 + a[1] * t1;
    return { x: s.cc + c0, y: Math.min(ya, yb), w: c1 - c0, h: Math.abs(t1 - t0) };
  };

  /* ---- content ---- */
  B.h = function (type, o) { this.haz.push(Object.assign({ type }, o)); return this; };
  B.foe = function (type, x, y, o) { this.foes.push(Object.assign({ type, x, y }, o)); return this; };
  B.gem = function (type, x, y, o) { this.gems.push(Object.assign({ type, x, y }, o)); return this; };
  B.plat = function (len, w, o) { return this.strip(len, Object.assign({ w, capStart: true, capEnd: false, surf: S.NORMAL }, o)); };

  /* freeze into a World plus the level data around it */
  B.finish = function (meta) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const c of this.cells.values()) { x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x); y1 = Math.max(y1, c.y); }
    const M = 8, ox = M - x0, oy = M - y0, w = x1 - x0 + 1 + M * 2, d = y1 - y0 + 1 + M * 2;
    const wd = new World(w, d), rnd = G.U.mulberry(meta.seed || 7);
    for (const c of this.cells.values()) {
      const i = (c.y + oy) * w + (c.x + ox);
      wd.kind[i] = 1; wd.hz[i] = c.h; wd.sx[i] = c.sx; wd.sy[i] = c.sy; wd.surf[i] = c.surf; wd.aux[i] = c.aux; wd.mat[i] = c.mat; wd.seed[i] = (rnd() * 255) | 0;
    }
    /* guard rails go on wanted edges that face empty space */
    const nb = [[0, -1, BIT.N], [1, 0, BIT.E], [0, 1, BIT.S], [-1, 0, BIT.W]];
    for (const c of this.cells.values()) {
      if (!c.want) continue;
      const i = (c.y + oy) * w + (c.x + ox);
      for (const [dx, dy, bit] of nb) {
        if (!(c.want & bit)) continue;
        const j = wd.idx(c.x + ox + dx, c.y + oy + dy);
        if (j < 0 || wd.kind[j] === 0) { wd.rail[i] |= bit; continue; }
        const mx = dx > 0 ? 1 : 0, my = dy > 0 ? 1 : 0;                                       /* our edge midpoint height vs theirs */
        const ours = wd.hz[i] + wd.sx[i] * (dx !== 0 ? mx : 0.5) + wd.sy[i] * (dy !== 0 ? my : 0.5);
        const theirs = wd.hz[j] + wd.sx[j] * (dx !== 0 ? 1 - mx : 0.5) + wd.sy[j] * (dy !== 0 ? 1 - my : 0.5);
        if (ours - theirs > 0.5) wd.rail[i] |= bit;
      }
    }
    wd.bounds();
    const sh = (p) => Object.assign({}, p, { x: p.x + ox, y: p.y + oy });
    const lvl = Object.assign({}, meta, { overlaps: this.overlaps || 0, overlapAt: this.overlapAt, world: wd, path: this.path.map(sh), haz: this.haz.map(sh), foes: this.foes.map(sh), gems: this.gems.map(sh), theme: this.theme, ox, oy });
    for (const h of lvl.haz) for (const k of ['x2', 'y2']) if (h[k] !== undefined) h[k] += (k === 'x2' ? ox : oy);
    for (const p of [...lvl.foes, ...lvl.haz]) if (p.patrol) p.patrol = p.patrol.map((q) => ({ x: q.x + ox, y: q.y + oy }));
    for (const h of lvl.haz) if (h.cells) h.cells = h.cells.map(([cx, cy]) => [cx + ox, cy + oy]);
    lvl.start = sh(this.start || this.path[0]);
    lvl.goal = this.goalCells.map(([cx, cy]) => [cx + ox, cy + oy]);
    /* a marble that shatters at a trap must not come back to life inside it */
    for (const p of lvl.path) {
      for (const h of lvl.haz) {
        let cx, cy, r = 2.2;
        if (h.type === 'laser') { cx = (h.x + h.x2) / 2; cy = (h.y + h.y2) / 2; r = 2.6; }
        else if (h.type === 'crusher') { cx = h.x + (h.w || 2) / 2; cy = h.y + (h.h || 2) / 2; r = Math.max(h.w || 2, h.h || 2) / 2 + 2; }
        else if (h.type === 'spikes' && h.cells && h.cells.length) { cx = h.cells[0][0] + 0.5; cy = h.cells[0][1] + 0.5; r = Math.max(2.6, Math.sqrt(h.cells.length) + 1.6); }
        else if (h.type === 'gate' || h.type === 'lift') { cx = h.cells[0][0] + 0.5; cy = h.cells[0][1] + 0.5; r = Math.sqrt(h.cells.length) + 2; }
        else if (h.type === 'sweeper') { cx = h.x; cy = h.y; r = (h.len || 2.2) + 1.6; }
        else if (h.type === 'mine' || h.type === 'turret') { cx = h.x; cy = h.y; r = 1.6; }
        else continue;
        if (Math.hypot(p.x - cx, p.y - cy) < r) p.safe = false;
      }
    }
    return lvl;
  };

  G.Builder = Builder;
  G.DIRS = DIRS;
})((typeof window !== 'undefined' ? (window.SGS = window.SGS || {}) : (global.SGS = global.SGS || {})));
