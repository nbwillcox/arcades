/* SpaceBert game logic: the cube pyramid, the hero's hops, enemies, discs, rounds, scoring and an autopilot (used for the title-screen demo and ?bot=1). */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, A = G.audio, I = G.input, SC = G.scores;
  const R = C.ROWS, TAU = U.TAU;
  const MODES = ['one', 'two', 'toggle', 'cycle'];
  const NSTATES = { one: 2, two: 3, toggle: 2, cycle: 3 };
  const DIRS = { UL: [-1, -1], UR: [-1, 0], DL: [1, 0], DR: [1, 1] };
  const DKEYS = ['UL', 'UR', 'DL', 'DR'];
  const LETHAL = { red: 1, egg: 1, coily: 1, ugg: 1, wrong: 1 };
  const PAL = [
    ['#2b46ff', '#ffe34a', '#ff7af0'],
    ['#8a2bff', '#37e6ff', '#a5ff5a'],
    ['#ff2b6e', '#ffc94a', '#37ffa0'],
    ['#14b8c8', '#ff6ad0', '#fff25a'],
    ['#3dff9e', '#ff7a2b', '#7a9bff'],
  ];

  const P = (r, c) => ({ x: C.CX + (c - r / 2) * 2 * C.HW, y: C.Y0 + r * C.DY });
  const valid = (r, c) => r >= 0 && r < R && c >= 0 && c <= r;

  const Game = {
    score: 0, lives: C.START_LIVES, stage: 0, level: 1, round: 1, world: 0, mode: 'one', n: 2, pal: PAL[0],
    demo: false, bot: false, hi: 0, phase: 'ready', phaseT: 0, t: 0, freeze: 0, msg: null, onOver: null,
    tiles: [], pulse: [], enemies: [], discs: [], hero: null, ride: null, sp: {}, bonusLeft: 0, flashT: 0, stats: { hits: 0, falls: 0, tiles: 0, clears: 0 },
  };
  G.game = Game;
  Game.PAL = PAL; Game.P = P; Game.valid = valid;

  const snd = (name, a, b) => { if (!Game.demo && A.sfx[name]) A.sfx[name](a, b); };
  const diff = () => (Game.demo ? 3 : Math.min(Game.stage, 18));

  /* ---------- setup ---------- */
  Game.reset = function (demo, stage) {
    Game.demo = !!demo;
    Game.score = 0; Game.lives = G.debug && G.debug.lives ? G.debug.lives : C.START_LIVES;
    Game.stage = demo ? 2 : Math.max(0, (stage || 1) - 1);
    Game.nextLife = C.EXTRA_LIFE_AT;
    Game.hi = SC.best();
    Game.bot = Game.demo; Game.over = false;
    Game.stats = { hits: 0, falls: 0, tiles: 0, clears: 0 };
    FX.reset();
    startRound(true);
  };

  function startRound(first) {
    Game.level = Math.floor(Game.stage / C.ROUNDS) + 1;
    Game.round = Game.stage % C.ROUNDS + 1;
    Game.world = (Game.level - 1) % PAL.length;
    Game.pal = PAL[Game.world];
    Game.mode = MODES[(Game.level - 1) % MODES.length];
    Game.n = NSTATES[Game.mode];
    Game.tiles = []; Game.pulse = [];
    for (let r = 0; r < R; r++) { Game.tiles.push(new Array(r + 1).fill(0)); Game.pulse.push(new Array(r + 1).fill(0)); }
    const ka = U.randInt(2, 5);
    let kb = U.randInt(2, 5);
    if (kb === ka) kb = ka === 5 ? 2 : ka + 1;
    Game.discs = [{ side: 'L', k: ka, r: ka - 1, c: -1, used: false }, { side: 'R', k: kb, r: kb - 1, c: kb, used: false }];
    for (const d of Game.discs) { const p = P(d.r, d.c); d.x = p.x; d.y = p.y; }
    Game.enemies = []; Game.freeze = 0; Game.ride = null; Game.flashT = 0;
    resetSpawns();
    spawnHero();
    Game.phase = 'ready'; Game.phaseT = 0;
    Game.msg = Game.demo ? null : { title: first ? 'GET READY' : 'LEVEL ' + Game.level + '  ROUND ' + Game.round, sub: first ? 'LEVEL ' + Game.level + '  ROUND ' + Game.round : '', t: 0, dur: 1.9 };
    if (!Game.demo) { snd('ready'); A.music('play', Game.level); }
  }
  function resetSpawns() {
    Game.sp = { red: 1.4, coily: 2.4, green: 6 + U.rand(0, 4), slick: 7 + U.rand(0, 4), ugg: 11 + U.rand(0, 5) };
  }
  function spawnHero() {
    const p = P(0, 0);
    Game.hero = { r: 0, c: 0, x: p.x, y: p.y - 260, z: 0, fx: p.x, fy: p.y - 260, tx: p.x, ty: p.y, tr: 0, tc: 0, t: 0, dur: 0.55, arc: 0, state: 'drop', face: 'DL', sq: 0, tt: 0, cheer: 0 };
  }

  /* ---------- tiles ---------- */
  function complete() {
    const t = Game.tiles, top = Game.n - 1;
    for (let r = 0; r < R; r++) for (let c = 0; c <= r; c++) if (t[r][c] !== top) return false;
    return true;
  }
  function stepTile(r, c) {
    const s = Game.tiles[r][c], m = Game.mode, top = Game.n - 1;
    let ns;
    if (m === 'toggle') ns = 1 - s;
    else if (m === 'cycle') ns = (s + 1) % 3;
    else ns = Math.min(s + 1, top);
    if (ns === s) return;
    Game.tiles[r][c] = ns; Game.pulse[r][c] = 0.28;
    const p = P(r, c), col = Game.pal[ns];
    FX.sparks(p.x, p.y, 7, 90, col, 0.45, 1.8);
    if (ns > s || m === 'cycle' && ns === 0) {
      if (ns > s) { addScore(25); Game.stats.tiles++; snd('tile', ns === top ? 7 : 2 + ns); }
      else snd('revert');
    } else snd('revert');
    if (ns === top && ns > s) FX.glowPop(p.x, p.y, 34, glowCol(col), 0.3);
  }
  function glowCol(hex) {
    const v = parseInt(hex.slice(1), 16);
    return 'rgba(' + (v >> 16) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',1)';
  }
  Game.glowCol = glowCol;
  function revertTile(r, c) {
    const s = Game.tiles[r][c];
    if (s <= 0) return;
    Game.tiles[r][c] = Game.mode === 'toggle' ? 0 : s - 1; Game.pulse[r][c] = 0.28;
    snd('revert');
    const p = P(r, c);
    FX.sparks(p.x, p.y, 6, 80, '#ff3a3a', 0.4, 1.6);
  }

  function addScore(n) {
    Game.score += n;
    if (Game.score >= Game.nextLife) {
      Game.lives++; Game.nextLife += C.EXTRA_LIFE_EVERY;
      snd('extraLife'); FX.text(300, 120, '1UP', '#ffd24a', 26);
    }
  }

  /* ---------- hero ---------- */
  Game.heroXY = () => { const h = Game.hero; return h ? { x: h.x, y: h.y - h.z - 20 } : null; };
  function hopHero(dir) {
    const h = Game.hero, d = DIRS[dir];
    const tr = h.r + d[0], tc = h.c + d[1], p = P(tr, tc);
    h.fx = h.x; h.fy = h.y; h.tx = p.x; h.ty = p.y; h.tr = tr; h.tc = tc;
    h.t = 0; h.dur = C.HOP; h.arc = d[0] > 0 ? 26 : 22; h.state = 'hop'; h.face = dir;
    snd('hop', d[0] > 0 ? 0 : 3);
  }
  function discAt(r, c) { for (const d of Game.discs) if (!d.used && d.r === r && d.c === c) return d; return null; }

  function heroLand() {
    const h = Game.hero;
    h.r = h.tr; h.c = h.tc; h.x = h.tx; h.y = h.ty; h.z = 0; h.sq = 0.12;
    if (valid(h.r, h.c)) {
      h.state = 'idle';
      snd('land');
      stepTile(h.r, h.c);
      if (Game.phase === 'play' && complete()) startClear();
      return;
    }
    const disc = discAt(h.r, h.c);
    if (disc) { startRide(disc); return; }
    h.state = 'fall'; h.t = 0; h.vy = 120; h.vx = (h.tx - h.fx) * 1.4;
    Game.stats.falls++;
    snd('fall');
  }
  function startRide(disc) {
    const h = Game.hero, e = P(0, 0);
    disc.used = true;
    Game.ride = { disc, t: 0, dur: 1.2, sx: disc.x, sy: disc.y, ex: e.x, ey: e.y };
    h.state = 'ride'; h.t = 0;
    snd('disc');
  }
  function endRide() {
    const h = Game.hero, e = P(0, 0);
    Game.ride.disc.gone = true;
    Game.discs = Game.discs.filter((d) => !d.gone);
    Game.ride = null;
    h.r = 0; h.c = 0; h.tr = 0; h.tc = 0; h.x = e.x; h.y = e.y; h.z = 0; h.state = 'idle'; h.face = 'DL'; h.sq = 0.14;
    snd('discLand');
    FX.ring(e.x, e.y, 6, 40, 'rgba(255,255,255,1)', 0.4, 2);
    stepTile(0, 0);
    /* every snake that was chasing the hero follows him off the edge */
    for (const en of Game.enemies) {
      if (en.kind === 'coily' || en.kind === 'egg') {
        en.state = 'fall'; en.vy = -260; en.vx = (en.x < e.x ? 70 : -70); en.tag = 'snakeFall';
        if (en.kind === 'coily') { addScore(500); FX.text(en.x, en.y - 50, '500', '#ffd24a', 22); snd('snakeDie'); }
        FX.explosion(en.x, en.y - 20, 1, 280);
      }
    }
    if (Game.phase === 'play' && complete()) startClear();
  }

  function die(cause) {
    const h = Game.hero;
    if (h.state === 'dead' || Game.phase !== 'play') return;
    Game.stats.hits++;
    h.state = 'dead'; h.t = 0; h.z = 0;
    Game.phase = 'dying'; Game.phaseT = 0;
    snd('die');
    FX.explosion(h.x, h.y - 20, 1.4, 25);
    FX.addShake(5);
    if (!Game.demo) loseLife();
  }
  function loseLife() {
    Game.lives--;
    if (Game.lives <= 0) Game.over = true;
  }

  function respawn() {
    Game.enemies = []; Game.freeze = 0; Game.ride = null;
    resetSpawns();
    Game.sp.red = 1.8; Game.sp.coily = 3.6;
    spawnHero();
    Game.phase = 'ready'; Game.phaseT = 0; Game.msg = null;
  }

  /* ---------- enemies ---------- */
  const E = {
    red: { hop: 0.34, wait: 0.34, arc: 20 }, egg: { hop: 0.34, wait: 0.32, arc: 20 }, slick: { hop: 0.3, wait: 0.28, arc: 18 },
    green: { hop: 0.34, wait: 0.34, arc: 20 }, coily: { hop: 0.22, wait: 0.2, arc: 28 }, ugg: { hop: 0.3, wait: 0.42, arc: 16 }, wrong: { hop: 0.3, wait: 0.42, arc: 16 },
  };
  function mkEnemy(kind, r, c) {
    const p = P(r, c);
    return { kind, r, c, x: p.x, y: p.y, z: 0, fx: p.x, fy: p.y, tx: p.x, ty: p.y, tr: r, tc: c, t: 0, dur: 0.3, arc: 0, state: 'wait', wait: 0.3, face: 'DL', age: 0, dead: false, vy: 0, vx: 0, hatchT: 0, flip: Math.random() < 0.5 ? 1 : -1 };
  }
  function count(...kinds) { let n = 0; for (const e of Game.enemies) if (kinds.indexOf(e.kind) >= 0 && !e.dead && e.state !== 'fall') n++; return n; }
  function spawnDrop(kind) {
    const c = Math.random() < 0.5 ? 0 : 1, e = mkEnemy(kind, 1, c);
    e.fx = e.x; e.fy = e.y - 190; e.x = e.fx; e.y = e.fy; e.t = 0; e.dur = 0.42; e.arc = 0; e.state = 'drop';
    e.face = c === 0 ? 'DL' : 'DR';
    Game.enemies.push(e);
    snd('spawn');
  }
  function spawnSide(kind) {
    const e = kind === 'ugg' ? mkEnemy('ugg', R - 1, -1) : mkEnemy('wrong', R - 1, R);
    e.wait = 0.7;
    Game.enemies.push(e);
    snd('spawn');
  }
  function spawns(dt) {
    const d = diff(), sp = Game.sp;
    sp.red -= dt;
    if (sp.red <= 0) { sp.red = Math.max(1.3, 3.2 - 0.11 * d) + U.rand(0, 1.1); if (count('red') < 2 + (d >= 7 ? 1 : 0) + (d >= 14 ? 1 : 0)) spawnDrop('red'); }
    sp.coily -= dt;
    if (sp.coily <= 0) { if (count('egg', 'coily') < (d >= 9 ? 2 : 1)) { spawnDrop('egg'); sp.coily = U.rand(3, 5); } else sp.coily = 1; }
    if (d >= 1) { sp.green -= dt; if (sp.green <= 0) { sp.green = U.rand(9, 15); if (!count('green')) spawnDrop('green'); } }
    if (d >= 2) { sp.slick -= dt; if (sp.slick <= 0) { sp.slick = U.rand(7, 11); if (count('slick') < 2) spawnDrop('slick'); } }
    if (d >= 4) { sp.ugg -= dt; if (sp.ugg <= 0) { sp.ugg = U.rand(11, 17); if (!count('ugg', 'wrong')) spawnSide(Math.random() < 0.5 ? 'ugg' : 'wrong'); } }
  }

  function heroCell() {
    const h = Game.hero;
    return h.state === 'hop' ? [h.tr, h.tc] : [h.r, h.c];
  }
  function enemyHop(e, tr, tc, dur, arc) {
    const p = P(tr, tc);
    e.fx = e.x; e.fy = e.y; e.tx = p.x; e.ty = p.y; e.tr = tr; e.tc = tc;
    e.t = 0; e.dur = dur; e.arc = arc; e.state = 'hop';
    e.face = (tr > e.r ? 'D' : 'U') + (p.x < e.fx ? 'L' : 'R');
    if (e.kind === 'coily') snd('snakeHop'); else snd('enemyHop');
  }
  function outsideOK(e) { return e.kind === 'ugg' ? e.c === -1 && e.r >= 0 : e.kind === 'wrong' ? e.c === e.r + 1 && e.r >= 0 : false; }

  function decide(e) {
    const spec = E[e.kind];
    if (e.kind === 'coily') {
      const ph = P.apply(null, heroCell()), d = diff();
      const randP = Math.max(0.04, 0.32 - 0.03 * d);
      let best = null, bd = 1e9;
      const opts = [];
      for (const k of DKEYS) { const v = DIRS[k], nr = e.r + v[0], nc = e.c + v[1]; if (valid(nr, nc)) opts.push([nr, nc]); }
      if (!opts.length) { e.wait = 0.2; return; }
      if (Math.random() < randP) best = U.pick(opts);
      else for (const o of opts) { const p = P(o[0], o[1]), dd = U.dist2(p.x, p.y, ph.x, ph.y) + Math.random() * 40; if (dd < bd) { bd = dd; best = o; } }
      enemyHop(e, best[0], best[1], spec.hop, spec.arc);
      return;
    }
    if (e.kind === 'ugg' || e.kind === 'wrong') {
      const L = e.kind === 'ugg', hc = heroCell(), edge = L ? 0 : e.r;
      if (!outsideOK(e)) { enemyHop(e, e.r - 1, L ? -1 : e.r, spec.hop, spec.arc); return; }     /* standing on a cube: hop back out and keep climbing */
      const heroAtEdge = hc[0] === e.r && hc[1] === edge && Game.hero.state !== 'ride' && Game.hero.state !== 'fall';
      if (heroAtEdge) { enemyHop(e, e.r, edge, spec.hop * 0.9, 12); return; }                 /* sideways pounce onto the hero's cube */
      if (e.r === 0 && !(Math.random() < 0.0)) { e.dead = true; return; }
      if (Math.random() < 0.22 && e.r > 1) { e.wait = 0.25; return; }
      if (Math.random() < 0.3 && e.r >= 1) { enemyHop(e, e.r, edge, spec.hop * 0.9, 12); return; }  /* wander onto the edge cube */
      enemyHop(e, e.r - 1, L ? -1 : e.r, spec.hop, spec.arc);
      return;
    }
    /* red / egg / green / slick: tumble down the pyramid */
    const k = Math.random() < 0.5 ? 'DL' : 'DR', v = DIRS[k];
    enemyHop(e, e.r + v[0], e.c + v[1], spec.hop, spec.arc);
  }

  function enemyLand(e) {
    e.r = e.tr; e.c = e.tc; e.x = e.tx; e.y = e.ty; e.z = 0;
    const spec = E[e.kind];
    if (e.kind === 'ugg' || e.kind === 'wrong') {
      if (e.r < 0) { e.dead = true; return; }
      e.state = 'wait'; e.wait = spec.wait; return;
    }
    if (!valid(e.r, e.c)) {
      e.state = 'fall'; e.vy = 100; e.vx = (e.tx - e.fx) * 1.2;
      return;
    }
    if (e.kind === 'slick') revertTile(e.r, e.c);
    if (e.kind === 'egg' && e.r === R - 1) {
      e.kind = 'coily'; e.state = 'hatch'; e.hatchT = 0.5;
      snd('hatch'); FX.explosion(e.x, e.y - 14, 1, 285);
      return;
    }
    e.state = 'wait';
    e.wait = e.kind === 'coily' ? Math.max(0.1, 0.24 - 0.008 * diff()) : spec.wait;
  }

  function updEnemy(e, dt, frozen) {
    e.age += dt;
    if (e.state === 'fall') {
      e.vy += 1150 * dt; e.y += e.vy * dt; e.x += e.vx * dt; e.z = 0;
      if (e.y > C.H + 90 || e.y < -120) e.dead = true;
      return;
    }
    if (frozen) return;
    if (e.state === 'hatch') { e.hatchT -= dt; if (e.hatchT <= 0) { e.state = 'wait'; e.wait = 0.2; } return; }
    if (e.state === 'wait') { e.wait -= dt; if (e.wait <= 0) decide(e); return; }
    e.t += dt;
    const k = Math.min(1, e.t / e.dur);
    e.x = e.fx + (e.tx - e.fx) * k; e.y = e.fy + (e.ty - e.fy) * k; e.z = e.arc * Math.sin(Math.PI * k);
    if (k >= 1) {
      if (e.state === 'drop') { e.state = 'wait'; e.wait = 0.2; e.z = 0; e.x = e.tx; e.y = e.ty; snd('land'); return; }
      enemyLand(e);
    }
  }

  /* ---------- round flow ---------- */
  function startClear() {
    Game.phase = 'clear'; Game.phaseT = 0; Game.stats.clears++;
    Game.flashT = 0;
    const h = Game.hero;
    if (h.state === 'hop') { /* let the hop finish */ }
    for (const e of Game.enemies) { if (!e.dead && e.state !== 'fall') FX.explosion(e.x, e.y - 14, 1, 200); }
    Game.enemies = [];
    snd('roundClear');
    Game.bonusLeft = Game.discs.filter((d) => !d.used).length;
    const rb = 1000 + 250 * (Game.level - 1);
    addScore(rb);
    Game.msg = { title: 'ROUND CLEAR', sub: '+' + rb, t: 0, dur: 2.4 };
    Game.cheerT = 0;
  }

  /* ---------- autopilot ---------- */
  function botMove() {
    const h = Game.hero;
    let best = null, bs = -1e9;
    const incomplete = [];
    for (let r = 0; r < R; r++) for (let c = 0; c <= r; c++) if (Game.tiles[r][c] !== Game.n - 1) { const p = P(r, c); incomplete.push([p.x, p.y]); }
    const snakeNear = Game.enemies.some((e) => e.kind === 'coily' && Math.abs(e.x - h.x) + Math.abs(e.y - h.y) < 230);
    for (const k of DKEYS) {
      const v = DIRS[k], tr = h.r + v[0], tc = h.c + v[1], p = P(tr, tc);
      let s = Math.random() * 3;
      if (valid(tr, tc)) {
        const st = Game.tiles[tr][tc];
        if (st < Game.n - 1) s += 6;
        else if (Game.mode === 'toggle' || Game.mode === 'cycle') s -= 12;
        let md = 1e9;
        for (const q of incomplete) { const dd = Math.abs(q[0] - p.x) + Math.abs(q[1] - p.y); if (dd < md) md = dd; }
        if (md < 1e9) s -= md * 0.02;
      } else {
        const d = discAt(tr, tc);
        if (!d) continue;
        s += snakeNear ? 90 : -10;
      }
      for (const e of Game.enemies) {
        if (e.state === 'fall' || e.dead) continue;
        const ex = e.state === 'hop' || e.state === 'drop' ? e.tx : e.x, ey = e.state === 'hop' || e.state === 'drop' ? e.ty : e.y;
        const dd = Math.sqrt(U.dist2(p.x, p.y, ex, ey));
        if (LETHAL[e.kind] && Game.freeze <= 0) {
          if (dd < 62) s -= 260; else if (dd < 130) s -= (130 - dd) * 0.8;
          if (e.kind === 'coily' && dd < 200) s -= (200 - dd) * 0.35;
        } else if (!LETHAL[e.kind] && dd < 110) s += 4;
      }
      if (s > bs) { bs = s; best = k; }
    }
    return best;
  }

  /* ---------- main update ---------- */
  Game.update = function (dt) {
    Game.t += dt;
    FX.update(dt);
    const h = Game.hero;
    if (Game.msg) { Game.msg.t += dt; if (Game.msg.t > Game.msg.dur) Game.msg = null; }
    for (let r = 0; r < R; r++) for (let c = 0; c <= r; c++) if (Game.pulse[r][c] > 0) Game.pulse[r][c] = Math.max(0, Game.pulse[r][c] - dt);
    if (h.sq > 0) h.sq = Math.max(0, h.sq - dt);
    Game.phaseT += dt;
    if (Game.freeze > 0) Game.freeze = Math.max(0, Game.freeze - dt);

    /* hero motion */
    if (h.state === 'drop' || h.state === 'hop') {
      h.t += dt;
      const k = Math.min(1, h.t / h.dur);
      const e = h.state === 'drop' ? k : k;
      h.x = h.fx + (h.tx - h.fx) * e; h.y = h.fy + (h.ty - h.fy) * e;
      h.z = h.state === 'drop' ? 0 : h.arc * Math.sin(Math.PI * k);
      if (k >= 1) {
        if (h.state === 'drop') { h.state = 'idle'; h.x = h.tx; h.y = h.ty; h.z = 0; h.sq = 0.14; snd('land'); stepTile(0, 0); }
        else heroLand();
      }
    } else if (h.state === 'fall') {
      h.t += dt; h.vy += 1500 * dt; h.y += h.vy * dt; h.x += h.vx * dt;
      if (h.t > 1.0 && Game.phase === 'play') {
        Game.phase = 'dying'; Game.phaseT = 0; h.state = 'dead'; h.nocurse = true;
        if (!Game.demo) loseLife();
      }
    } else if (h.state === 'ride') {
      const rd = Game.ride; rd.t += dt;
      const k = Math.min(1, rd.t / rd.dur), e = U.easeInOutSine(k);
      h.x = rd.sx + (rd.ex - rd.sx) * e; h.y = rd.sy + (rd.ey - rd.sy) * e;
      h.z = 60 * Math.sin(Math.PI * k);
      rd.disc.x = h.x; rd.disc.y = h.y;
      if (k >= 1) endRide();
    } else if (h.state === 'idle') {
      h.tt += dt;
    }

    /* phase flow */
    if (Game.phase === 'ready') {
      if (Game.phaseT > (Game.msg ? 1.5 : 0.75) && h.state !== 'drop') { Game.phase = 'play'; Game.phaseT = 0; if (complete()) startClear(); }
    } else if (Game.phase === 'play') {
      if (h.state === 'idle') {
        let dir = Game.bot ? botMove() : I.take();
        if (!dir && !Game.bot) dir = null;
        if (dir) hopHero(dir);
      } else if (!Game.bot) { /* buffered presses stay in I.dir until the hero lands */ }
      spawns(dt);
      const frozen = Game.freeze > 0 || h.state === 'ride';
      for (const e of Game.enemies) updEnemy(e, dt, frozen);
      collide();
      Game.enemies = Game.enemies.filter((e) => !e.dead);
    } else if (Game.phase === 'dying') {
      for (const e of Game.enemies) if (e.state === 'fall') updEnemy(e, dt, true);
      const wait = h.nocurse ? 0.5 : 1.7;
      if (Game.phaseT > wait) {
        if (Game.over) { Game.phase = 'over'; Game.phaseT = 0; snd('gameOver'); A.music && A.music('off'); }
        else { h.nocurse = false; respawn(); }
      }
    } else if (Game.phase === 'clear') {
      for (const e of Game.enemies) updEnemy(e, dt, true);
      Game.flashT += dt;
      if (h.state === 'idle') { h.cheer = (h.cheer || 0) + dt; }
      if (Game.bonusLeft > 0 && Game.phaseT > 1.0 + (3 - Game.bonusLeft) * 0.0) {
        /* pay out the unused discs one at a time */
        if (!Game.bonusTimer || Game.t - Game.bonusTimer > 0.35) {
          Game.bonusTimer = Game.t; Game.bonusLeft--; addScore(50); snd('bonus', 3 - Game.bonusLeft);
          FX.text(300, 330 + Game.bonusLeft * 22, '+50 DISC', '#ffd24a', 18);
        }
      }
      if (Game.phaseT > 2.6) { Game.stage++; startRound(false); }
    } else if (Game.phase === 'over') {
      if (Game.phaseT > 1.4 && Game.onOver) { const f = Game.onOver; Game.onOver = null; f(); }
    }
    if (Game.demo && Game.phase === 'dying' && Game.phaseT > 0.6) { respawn(); }
    if (Game.demo && Game.phase === 'over') { Game.phase = 'ready'; }
    if (Game.phase !== 'play' && !Game.demo) I.dir = null;
    if (Game.score > Game.hi) Game.hi = Game.score;
  };

  function collide() {
    const h = Game.hero;
    if (h.state !== 'idle' && h.state !== 'hop') return;
    const lim = (C.HW * 0.6) * (C.HW * 0.6);
    for (const e of Game.enemies) {
      if (e.dead || e.state === 'fall' || e.state === 'drop' || e.state === 'hatch') continue;
      if (U.dist2(h.x, h.y, e.x, e.y) > lim) continue;
      if (LETHAL[e.kind]) {
        if (Game.freeze > 0 || (G.debug && G.debug.god)) continue;
        die(e.kind);
        return;
      }
      if (e.kind === 'green') {
        e.dead = true; addScore(100); FX.text(e.x, e.y - 40, '100', '#7dff9a', 20);
        Game.freeze = 4.5; snd('freeze'); FX.ring(e.x, e.y - 14, 8, 90, 'rgba(120,230,255,1)', 0.5, 3); FX.doFlash(0.25, '120,220,255');
      } else if (e.kind === 'slick') {
        e.dead = true; addScore(300); FX.text(e.x, e.y - 40, '300', '#ffd24a', 22);
        snd('catch'); FX.explosion(e.x, e.y - 14, 1, 120);
      }
    }
  }

  /* ---------- drawing ---------- */
  Game.render = function (ctx) {
    const ART = G.art;
    ART.draw(ctx, Game);
    FX.drawNorm(ctx);
    ctx.globalCompositeOperation = 'lighter';
    FX.drawAdd(ctx);
    ctx.globalCompositeOperation = 'source-over';
    FX.drawText(ctx);
  };
})((window.SGS = window.SGS || {}));
