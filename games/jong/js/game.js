/* Game state and rules glue: deal, pick / match, combo and score, hint / undo / shuffle (with Timed penalties), dead-end detection, win / lose, effects. */
(function (G) {
  'use strict';
  const K = G.core, R = G.render, F = G.faces, GL = G.glass, S = G.settings, U = G.U, C = G.C;
  const g = { L: null, layout: null, mode: 'zen', state: 'none', demo: false };
  G.game = g;
  const COST = { hint: 10, undo: 8, shuffle: 15, stuck: 10 };
  g.COST = COST;
  const snd = (name, a) => { if (!g.demo && G.audio && G.audio.sfx[name]) G.audio.sfx[name](a); };
  const rgbs = (c) => c[0] + ',' + c[1] + ',' + c[2];
  const resetFx = () => { g.shards = []; g.sparks = []; g.rings = []; g.beams = []; g.pops = []; g.banners = []; g.shakeA = 0; g.flashA = 0; g.pulse = 0; };
  g.start = function (o) {
    let lay = G.layoutById(o.layout);
    /* tall screens (phones held upright) get the board turned on its side so the tiles come out bigger */
    if (!o.demo && window.innerHeight > window.innerWidth * 1.15 && lay.w > lay.h * 1.12) lay = Object.assign({}, lay, { tiles: lay.tiles.map((t) => [t[1], t[0], t[2]]), w: lay.h, h: lay.w });
    const L = K.build(lay.tiles), d = K.deal(L);
    g.layout = lay; g.L = L; g.mode = o.mode || 'zen'; g.demo = !!o.demo; g.faces = d.faces.slice(); g.alive = new Array(L.n).fill(true);
    g.n = L.n; g.left = L.n; g.sel = -1; g.cur = -1; g.hover = -1; g.active = -1; g.hint = null; g.stack = []; g.shuf = null; g.useCursor = false; g.showMatches = false;
    g.time = 0; g.score = 0; g.combo = 0; g.comboT = 0; g.maxCombo = 0; g.matches = 0; g.hints = 0; g.undos = 0; g.shuffles = 0; g.penalty = 0;
    g.clock = g.mode === 'timed' ? Math.round(60 + (L.n / 2) * 2.5) : 0; g.clock0 = g.clock; g.reported = false; g.demoDone = false; g.bonus = 0; g.state = 'intro'; g.introT = 0; g.endT = 0; g.stuckT = 0; g.winT = 0; g.fwT = 0; g.demoT = 1.2;
    g.delay = []; g.lift = []; g.shk = []; g.flash = []; g.appear = [];
    let mxd = 0; for (let i = 0; i < L.n; i++) { g.delay.push(L.z[i] * 0.2 + Math.random() * 0.5 + (L.x[i] / lay.w) * 0.25); g.lift.push(0); g.shk.push(0); g.flash.push(0); g.appear.push(0); mxd = Math.max(mxd, g.delay[i]); }
    g.introEnd = mxd + 0.7; resetFx(); R.setLayout(lay); g.refresh();
    if (!g.demo) { snd('intro'); G.audio && G.audio.music('play'); }
  };
  g.refresh = function () { g.freeSet = new Array(g.n); for (let i = 0; i < g.n; i++) g.freeSet[i] = K.free(g.L, g.alive, i); };
  g.movesLeft = () => K.moves(g.L, g.alive, g.faces).length;
  g.canAct = () => g.state === 'play' && !g.shuf;
  /* ---------- effects ---------- */
  const tmp = {};
  function burst(x, y, col, n, speed) { const d = R.dpr; for (let i = 0; i < n && g.sparks.length < 700; i++) { const a = Math.random() * U.TAU, v = (60 + Math.random() * 260) * speed * d; g.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40 * d, r: (1 + Math.random() * 2.2) * d, life: 0.5 + Math.random() * 0.7, age: 0, col }); } }
  function ringAt(x, y, col, big) { const d = R.dpr; g.rings.push({ x, y, r0: R.tw * 0.2, r1: R.tw * (big ? 2.2 : 1.3), life: big ? 0.8 : 0.5, age: 0, col }); void d; }
  function beam(ax, ay, bx, by, col) {
    const pts = [[ax, ay]], n = 7, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    for (let i = 1; i < n; i++) { const t = i / n, j = (Math.random() - 0.5) * R.tw * 0.7 * Math.sin(t * Math.PI); pts.push([ax + dx * t + nx * j, ay + dy * t + ny * j]); }
    pts.push([bx, by]); g.beams.push({ pts, life: 0.45, age: 0, col });
  }
  function pop(x, y, text, col, size) { if (g.demo) return; g.pops.push({ x, y, text, col, size: size || 22, life: 1.0, age: 0 }); }
  function banner(text, col, glow, size, life, y) { if (g.demo) return; g.banners.push({ text, col, glow, size: size || 54, life: life || 1.3, age: 0, y }); }
  g.banner = banner;
  /* ---------- picking and matching ---------- */
  g.pick = function (i) {
    if (!g.canAct() || i < 0 || !g.alive[i]) return;
    if (!g.freeSet[i]) {
      g.shk[i] = 0.35; for (const j of K.blockers(g.L, g.alive, i)) g.flash[j] = 0.7; snd('blocked'); return;
    }
    g.hint = null;
    if (g.sel === i) { g.sel = -1; snd('drop'); return; }
    if (g.sel < 0) { g.sel = i; snd('pick'); return; }
    if (K.match(g.faces[g.sel], g.faces[i])) g.doMatch(g.sel, i); else { g.sel = i; snd('nomatch'); }
  };
  g.doMatch = function (a, b) {
    const L = g.L, fa = g.faces[a], fb = g.faces[b];
    g.stack.push({ a, b, score: g.score, combo: g.combo, comboT: g.comboT, clock: g.clock, matches: g.matches });
    g.combo = g.comboT > 0 ? g.combo + 1 : 1; g.comboT = C.COMBO_WIN; g.maxCombo = Math.max(g.maxCombo, g.combo);
    const mult = Math.min(8, g.combo), pts = 100 * mult + 10 * (L.z[a] + L.z[b]);
    g.score += pts; g.matches++; g.alive[a] = g.alive[b] = false; g.left -= 2; g.sel = -1; g.hint = null; g.cur = g.cur === a || g.cur === b ? -1 : g.cur;
    if (g.mode === 'timed') g.clock += 2 + Math.min(4, (g.combo - 1) * 0.5);
    g.refresh();
    const A = R.center(g, a, {}), B = R.center(g, b, {}), ca = F.tint(fa), cb = F.tint(fb), n = Math.min(g.combo, 8), mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    GL.shards(g.shards, A.x, A.y, R.tw, R.th, ca, mx, my, 0.8 + n * 0.08); GL.shards(g.shards, B.x, B.y, R.tw, R.th, cb, mx, my, 0.8 + n * 0.08);
    beam(A.x, A.y, B.x, B.y, rgbs(ca)); ringAt(A.x, A.y, rgbs(ca), n > 3); ringAt(B.x, B.y, rgbs(cb), n > 3);
    burst(A.x, A.y, rgbs(ca), 10 + n * 5, 0.8 + n * 0.1); burst(B.x, B.y, rgbs(cb), 10 + n * 5, 0.8 + n * 0.1);
    pop(mx, my - R.th * 0.4, '+' + pts, rgbs(ca), 18 + n * 2); g.pulse = Math.min(1, g.pulse + 0.25 + n * 0.05);
    g.shakeA = Math.max(g.shakeA, 2 + n * 1.4); if (g.combo >= 5) g.flashA = Math.min(0.28, 0.06 * (g.combo - 3));
    snd('match', g.combo);
    if (g.combo >= 3) { banner('COMBO x' + mult, '#fff', 'rgb(' + rgbs(ca) + ')', 38 + n * 3, 0.9, R.H * 0.14); if (g.combo % 3 === 0) snd('combo', g.combo); }
    g.afterChange();
  };
  g.afterChange = function () {
    if (g.left <= 0) { g.win(); return; }
    if (!g.demo && g.movesLeft() === 0) { g.state = 'stuck'; g.stuckT = 1.4; banner('NO MOVES  -  SHUFFLING', '#ffe27a', 'rgb(255,150,40)', 40, 1.4); snd('stuck'); }
  };
  g.win = function () {
    g.state = 'won'; g.winT = 0; g.fwT = 0; g.endT = 0; snd('win');
    banner('BOARD CLEARED', '#fff', 'rgb(255,214,90)', 62, 2.6); g.flashA = 0.3; g.shakeA = 10;
    g.bonus = g.mode === 'timed' ? Math.floor(g.clock) * 10 : 0; g.score += g.bonus;
  };
  g.lose = function () { g.state = 'lost'; g.endT = 0; snd('over'); banner('TIME UP', '#ffb0b8', 'rgb(255,50,70)', 64, 2.0); };
  /* ---------- helpers: hint / undo / shuffle ---------- */
  g.afford = (c) => g.mode !== 'timed' || g.clock > c + 1;
  const poor = () => { banner('NOT ENOUGH TIME', '#ffb0b8', 'rgb(255,50,70)', 34, 1.0, R.H * 0.2); };
  const charge = (c) => { if (g.mode === 'timed') { g.clock -= c; g.penalty += c; pop(R.W / 2, R.H * 0.1, '-' + c + 's', '255,120,120', 26); } };
  g.useHint = function () {
    if (!g.canAct()) return;
    if (!g.afford(COST.hint)) return poor();
    const m = K.moves(g.L, g.alive, g.faces); if (!m.length) return;
    const pick = m[Math.floor(Math.random() * m.length)]; g.hint = { a: pick[0], b: pick[1], t: 3.2 }; g.sel = -1; g.hints++; charge(COST.hint); g.combo = 0; g.comboT = 0; snd('hint');
  };
  g.undo = function () {
    if (!g.canAct() || !g.stack.length) return;
    if (!g.afford(COST.undo)) return poor();
    const u = g.stack.pop(); g.alive[u.a] = g.alive[u.b] = true; g.appear[u.a] = g.appear[u.b] = 0.5; g.score = u.score; g.combo = u.combo; g.comboT = u.comboT; g.matches = u.matches; g.left += 2;
    if (g.mode === 'timed') g.clock = u.clock; g.undos++; charge(COST.undo); g.sel = -1; g.hint = null; g.refresh(); snd('undo');
  };
  g.shuffle = function (forced) {
    if (g.state !== 'play' && g.state !== 'stuck') return;
    if (!forced && !g.afford(COST.shuffle)) return poor();
    const r = K.reshuffle(g.L, g.alive, g.faces); if (!r) return;
    g.shuf = { t: 0, faces: r.faces, applied: false }; g.shuffles++; g.stack = []; g.sel = -1; g.hint = null; g.combo = 0; g.comboT = 0;
    if (g.state === 'stuck') g.state = 'play'; charge(forced ? COST.stuck : COST.shuffle); snd('shuffle');
  };
  /* ---------- keyboard / pad cursor: hop between free tiles ---------- */
  g.moveCursor = function (dx, dy) {
    g.useCursor = true; if (!g.canAct()) return;
    const free = []; for (let i = 0; i < g.n; i++) if (g.freeSet[i]) free.push(i);
    if (!free.length) return;
    if (g.cur < 0 || !g.alive[g.cur] || !g.freeSet[g.cur]) { let best = free[0], bd = 1e9; const cx = R.W / 2, cy = R.H / 2; for (const i of free) { const c = R.center(g, i, {}), dd = Math.hypot(c.x - cx, c.y - cy); if (dd < bd) { bd = dd; best = i; } } g.cur = best; return; }
    const o = R.center(g, g.cur, {}); let best = -1, bc = 1e9;
    for (const i of free) {
      if (i === g.cur) continue; const c = R.center(g, i, {}), vx = c.x - o.x, vy = c.y - o.y, along = vx * dx + vy * dy, perp = Math.abs(vx * dy - vy * dx);
      if (along <= R.tw * 0.15) continue; const cost = along + perp * 2.2; if (cost < bc) { bc = cost; best = i; }
    }
    if (best >= 0) { g.cur = best; if (G.audio) G.audio.sfx.blip(); }
  };
  g.pickCursor = function () { if (g.cur >= 0) g.pick(g.cur); else g.moveCursor(0, 0); };
  /* ---------- per-frame ---------- */
  g.update = function (dt) {
    if (!g.L) return;
    const d = R.dpr;
    g.introT += dt; if (g.state === 'intro' && g.introT > g.introEnd) g.state = 'play';
    if (g.state === 'play' || g.state === 'stuck') {
      g.time += dt;
      if (g.comboT > 0) { g.comboT -= dt; if (g.comboT <= 0) g.combo = 0; }
      if (g.mode === 'timed') { g.clock -= dt; if (g.clock < 12 && g.clock > 0 && Math.floor(g.clock) !== Math.floor(g.clock + dt)) snd('tick'); if (g.clock <= 0) { g.clock = 0; g.lose(); } }
    }
    if (g.state === 'stuck') { g.stuckT -= dt; if (g.stuckT <= 0) g.shuffle(true); }
    if (g.shuf) {
      g.shuf.t += dt / 1.1; if (!g.shuf.applied && g.shuf.t >= 0.5) { g.faces = g.shuf.faces; g.shuf.applied = true; g.refresh(); }
      if (g.shuf.t >= 1) { g.shuf = null; g.refresh(); if (g.movesLeft() === 0 && g.left > 0) g.shuffle(true); }
    }
    if (g.hint) { g.hint.t -= dt; if (g.hint.t <= 0 || !g.alive[g.hint.a] || !g.alive[g.hint.b]) g.hint = null; }
    if (g.state === 'won') {
      g.winT += dt; g.fwT -= dt;
      if (g.fwT <= 0 && g.winT < 2.7) { g.fwT = 0.22; const x = R.bx + Math.random() * R.bw, y = R.oy + Math.random() * R.bh * 0.8, c = GL.hsl(Math.random() * 360, 90, 62).map(Math.round); burst(x, y, c.join(','), 46, 1.5); ringAt(x, y, c.join(','), true); snd('firework'); }
      if (g.winT > 3.0 && !g.reported) { g.reported = true; G.main.onResult(g.result(true)); }
    }
    if (g.state === 'lost') { g.endT += dt; if (g.endT > 1.6 && !g.reported) { g.reported = true; G.main.onResult(g.result(false)); } }
    // demo: the title screen plays itself
    if (g.demo && g.state === 'play') {
      g.demoT -= dt;
      if (g.demoT <= 0) {
        const m = K.moves(g.L, g.alive, g.faces);
        if (!m.length) g.demoDone = true; else { const p = m[Math.floor(Math.random() * m.length)]; g.doMatch(p[0], p[1]); g.demoT = 0.55 + Math.random() * 0.5; }
        if (g.demoDone || g.left <= 0) { g.demoT = 99; setTimeout(() => G.main.startDemo(), 1800); }
      }
    }
    const k = Math.min(1, dt * 14);
    g.active = g.useCursor ? g.cur : g.hover;
    for (let i = 0; i < g.n; i++) {
      g.lift[i] += ((i === g.sel ? 1 : 0) - g.lift[i]) * k; if (g.lift[i] < 0.003) g.lift[i] = 0;
      if (g.shk[i] > 0) g.shk[i] -= dt; if (g.flash[i] > 0) g.flash[i] -= dt; if (g.appear[i] > 0) g.appear[i] -= dt;
    }
    for (const s of g.shards) { s.age += dt; s.vy += 1500 * d * dt; s.x += s.vx * d * dt; s.y += s.vy * d * dt; s.rot += s.vr * dt; }
    for (const s of g.sparks) { s.age += dt; s.vy += 500 * d * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 1 - dt * 1.4; }
    g.shards = g.shards.filter((s) => s.age < s.life); g.sparks = g.sparks.filter((s) => s.age < s.life);
    for (const a of [g.rings, g.beams, g.pops, g.banners]) for (const e of a) e.age += dt;
    g.rings = g.rings.filter((e) => e.age < e.life); g.beams = g.beams.filter((e) => e.age < e.life); g.pops = g.pops.filter((e) => e.age < e.life); g.banners = g.banners.filter((e) => e.age < e.life);
    g.shakeA = Math.max(0, g.shakeA - dt * 30); g.flashA = Math.max(0, g.flashA - dt * 1.1); g.pulse = Math.max(0, g.pulse - dt * 1.2);
  };
  g.result = function (win) {
    return { mode: g.mode, layout: g.layout, win, score: g.score, bonus: g.bonus || 0, time: g.time, left: g.clock, matches: g.matches, maxCombo: g.maxCombo, hints: g.hints, undos: g.undos, shuffles: g.shuffles, penalty: g.penalty, tilesLeft: g.left };
  };
})((window.SGS = window.SGS || {}));
