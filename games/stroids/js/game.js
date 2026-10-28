/* Core game state: ship physics, bullets, collisions, wave flow. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, GFX = G.gfx, A = G.audio, I = G.input, R = G.rocks, Sa = G.saucers, TAU = U.TAU;
  const W = C.W, H = C.H;
  const Game = { state: 'title', demo: true, time: 0 };
  G.game = Game;

  function newPlayer() {
    return { x: W / 2, y: H / 2, vx: 0, vy: 0, ang: -Math.PI / 2, alive: true, tier: 1, drones: 0, shield: 0, fireCd: 0, invuln: 3, respawn: 0, t: 0, hyperCd: 0, hitFlash: 0, muzzle: 0, dA: 0, thr: 0, thx: 0, thy: 0 };
  }

  Game.reset = function (demo, startStage) {
    this.demo = !!demo;
    this.score = 0; this.lives = C.START_LIVES; this.stage = 0;
    this.combo = 0; this.comboT = 0; this.mult = 1;
    this.lifeIdx = 0; this.nextLifeAt = C.EXTRA_LIFE_AT[0];
    this.pb = []; this.eb = []; this.pk = []; this.rocks = []; this.saucers = []; this.saucerT = 20; this.stall = 0;
    this.boss = null; this.banner = null; this.lastBoss = null;
    this.stageTime = 0; this.perfect = true; this.timer = 0; this.over = false; this.overDone = false; this.world = 0;
    this.player = newPlayer();
    this.hi = G.scores.best();
    FX.reset();
    this.startStage(startStage || 1);
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
      this.banner = { text: 'EXTRA SHIP', sub: '', t: 0, life: 1.6, small: true };
    }
  };
  Game.award = function (base, x, y) {
    const v = Math.round(base * this.mult);
    this.addScore(v);
    if (x !== undefined && base >= 100) FX.text(x, y - 16, '+' + U.fmt(v), this.mult > 1 ? '#ffd24a' : '#ffffff', base >= 1000 ? 22 : 14);
  };
  Game.comboKill = function () {
    this.combo++; this.comboT = 2.4;
    const m = Math.min(8, 1 + Math.floor(this.combo / 8));
    if (m > this.mult) { this.mult = m; FX.text(this.player.x, this.player.y - 36, 'COMBO x' + m, '#ffd24a', 20); A.sfx.combo(m); }
  };
  Game.breakCombo = function () { this.combo = 0; this.comboT = 0; this.mult = 1; };

  /* ---------- bullets (all wrap, all expire) ---------- */
  Game.ebullet = function (x, y, vx, vy, kind, r, extra) {
    if (this.eb.length > 60) return;
    const b = { x, y, vx, vy, kind: kind || 'orb', r: r || 5, life: 3, dead: false };
    if (extra) Object.assign(b, extra);
    this.eb.push(b);
  };
  Game.clearEnemyBullets = function (fxOn) {
    if (fxOn) for (const b of this.eb) FX.sparks(b.x, b.y, 2, 80, 'hsla(30,100%,60%,1)', 0.3, 1.2);
    this.eb.length = 0;
  };
  Game.pbullet = function (x, y, vx, vy, dmg, kind, pierce, life) {
    this.pb.push({ x, y, vx, vy, ang: Math.atan2(vy, vx) + Math.PI / 2, dmg, kind, pierce: !!pierce, hit: pierce ? [] : null, r: kind === 'lance' ? 4.5 : 3.4, life: life || C.BULLET_LIFE, dead: false });
  };

  /* ---------- pickups (weapon, wingmen, shield) ---------- */
  Game.dropPickup = function (x, y, kind) {
    const a = Math.random() * TAU;
    this.pk.push({ x, y, vx: Math.cos(a) * 24, vy: Math.sin(a) * 24, kind: kind || this.randomKind(), t: 0, life: 12, dead: false });
  };
  Game.randomKind = function () {
    const p = this.player;
    const w = { W: p.tier >= C.MAX_TIER ? 1 : 4, D: p.drones >= C.MAX_DRONES ? 1 : 2.4, S: 2 };
    let tot = 0; for (const k in w) tot += w[k];
    let r = Math.random() * tot;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'W';
  };
  Game.collect = function (pk) {
    const p = this.player, x = pk.x, y = pk.y;
    FX.sparks(x, y, 12, 170, FX.col(50), 0.5);
    FX.ring(x, y, 6, 36, 'hsla(50,100%,70%,1)', 0.35, 2);
    if (pk.kind === 'W') {
      if (p.tier < C.MAX_TIER) { p.tier++; A.sfx.weaponUp(); FX.text(p.x, p.y - 30, p.tier === C.MAX_TIER ? 'PIERCING LANCES!' : 'WEAPON UP', '#ffe27a', 16); }
      else { this.award(1000, x, y); A.sfx.pickup(); }
    } else if (pk.kind === 'D') {
      if (p.drones < C.MAX_DRONES) { p.drones++; A.sfx.drone(); FX.text(p.x, p.y - 30, 'WINGMAN', '#7dffb8', 16); }
      else { this.award(1000, x, y); A.sfx.pickup(); }
    } else { p.shield = C.SHIELD_TIME; A.sfx.shield(); FX.text(p.x, p.y - 30, 'SHIELD', '#8fd4ff', 16); }
    this.addScore(200);
  };

  /* ---------- hits and hyperspace ---------- */
  Game.hitPlayer = function () {
    const p = this.player;
    if (!p.alive || p.invuln > 0) return false;
    if (G.debug && G.debug.god) return false;
    if (p.shield > 0) {
      p.shield = 0; p.invuln = 1.2; p.hitFlash = 0.25;
      A.sfx.shieldBreak(); FX.addShake(4);
      FX.ring(p.x, p.y, 12, 66, 'hsla(200,100%,70%,1)', 0.4, 4);
      FX.sparks(p.x, p.y, 16, 220, FX.col(200), 0.5);
      return true;
    }
    Game.killPlayer.call(this);
    return true;
  };
  Game.killPlayer = function () {
    const p = this.player;
    p.alive = false;
    FX.explosion(p.x, p.y, 2.8, 190); FX.explosion(p.x, p.y, 1.8, 320);
    A.sfx.playerDie(); FX.doFlash(0.5, '255,190,190'); FX.addShake(10);
    p.tier = Math.max(1, p.tier - 1); p.drones = Math.max(0, p.drones - 1); p.shield = 0;
    this.lives--; this.perfect = false; this.breakCombo();
    if (this.lives <= 0) { this.over = true; this.overT = 2.4; A.music('off'); setTimeout(() => A.sfx.gameOver(), 700); }
    else p.respawn = 1.8;
  };
  Game.hyperspace = function () {
    const p = this.player;
    if (!p.alive || p.hyperCd > 0) return;
    p.hyperCd = C.HYPER_CD;
    FX.ring(p.x, p.y, 6, 60, 'hsla(280,100%,75%,1)', 0.4, 3); FX.sparks(p.x, p.y, 14, 200, FX.col(280), 0.4);
    p.x = U.rand(40, W - 40); p.y = U.rand(40, H - 40); p.vx = 0; p.vy = 0; p.invuln = Math.max(p.invuln, 0.6);
    FX.ring(p.x, p.y, 60, 6, 'hsla(280,100%,75%,1)', 0.4, 3); FX.sparks(p.x, p.y, 14, 200, FX.col(280), 0.4);
    A.sfx.hyper();
    if (Math.random() < 0.06 && !(G.debug && G.debug.god)) { FX.text(p.x, p.y - 24, 'BAD JUMP!', '#ff6a6a', 18); Game.killPlayer.call(this); }
  };

  /* ---------- ship ---------- */
  const RATE = [0, 7.5, 8, 8.5, 10];
  Game.firePlayer = function (p) {
    const dx = Math.cos(p.ang), dy = Math.sin(p.ang), px = -dy, py = dx;
    const shot = (off, da, dmg, kind, pierce, sp, life) => {
      const a = p.ang + da, ox = p.x + dx * 14 + px * off, oy = p.y + dy * 14 + py * off;
      this.pbullet(U.wrap(ox, W), U.wrap(oy, H), Math.cos(a) * sp + p.vx * 0.5, Math.sin(a) * sp + p.vy * 0.5, dmg, kind, pierce, life);
    };
    const sp = 620;
    if (p.tier === 1) shot(0, 0, 1, 'bolt', false, sp);
    else if (p.tier === 2) { shot(-5, 0, 1, 'bolt', false, sp); shot(5, 0, 1, 'bolt', false, sp); }
    else if (p.tier === 3) { shot(0, 0, 1, 'bolt', false, sp); shot(-4, -0.17, 1, 'bolt', false, sp); shot(4, 0.17, 1, 'bolt', false, sp); }
    else { shot(-4, 0, 1.5, 'lance', true, 780, 1.15); shot(4, 0, 1.5, 'lance', true, 780, 1.15); shot(-9, -0.2, 1, 'bolt', false, sp); shot(9, 0.2, 1, 'bolt', false, sp); }
    p.fireCd = 1 / RATE[p.tier];
    p.muzzle = 0.06;
    A.sfx.shoot(p.tier);
  };

  Game.updatePlayer = function (dt) {
    const p = this.player;
    p.t += dt;
    if (p.hitFlash > 0) p.hitFlash -= dt;
    if (p.muzzle > 0) p.muzzle -= dt;
    if (p.hyperCd > 0) p.hyperCd -= dt;
    if (!p.alive) {
      p.respawn -= dt;
      if (p.respawn <= 0 && this.lives > 0 && !this.over) {
        const clear = !this.rocks.some((r) => R.dist2(r.x, r.y, W / 2, H / 2) < (r.r + 90) * (r.r + 90));
        if (clear || p.respawn < -2.5) {
          Object.assign(p, { x: W / 2, y: H / 2, vx: 0, vy: 0, alive: true, invuln: 3, fireCd: 0, ang: -Math.PI / 2 });
          FX.ring(p.x, p.y, 8, 50, 'hsla(190,100%,70%,1)', 0.5, 3);
        }
      }
      return;
    }
    let ax = 0, ay = 0, fire = false, hyper = false;
    if (this.demo) { const c = this.autopilot(dt); ax = c.ax; ay = c.ay; p.ang = c.aim; fire = c.fire; hyper = c.hyper; }
    else {
      // left/right turn the ship, or the mouse aims it; up thrusts forward, down thrusts backward
      if (I.mouseActive) p.ang = Math.atan2(I.mouseY - p.y, I.mouseX - p.x);
      else p.ang += ((I.right ? 1 : 0) - (I.left ? 1 : 0)) * C.TURN_RATE * dt;
      const f = (I.up ? 1 : 0) - (I.down ? 1 : 0);
      ax = Math.cos(p.ang) * f; ay = Math.sin(p.ang) * f;
      fire = I.fire; hyper = I.takeHyper();
    }
    const l = Math.hypot(ax, ay);
    p.thr = l > 0 ? 1 : 0;
    if (l > 0) {
      p.thx = ax / l; p.thy = ay / l;
      p.vx += p.thx * C.ACCEL * dt; p.vy += p.thy * C.ACCEL * dt;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > C.MAX_SPEED) { p.vx *= C.MAX_SPEED / sp; p.vy *= C.MAX_SPEED / sp; }
      if (p.t % 0.06 < dt * 1.2) A.sfx.thrust();
    }
    p.x = U.wrap(p.x + p.vx * dt, W); p.y = U.wrap(p.y + p.vy * dt, H);
    if (p.invuln > 0) p.invuln -= dt;
    if (p.shield > 0) p.shield -= dt;
    p.fireCd = Math.max(0, p.fireCd - dt);
    if (fire && p.fireCd <= 0) this.firePlayer(p);
    if (hyper) this.hyperspace();
    // wingmen orbit the ship and fire along its aim
    p.dcd = (p.dcd || 0) - dt;
    p.dpos = p.dpos || [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    for (let i = 0; i < p.drones; i++) {
      const a = p.t * 2.6 + i * Math.PI, d = p.dpos[i];
      d.x = p.x + Math.cos(a) * 34; d.y = p.y + Math.sin(a) * 34;
      if (fire && p.dcd <= 0) this.pbullet(U.wrap(d.x, W), U.wrap(d.y, H), Math.cos(p.ang) * 600 + p.vx * 0.5, Math.sin(p.ang) * 600 + p.vy * 0.5, 0.8, 'dbolt', false, 0.9);
    }
    if (fire && p.dcd <= 0) { p.dcd = 0.25; if (p.drones) A.sfx.droneShot(); }
    if (l > 0 && (!S.reduced || Math.random() < 0.4)) FX.trail(p.x - p.thx * 13 + U.rand(-2, 2), p.y - p.thy * 13 + U.rand(-2, 2), 'hsla(190,100%,60%,1)', U.rand(4, 7), 0.16);
  };

  /* attract-mode pilot: keep clear of rocks, damp speed, shoot the nearest one */
  Game.autopilot = function (dt) {
    const p = this.player;
    let tx = 0, ty = 0, near = null, nd = 1e9, minGap = 1e9;
    for (const r of this.rocks) {
      const dx = U.wrapD(r.x, p.x, W), dy = U.wrapD(r.y, p.y, H), d = Math.hypot(dx, dy), gap = d - r.r;
      if (gap < minGap) minGap = gap;
      if (d < nd) { nd = d; near = { r, dx, dy, d }; }
      if (gap < 130) { const k = (130 - gap) / 130; tx -= dx / d * k * 2.2; ty -= dy / d * k * 2.2; }
    }
    for (const b of this.eb) { const dx = U.wrapD(b.x, p.x, W), dy = U.wrapD(b.y, p.y, H), d = Math.hypot(dx, dy); if (d < 120) { tx -= dx / d; ty -= dy / d; } }
    for (const s of this.saucers) { const dx = U.wrapD(s.x, p.x, W), dy = U.wrapD(s.y, p.y, H), d = Math.hypot(dx, dy); if (d < 110) { tx -= dx / d; ty -= dy / d; } }
    const sp = Math.hypot(p.vx, p.vy);
    if (Math.hypot(tx, ty) < 0.15 && sp > 60) { tx = -p.vx / sp; ty = -p.vy / sp; }
    const m = Math.hypot(tx, ty);
    let aim = p.ang, fire = false;
    const tgt = near || (this.saucers[0] && { dx: U.wrapD(this.saucers[0].x, p.x, W), dy: U.wrapD(this.saucers[0].y, p.y, H), d: 100, r: this.saucers[0] });
    if (this.boss && this.boss.state === 'fight') { const md = this.boss.mods.find((q) => q.alive && q.k !== 'core') || this.boss.mods.find((q) => q.alive); if (md) { const dx = md.x - p.x, dy = md.y - p.y; aim = Math.atan2(dy, dx); fire = true; } }
    else if (tgt) {
      const t = Math.min(0.9, tgt.d / 620), r = tgt.r;
      aim = Math.atan2(tgt.dy + (r.vy || 0) * t - p.vy * 0.5 * t, tgt.dx + (r.vx || 0) * t - p.vx * 0.5 * t);
      fire = tgt.d < 480;
    }
    return { ax: m > 0.2 ? tx / Math.max(1, m) : 0, ay: m > 0.2 ? ty / Math.max(1, m) : 0, aim, fire, hyper: minGap < 14 && p.hyperCd <= 0 && Math.random() < 0.08 };
  };

  /* ---------- collisions (the arena is a torus) ---------- */
  Game.collide = function () {
    const p = this.player, boss = this.boss && this.boss.state === 'fight' ? this.boss : null;
    for (const b of this.pb) {
      if (b.dead) continue;
      const s = Sa.hitTest(this, b.x, b.y, b.r, b.pierce ? b.hit : null);
      if (s) { if (b.pierce) b.hit.push(s.id); Sa.damage(this, s, b.dmg); if (!b.pierce) { b.dead = true; continue; } }
      const r = R.hitTest(this, b.x, b.y, b.r, b.pierce ? b.hit : null);
      if (r) {
        if (b.pierce) b.hit.push(r.id);
        FX.sparks(b.x, b.y, 2, 100, 'hsla(190,100%,75%,1)', 0.2, 1.2);
        R.damage(this, r, b.dmg);
        if (!b.pierce) { b.dead = true; continue; }
      }
      if (boss) G.boss.bulletHit(this, boss, b);
    }
    if (!p.alive) return;
    const pr = C.SHIP_R * 0.8;
    for (const b of this.eb) {
      const rr = b.r + pr;
      if (!b.dead && R.dist2(b.x, b.y, p.x, p.y) < rr * rr) { b.dead = true; this.hitPlayer(); if (!p.alive) return; }
    }
    for (const r of this.rocks) {
      if (r.dead) continue;
      const rr = r.r + C.SHIP_R * 0.85;
      if (R.dist2(r.x, r.y, p.x, p.y) < rr * rr) {
        if (this.hitPlayer() && p.alive) R.destroy(this, r);
        if (!p.alive) return;
      }
    }
    for (const s of this.saucers) {
      const rr = s.r + C.SHIP_R;
      if (!s.dead && R.dist2(s.x, s.y, p.x, p.y) < rr * rr) { if (this.hitPlayer() && p.alive) Sa.damage(this, s, 9); if (!p.alive) return; }
    }
    if (boss && G.boss.hitsPlayer(this, boss, p)) this.hitPlayer();
    for (const k of this.pk) {
      if (k.dead) continue;
      if (R.dist2(k.x, k.y, p.x, p.y) < 26 * 26) { k.dead = true; this.collect(k); }
    }
  };

  function stepWrap(arr, dt) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      b.x = U.wrap(b.x + b.vx * dt, W); b.y = U.wrap(b.y + b.vy * dt, H);
      b.life -= dt;
      if (b.dead || b.life <= 0) { arr[i] = arr[arr.length - 1]; arr.pop(); }
    }
  }

  Game.update = function (dt) {
    this.time += dt;
    this.stageTime += dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.breakCombo(); }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    if (this.state === 'play' && !this.stall && this.stageTime > 38 + this.stage * 2 && !this.over) {
      this.stall = 1; this.banner = { text: 'HURRY UP!', sub: '', t: 0, life: 1.6, small: true }; A.sfx.thief();
    }
    this.updatePlayer(dt);
    stepWrap(this.pb, dt);
    R.update(this, dt);
    Sa.update(this, dt);
    if (this.boss) G.boss.update(this, this.boss, dt);
    stepWrap(this.eb, dt);
    for (const k of this.pk) { k.t += dt; k.life -= dt; k.x = U.wrap(k.x + k.vx * dt, W); k.y = U.wrap(k.y + k.vy * dt, H); if (k.life <= 0) k.dead = true; }
    this.pk = this.pk.filter((k) => !k.dead);
    this.collide();
    R.cull(this);
    FX.update(dt);
    this.flow(dt);
    if (this.over) {
      this.overT -= dt;
      if (this.overT <= 0) {
        if (this.demo) { this.reset(true, U.randInt(1, 4)); this.player.tier = U.randInt(1, 3); this.player.drones = U.randInt(0, 2); }
        else if (!this.overDone) { this.overDone = true; if (this.onOver) this.onOver(); }
      }
    }
  };

  /* ---------- wave flow ---------- */
  Game.startStage = function (n) {
    this.stage = n; this.stageTime = 0; this.perfect = true; this.stall = 0;
    this.world = Math.floor((n - 1) / C.BOSS_EVERY) % 5;
    this.clearEnemyBullets(false);
    this.rocks = []; this.saucers = []; this.saucerT = U.rand(16, 24);
    const key = [0, 2, -2, 3, 5][this.world];
    if (n % C.BOSS_EVERY === 0) {
      this.state = 'bossWarn'; this.timer = 3.4;
      this.banner = { text: 'WARNING', sub: 'MASSIVE SIGNATURE DETECTED', t: 0, life: 3.4, warn: true };
      if (!this.demo) { A.sfx.warning(); A.music('boss', 3, key); }
    } else {
      this.state = 'intro'; this.timer = 1.6;
      this.banner = { text: 'WAVE ' + n, sub: '', t: 0, life: 1.6 };
      if (!this.demo) A.music('play', n >= 3 ? 2 : 1, key);
    }
    G.onStage && G.onStage(n);
  };

  Game.beginClear = function (boss) {
    this.state = 'clear';
    this.timer = boss ? 4.4 : 2.4;
    this.clearEnemyBullets(true);
    for (const r of this.rocks.slice()) R.destroy(this, r, { silent: true });
    R.cull(this);
    this.saucers = [];
    let bonus = 0;
    if (this.perfect && !this.demo) bonus = boss ? 5000 : 500 + this.stage * 100;
    if (bonus) { this.addScore(bonus); A.sfx.perfect(); }
    if (!this.demo) A.sfx.stageClear();
    this.banner = { text: boss ? 'BOSS DESTROYED' : 'WAVE ' + this.stage + ' CLEARED', sub: bonus ? 'PERFECT  +' + U.fmt(bonus) : '', t: 0, life: this.timer - 0.2 };
  };

  Game.flow = function (dt) {
    if (this.over) return;
    switch (this.state) {
      case 'intro':
        this.timer -= dt;
        if (this.timer <= 0) { R.spawnWave(this, this.stage); this.state = 'play'; }
        break;
      case 'play':
        if (!this.rocks.some((r) => !r.dead) && this.saucers.length === 0) this.beginClear(false);
        break;
      case 'bossWarn':
        this.timer -= dt;
        if (this.timer <= 0) { this.boss = G.boss.create(this, this.stage); this.state = 'bossFight'; }
        break;
      case 'bossFight':
        if (this.boss && this.boss.state === 'done') { this.boss = null; this.beginClear(true); }
        break;
      case 'clear':
        this.timer -= dt;
        if (this.timer <= 0) this.startStage(this.stage + 1);
        break;
      default:
    }
  };

  /* ---------- rendering (logical 720x540 space) ---------- */
  function drawShipAt(ctx, p, x, y) {
    const spr = GFX.spr, SS = C.SHIP_SCALE, rot = p.ang + Math.PI / 2;
    const blink = p.invuln > 0 ? (Math.floor(p.t * 16) % 2 ? 0.35 : 0.85) : 1;
    ctx.globalCompositeOperation = 'lighter';
    GFX.drawGlow(ctx, 'hsla(190,100%,60%,1)', x - Math.cos(p.ang) * 12, y - Math.sin(p.ang) * 12, p.thr ? 13 : 8, p.thr ? 0.85 : 0.45);
    if (p.muzzle > 0) GFX.drawGlow(ctx, 'hsla(190,100%,65%,1)', x + Math.cos(p.ang) * 17, y + Math.sin(p.ang) * 17, 13, 0.9);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < p.drones; i++) {
      const d = p.dpos[i], dx = x + (d.x - p.x), dy = y + (d.y - p.y);
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(150,100%,60%,1)', dx, dy, 8, 0.8);
      ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, spr.drone, dx, dy, rot, 0.55, 0.55, blink);
    }
    GFX.draw(ctx, spr.player, x, y, rot, SS, SS, blink);
    ctx.globalCompositeOperation = 'lighter';
    GFX.drawGlow(ctx, 'hsla(190,100%,70%,1)', x, y, 4, 1);
    if (p.shield > 0) {
      const low = p.shield < 3 && Math.floor(p.t * 8) % 2;
      ctx.globalAlpha = low ? 0.25 : 0.6 + Math.sin(p.t * 6) * 0.15;
      const g = ctx.createRadialGradient(x, y, 11, x, y, 25);
      g.addColorStop(0, 'rgba(80,190,255,0)'); g.addColorStop(0.75, 'rgba(80,190,255,0.25)'); g.addColorStop(1, 'rgba(180,235,255,0.9)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 25, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  Game.drawPlayer = function (ctx) {
    const p = this.player;
    if (!p.alive) return;
    const m = 60;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const x = p.x + ox * W, y = p.y + oy * H;
        if (x < -m || x > W + m || y < -m || y > H + m) continue;
        drawShipAt(ctx, p, x, y);
      }
    }
  };

  Game.render = function (ctx) {
    const spr = GFX.spr;
    for (const k of this.pk) {
      const spin = 0.55 + 0.45 * Math.abs(Math.cos(k.t * 3.2)), fade = k.life < 3 ? (Math.floor(k.t * 8) % 2 ? 0.4 : 1) : 1;
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(' + (k.kind === 'W' ? 45 : k.kind === 'D' ? 150 : 205) + ',100%,60%,1)', k.x, k.y, 28, (0.55 + Math.sin(k.t * 6) * 0.15) * fade);
      ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, spr.pick[k.kind], k.x, k.y, 0, spin * 0.85, 0.85, fade);
    }
    R.draw(ctx, this);
    Sa.draw(ctx, this);
    if (this.boss) G.boss.draw(ctx, this, this.boss);
    FX.drawNorm(ctx);
    for (const b of this.eb) {
      if (b.kind === 'needle') GFX.draw(ctx, spr.eneedle, b.x, b.y, Math.atan2(b.vy, b.vx) - Math.PI / 2);
      else GFX.draw(ctx, spr.eorb, b.x, b.y, 0, 0.9, 0.9);
    }
    for (const b of this.pb) GFX.draw(ctx, spr[b.kind], b.x, b.y, b.ang, 0.8, 0.8);
    this.drawPlayer(ctx);
    ctx.globalCompositeOperation = 'lighter';
    FX.drawAdd(ctx);
    ctx.globalCompositeOperation = 'source-over';
    FX.drawText(ctx);
  };
})((window.SGS = window.SGS || {}));
