/* The rules: hero and drone movement on the tile grid, drone AIs, waves, power cells, bonus gems, lives and levels. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, A = G.audio, I = G.input, Mz = G.maze, Art = G.art;
  const W = C.COLS, H = C.ROWS, T = C.T, TY = Mz.TUNNEL_Y;
  const DIRS = [null, { dx: 0, dy: -1 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 0 }];   /* 1 up, 2 left, 3 down, 4 right */
  const OPP = [0, 3, 4, 1, 2];
  const px = (x) => C.MX + (x + 0.5) * T, py = (y) => C.MY + (y + 0.5) * T;
  const KINDS = ['stalker', 'ambusher', 'flanker', 'wisp'];
  const CORNER = { stalker: [W - 2, 1], ambusher: [1, 1], flanker: [W - 2, H - 2], wisp: [1, H - 2] };
  const G0 = G.debug || {};

  const Game = {
    demo: true, phase: 'demo', time: 0, level: 1, score: 0, lives: 3, hero: null, drones: [], mz: null, dots: null, dotsLeft: 0, dotsEaten: 0,
    fright: 0, combo: 0, gem: null, gemsGot: [], banner: '', bannerT: 0, freezeT: 0, flash: 0, onOver: null, extraIdx: 0, dist: null,
  };

  /* ---------- the grid ---------- */
  function tileT(x, y) {
    if (y === TY && (x === -1 || x === W)) return 0;
    if (x < 0 || x >= W || y < 0 || y >= H) return 1;
    return Game.mz.t[y * W + x];
  }
  const heroCan = (x, y, dir) => tileT(x + DIRS[dir].dx, y + DIRS[dir].dy) === 0;

  /* BFS distance from the hub exit, used to send eaten drones home */
  function buildDist() {
    const d = new Int16Array(W * H).fill(999), q = [Mz.OUT.y * W + Mz.OUT.x];
    d[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const x = q[h] % W, y = (q[h] / W) | 0;
      for (let k = 1; k <= 4; k++) {
        let nx = x + DIRS[k].dx, ny = y + DIRS[k].dy;
        if (ny === TY) { if (nx < 0) nx = W - 1; else if (nx >= W) nx = 0; }
        if (nx < 0 || nx >= W || ny < 0 || ny >= H || Game.mz.t[ny * W + nx] !== 0 || d[ny * W + nx] !== 999) continue;
        d[ny * W + nx] = d[y * W + x] + 1; q.push(ny * W + nx);
      }
    }
    Game.dist = d;
  }

  /* Move an entity along its heading by dist tiles, calling decide() each time it reaches the centre of a tile. */
  function advance(e, dist, decide) {
    for (let guard = 0; dist > 1e-7 && guard < 8; guard++) {
      const cx = Math.round(e.x), cy = Math.round(e.y);
      if (Math.abs(e.x - cx) < 1e-6 && Math.abs(e.y - cy) < 1e-6 && (e.hx !== cx || e.hy !== cy)) { e.x = cx; e.y = cy; e.hx = cx; e.hy = cy; decide(e); }
      if (!e.dir) return;
      const d = DIRS[e.dir];
      let to;
      if (d.dx) to = d.dx > 0 ? Math.floor(e.x + 1e-6) + 1 - e.x : e.x - (Math.ceil(e.x - 1e-6) - 1);
      else to = d.dy > 0 ? Math.floor(e.y + 1e-6) + 1 - e.y : e.y - (Math.ceil(e.y - 1e-6) - 1);
      const step = Math.min(dist, to);
      e.x += d.dx * step; e.y += d.dy * step; dist -= step;
      if (step >= to - 1e-9) {
        e.x = Math.round(e.x); e.y = Math.round(e.y);
        if (e.y === TY) { if (e.x === -1 && e.dir === 2) e.x = W; else if (e.x === W && e.dir === 4) e.x = -1; }
      }
    }
  }

  /* ---------- setup ---------- */
  Game.reset = function (demo) {
    Game.demo = !!demo; Game.score = 0; Game.lives = C.START_LIVES; Game.extraIdx = 0; Game.gemsGot = [];
    Game.time = 0; Game.banner = ''; FX.reset();
    Game.startLevel(demo ? 1 : (G0.level || 1));
    Game.phase = demo ? 'demo' : 'ready';
  };

  Game.startLevel = function (level) {
    Game.level = level;
    Game.mz = Mz.make(level);
    Game.dots = Game.mz.dots.slice();
    Game.dotsLeft = Game.mz.total; Game.dotsEaten = 0; Game.gem = null; Game.gemSpot = null;
    for (let y = 13; y <= 21 && !Game.gemSpot; y++) if (Game.mz.t[y * W + 10] === 0 && y !== Mz.START.y) Game.gemSpot = { x: 10, y };
    if (!Game.gemSpot) Game.gemSpot = { x: Mz.START.x, y: Mz.START.y };
    buildDist();
    Art.buildMaze(Game.mz);
    Game.placeActors(true);
    Game.phase = Game.demo ? 'demo' : 'ready';
    Game.phaseT = 2.4;
    Game.banner = 'READY!'; Game.bannerT = 2.4;
    Game.levelBanner = 2.4;
    if (!Game.demo) A.sfx.ready();
  };

  Game.placeActors = function (full) {
    Game.hero = { x: Mz.START.x, y: Mz.START.y, dir: 0, want: 0, hx: Mz.START.x, hy: Mz.START.y, face: 2, t: 0 };
    Game.fright = 0; Game.combo = 0; Game.waveI = 0; Game.waveT = Game.waves()[0]; Game.mode = 'scatter';
    Game.relT = 1.0; Game.drones = KINDS.map((k, i) => ({
      kind: k, i, x: i === 0 ? Mz.OUT.x : 9 + (i - 1), y: i === 0 ? Mz.OUT.y : 11, dir: i === 0 ? 2 : 0, hx: -99, hy: -99,
      state: i === 0 ? 'roam' : 'house', fr: false, rel: 0, t: Math.random() * 6,
    }));
    Game.drones[0].hx = Game.drones[0].x;
    Game.drones[0].hy = Game.drones[0].y;
    if (I) I.want = 0;
  };

  Game.waves = function () {
    const L = Game.level;
    return L >= 5 ? [5, 20, 5, 20, 3, 25, 3, Infinity] : [7, 20, 7, 20, 5, 20, 5, Infinity];
  };

  /* ---------- speeds ---------- */
  const heroBase = () => C.HERO_SPEED * (1 + Math.min(0.2, 0.012 * (Game.level - 1)));
  const droneBase = () => heroBase() * Math.min(1.06, 0.88 + 0.014 * (Game.level - 1));
  function droneSpeed(d) {
    if (d.state === 'eyes') return heroBase() * 2.1;
    let s = droneBase();
    if (d.kind === 'stalker' && !d.fr) { if (Game.dotsLeft < 10) s *= 1.14; else if (Game.dotsLeft < 24) s *= 1.07; }
    if (d.fr) s = heroBase() * 0.55;
    if (d.y === TY && (d.x < 2.5 || d.x > W - 3.5)) s *= 0.6;
    return s;
  }
  const frightTime = () => Math.max(1.4, 7 - 0.5 * (Game.level - 1));

  /* ---------- hero ---------- */
  function heroDecide(h) {
    if (h.want && heroCan(h.x, h.y, h.want)) h.dir = h.want;
    else if (h.dir && heroCan(h.x, h.y, h.dir)) { /* keep going */ } else h.dir = 0;
    if (h.dir) h.face = h.dir;
  }
  function updateHero(dt) {
    const h = Game.hero;
    if (I && I.want) h.want = I.want;
    h.t += dt;
    if (h.want) {
      if (h.dir && h.want === OPP[h.dir]) { h.dir = h.want; h.face = h.dir; h.hx = h.hy = -99; }
      else if (!h.dir) {
        const cx = Math.round(h.x), cy = Math.round(h.y);
        if (heroCan(cx, cy, h.want)) { h.dir = h.want; h.face = h.dir; h.hx = cx; h.hy = cy; }
      } else if (h.want !== h.dir) {                                                   /* a turn pressed a hair too late still counts */
        const cx = Math.round(h.x), cy = Math.round(h.y), d = DIRS[h.dir], past = (h.x - cx) * d.dx + (h.y - cy) * d.dy;
        if (past > 0 && past <= 0.34 && Math.abs(h.x - cx) < 0.4 && Math.abs(h.y - cy) < 0.4 && heroCan(cx, cy, h.want)) { h.x = cx; h.y = cy; h.dir = h.want; h.face = h.dir; h.hx = cx; h.hy = cy; }
      }
    }
    advance(h, heroBase() * (Game.fright > 0 ? 1.1 : 1) * dt, heroDecide);
    if (h.dir && Math.random() < dt * 40) FX.trail(px(h.x) - DIRS[h.dir].dx * 8, py(h.y) - DIRS[h.dir].dy * 8, 'rgba(200,255,80,0.8)', 5, 0.25);
    /* pick up what is under the hero */
    const tx = Math.round(h.x), ty = Math.round(h.y);
    if (tx >= 0 && tx < W && Math.abs(h.x - tx) < 0.45 && Math.abs(h.y - ty) < 0.45) {
      const i = ty * W + tx, k = Game.dots[i];
      if (k) {
        Game.dots[i] = 0; Game.dotsLeft--; Game.dotsEaten++;
        Game.addScore(k === 2 ? 50 : 10);
        if (k === 2) { Game.startFright(); FX.ring(px(tx), py(ty), 6, 40, 'rgba(160,200,255,0.9)', 0.5, 3); FX.sparks(px(tx), py(ty), 10, 130, 'rgba(160,210,255,1)', 0.5); A.sfx.power(); }
        else { A.sfx.dot(); if (!S.reduced) FX.sparks(px(tx), py(ty), 2, 50, Game.mz.theme.wall, 0.25, 1.1); }
        if (Game.dotsEaten === 70 || Game.dotsEaten === 170) Game.spawnGem();
        if (Game.dotsLeft <= 0) Game.levelClear();
      }
    }
    const gm = Game.gem;
    if (gm && Math.abs(h.x - gm.x) < 0.6 && Math.abs(h.y - gm.y) < 0.6) {
      Game.addScore(gm.def.pts); FX.text(px(gm.x), py(gm.y) - 8, String(gm.def.pts), gm.def.color, 15);
      FX.ring(px(gm.x), py(gm.y), 4, 30, gm.def.color, 0.45, 2.5); A.sfx.gem();
      Game.gemsGot.push(gm.idx); if (Game.gemsGot.length > 8) Game.gemsGot.shift();
      Game.gem = null;
    }
  }

  Game.addScore = function (n) {
    const before = Game.score;
    Game.score += n;
    while (Game.extraIdx < C.EXTRA_LIFE.length && Game.score >= C.EXTRA_LIFE[Game.extraIdx]) {
      Game.extraIdx++; Game.lives++; A.sfx.extra(); FX.text(C.W / 2, C.MY + 12 * T, '1UP', '#7dffb0', 22);
    }
    return before;
  };

  Game.spawnGem = function () {
    const idx = Math.min(Game.level - 1, C.GEMS.length - 1);
    Game.gem = { x: Game.gemSpot.x, y: Game.gemSpot.y, t: 0, life: 9.5, idx, def: C.GEMS[idx] };
  };

  Game.startFright = function () {
    const ft = frightTime();
    Game.fright = ft; Game.frightMax = ft; Game.combo = 0;
    for (const d of Game.drones) {
      if (d.state === 'eyes' || d.state === 'enter') continue;
      d.fr = true;
      if (d.state === 'roam' && d.dir) { d.dir = OPP[d.dir]; d.hx = d.hy = -99; }
    }
  };

  /* ---------- drones ---------- */
  function targetOf(d) {
    const h = Game.hero, hx = Math.round(h.x), hy = Math.round(h.y), fd = DIRS[h.face || 2];
    if (Game.mode === 'scatter') return CORNER[d.kind];
    switch (d.kind) {
      case 'stalker': return [hx, hy];
      case 'ambusher': return [U.clamp(hx + fd.dx * 4, 0, W - 1), U.clamp(hy + fd.dy * 4, 0, H - 1)];
      case 'flanker': return [W - 1 - hx, H - 1 - hy];
      default: return U.dist2(d.x, d.y, hx, hy) < 36 ? CORNER.wisp : [hx, hy];
    }
  }
  function droneDecide(d) {
    if (d.state === 'enter') return;
    const tx = Math.round(d.x), ty = Math.round(d.y), opts = [];
    if (d.state === 'eyes' && tx === Mz.OUT.x && ty === Mz.OUT.y) { d.state = 'enter'; d.dir = 3; return; }
    for (let k = 1; k <= 4; k++) {
      if (d.dir && k === OPP[d.dir]) continue;
      if (tileT(tx + DIRS[k].dx, ty + DIRS[k].dy) === 0) opts.push(k);
    }
    if (!opts.length) { if (d.dir) opts.push(OPP[d.dir]); else return; }
    let pick = opts[0];
    if (d.state === 'eyes') {
      let bd = 1e9;
      for (let k = 1; k <= 4; k++) {
        if (tileT(tx + DIRS[k].dx, ty + DIRS[k].dy) !== 0) continue;
        let nx = tx + DIRS[k].dx; const ny = ty + DIRS[k].dy;
        if (ny === TY) { if (nx < 0) nx = W - 1; else if (nx >= W) nx = 0; }
        const v = Game.dist[ny * W + nx];
        if (v < bd) { bd = v; pick = k; }
      }
    } else if (d.fr) pick = opts[Math.floor(Math.random() * opts.length)];
    else if (d.kind === 'wisp' && opts.length > 1 && Math.random() < 0.22) pick = opts[Math.floor(Math.random() * opts.length)];
    else {
      const tg = targetOf(d);
      let bd = 1e9;
      for (const k of opts) {
        const dd = U.dist2(tx + DIRS[k].dx, ty + DIRS[k].dy, tg[0], tg[1]);
        if (dd < bd - 1e-9) { bd = dd; pick = k; }
      }
    }
    d.dir = pick;
  }
  function updateDrone(d, dt) {
    d.t += dt;
    if (d.state === 'house') {
      if (d.rel > 0) d.rel -= dt;
      else if (d.back) { d.back = false; d.state = 'exit'; }
      return;
    }
    if (d.state === 'exit') {                              /* up through the door */
      const sp = 4.2 * dt;
      if (Math.abs(d.x - 10) > 1e-4) { d.x += Math.sign(10 - d.x) * Math.min(sp, Math.abs(10 - d.x)); d.dir = d.x < 10 ? 4 : 2; }
      else { d.x = 10; d.dir = 1; d.y -= sp; if (d.y <= Mz.OUT.y) { d.y = Mz.OUT.y; d.state = 'roam'; d.dir = Math.random() < 0.5 ? 2 : 4; d.hx = d.x; d.hy = d.y; } }
      return;
    }
    if (d.state === 'enter') {                             /* home again: down through the door */
      const sp = 5 * dt; d.dir = 3; d.y += sp;
      if (d.y >= 11) { d.y = 11; d.x = 9 + d.i % 3; d.state = 'house'; d.rel = 0.9; d.back = true; d.fr = false; d.dir = 0; }
      return;
    }
    advance(d, droneSpeed(d) * dt, droneDecide);
  }

  function updateWaves(dt) {
    if (Game.fright > 0) {
      Game.fright -= dt;
      if (Game.fright <= 0) { Game.fright = 0; for (const d of Game.drones) d.fr = false; }
      return;
    }
    Game.waveT -= dt;
    if (Game.waveT <= 0 && Game.waveI < Game.waves().length - 1) {
      Game.waveI++;
      Game.waveT = Game.waves()[Game.waveI];
      Game.mode = Game.waveI % 2 ? 'chase' : 'scatter';
      for (const d of Game.drones) if (d.state === 'roam' && d.dir) { d.dir = OPP[d.dir]; d.hx = d.hy = -99; }
    }
  }
  function releaseTick(dt) {
    Game.relT -= dt;
    if (Game.relT > 0) return;
    const d = Game.drones.find((q) => q.state === 'house' && q.rel <= 0);
    if (d) { d.state = 'exit'; Game.relT = Math.max(2.2, 4.6 - 0.18 * Game.level); }
    else Game.relT = 0.5;
  }

  function collide() {
    const h = Game.hero;
    for (const d of Game.drones) {
      if (d.state === 'house' || d.state === 'eyes' || d.state === 'enter') continue;
      if (U.dist2(h.x, h.y, d.x, d.y) > 0.36) continue;
      if (d.fr) {
        const pts = 200 << Math.min(3, Game.combo);
        Game.combo++; Game.addScore(pts);
        d.fr = false; d.state = 'eyes'; d.hx = d.hy = -99; if (!d.dir) d.dir = 1;
        FX.explosion(px(d.x), py(d.y), 1.4, 200);
        FX.text(px(d.x), py(d.y) - 6, String(pts), '#7ee8ff', 17);
        A.sfx.eat(Game.combo);
        Game.freezeT = 0.5;
        return;
      }
      if (G0.god) continue;
      Game.die();
      return;
    }
  }

  /* ---------- life cycle ---------- */
  Game.die = function () {
    Game.phase = 'dying'; Game.phaseT = 1.9;
    FX.addShake(4); A.sfx.die();
    Game.hero.dir = 0;
    FX.explosion(px(Game.hero.x), py(Game.hero.y), 1.6, 70);
  };
  Game.levelClear = function () {
    Game.phase = 'clear'; Game.phaseT = 2.4; Game.flash = 0;
    Game.gem = null; Game.fright = 0; for (const d of Game.drones) d.fr = false;
    A.sfx.clear();
  };
  Game.over = function () {
    Game.phase = 'over';
    if (Game.onOver) Game.onOver();
  };

  Game.update = function (dt) {
    Game.time += dt;
    FX.update(dt);
    if (Game.demo) { for (const d of Game.drones) d.t += dt; return; }
    const ph = Game.phase;
    if (Game.bannerT > 0) Game.bannerT -= dt;
    if (ph === 'ready') {
      Game.phaseT -= dt; Game.levelBanner -= dt;
      if (I && I.want) Game.hero.want = I.want;
      for (const d of Game.drones) d.t += dt;
      if (Game.phaseT <= 0) { Game.phase = 'play'; Game.banner = ''; }
      return;
    }
    if (ph === 'dying') {
      Game.phaseT -= dt;
      if (Game.phaseT <= 0) {
        Game.lives--;
        if (Game.lives <= 0) Game.over();
        else { Game.placeActors(false); Game.phase = 'ready'; Game.phaseT = 1.8; Game.banner = 'READY!'; Game.bannerT = 1.8; A.sfx.ready(); }
      }
      return;
    }
    if (ph === 'clear') {
      Game.phaseT -= dt; Game.flash += dt;
      if (Game.phaseT <= 0) Game.startLevel(Game.level + 1);
      return;
    }
    if (ph !== 'play') return;
    if (Game.freezeT > 0) {                                            /* a short hit-stop when a drone is eaten */
      Game.freezeT -= dt;
      return;
    }
    const gm = Game.gem;
    if (gm) { gm.t += dt; gm.life -= dt; if (gm.life <= 0) Game.gem = null; }
    updateHero(dt);
    if (Game.phase !== 'play') return;
    updateWaves(dt);
    releaseTick(dt);
    for (const d of Game.drones) updateDrone(d, dt);
    collide();
    A.siren(Game.fright > 0 ? 'fright' : Game.drones.some((d) => d.state === 'eyes') ? 'eyes' : 'normal', Game.dotsLeft / Math.max(1, Game.mz.total));
  };

  /* ---------- drawing ---------- */
  Game.render = function (ctx) {
    const mz = Game.mz;
    if (!mz) return;
    const th = mz.theme, t = Game.time;
    let wallAlpha = 1;
    if (Game.phase === 'clear') wallAlpha = Math.floor(Game.flash * 5) % 2 ? 0.25 : 1;
    ctx.globalAlpha = wallAlpha;
    Art.drawMaze(ctx);
    ctx.globalAlpha = 1;
    /* dots */
    if (Game.phase !== 'clear') {
      ctx.fillStyle = th.dot;
      ctx.beginPath();
      for (let i = 0; i < Game.dots.length; i++) {
        if (Game.dots[i] !== 1) continue;
        const x = px(i % W), y = py((i / W) | 0);
        ctx.moveTo(x + 2.2, y); ctx.arc(x, y, 2.2, 0, U.TAU);
      }
      ctx.fill();
      const blink = 0.7 + 0.3 * Math.sin(t * 9);
      for (let i = 0; i < Game.dots.length; i++) {
        if (Game.dots[i] !== 2) continue;
        const x = px(i % W), y = py((i / W) | 0);
        Art.drawPower(ctx, x, y, t, blink);
      }
    }
    if (Game.gem) Art.drawGem(ctx, Game.gem.def, px(Game.gem.x), py(Game.gem.y), t, Game.gem.life < 2.5 && Math.floor(t * 8) % 2);
    const h = Game.hero, ph = Game.phase;
    const frFlash = Game.fright > 0 && Game.fright < 1.8 && Math.floor(t * 6) % 2;
    ctx.save();
    /* drones under the hero when frightened, over it otherwise */
    const sorted = Game.drones.slice().sort((a, b) => (a.fr ? 0 : 1) - (b.fr ? 0 : 1));
    if (ph !== 'dying' || Game.phaseT > 1.2) {
      for (const d of sorted) Art.drawDrone(ctx, d, px(d.x), py(d.y), t, frFlash, ph === 'dying');
    }
    if (!Game.demo) {
      if (ph === 'dying') Art.drawHeroDeath(ctx, px(h.x), py(h.y), 1 - Math.max(0, Game.phaseT - 0.1) / 1.9);
      else Art.drawHero(ctx, px(h.x), py(h.y), h.face, t, !!h.dir, Game.fright > 0);
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter'; FX.drawAdd(ctx); ctx.globalCompositeOperation = 'source-over';
    FX.drawNorm(ctx); FX.drawText(ctx);
  };

  G.game = Game;
})((window.SGS = window.SGS || {}));
