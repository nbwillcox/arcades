/* Core game state: the miner, digging, the pump hose, boulders, minerals, power-ups and level flow. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, GFX = G.gfx, A = G.audio, I = G.input, L = G.level, Al = G.aliens, TAU = U.TAU;
  const W = C.W, H = C.H, CELL = C.CELL, COLS = C.COLS, ROWS = C.ROWS, K = L.KIND;
  const cx = Al.cx, cy = Al.cy;
  const Game = { state: 'title', demo: true, time: 0 };
  G.game = Game;

  Game.reset = function (demo, level) {
    this.demo = !!demo;
    this.score = 0; this.lives = C.START_LIVES; this.level = 0;
    this.lifeIdx = 0; this.nextLifeAt = C.EXTRA_LIFE_AT[0];
    this.banner = null; this.over = false; this.overDone = false; this.timer = 0;
    this.hi = G.scores.best();
    FX.reset();
    this.player = this.newPlayer();
    this.startLevel(level || 1);
  };
  Game.newPlayer = function () {
    return { x: cx(C.START_C), y: cy(0), mv: null, dir: 'r', fx: 1, alive: true, respawn: 0, invuln: 2, hose: { state: 'idle', len: 0, target: null, dir: 'r' }, pumpT: 0, drill: 0, longHose: 0, scan: 0, shield: false, t: 0, c: C.START_C, r: 0 };
  };

  /* ---------- scoring ---------- */
  Game.addScore = function (v) {
    this.score += v;
    if (this.demo) return;
    while (this.score >= this.nextLifeAt) {
      this.lives = Math.min(9, this.lives + 1);
      this.lifeIdx++;
      this.nextLifeAt = this.lifeIdx < C.EXTRA_LIFE_AT.length ? C.EXTRA_LIFE_AT[this.lifeIdx] : this.nextLifeAt + C.EXTRA_LIFE_EVERY;
      A.sfx.extraLife();
      this.banner = { text: 'EXTRA MINER', sub: '', t: 0, life: 1.6, small: true };
    }
  };
  Game.award = function (v, x, y) {
    this.addScore(v);
    if (x !== undefined && v >= 100) FX.text(x, y - 16, '+' + U.fmt(v), '#ffffff', v >= 1000 ? 22 : 14);
  };

  /* ---------- grid helpers (used by the aliens too) ---------- */
  Game.rockAt = function (c, r) { return this.rocks.find((k) => k.c === c && k.r === r && k.state !== 'gone') || null; };
  Game.open = function (c, r) { return c >= 0 && r >= 0 && c < COLS && r < ROWS && this.dirt[L.idx(c, r)] === 0 && !this.rockAt(c, r); };
  Game.solid = function (c, r) { return c < 0 || c >= COLS || r >= ROWS || this.dirt[L.idx(c, r)] === 1; };

  /* clear a cell of rock; for the player this also collects whatever was buried there */
  Game.digCell = function (c, r, byPlayer) {
    const i = L.idx(c, r);
    if (this.dirt[i] === 1) {
      this.dirt[i] = 0;
      GFX.art.carve(this.dirtCv, cx(c), cy(r), 17);
      FX.sparks(cx(c), cy(r), 3, 70, 'hsla(30,40%,60%,1)', 0.3, 1.4);
      if (this.kind[i] === K.GAS) { this.kind[i] = K.NONE; this.clouds.push({ x: cx(c), y: cy(r), t: 0, life: 4 }); A.sfx.blast(); }
    }
  };
  Game.collectAt = function (c, r) {
    const i = L.idx(c, r), kd = this.kind[i], d = this.data[i];
    if (kd === K.ORE) {
      this.kind[i] = K.NONE;
      const T = GFX.art.TIERS[d.tier], pts = T.val;
      this.minerals += d.tier === 3 ? 2 : 1;
      this.award(pts, cx(c), cy(r));
      FX.sparks(cx(c), cy(r), 14, 180, T.c1, 0.6); FX.ring(cx(c), cy(r), 6, 44, T.c1, 0.45, 3);
      FX.text(cx(c), cy(r) + 18, T.name, T.c1, 13);
      A.sfx.ore(d.tier);
      if (!this.hatchOpen && this.quota > 0 && this.minerals >= this.quota) { this.hatchOpen = true; this.banner = { text: 'EXTRACTION OPEN', sub: 'RETURN TO THE SURFACE', t: 0, life: 2.4 }; A.sfx.stageClear(); }
    } else if (kd === K.CRATE) { this.kind[i] = K.NONE; this.applyPower(d.power, cx(c), cy(r)); }
  };
  Game.applyPower = function (kind, x, y) {
    const P = this.player;
    if (kind === 'drill') P.drill = C.FX_T; else if (kind === 'hose') P.longHose = C.FX_T; else if (kind === 'shield') P.shield = true; else P.scan = C.FX_T + 6;
    A.sfx.capsule(); FX.text(x, y - 18, GFX.art.CRATES[kind].name, GFX.art.CRATES[kind].c, 14); FX.sparks(x, y, 10, 150, FX.col(40), 0.45);
  };

  /* ---------- level setup ---------- */
  Game.startLevel = function (n) {
    this.level = n;
    L.build(this, n);
    this.dirtCv = GFX.art.buildDirt(n);
    GFX.art.carveRect(this.dirtCv, 0, C.GY0, W, CELL);
    for (const k of this.carves) GFX.art.carveRect(this.dirtCv, k.c * CELL + 1, C.GY0 + k.r * CELL + 1, k.w * CELL - 2, k.h * CELL - 2);
    for (const k of this.carves) for (let y = k.r; y < k.r + k.h; y++) for (let x = k.c; x < k.c + k.w; x++) GFX.art.carve(this.dirtCv, cx(x), cy(y), 17);
    for (const k of this.rocks) { k.x = cx(k.c); k.y = cy(k.r); }
    this.al = []; this.projs = []; this.clouds = []; this.pickups = []; this.rockDrops = 0; this.hatchOpen = false; this.state = 'play';
    for (const s of this.spawns) Al.spawn(this, s.type, s.c, s.r);
    if (this.boss) Al.spawnQueen(this, this.boss.c, this.boss.r);
    const P = this.player; Object.assign(P, { x: cx(C.START_C), y: cy(0), c: C.START_C, r: 0, mv: null, alive: true, invuln: 2, hose: { state: 'idle', len: 0, target: null, dir: 'r' } });
    this.pc = { c: C.START_C, r: 0 };
    this.banner = this.boss ? { text: 'WARNING', sub: 'THE ALIEN QUEEN LURKS BELOW', t: 0, life: 2.6, warn: true } : { text: 'LEVEL ' + n, sub: this.quota + ' RARE MINERALS TO FIND', t: 0, life: 2.2 };
    if (!this.demo) { if (this.boss) { A.sfx.warning(); A.music('boss', 3, 0); } else A.music('play', n >= 4 ? 2 : 1, [0, 2, -2, 3, 5][(n - 1) % 5]); }
  };

  /* ---------- the miner ---------- */
  Game.killPlayer = function (reason) {
    const P = this.player;
    if (!P.alive || P.invuln > 0 || (G.debug && G.debug.god)) return;
    if (P.shield && reason !== 'lava') { P.shield = false; P.invuln = 1.2; A.sfx.shieldBreak(); FX.ring(P.x, P.y, 10, 50, 'hsla(200,100%,70%,1)', 0.4, 3); return; }
    P.alive = false; P.hose = { state: 'idle', len: 0, target: null, dir: P.dir };
    for (const e of this.al) e.attached = false;
    FX.explosion(P.x, P.y, 1.8, 40); A.sfx.playerDie(); FX.addShake(8); FX.doFlash(0.3, '255,200,200');
    this.lives--;
    if (this.lives <= 0) { this.over = true; this.overT = 2.2; A.music('off'); setTimeout(() => A.sfx.gameOver(), 600); }
    else P.respawn = 1.5;
  };
  const DV = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] };
  const OPP = { l: 'r', r: 'l', u: 'd', d: 'u' };

  Game.updatePlayer = function (dt, input) {
    const P = this.player;
    P.t += dt;
    if (P.invuln > 0) P.invuln -= dt;
    for (const k of ['drill', 'longHose', 'scan']) if (P[k] > 0) P[k] -= dt;
    if (!P.alive) {
      P.respawn -= dt;
      if (P.respawn <= 0 && this.lives > 0 && !this.over) { Object.assign(P, { x: cx(C.START_C), y: cy(0), c: C.START_C, r: 0, mv: null, alive: true, invuln: 2.2 }); this.pc = { c: C.START_C, r: 0 }; FX.ring(P.x, P.y, 8, 60, 'hsla(190,100%,70%,1)', 0.5, 3); }
      return;
    }
    const hose = P.hose, max = P.longHose > 0 ? C.HOSE_LEN_LONG : C.HOSE_LEN;
    // ---- pump hose ----
    if (input.fire && hose.state === 'idle' && !P.mv) { hose.state = 'out'; hose.len = 0; hose.dir = P.dir; hose.target = null; A.sfx.hose(); }
    if (hose.state === 'out' || hose.state === 'attached') {
      const v = DV[hose.dir];
      if (hose.state === 'out') {
        if (!input.fire) hose.state = 'retract';
        else {
          const next = Math.min(max, hose.len + 520 * dt);
          let blocked = false;
          const tipx = P.x + v[0] * (next + 12), tipy = P.y + v[1] * (next + 12);
          if (!this.open(Al.cc(tipx), Al.cr(tipy))) blocked = true;
          if (!blocked) hose.len = next;
          for (const e of this.al) {
            if (e.dead || e.ghost) continue;
            if (Math.hypot(e.x - (P.x + v[0] * (hose.len + 10)), e.y - (P.y + v[1] * (hose.len + 10))) < e.r0 + 8) { hose.state = 'attached'; hose.target = e; e.attached = true; e.mv = null; e.flame = null; this.pumpT = 0; P.pumpT = 0.12; break; }
          }
          if (hose.len >= max - 0.5 && hose.state === 'out' && blocked === false && !hose.target) hose.hold = (hose.hold || 0) + dt;
        }
      } else {
        const e = hose.target;
        if (!input.fire || !e || e.dead || Math.hypot(e.x - P.x, e.y - P.y) > max + e.r0 + 22) { hose.state = 'retract'; if (e) e.attached = false; }
        else {
          hose.len = Math.max(8, Math.hypot(e.x - P.x, e.y - P.y) - e.r0 * 0.4);
          P.pumpT -= dt;
          if (P.pumpT <= 0) { P.pumpT = P.longHose > 0 ? 0.2 : 0.3; Al.pump(this, e); if (e.dead) { hose.state = 'retract'; hose.target = null; } }
        }
      }
    } else if (hose.state === 'retract') { hose.len -= 780 * dt; if (hose.len <= 0) { hose.len = 0; hose.state = 'idle'; hose.target = null; } }
    // ---- movement ----
    if (hose.state !== 'idle') { P.mv = null; return; }
    const dig = P.drill > 0 ? 1.6 : 1;
    if (P.mv) {
      const m = P.mv, d = input.dir;
      if (d && OPP[d] === m.dir) { const t = { tx: m.fx, ty: m.fy, fx: m.tx, fy: m.ty, dir: d, dig: false }; P.mv = t; P.dir = d; }
      const mm = P.mv, dx = mm.tx - P.x, dy = mm.ty - P.y, dist = Math.hypot(dx, dy), sp = (mm.dig ? C.SPEED_DIG * dig : C.SPEED_OPEN) * dt;
      if (dist <= sp) { P.x = mm.tx; P.y = mm.ty; P.mv = null; } else { P.x += dx / dist * sp; P.y += dy / dist * sp; }
      if (mm.dig && P.mv && (Math.abs(P.x - mm.fx) + Math.abs(P.y - mm.fy)) > 7) GFX.art.carve(this.dirtCv, P.x, P.y, 15);
    }
    if (!P.mv) {
      const d = input.dir;
      if (d) {
        P.dir = d; if (d === 'l') P.fx = -1; else if (d === 'r') P.fx = 1;
        const v = DV[d], nc = P.c + v[0], nr = P.r + v[1];
        if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !this.rockAt(nc, nr)) {
          const i = L.idx(nc, nr);
          if (this.kind[i] === K.LAVA && this.dirt[i] === 1) { this.dirt[i] = 0; this.kind[i] = K.NONE; GFX.art.carve(this.dirtCv, cx(nc), cy(nr), 17); this.killPlayer('lava'); return; }
          P.mv = { fx: P.x, fy: P.y, tx: cx(nc), ty: cy(nr), dir: d, dig: this.dirt[i] === 1 };
          if (P.mv.dig) A.sfx.dig();
        }
      }
    }
    // cell bookkeeping: whatever cell the miner is in gets dug out and searched
    const c = Al.cc(P.x), r = Al.cr(P.y), nc2 = Math.round((P.x - CELL / 2) / CELL), nr2 = Math.round((P.y - C.GY0 - CELL / 2) / CELL);
    P.c = nc2; P.r = nr2;
    if (nc2 !== this.pc.c || nr2 !== this.pc.r) {
      this.pc = { c: nc2, r: nr2 };
      if (nr2 > 0) this.digCell(nc2, nr2, true);
      this.collectAt(nc2, nr2);
    }
    void c; void r;
  };

  /* ---------- boulders ---------- */
  Game.updateRocks = function (dt) {
    for (const k of this.rocks) {
      if (k.state === 'idle') {
        if (k.r + 1 < ROWS && this.dirt[L.idx(k.c, k.r + 1)] === 0 && !this.rockAt(k.c, k.r + 1)) { k.state = 'wobble'; k.t = 0; }
      } else if (k.state === 'wobble') {
        k.t += dt;
        if (k.t > 0.7) { k.state = 'fall'; k.vy = 0; k.crushed = 0; k.hitQ = false; this.dirt[L.idx(k.c, k.r)] = 0; GFX.art.carve(this.dirtCv, cx(k.c), cy(k.r), 17); A.sfx.rockStart(); }
      } else if (k.state === 'fall') {
        k.vy = Math.min(480, k.vy + 900 * dt); k.y += k.vy * dt;
        const P = this.player;
        if (P.alive && Math.abs(P.x - k.x) < 18 && Math.abs(P.y - k.y) < 22) this.killPlayer('rock');
        for (const e of this.al) {
          if (e.dead) continue;
          if (e.boss) { if (!k.hitQ && Math.abs(e.x - k.x) < e.r0 && Math.abs(e.y - k.y) < e.r0) { k.hitQ = true; e.pump += 6; e.flash = 0.2; FX.explosion(k.x, k.y, 1.4, 320); FX.addShake(8); if (e.pump >= e.popAt) Al.pop(this, e, false); } continue; }
          if (!e.ghost && Math.abs(e.x - k.x) < 18 && Math.abs(e.y - k.y) < 22) { k.crushed++; Al.pop(this, e, true); }
        }
        if (k.y >= cy(k.r + 1) - 0.5) {
          k.r++;
          if (k.r + 1 >= ROWS || this.dirt[L.idx(k.c, k.r + 1)] === 1 || this.rockAt(k.c, k.r + 1)) this.landRock(k);
        }
      }
    }
    this.rocks = this.rocks.filter((k) => k.state !== 'gone');
  };
  Game.landRock = function (k) {
    k.state = 'gone'; k.y = cy(k.r);
    FX.explosion(k.x, k.y, 1.3, 215); FX.addShake(6); A.sfx.thud();
    if (k.crushed > 0) { const v = [0, 1000, 2500, 4000, 6000, 8000][Math.min(5, k.crushed)]; this.award(v, k.x, k.y); }
    this.rockDrops++;
    if (this.rockDrops % 2 === 0) this.pickups.push({ x: k.x, y: k.y, power: U.pick(['drill', 'hose', 'shield', 'scan']), t: 0, life: 12 });
  };

  /* ---------- gas clouds, bonus crates ---------- */
  Game.updateStuff = function (dt) {
    const P = this.player;
    for (const g of this.clouds) {
      g.t += dt; const r = Math.min(54, 12 + g.t * 36); g.r = r;
      if (P.alive && Math.hypot(P.x - g.x, P.y - g.y) < r) this.killPlayer('gas');
      for (const e of this.al) if (!e.dead && !e.boss && Math.hypot(e.x - g.x, e.y - g.y) < r + 6) { Al.pop(this, e, true); this.award(300, e.x, e.y); }
    }
    this.clouds = this.clouds.filter((g) => g.t < g.life);
    for (const p of this.pickups) { p.t += dt; if (P.alive && Math.hypot(P.x - p.x, P.y - p.y) < 20) { p.dead = true; this.applyPower(p.power, p.x, p.y); this.addScore(200); } if (p.t > p.life) p.dead = true; }
    this.pickups = this.pickups.filter((p) => !p.dead);
  };

  /* ---------- level flow ---------- */
  Game.onAlienDown = function (e) {
    if (this.state !== 'play') return;
    if (e.boss) { for (const a of this.al) if (!a.dead && a !== e) { a.dead = true; FX.explosion(a.x, a.y, 1, 320); } this.levelClear(true); return; }
    if (!this.boss && this.al.every((a) => a.dead)) this.levelClear(true);
  };
  Game.levelClear = function (killedAll) {
    this.state = 'clear'; this.timer = 2.8;
    const bonus = 1000 + this.level * 200 + (killedAll ? 1000 : 0);
    this.addScore(bonus); A.sfx.stageClear();
    this.banner = { text: killedAll ? 'ALL ALIENS CLEARED' : 'EXTRACTION COMPLETE', sub: 'BONUS  +' + U.fmt(bonus), t: 0, life: 2.5 };
    this.projs = [];
  };

  Game.update = function (dt) {
    this.time += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    if (this.state === 'clear') { this.timer -= dt; FX.update(dt); this.updateRocks(dt); if (this.timer <= 0) this.startLevel(this.level + 1); return; }
    const input = this.demo ? this.autopilot() : { dir: I.dir(), fire: I.fire };
    this.updatePlayer(dt, input);
    this.updateRocks(dt);
    Al.update(this, dt);
    Al.updateProjs(this, dt);
    this.updateStuff(dt);
    if (this.hatchOpen && this.player.alive && this.player.r === 0 && this.state === 'play' && !this.boss) this.levelClear(false);
    FX.update(dt);
    if (this.over) {
      this.overT -= dt;
      if (this.overT <= 0) {
        if (this.demo) this.reset(true, 1);
        else if (!this.overDone) { this.overDone = true; if (this.onOver) this.onOver(); }
      }
    }
    if (this.demo && this.time > 120) { this.time = 0; this.reset(true, 1); }
  };

  /* attract-mode miner: dig toward the nearest mineral or alien, pump anything lined up in front */
  Game.autopilot = function () {
    const P = this.player, pc = this.pc;
    let fire = false, tgt = null, td = 1e9;
    for (const e of this.al) {
      if (e.dead) continue;
      const dc = e.c - pc.c, dr = e.r - pc.r;
      const aligned = (dr === 0 && Math.abs(dc) <= 3) || (dc === 0 && Math.abs(dr) <= 3);
      if (aligned && !e.ghost) { const d = dr === 0 ? (dc > 0 ? 'r' : 'l') : (dr > 0 ? 'd' : 'u'); if (d === P.hose.dir || P.hose.state === 'idle') { P.dir = d; fire = true; if (P.hose.state === 'idle') P.hose.dir = d; } }
    }
    if (P.hose.state !== 'idle' || fire) return { dir: null, fire };
    for (let i = 0; i < this.kind.length; i++) if (this.kind[i] === K.ORE) { const c = i % COLS, r = Math.floor(i / COLS), d = Math.abs(c - pc.c) + Math.abs(r - pc.r); if (d < td) { td = d; tgt = { c, r }; } }
    if (!tgt) for (const e of this.al) if (!e.dead) { const d = Math.abs(e.c - pc.c) + Math.abs(e.r - pc.r); if (d < td) { td = d; tgt = { c: e.c, r: e.r }; } }
    if (this.hatchOpen) tgt = { c: C.START_C, r: 0 };
    if (!tgt) return { dir: null, fire: false };
    const dc = tgt.c - pc.c, dr = tgt.r - pc.r, order = Math.abs(dc) > Math.abs(dr) ? ['h', 'v'] : ['v', 'h'];
    for (const o of order) {
      const d = o === 'h' ? (dc > 0 ? 'r' : dc < 0 ? 'l' : null) : (dr > 0 ? 'd' : dr < 0 ? 'u' : null);
      if (!d) continue;
      const v = DV[d], nc = pc.c + v[0], nr = pc.r + v[1];
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || this.rockAt(nc, nr) || this.kind[L.idx(nc, nr)] === K.LAVA || this.kind[L.idx(nc, nr)] === K.GAS) continue;
      return { dir: d, fire: false };
    }
    return { dir: U.pick(['l', 'r', 'd']), fire: false };
  };

  /* ---------- rendering (logical 540x720 space) ---------- */
  Game.hasBackdrop = true;
  Game.drawBackdrop = function (ctx) {
    ctx.drawImage(GFX.art.backdrop(), 0, 0, W, H);
    ctx.drawImage(this.dirtCv, 0, GFX.art.DY, W, H - GFX.art.DY);
  };

  function glint(ctx, x, y, col, a, s) {
    ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke(); ctx.globalAlpha = 1;
  }
  Game.render = function (ctx) {
    const spr = GFX.spr, T = GFX.art.TIERS, t = this.time, P = this.player;
    for (let r = 1; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = L.idx(c, r), kd = this.kind[i];
        if (!kd) continue;
        const x = cx(c), y = cy(r), solid = this.dirt[i] === 1;
        if (kd === K.ORE) {
          const d = this.data[i], tr = T[d.tier], near = P.scan > 0 && Math.hypot(P.x - x, P.y - y) < 170;
          if (!solid || near) {
            ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, tr.c1.length === 7 ? 'rgba(' + parseInt(tr.c1.slice(1, 3), 16) + ',' + parseInt(tr.c1.slice(3, 5), 16) + ',' + parseInt(tr.c1.slice(5, 7), 16) + ',1)' : 'rgba(255,255,255,1)', x, y, 24, near && solid ? 0.5 : 0.35); ctx.globalCompositeOperation = 'source-over';
            GFX.draw(ctx, spr.gem[d.tier], x, y + Math.sin(t * 3 + d.ph) * 1.5, 0, 1, 1, near && solid ? 0.85 : 1);
          } else {
            const a = 0.5 + 0.5 * Math.sin(t * 2.1 + d.ph);
            if (a > 0.8) glint(ctx, x + Math.sin(d.ph * 7) * 7, y + Math.cos(d.ph * 5) * 6, tr.c1, (a - 0.8) * 4, 3 + d.tier);
            ctx.globalAlpha = 0.14; ctx.fillStyle = tr.c1; ctx.beginPath(); ctx.arc(x + Math.sin(d.ph * 3) * 5, y + Math.cos(d.ph * 4) * 5, 2.2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
          }
        } else if (kd === K.CRATE) GFX.draw(ctx, spr.crate[this.data[i].power], x, y, 0, 0.9, 0.9);
        else if (kd === K.LAVA && solid) {
          const f = 0.7 + 0.3 * Math.sin(t * 5 + c * 1.7 + r);
          ctx.fillStyle = GFX.lg(ctx, 0, y - 15, 0, y + 15, [[0, 'rgba(255,230,90,' + f + ')'], [0.5, 'rgba(255,110,20,' + f + ')'], [1, 'rgba(160,20,0,0.9)']]); ctx.fillRect(x - 14, y - 14, 28, 28);
          ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(20,100%,55%,1)', x, y, 24, 0.35 * f); ctx.globalCompositeOperation = 'source-over';
        } else if (kd === K.GAS && solid) {
          ctx.fillStyle = 'rgba(120,255,140,' + (0.28 + 0.12 * Math.sin(t * 3 + c)) + ')'; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(190,255,200,0.7)'; ctx.lineWidth = 1.4; ctx.stroke();
          ctx.fillStyle = 'rgba(210,255,215,0.6)'; ctx.beginPath(); ctx.arc(x - 4, y - 3, 2.6, 0, TAU); ctx.arc(x + 4, y + 4, 1.8, 0, TAU); ctx.fill();
        }
      }
    }
    const hx = cx(C.START_C), hy = cy(0);
    ctx.fillStyle = this.hatchOpen ? 'rgba(255,230,120,' + (0.6 + 0.3 * Math.sin(t * 6)) + ')' : 'rgba(120,130,160,0.8)'; ctx.fillRect(hx - 14, hy + 8, 28, 6);
    if (this.hatchOpen) { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(48,100%,60%,1)', hx, hy, 40, 0.4 + 0.2 * Math.sin(t * 6)); ctx.globalCompositeOperation = 'source-over'; }
    for (const k of this.rocks) {
      const sx = k.state === 'wobble' ? Math.sin(t * 70) * 1.6 : 0;
      GFX.draw(ctx, spr.rock, k.x + sx, k.y, 0, 0.82, 0.82);
    }
    for (const p of this.pickups) { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(40,100%,60%,1)', p.x, p.y, 24, 0.4); ctx.globalCompositeOperation = 'source-over'; GFX.draw(ctx, spr.crate[p.power], p.x, p.y + Math.sin(p.t * 5) * 2, 0, 0.95, 0.95, p.life - p.t < 3 ? (Math.floor(p.t * 8) % 2 ? 0.4 : 1) : 1); }
    for (const g of this.clouds) { ctx.globalAlpha = 0.35 * (1 - g.t / g.life * 0.6); ctx.fillStyle = 'rgba(120,255,140,1)'; ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(200,255,210,0.6)'; ctx.lineWidth = 2; ctx.stroke(); }
    Al.draw(ctx, this);
    FX.drawNorm(ctx);
    if (P.alive) {
      const v = DV[P.hose.dir], h = P.hose;
      if (h.state !== 'idle' && h.len > 0) {
        const nx = P.x + v[0] * 14, ny = P.y + v[1] * 14, tx = nx + v[0] * h.len, ty = ny + v[1] * h.len;
        ctx.lineCap = 'round';
        for (const [w, c] of [[9, 'rgba(60,200,255,0.25)'], [4.5, '#6ad8ff'], [1.8, '#e8fbff']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(tx, ty); ctx.stroke(); }
        ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(tx, ty, 4, 0, TAU); ctx.fill();
      }
      const blink = P.invuln > 0 ? (Math.floor(P.t * 14) % 2 ? 0.4 : 0.9) : 1, rot = P.dir === 'u' ? -Math.PI / 2 : P.dir === 'd' ? Math.PI / 2 : 0;
      if (P.drill > 0) { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(35,100%,60%,1)', P.x + DV[P.dir][0] * 18, P.y + DV[P.dir][1] * 18, 14, 0.5); ctx.globalCompositeOperation = 'source-over'; }
      GFX.draw(ctx, spr.miner, P.x, P.y, rot, (P.dir === 'l' ? -1 : 1) * 0.9, 0.9, blink);
      if (P.shield) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(150,215,255,' + (0.6 + 0.2 * Math.sin(t * 8)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, P.y, 20, 0, TAU); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
    }
    ctx.globalCompositeOperation = 'lighter';
    FX.drawAdd(ctx);
    ctx.globalCompositeOperation = 'source-over';
    FX.drawText(ctx);
  };
})((window.SGS = window.SGS || {}));
