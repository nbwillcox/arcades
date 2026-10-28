/* Core game state: the frog, lanes and hazards, power-ups, docking bays, classic levels and the endless run. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, GFX = G.gfx, A = G.audio, I = G.input, Wd = G.world, TAU = U.TAU;
  const W = C.W, H = C.H, T = C.TILE;
  const Game = { state: 'title', demo: true, time: 0, mode: 'classic' };
  G.game = Game;

  Game.newFrog = function () {
    return { x: W / 2, row: 0, hop: null, alive: true, deadT: 0, ang: 0, plat: null, plane: null, carry: false, shield: false, super: false, invuln: 1.2, best: 0, time: C.TIMER, t: 0, squash: 0 };
  };
  Game.reset = function (demo, mode) {
    this.demo = !!demo; this.mode = mode === 'endless' ? 'endless' : 'classic';
    if (!this.demo) G.scores.setMode(this.mode);
    this.score = 0; this.lives = this.mode === 'endless' ? 1 : C.START_LIVES; this.level = 1;
    this.lifeIdx = 0; this.nextLifeAt = C.EXTRA_LIFE_AT[0];
    this.bays = [false, false, false, false, false]; this.bayBug = null; this.bayWorm = null; this.friend = null; this.pu = []; this.inv = null; this.slow = 0;
    this.cam = 0; this.camT = 0; this.camAuto = 0; this.moved = false; this.maxRow = 0;
    this.rows = new Map(); this.banner = null; this.over = false; this.overDone = false; this.timer = 0; this.state = 'play';
    this.tBug = U.rand(5, 9); this.tWorm = U.rand(8, 14); this.tFriend = U.rand(6, 10); this.tPu = U.rand(8, 13); this.hopCd = 0; this.demoT = 0;
    if (this.mode === 'classic') this.rows = Wd.classic(1); else Wd.endlessInit(this);
    this.frog = this.newFrog();
    this.hi = G.scores.best();
    FX.reset();
    this.banner = this.mode === 'classic' ? { text: 'LEVEL 1', sub: GFX.art.ZONES[0].name, t: 0, life: 1.8 } : { text: 'ENDLESS', sub: 'HOP FORWARD - DON\'T GET SWEPT AWAY', t: 0, life: 2.2 };
    if (!this.demo) A.music('play', 1, 0);
  };

  /* ---------- scoring ---------- */
  Game.addScore = function (v) {
    this.score += v;
    if (this.demo || this.mode === 'endless') return;
    while (this.score >= this.nextLifeAt) {
      this.lives = Math.min(9, this.lives + 1);
      this.lifeIdx++;
      this.nextLifeAt = this.lifeIdx < C.EXTRA_LIFE_AT.length ? C.EXTRA_LIFE_AT[this.lifeIdx] : this.nextLifeAt + C.EXTRA_LIFE_EVERY;
      A.sfx.extraLife();
      this.banner = { text: 'EXTRA FROG', sub: '', t: 0, life: 1.6, small: true };
    }
  };
  Game.award = function (v, x, y, col) {
    this.addScore(v);
    if (x !== undefined && v >= 50) FX.text(x, y - 16, '+' + U.fmt(v), col || '#ffffff', v >= 200 ? 20 : 14);
  };

  /* ---------- geometry helpers ---------- */
  Game.sy = function (row) { return C.BASE_Y - (row - this.cam) * T; };
  Game.zone = function () { return this.mode === 'classic' ? Math.floor((this.level - 1) / 3) % 5 : Math.floor(Math.max(0, this.cam) / 60) % 5; };
  Game.laneAt = function (row) { return this.rows.get(row) || null; };
  const submerged = (g, it) => it.dive && ((g.time + it.ph) % 5.2) > 3.6;
  Game.submerged = (it) => submerged(Game, it);
  Game.platformAt = function (lane, x) {
    for (const it of lane.items) {
      if (submerged(this, it)) continue;
      if (Math.abs(Wd.itemX(lane, it) - x) < it.len * T / 2 + 1) return it;
    }
    return null;
  };

  /* ---------- pickups, friend, bay occupants ---------- */
  Game.maybeSpawnPickup = function (lane, rnd) {
    if (rnd() > 0.28) return;
    const kind = ['shield', 'slow', 'super', 'bug', 'bug', 'bug'][Math.floor(rnd() * 6)];
    if (lane.kind === 'river') {
      const it = lane.items.find((i) => i.kind !== 'jelly');
      if (it) this.pu.push({ kind, row: lane.row, lane, item: it, off: (rnd() - 0.5) * it.len * T * 0.5, t: 0 });
    } else {
      const col = Math.floor(rnd() * 12);
      if (lane.blocked && lane.blocked.has(col)) return;
      this.pu.push({ kind, row: lane.row, x: (col + 0.5) * T, t: 0 });
    }
  };
  Game.puX = (p) => (p.item ? Wd.itemX(p.lane, p.item) + p.off : p.x);
  Game.collectPu = function (p) {
    p.dead = true;
    const x = this.puX(p), y = this.sy(p.row);
    FX.sparks(x, y, 10, 150, FX.col(p.kind === 'bug' ? 55 : 200), 0.45);
    if (p.kind === 'bug') { this.award(100, x, y, '#fff08a'); A.sfx.pickup(); }
    else { this.inv = p.kind; A.sfx.capsule(); FX.text(x, y - 20, GFX.art.POWER[p.kind].name, GFX.art.POWER[p.kind].col, 15); }
  };
  Game.usePower = function () {
    const F = this.frog;
    if (!this.inv || !F.alive || this.state !== 'play') return;
    const k = this.inv; this.inv = null;
    if (k === 'shield') F.shield = true; else if (k === 'slow') this.slow = 6; else F.super = true;
    A.sfx.weaponUp();
    FX.ring(F.x, this.sy(F.row), 6, 40, 'hsla(190,100%,70%,1)', 0.35, 3);
  };
  Game.updateOccupants = function (dt) {
    if (this.mode !== 'classic') return;
    this.tBug -= dt; this.tWorm -= dt; this.tFriend -= dt; this.tPu -= dt;
    const free = [0, 1, 2, 3, 4].filter((i) => !this.bays[i]);
    if (this.bayBug) { this.bayBug.t -= dt; if (this.bayBug.t <= 0) this.bayBug = null; }
    if (this.bayWorm) { this.bayWorm.t -= dt; if (this.bayWorm.t <= 0) this.bayWorm = null; }
    if (this.tBug <= 0 && !this.bayBug && free.length) { this.tBug = U.rand(9, 15); const i = U.pick(free); if (!this.bayWorm || this.bayWorm.i !== i) this.bayBug = { i, t: 4.5 }; }
    if (this.tWorm <= 0 && !this.bayWorm && this.level >= 2 && free.length) { this.tWorm = U.rand(9, 15); const i = U.pick(free); if (!this.bayBug || this.bayBug.i !== i) { this.bayWorm = { i, t: 3.2 }; A.sfx.enemyShot(); } }
    if (this.friend) { this.friend.x = Wd.itemX(this.friend.lane, this.friend.item) + this.friend.off; if (this.friend.x < -10 || this.friend.x > W + 10 || submerged(this, this.friend.item)) this.friend = null; }
    else if (this.tFriend <= 0 && !this.frog.carry) {
      this.tFriend = U.rand(12, 18);
      const lane = this.rows.get(7 + Math.floor(Math.random() * 5)), its = lane.items.filter((it) => it.kind !== 'jelly' && Math.abs(Wd.itemX(lane, it)) < W - 60 && Wd.itemX(lane, it) > 60);
      if (its.length) this.friend = { lane, item: U.pick(its), off: 0, x: 0 };
    }
    if (this.tPu <= 0 && this.pu.length < 1) {
      this.tPu = U.rand(14, 20);
      this.pu.push({ kind: U.pick(['shield', 'slow', 'super']), row: U.pick([0, 6]), x: (Math.floor(Math.random() * 12) + 0.5) * T, t: 0, life: 14 });
    }
  };

  /* ---------- the frog ---------- */
  Game.tryHop = function (dx, dr) {
    const F = this.frog;
    if (!F.alive || F.hop || this.state !== 'play') return false;
    let tr = F.row + dr;
    if (dr > 0 && F.super) tr = F.row + 2;
    if (this.mode === 'classic') { if (tr < 0 || tr > C.BAY_ROW) return false; if (F.row === C.BAY_ROW) return false; }
    else if (tr < Math.floor(this.cam) - 0.01 && dr < 0) return false;
    let tx = F.x + dx * T;
    if (tx < T / 2 - 1 || tx > W - T / 2 + 1) return false;
    const lane = this.laneAt(tr);
    if (!lane) return false;
    if (lane.blocked && lane.blocked.has(Math.floor(tx / T))) return false;
    if (F.plat === null && lane.kind !== 'river' && dx === 0 && dr !== 0) tx = (Math.floor(tx / T) + 0.5) * T;    // snap to the grid on solid ground
    const sup = dr > 0 && F.super;
    if (sup) F.super = false;
    F.hop = { t: 0, fx: F.x, fr: F.row, tx, tr, sup };
    F.ang = dx > 0 ? Math.PI / 2 : dx < 0 ? -Math.PI / 2 : dr < 0 ? Math.PI : 0;
    F.plat = null; F.plane = null; F.squash = 1;
    A.sfx.hop();
    return true;
  };

  Game.die = function (type) {
    const F = this.frog;
    if (!F.alive || F.invuln > 0 || (G.debug && G.debug.god)) return;
    if (F.shield && (type === 'car' || type === 'serpent' || type === 'worm')) {
      F.shield = false; F.invuln = 1.1; A.sfx.shieldBreak(); FX.addShake(4);
      FX.ring(F.x, this.sy(F.row), 10, 54, 'hsla(200,100%,70%,1)', 0.4, 3);
      return;
    }
    F.alive = false; F.deadT = 1.1; F.hop = null; F.carry = false;
    const x = F.x, y = this.sy(F.row);
    if (type === 'void' || type === 'drift') { FX.ring(x, y, 6, 50, 'hsla(190,100%,70%,1)', 0.5, 3); FX.sparks(x, y, 14, 150, FX.col(190), 0.6); A.sfx.splash(); }
    else { FX.explosion(x, y, 1.6, 100); A.sfx.playerDie(); FX.addShake(7); FX.doFlash(0.2, '255,200,200'); }
    this.lives--; this.moved = this.mode === 'endless' ? this.moved : false;
    if (this.lives <= 0) { this.over = true; this.overT = 2.0; A.music('off'); setTimeout(() => A.sfx.gameOver(), 600); }
  };

  Game.respawn = function () {
    const F = this.frog = this.newFrog();
    if (this.mode === 'endless') { F.row = Math.max(0, Math.floor(this.cam) + 1); }
  };

  Game.land = function () {
    const F = this.frog, h = F.hop;
    F.hop = null; F.row = h.tr; F.x = h.tx; F.squash = 0.6;
    const lane = this.laneAt(F.row);
    if (!lane) return;
    if (F.row > F.best) { const gain = F.row - F.best; F.best = F.row; if (this.mode === 'classic') this.award(10 * gain); else { this.award(10 * Math.max(0, F.row - this.maxRow)); } }
    if (F.row > this.maxRow) this.maxRow = F.row;
    if (F.row > 0) this.moved = true;
    if (lane.kind === 'river') {
      const pl = this.platformAt(lane, F.x);
      if (!pl) { this.die('void'); return; }
      F.plat = pl; F.plane = lane;
      if (this.friend && this.friend.item === pl && Math.abs(this.friend.x - F.x) < 30 && !F.carry) { F.carry = true; this.friend = null; A.sfx.pickup(); FX.text(F.x, this.sy(F.row) - 24, 'FRIEND!', '#ff9ae0', 16); }
    } else if (lane.kind === 'bay') this.landBay();
  };

  Game.landBay = function () {
    const F = this.frog;
    const i = C.BAY_X.findIndex((bx) => Math.abs(F.x - bx) <= C.BAY_TOL);
    if (i < 0 || this.bays[i] || (this.bayWorm && this.bayWorm.i === i && this.bayWorm.t < 3.0)) { this.die(i >= 0 && this.bayWorm && this.bayWorm.i === i ? 'worm' : 'wall'); return; }
    const bonus = Math.round(F.time * 10) + (this.bayBug && this.bayBug.i === i ? 200 : 0) + (F.carry ? 200 : 0);
    this.bays[i] = true;
    this.award(50 + bonus, C.BAY_X[i], this.sy(C.BAY_ROW), '#ffe27a');
    FX.ring(C.BAY_X[i], this.sy(C.BAY_ROW), 6, 44, 'hsla(140,100%,70%,1)', 0.5, 3); FX.sparks(C.BAY_X[i], this.sy(C.BAY_ROW), 14, 170, FX.col(140), 0.6);
    A.sfx.dock();
    if (this.bayBug && this.bayBug.i === i) this.bayBug = null;
    if (this.bays.every((b) => b)) { this.levelClear(); return; }
    this.respawn();
  };

  Game.levelClear = function () {
    this.state = 'clear'; this.timer = 2.4;
    const bonus = 1000 + this.level * 100;
    this.addScore(bonus); A.sfx.stageClear();
    this.banner = { text: 'LEVEL ' + this.level + ' CLEAR', sub: 'BONUS  +' + U.fmt(bonus), t: 0, life: 2.1 };
    FX.doFlash(0.3, '200,255,220');
  };
  Game.nextLevel = function () {
    this.level++; this.rows = Wd.classic(this.level); this.bays = [false, false, false, false, false];
    this.bayBug = null; this.bayWorm = null; this.friend = null; this.pu = []; this.state = 'play';
    this.frog = this.newFrog();
    this.banner = { text: 'LEVEL ' + this.level, sub: this.level % 3 === 1 ? GFX.art.ZONES[this.zone()].name : '', t: 0, life: 1.8 };
    if (!this.demo) A.music('play', this.level >= 4 ? 2 : 1, [0, 2, -2, 3, 5][this.zone()]);
  };

  /* ---------- hazards touching the frog ---------- */
  Game.checkHazards = function () {
    const F = this.frog;
    if (!F.alive || (F.hop && F.hop.sup)) return;
    const row = Math.round(F.row), lane = this.laneAt(row);
    if (!lane || Math.abs(F.row - row) > 0.38) return;
    if (lane.kind === 'road') {
      for (const it of lane.items) { if (Math.abs(Wd.itemX(lane, it) - F.x) < it.len * T / 2 - 6 + C.FROG_R * 0.6) { this.die('car'); return; } }
    } else if (lane.serpent) {
      const s = lane.serpent, hw = s.len * T / 2;
      if (Math.abs(s.x - F.x) < hw + 6) { this.die('serpent'); return; }
    }
    for (const p of this.pu) if (!p.dead && p.row === row && Math.abs(this.puX(p) - F.x) < 24) this.collectPu(p);
    this.pu = this.pu.filter((p) => !p.dead);
  };

  /* ---------- attract-mode hopper ---------- */
  Game.autoHop = function (dt) {
    this.hopCd -= dt;
    const F = this.frog;
    if (this.hopCd > 0 || !F.alive || F.hop) return null;
    const lane = this.laneAt(F.row + 1);
    if (!lane) return null;
    let dx = 0, ok = false;
    if (lane.kind === 'road') ok = lane.items.every((it) => { const cx = Wd.itemX(lane, it), hw = it.len * T / 2 + 30, nx = cx + lane.dir * lane.speed * 0.32; return Math.abs(cx - F.x) > hw && Math.abs(nx - F.x) > hw; });
    else if (lane.kind === 'river') ok = lane.items.some((it) => !submerged(this, it) && !submerged({ time: this.time + 1.2 }, it) && Math.abs(Wd.itemX(lane, it) + lane.dir * lane.speed * 0.14 - F.x) < it.len * T / 2 - 14);
    else if (lane.kind === 'bay') {
      const free = [0, 1, 2, 3, 4].filter((i) => !this.bays[i]).map((i) => C.BAY_X[i]).sort((a, b) => Math.abs(a - F.x) - Math.abs(b - F.x));
      const bx = free[0];
      if (bx !== undefined && Math.abs(F.x - bx) > 24) { dx = bx > F.x ? 1 : -1; this.hopCd = 0.1; return [dx, 0]; }
      ok = true;
    } else ok = true;
    if (!ok) return null;
    this.hopCd = 0.14;
    return [0, 1];
  };

  /* ---------- main update ---------- */
  Game.update = function (dt) {
    this.time += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    if (this.state === 'clear') { this.timer -= dt; FX.update(dt); if (this.timer <= 0) this.nextLevel(); return; }
    const F = this.frog, ts = this.slow > 0 ? 0.4 : 1;
    if (this.slow > 0) this.slow -= dt;
    for (const lane of this.rows.values()) {
      if (lane.speed) lane.off += lane.dir * lane.speed * ts * dt;
      const s = lane.serpent;
      if (s) { s.x += s.dir * s.speed * ts * dt; if (s.x > W + s.len * T) s.x = -s.len * T; else if (s.x < -s.len * T) s.x = W + s.len * T; }
    }
    F.t += dt; if (F.invuln > 0) F.invuln -= dt; if (F.squash > 0) F.squash = Math.max(0, F.squash - dt * 6);
    if (F.alive) {
      const h = F.hop;
      if (h) {
        h.t += dt;
        const k = Math.min(1, h.t / C.HOP_T), e = 1 - (1 - k) * (1 - k);
        F.row = h.fr + (h.tr - h.fr) * e; F.x = h.fx + (h.tx - h.fx) * e;
        if (h.t >= C.HOP_T) this.land();
      } else {
        if (F.plat && F.plane) {
          F.x += F.plane.dir * F.plane.speed * ts * dt;
          if (submerged(this, F.plat)) this.die('void');
          else if (F.x < 6 || F.x > W - 6) this.die('drift');
        }
        const hop = this.demo ? this.autoHop(dt) : I.takeHop();
        if (hop && F.alive) this.tryHop(hop[0], hop[1]);
      }
      if (F.alive) {
        if (this.demo ? (this.inv && Math.random() < 0.02) : I.takePow()) this.usePower();
        this.checkHazards();
        if (this.mode === 'classic' && this.state === 'play') {
          F.time -= dt;
          if (F.time <= 0) this.die('time');
          else if (F.time < 6 && Math.floor(F.time + dt) !== Math.floor(F.time)) A.sfx.tick();
        }
      }
    } else if (!this.over) { F.deadT -= dt; if (F.deadT <= 0) this.respawn(); }
    if (this.mode === 'endless') this.updateEndless(dt);
    else this.updateOccupants(dt);
    for (const p of this.pu) { p.t += dt; if (p.life && p.t > p.life) p.dead = true; }
    this.pu = this.pu.filter((p) => !p.dead);
    FX.update(dt);
    if (this.over) {
      this.overT -= dt;
      if (this.overT <= 0) {
        if (this.demo) this.reset(true, 'classic');
        else if (!this.overDone) { this.overDone = true; if (this.onOver) this.onOver(); }
      }
    }
    if (this.demo && (this.demoT += dt) > 90) this.reset(true, 'classic');
  };

  /* endless: the camera creeps forward (faster the further you go); stand still and the void sweeps you away */
  Game.updateEndless = function (dt) {
    const F = this.frog;
    if (this.moved) this.camAuto += Math.min(1.7, 0.28 + this.maxRow / 200) * dt;
    const target = Math.max(this.camAuto, this.maxRow - 6);
    if (target > this.cam) this.cam += (target - this.cam) * Math.min(1, 5 * dt) + 0.0001;
    Wd.endlessTo(this, Math.floor(this.cam) + 18);
    const cut = Math.floor(this.cam) - 3;
    for (const r of [...this.rows.keys()]) if (r < cut) this.rows.delete(r);
    this.pu = this.pu.filter((p) => p.row >= cut);
    if (F.alive && F.row < this.cam - 0.75 && !F.hop) this.die('swept');
  };

  /* ---------- rendering (logical 540x720 space) ---------- */
  Game.hasBackdrop = true;
  Game.drawBackdrop = function (ctx) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.fillStyle = '#03040d'; ctx.fillRect(0, 0, W, H);
    const r0 = Math.floor(this.cam) - 1, A2 = GFX.art;
    for (let r = r0; r <= r0 + 16; r++) {
      const lane = this.rows.get(r), y = this.sy(r) - T / 2;
      if (!lane) continue;
      ctx.drawImage(A2.strip(lane.zone, lane.kind === 'start' ? 'start' : lane.kind), 0, y, W, T);
      if (lane.kind === 'river') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineWidth = 1.6;
        ctx.strokeStyle = U.hsl(A2.ZONES[lane.zone].h + 40, 90, 70, 0.18);
        for (let i = 0; i < 7; i++) { const x = (((i * 83 + this.time * 26 * lane.dir * (lane.speed / 60)) % (W + 80)) + W + 80) % (W + 80) - 40, yy = y + 8 + (i * 13) % 30; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + 20, yy); ctx.stroke(); }
        ctx.restore();
      }
    }
    ctx.restore();
  };

  function drawWorm(ctx, x, y, t, warn) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = warn ? (Math.floor(t * 14) % 2 ? 0.35 : 0.8) : 1;
    ctx.fillStyle = GFX.rg(ctx, -4, -6, 2, 24, [[0, '#f0c8ff'], [0.5, '#a64cff'], [1, '#34106a']]);
    ctx.beginPath(); ctx.arc(0, 4, 17, Math.PI, 0); ctx.lineTo(17, 18); ctx.lineTo(-17, 18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e6b8ff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-6, 2, 4, 0, TAU); ctx.arc(6, 2, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff2a4a'; ctx.beginPath(); ctx.arc(-6, 2.5, 1.8, 0, TAU); ctx.arc(6, 2.5, 1.8, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawSerpent(ctx, s, y, t) {
    const n = s.len * 4, seg = (s.len * T) / n;
    for (let i = n - 1; i >= 0; i--) {
      const x = s.x - s.dir * (i - (n - 1) / 2) * seg, yy = y + Math.sin(t * 7 + i * 0.8) * 5, r = i === 0 ? 9 : 7.5 - i * 0.12;
      ctx.fillStyle = i % 2 ? '#ff5a8a' : '#ffb04a'; ctx.beginPath(); ctx.arc(x, yy, Math.max(4, r), 0, TAU); ctx.fill();
      if (i === 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + s.dir * 3, yy - 3, 2.4, 0, TAU); ctx.fill(); ctx.fillStyle = '#220'; ctx.beginPath(); ctx.arc(x + s.dir * 3.6, yy - 3, 1.1, 0, TAU); ctx.fill(); }
    }
  }

  Game.render = function (ctx) {
    const spr = GFX.spr, A2 = GFX.art, t = this.time, F = this.frog, r0 = Math.floor(this.cam) - 1;
    for (let r = r0; r <= r0 + 16; r++) {
      const lane = this.rows.get(r), y = this.sy(r);
      if (!lane || y < -40 || y > H + 40) continue;
      if (lane.kind === 'river') {
        for (const it of lane.items) {
          const x = Wd.itemX(lane, it);
          if (x < -it.len * T || x > W + it.len * T) continue;
          let a = 1, dy = 0;
          if (it.dive) { const ph = (t + it.ph) % 5.2; if (ph > 3.6) { a = 0.18; dy = 5; } else if (ph > 3.0) a = Math.floor(t * 12) % 2 ? 0.45 : 1; }
          GFX.draw(ctx, A2.platform(it.kind, it.len, it.hue), x, y + dy, 0, 1, 1, a);
        }
      } else if (lane.kind === 'road') {
        for (const it of lane.items) {
          const x = Wd.itemX(lane, it);
          if (x < -it.len * T || x > W + it.len * T) continue;
          ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(' + Math.round(it.hue) + ',100%,60%,1)', x - lane.dir * it.len * T * 0.45, y, 18, 0.25); ctx.globalCompositeOperation = 'source-over';
          GFX.draw(ctx, A2.vehicle(it.kind, it.len, it.hue), x, y, 0, lane.dir, 1);
        }
      } else if (lane.blocked) {
        for (const c of lane.blocked) { const x = (c + 0.5) * T; ctx.fillStyle = '#2a3148'; ctx.beginPath(); ctx.arc(x, y, 18, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(160,190,255,0.8)'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(x - 5, y - 4, 5, 0, TAU); ctx.fill(); }
      }
      if (lane.serpent) drawSerpent(ctx, lane.serpent, y, t);
    }
    if (this.mode === 'classic') {
      const by = this.sy(C.BAY_ROW);
      this.bays.forEach((f, i) => { if (f) GFX.draw(ctx, spr.frog, C.BAY_X[i], by + 2, 0, 0.8, 0.8); });
      if (this.bayBug) GFX.draw(ctx, spr.bug, C.BAY_X[this.bayBug.i], by + Math.sin(t * 6) * 3, 0, 1, 1);
      if (this.bayWorm) drawWorm(ctx, C.BAY_X[this.bayWorm.i], by + 4, this.bayWorm.t, this.bayWorm.t > 3.0);
      if (this.friend) GFX.draw(ctx, spr.friend, this.friend.x, this.sy(this.friend.lane.row) - 2, 0, 1, 1);
    }
    for (const p of this.pu) {
      const x = this.puX(p), y = this.sy(p.row), bob = Math.sin(p.t * 4) * 3;
      if (y < -30 || y > H + 30) continue;
      ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, p.kind === 'bug' ? 'hsla(55,100%,60%,1)' : 'hsla(195,100%,60%,1)', x, y + bob, 24, 0.4); ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, p.kind === 'bug' ? spr.bug : spr.pick[p.kind], x, y + bob, 0, 1, 1, p.life && p.life - p.t < 3 ? (Math.floor(p.t * 8) % 2 ? 0.4 : 1) : 1);
    }
    FX.drawNorm(ctx);
    if (F.alive) {
      const h = F.hop, k = h ? Math.min(1, h.t / C.HOP_T) : 0, lift = h ? Math.sin(Math.PI * k) * 12 : 0, y = this.sy(F.row);
      const sq = 1 + F.squash * 0.12 + (h ? Math.sin(Math.PI * k) * 0.18 : 0), blink = F.invuln > 0 ? (Math.floor(F.t * 16) % 2 ? 0.4 : 0.9) : 1;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(F.x, y + 8, 13, 6, 0, 0, TAU); ctx.fill();
      if (F.super) { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(140,100%,60%,1)', F.x, y - lift, 30, 0.45 + 0.2 * Math.sin(t * 10)); ctx.globalCompositeOperation = 'source-over'; }
      GFX.draw(ctx, spr.frog, F.x, y - lift, F.ang, sq, sq, blink);
      if (F.carry) GFX.draw(ctx, spr.friend, F.x, y - lift - 4, 0, 0.7, 0.7);
      if (F.shield) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(150,215,255,' + (0.6 + 0.2 * Math.sin(t * 8)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(F.x, y - lift, 24, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(120,200,255,0.12)'; ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    }
    ctx.globalCompositeOperation = 'lighter';
    FX.drawAdd(ctx);
    ctx.globalCompositeOperation = 'source-over';
    FX.drawText(ctx);
  };
})((window.SGS = window.SGS || {}));
