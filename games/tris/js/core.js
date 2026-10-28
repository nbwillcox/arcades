/* Game rules, no rendering: SRS rotation with wall kicks, 7-bag, hold, ghost, lock delay with move reset, T-spins, back-to-back, combos, perfect clears,
   garbage, plus two sci-fi rulesets: power cores (glowing cells that fire when their line clears) and cascade gravity (loose shards fall and chain). */
(function (G) {
  'use strict';
  const C = G.C || { COLS: 10, ROWS: 22, VIS: 20, LOCK: 0.5, MAXRESETS: 15, CLEAR_T: 0.42 };
  const K = {};
  G.core = K;
  K.NAMES = ' IOTSZJL';
  const SH = {
    1: [[[0, 1], [1, 1], [2, 1], [3, 1]], [[2, 0], [2, 1], [2, 2], [2, 3]], [[0, 2], [1, 2], [2, 2], [3, 2]], [[1, 0], [1, 1], [1, 2], [1, 3]]],
    2: [[[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]]],
    3: [[[1, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [2, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [1, 2]]],
    4: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[1, 0], [1, 1], [2, 1], [2, 2]], [[1, 1], [2, 1], [0, 2], [1, 2]], [[0, 0], [0, 1], [1, 1], [1, 2]]],
    5: [[[0, 0], [1, 0], [1, 1], [2, 1]], [[2, 0], [1, 1], [2, 1], [1, 2]], [[0, 1], [1, 1], [1, 2], [2, 2]], [[1, 0], [0, 1], [1, 1], [0, 2]]],
    6: [[[0, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [2, 2]], [[1, 0], [1, 1], [0, 2], [1, 2]]],
    7: [[[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [1, 2], [2, 2]], [[0, 1], [1, 1], [2, 1], [0, 2]], [[0, 0], [1, 0], [1, 1], [1, 2]]],
  };
  K.SHAPES = SH;
  /* SRS wall kicks as (x, y-up) offsets, keyed 'from>to'; y is flipped when applied (the board grows downward) */
  const KJ = { '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]] };
  const KI = { '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]] };
  K.rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  K.gravity = (level) => { const l = Math.min(level, 20), s = Math.pow(0.8 - (l - 1) * 0.007, l - 1); return 1 / Math.max(0.0005, s); };   // rows per second
  K.CORENAMES = ['', 'BOMB', 'LASER', 'FREEZE', 'NOVA'];
  /* guideline-style attack table */
  K.attack = (lines, tspin, b2b, combo, pc) => {
    let a = tspin === 'full' ? [0, 2, 4, 6][lines] : tspin === 'mini' ? [0, 0, 1][lines] || 0 : [0, 0, 1, 2, 4][lines];
    if (b2b && (lines === 4 || tspin)) a += 1;
    a += [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5][Math.min(Math.max(combo, 0), 11)] || 0;
    if (pc) a += 10;
    return a;
  };

  class Tet {
    constructor(o) {
      o = o || {};
      this.cols = C.COLS; this.rows = C.ROWS; this.vis = C.VIS;
      this.grid = new Uint8Array(this.cols * this.rows); this.core = new Uint8Array(this.cols * this.rows);
      this.rnd = K.rng(o.seed === undefined ? (Math.random() * 1e9) | 0 : o.seed);
      this.rules = { cores: !!o.cores, cascade: !!o.cascade };
      this.startLevel = o.level || 1; this.level = this.startLevel; this.fixedLevel = !!o.fixedLevel;
      this.bag = []; this.queue = []; this.hold = null; this.canHold = true; this.since = 0;
      this.score = 0; this.lines = 0; this.pieces = 0; this.combo = -1; this.b2b = false; this.time = 0;
      this.state = 'play'; this.cur = null; this.ev = []; this.pending = []; this.freezeT = 0; this.clearT = 0; this.chain = 0; this.acc = 0; this.over = false;
      this.stats = { single: 0, double: 0, triple: 0, tetris: 0, tspin: 0, maxCombo: 0, pc: 0, cores: 0, cascade: 0, sent: 0, b2b: 0 };
      this.fill(); this.spawn();
    }
    emit(type, d) { this.ev.push(Object.assign({ type }, d || {})); }
    /* the 7-bag, with power cores riding on some pieces in the Station ruleset */
    fill() {
      while (this.queue.length < 8) {
        if (!this.bag.length) { this.bag = [1, 2, 3, 4, 5, 6, 7]; for (let i = 6; i > 0; i--) { const j = Math.floor(this.rnd() * (i + 1)); [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]; } }
        const item = { t: this.bag.pop(), core: null };
        this.since++;
        if (this.rules.cores && this.since >= 5 && this.rnd() < 0.2) { const r = this.rnd(); item.core = { idx: Math.floor(this.rnd() * 4), type: r < 0.3 ? 1 : r < 0.55 ? 2 : r < 0.75 ? 3 : 4 }; this.since = 0; }
        this.queue.push(item);
      }
    }
    cells(p) { const s = SH[p.t][p.r], out = []; for (let i = 0; i < 4; i++) out.push([p.x + s[i][0], p.y + s[i][1]]); return out; }
    valid(t, r, x, y) { const s = SH[t][r]; for (let i = 0; i < 4; i++) { const cx = x + s[i][0], cy = y + s[i][1]; if (cx < 0 || cx >= this.cols || cy >= this.rows) return false; if (cy >= 0 && this.grid[cy * this.cols + cx]) return false; } return true; }
    grounded() { const p = this.cur; return !this.valid(p.t, p.r, p.x, p.y + 1); }
    spawn(item) {
      item = item || this.queue.shift(); this.fill();
      const p = { t: item.t, r: 0, x: 3, y: 0, core: item.core, lastAct: 'spawn', kick: 0 };
      this.cur = p; this.lockT = 0; this.resets = 0; this.lowest = 0; this.acc = 0;
      if (!this.valid(p.t, p.r, p.x, p.y)) { this.cur = null; return this.die('block'); }
      if (this.valid(p.t, p.r, p.x, p.y + 1)) p.y++;
      this.lowest = p.y; this.emit('spawn', { t: p.t });
    }
    die(why) { this.state = 'over'; this.over = true; this.emit('over', { why }); }
    resetLock() { if (this.grounded()) { if (this.resets < C.MAXRESETS) { this.lockT = 0; this.resets++; } } else this.lockT = 0; }
    move(dx) { const p = this.cur; if (!p || this.state !== 'play' || !this.valid(p.t, p.r, p.x + dx, p.y)) return false; p.x += dx; p.lastAct = 'move'; this.resetLock(); this.emit('move'); return true; }
    rotate(dir) {
      const p = this.cur; if (!p || this.state !== 'play') return false;
      if (p.t === 2) { p.lastAct = 'rotate'; this.emit('rotate'); return true; }
      const nr = (p.r + dir + 4) % 4, tab = (p.t === 1 ? KI : KJ)[p.r + '>' + nr];
      for (let i = 0; i < tab.length; i++) {
        const nx = p.x + tab[i][0], ny = p.y - tab[i][1];
        if (this.valid(p.t, nr, nx, ny)) { p.r = nr; p.x = nx; p.y = ny; p.lastAct = 'rotate'; p.kick = i; this.resetLock(); this.emit('rotate'); return true; }
      }
      return false;
    }
    drop1() { const p = this.cur; if (!p || !this.valid(p.t, p.r, p.x, p.y + 1)) return false; p.y++; p.lastAct = 'drop'; if (p.y > this.lowest) { this.lowest = p.y; this.lockT = 0; this.resets = 0; } return true; }
    softStep() { if (this.state !== 'play') return false; if (this.drop1()) { this.score += 1; return true; } return false; }
    ghostY() { const p = this.cur; let y = p.y; while (this.valid(p.t, p.r, p.x, y + 1)) y++; return y; }
    hardDrop() { const p = this.cur; if (!p || this.state !== 'play') return false; let n = 0; while (this.drop1()) n++; this.score += n * 2; this.emit('hard', { rows: n, x: p.x }); this.lock(); return true; }
    holdPiece() {
      if (!this.cur || !this.canHold || this.state !== 'play') return false;
      const item = { t: this.cur.t, core: this.cur.core }, from = this.hold; this.hold = item; this.canHold = false; this.emit('hold');
      if (from) this.spawn(from); else this.spawn();
      return true;
    }
    /* the power-core mino rotates with its piece: rotate its rotation-0 cell clockwise r times inside the piece box */
    coreCell(p) {
      if (!p.core) return null;
      let [x, y] = SH[p.t][0][p.core.idx]; const n = p.t === 1 ? 3 : 2;
      if (p.t !== 2) for (let i = 0; i < p.r; i++) { const nx = n - y, ny = x; x = nx; y = ny; }
      return [p.x + x, p.y + y];
    }
    update(dt) {
      if (this.state === 'over') return;
      this.time += dt;
      if (this.state === 'play') {
        if (!this.cur) return;
        let g = K.gravity(this.level); if (this.freezeT > 0) { this.freezeT -= dt; g *= 0.04; }
        this.acc += g * dt; let n = 0;
        while (this.acc >= 1 && n < 30) { this.acc -= 1; n++; if (!this.drop1()) { this.acc = 0; break; } }
        if (this.grounded()) { this.lockT += dt; if (this.lockT >= C.LOCK) this.lock(); } else this.lockT = 0;
      } else if (this.state === 'clear') { this.clearT -= dt; if (this.clearT <= 0) this.finishClear(); }
      else if (this.state === 'fall') { this.clearT -= dt; if (this.clearT <= 0) this.afterFall(); }
    }
    detectTSpin(p) {
      if (p.t !== 3 || p.lastAct !== 'rotate') return null;
      const occ = (x, y) => x < 0 || x >= this.cols || y >= this.rows || (y >= 0 && this.grid[y * this.cols + x] > 0);
      let n = 0; for (const c of [[0, 0], [2, 0], [0, 2], [2, 2]]) if (occ(p.x + c[0], p.y + c[1])) n++;
      if (n < 3) return null;
      const front = [[[0, 0], [2, 0]], [[2, 0], [2, 2]], [[0, 2], [2, 2]], [[0, 0], [0, 2]]][p.r];
      return front.every((c) => occ(p.x + c[0], p.y + c[1])) || p.kick === 4 ? 'full' : 'mini';
    }
    lock() {
      const p = this.cur; if (!p) return; this.cur = null;
      const ts = this.detectTSpin(p), cells = this.cells(p), cc = this.coreCell(p); let hidden = true; const placed = [];
      for (const [x, y] of cells) {
        if (y < 0 || y >= this.rows) continue;
        const idx = y * this.cols + x; this.grid[idx] = p.t; if (cc && cc[0] === x && cc[1] === y) this.core[idx] = p.core.type;
        if (y >= 2) hidden = false; placed.push({ x, y, t: p.t, core: this.core[idx] });
      }
      this.pieces++; this.canHold = true; this.emit('lock', { cells: placed, t: p.t });
      if (hidden) { this.die('lockout'); return; }
      this.afterLock(ts);
    }
    fullRows() { const out = []; for (let y = 0; y < this.rows; y++) { let f = true; for (let x = 0; x < this.cols; x++) if (!this.grid[y * this.cols + x]) { f = false; break; } if (f) out.push(y); } return out; }
    afterLock(ts) {
      const rows = this.fullRows();
      if (!rows.length) {
        if (ts) { this.score += (ts === 'full' ? 400 : 100) * this.level; this.stats.tspin++; this.emit('tspin', { ts, lines: 0 }); }
        this.combo = -1; this.beginNext(); return;
      }
      this.chain = 0; this.startClear(rows, ts);
    }
    beginNext() { if (this.pending.length) this.applyGarbage(); if (!this.over) this.spawn(); }
    computeRemoval(rows) {
      const rm = new Set(), cores = [], seen = new Set(), C2 = this.cols;
      for (const r of rows) for (let x = 0; x < C2; x++) rm.add(r * C2 + x);
      let changed = true;
      while (changed) {
        changed = false;
        for (const idx of Array.from(rm)) {
          const ct = this.core[idx]; if (!ct || seen.has(idx)) continue;
          seen.add(idx); changed = true; const x = idx % C2, y = Math.floor(idx / C2); cores.push({ type: ct, x, y });
          const add = (xx, yy) => { if (xx >= 0 && xx < C2 && yy >= 0 && yy < this.rows && this.grid[yy * C2 + xx]) rm.add(yy * C2 + xx); };
          if (ct === 1) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) add(x + dx, y + dy); }
          else if (ct === 2) { for (let yy = 0; yy < this.rows; yy++) add(x, yy); }
          else if (ct === 4) { for (const yy of [y - 1, y + 1]) for (let xx = 0; xx < C2; xx++) add(xx, yy); }
          else if (ct === 3) this.freezeT = 8;
        }
      }
      return { rm, cores };
    }
    startClear(rows, ts) {
      const info = this.computeRemoval(rows), lines = rows.length, lvl = this.level, chain = this.chain, prevB2b = this.b2b;
      const cells = []; for (const idx of info.rm) cells.push({ x: idx % this.cols, y: Math.floor(idx / this.cols), t: this.grid[idx], core: this.core[idx] });
      const extra = info.rm.size - lines * this.cols;
      this.combo++; this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
      const base = ts === 'full' ? [400, 800, 1200, 1600][lines] : ts === 'mini' ? [100, 200, 400][lines] : [0, 100, 300, 500, 800][lines];
      const hard = lines === 4 || (ts && lines > 0);
      let pts = base * lvl; if (hard && prevB2b) pts = Math.floor(pts * 1.5);
      this.b2b = hard ? true : false; if (hard && prevB2b) this.stats.b2b++;
      if (this.combo > 0) pts += 50 * this.combo * lvl;
      if (chain > 0) pts = Math.floor(pts * (1 + 0.5 * chain));
      pts += 20 * Math.max(0, extra) * lvl;
      this.score += pts; this.lines += lines; this.lastLines = lines;
      if (ts && lines) this.stats.tspin++;
      this.stats[['', 'single', 'double', 'triple', 'tetris'][lines]]++;
      if (!this.fixedLevel) { const nl = this.startLevel + Math.floor(this.lines / 10); if (nl > this.level) { this.level = nl; this.emit('level', { level: nl }); } }
      const atk = K.attack(lines, ts, hard && prevB2b, this.combo, false);
      this.emit('clear', { rows, lines, ts, combo: this.combo, b2b: hard && prevB2b, pts, cells, cores: info.cores, chain, extra });
      if (atk > 0) { this.stats.sent += atk; this.emit('attack', { lines: atk }); }
      this.clearing = info; this.state = 'clear'; this.clearT = chain > 0 ? 0.3 : C.CLEAR_T;
    }
    /* remove the shattered cells: cells above a removed cell drop by one per removed cell below it in their column (so full rows collapse rigidly);
       with cascade gravity every column then packs to the floor, which can complete new lines (a chain) */
    finishClear() {
      const rm = this.clearing.rm, C2 = this.cols, R = this.rows, moves = [], ng = new Uint8Array(this.grid.length), nc = new Uint8Array(this.core.length);
      for (let x = 0; x < C2; x++) {
        const col = []; let shift = 0;
        for (let y = R - 1; y >= 0; y--) { const idx = y * C2 + x; if (rm.has(idx)) { shift++; continue; } if (this.grid[idx]) col.push({ y, t: this.grid[idx], core: this.core[idx], ny: y + shift }); }
        if (this.rules.cascade) col.forEach((c, i) => { c.ny = R - 1 - i; });
        for (const c of col) { ng[c.ny * C2 + x] = c.t; nc[c.ny * C2 + x] = c.core; if (c.ny !== c.y) moves.push({ x, y0: c.y, y1: c.ny, t: c.t, core: c.core }); }
      }
      this.grid = ng; this.core = nc; this.clearing = null; this.moves = moves;
      if (moves.length) { this.state = 'fall'; this.clearT = this.fallDur = this.rules.cascade ? 0.2 : 0.14; this.emit('fall', { moves }); } else this.afterFall();
    }
    afterFall() {
      this.moves = null;
      const rows = this.fullRows();
      if (rows.length) { this.chain++; this.stats.cascade = Math.max(this.stats.cascade, this.chain); this.emit('chain', { n: this.chain }); this.startClear(rows, null); return; }
      let empty = true; for (let i = 0; i < this.grid.length; i++) if (this.grid[i]) { empty = false; break; }
      if (empty) { const pts = [0, 800, 1200, 1800, 2000][Math.min(4, this.lastLines || 1)] * this.level; this.score += pts; this.stats.pc++; this.emit('pc', { pts }); this.stats.sent += 10; this.emit('attack', { lines: 10 }); }
      this.state = 'play'; this.beginNext();
    }
    /* ---- versus garbage ---- */
    addGarbage(n, hole) { if (n > 0) this.pending.push({ n, hole: hole === undefined ? Math.floor(this.rnd() * this.cols) : hole }); this.emit('incoming', { n: this.pendingTotal() }); }
    pendingTotal() { return this.pending.reduce((a, b) => a + b.n, 0); }
    cancel(a) { while (a > 0 && this.pending.length) { const b = this.pending[0], c = Math.min(a, b.n); b.n -= c; a -= c; if (b.n <= 0) this.pending.shift(); } if (a >= 0) this.emit('incoming', { n: this.pendingTotal() }); return a; }
    applyGarbage() {
      const cap = 8, holes = []; let keep = [];
      for (const b of this.pending) { const n = Math.min(b.n, cap - holes.length); for (let i = 0; i < n; i++) holes.push(b.hole); if (b.n > n) keep.push({ n: b.n - n, hole: b.hole }); }
      this.pending = keep; const n = holes.length; if (!n) return;
      const C2 = this.cols; let overflow = false; for (let i = 0; i < n * C2; i++) if (this.grid[i]) overflow = true;
      this.grid.copyWithin(0, n * C2); this.core.copyWithin(0, n * C2);
      for (let k = 0; k < n; k++) { const y = this.rows - n + k; for (let x = 0; x < C2; x++) { this.grid[y * C2 + x] = x === holes[k] ? 0 : 8; this.core[y * C2 + x] = 0; } }
      this.emit('garbage', { n, holes }); this.emit('incoming', { n: this.pendingTotal() });
      if (overflow) this.die('garbage');
    }
  }
  K.Tet = Tet;
  if (typeof module !== 'undefined') module.exports = K;
})(typeof window !== 'undefined' ? (window.SGS = window.SGS || {}) : (global.SGS = global.SGS || {}));
