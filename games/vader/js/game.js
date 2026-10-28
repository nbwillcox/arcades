/* Core game state: player, bullets, collisions, wave flow. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, GFX = G.gfx, A = G.audio, I = G.input, Sh = G.shields, Inv = G.invaders, TAU = U.TAU;
  const W = C.W, H = C.H;
  const Game = { state: 'title', demo: true, time: 0 };
  G.game = Game;

  function newPlayer() {
    return { x: W / 2, y: C.PLAYER_Y, alive: true, tier: 1, drones: 0, shield: 0, bombs: 1, fireCd: 0, invuln: 2, respawn: 0, tilt: 0, t: 0, dx: [-32, 32], dy: [8, 8], bombCd: 0, hitFlash: 0, muzzle: 0 };
  }

  Game.reset = function (demo, startStage) {
    this.demo = !!demo;
    this.score = 0; this.lives = C.START_LIVES; this.stage = 0;
    this.combo = 0; this.comboT = 0; this.mult = 1;
    this.lifeIdx = 0; this.nextLifeAt = C.EXTRA_LIFE_AT[0];
    this.pb = []; this.eb = []; this.pk = []; this.inv = []; this.pods = []; this.ufo = null; this.form = null;
    this.boss = null; this.banner = null; this.bunkers = []; this.divers = []; this.diverT = 4.5; this.diverQ = [];
    this.stageTime = 0; this.perfect = true; this.timer = 0; this.over = false; this.overDone = false;
    this.freeze = 0; this.world = 0; this.bombT = 2; this.ufoT = 15; this.baseInterval = 0.55;
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
    if (x !== undefined && base >= 100) FX.text(x, y - 16, '+' + U.fmt(v), this.mult > 1 ? '#ffd24a' : '#ffffff', base >= 500 ? 22 : 14);
  };
  Game.comboKill = function () {
    this.combo++; this.comboT = 2.4;
    const m = Math.min(8, 1 + Math.floor(this.combo / 6));
    if (m > this.mult) {
      this.mult = m;
      FX.text(this.player.x, this.player.y - 44, 'COMBO x' + m, '#ffd24a', 22);
      A.sfx.combo(m);
    }
  };
  Game.breakCombo = function () { this.combo = 0; this.comboT = 0; this.mult = 1; };

  /* ---------- bullets ---------- */
  Game.ebullet = function (x, y, vx, vy, kind, r, extra) {
    if (this.eb.length > 60) return;
    const b = { x, y, vx, vy, kind: kind || 'orb', r: r || 5, t: 0, ax: x, dead: false };
    if (extra) Object.assign(b, extra);
    this.eb.push(b);
  };
  Game.aimed = function (x, y, speed, kind, spread, r) {
    const p = this.player;
    const a = Math.atan2(p.y - y, p.x - x) + (spread || 0);
    this.ebullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, kind, r);
  };
  Game.clearEnemyBullets = function (fxOn) {
    if (fxOn) for (const b of this.eb) FX.sparks(b.x, b.y, 2, 80, 'hsla(30,100%,60%,1)', 0.3, 1.2);
    this.eb.length = 0;
  };
  Game.pbullet = function (x, y, ang, speed, dmg, kind, pierce) {
    this.pb.push({ x, y, vx: Math.sin(ang) * speed, vy: -Math.cos(ang) * speed, ang, dmg, kind, pierce: !!pierce, hit: pierce ? [] : null, r: kind === 'lance' ? 4.5 : 3.6, dead: false });
  };

  /* ---------- pickups ---------- */
  Game.dropPickup = function (x, y, kind) {
    this.pk.push({ x, y, kind: kind || this.randomKind(), t: 0, vy: 80, dead: false });
  };
  Game.randomKind = function () {
    const p = this.player;
    const w = { W: p.tier >= C.MAX_TIER ? 1 : 4, D: p.drones >= C.MAX_DRONES ? 1 : 2.4, S: 2, B: p.bombs >= C.MAX_BOMBS ? 0.8 : 2 };
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
      if (p.tier < C.MAX_TIER) { p.tier++; A.sfx.weaponUp(); FX.text(p.x, p.y - 38, p.tier === C.MAX_TIER ? 'PIERCING LANCES!' : 'WEAPON UP', '#ffe27a', 18); }
      else { this.award(1000, x, y); A.sfx.pickup(); }
    } else if (pk.kind === 'D') {
      if (p.drones < C.MAX_DRONES) { p.drones++; A.sfx.drone(); FX.text(p.x, p.y - 38, 'WINGMAN', '#7dffb8', 18); }
      else { this.award(1000, x, y); A.sfx.pickup(); }
    } else if (pk.kind === 'S') {
      p.shield = C.SHIELD_TIME; A.sfx.shield(); FX.text(p.x, p.y - 38, 'SHIELD', '#8fd4ff', 18);
    } else if (p.bombs < C.MAX_BOMBS) { p.bombs++; A.sfx.bombPickup(); FX.text(p.x, p.y - 38, 'SMART BOMB', '#ff8ca0', 18); }
    else { this.award(1000, x, y); A.sfx.pickup(); }
    this.addScore(200);
  };

  /* ---------- player ---------- */
  const RATE = [0, 7.5, 8, 8.5, 10];
  Game.firePlayer = function (p) {
    const sp = 960, y = p.y - 22;
    if (p.tier === 1) this.pbullet(p.x, y, 0, sp, 1, 'bolt');
    else if (p.tier === 2) { this.pbullet(p.x - 6, y + 3, 0, sp, 1, 'bolt'); this.pbullet(p.x + 6, y + 3, 0, sp, 1, 'bolt'); }
    else if (p.tier === 3) {
      this.pbullet(p.x, y, 0, sp, 1, 'bolt');
      this.pbullet(p.x - 6, y + 4, -0.17, sp, 1, 'bolt');
      this.pbullet(p.x + 6, y + 4, 0.17, sp, 1, 'bolt');
    } else {
      this.pbullet(p.x - 5, y, 0, 1150, 1.5, 'lance', true);
      this.pbullet(p.x + 5, y, 0, 1150, 1.5, 'lance', true);
      this.pbullet(p.x - 12, y + 6, -0.2, sp, 1, 'bolt');
      this.pbullet(p.x + 12, y + 6, 0.2, sp, 1, 'bolt');
    }
    p.fireCd = 1 / RATE[p.tier];
    p.muzzle = 0.06;
    A.sfx.shoot(p.tier);
  };

  Game.useBomb = function () {
    const p = this.player;
    if (!p.alive || p.bombs <= 0 || p.bombCd > 0) return;
    p.bombs--; p.bombCd = 0.8;
    p.invuln = Math.max(p.invuln, 0.9);
    A.sfx.bomb();
    FX.doFlash(0.9, '255,240,220');
    FX.addShake(14);
    FX.ring(p.x, p.y, 10, 760, 'hsla(40,100%,70%,1)', 0.8, 7);
    FX.ring(p.x, p.y, 6, 540, 'hsla(200,100%,75%,1)', 1.0, 4);
    this.clearEnemyBullets(true);
    for (const q of this.inv) if (!q.dead) { q.shielded = false; Inv.damage(this, q, q.type === 'cmd' ? 3 : 6); }
    for (const q of this.pods.slice()) Inv.killPod(this, q);
    if (this.ufo) Inv.killUfo(this);
    if (this.boss && this.boss.state === 'fight') G.boss.bombed(this, this.boss);
    G.divers.bombed(this);
  };

  Game.hitPlayer = function () {
    const p = this.player;
    if (!p.alive || p.invuln > 0) return false;
    if (G.debug && G.debug.god) return false;
    if (p.shield > 0) {
      p.shield = 0; p.invuln = 1.2; p.hitFlash = 0.25;
      A.sfx.shieldBreak(); FX.addShake(4);
      FX.ring(p.x, p.y, 14, 70, 'hsla(200,100%,70%,1)', 0.4, 4);
      FX.sparks(p.x, p.y, 16, 220, FX.col(200), 0.5);
      return true;
    }
    p.alive = false;
    FX.explosion(p.x, p.y, 3, 190);
    FX.explosion(p.x, p.y, 1.9, 320);
    A.sfx.playerDie(); FX.doFlash(0.5, '255,190,190'); FX.addShake(10);
    p.tier = Math.max(1, p.tier - 1);
    p.drones = Math.max(0, p.drones - 1);
    p.shield = 0;
    this.lives--; this.perfect = false; this.breakCombo();
    this.freeze = 1.8;
    if (this.lives <= 0) { this.over = true; this.overT = 2.4; A.music('off'); setTimeout(() => A.sfx.gameOver(), 700); }
    else p.respawn = 1.5;
    return true;
  };

  /* the invaders reached the planet: instant game over */
  Game.invade = function () {
    if (this.over || (G.debug && G.debug.god)) return;
    const p = this.player;
    this.lives = 0; this.over = true; this.overT = 2.6; this.perfect = false;
    this.banner = { text: 'INVADED!', sub: 'THE PLANET HAS FALLEN', t: 0, life: 2.4 };
    if (p.alive) { p.alive = false; FX.explosion(p.x, p.y, 3.4, 190); }
    FX.doFlash(0.8, '255,120,120'); FX.addShake(14);
    A.sfx.playerDie(); A.music('off'); setTimeout(() => A.sfx.gameOver(), 800);
  };

  Game.updatePlayer = function (dt) {
    const p = this.player;
    p.t += dt;
    if (p.hitFlash > 0) p.hitFlash -= dt;
    if (p.muzzle > 0) p.muzzle -= dt;
    if (!p.alive) {
      p.respawn -= dt;
      if (p.respawn <= 0 && this.lives > 0 && !this.over) {
        p.alive = true; p.x = W / 2; p.y = C.PLAYER_Y; p.invuln = 2.6; p.fireCd = 0; p.tilt = 0;
        FX.ring(p.x, p.y, 8, 60, 'hsla(190,100%,70%,1)', 0.5, 3);
      }
      return;
    }
    let dir = 0, target = null, fire = false, bomb = false;
    if (this.demo) { const c = this.autopilot(dt); target = c.x; fire = true; bomb = c.bomb; }
    else {
      dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
      if (dir === 0 && I.mouseActive) target = U.clamp(I.mouseX, 26, W - 26);
      fire = I.fire; bomb = I.takeBomb();
    }
    let vx = 0;
    if (dir !== 0) { vx = dir * C.PLAYER_SPEED; p.x += vx * dt; }
    else if (target !== null) {
      const d = target - p.x, step = (this.demo ? C.PLAYER_SPEED : C.MOUSE_SPEED) * dt;
      const m = Math.abs(d) <= step ? d : Math.sign(d) * step;
      p.x += m; vx = m / dt;
    }
    p.x = U.clamp(p.x, 24, W - 24);
    p.tilt += (U.clamp(vx / C.PLAYER_SPEED, -1, 1) * 0.3 - p.tilt) * Math.min(1, 14 * dt);
    if (p.invuln > 0) p.invuln -= dt;
    if (p.shield > 0) p.shield -= dt;
    if (p.bombCd > 0) p.bombCd -= dt;
    p.fireCd = Math.max(0, p.fireCd - dt);
    if (fire && p.fireCd <= 0) this.firePlayer(p);
    if (bomb) this.useBomb();
    p.dcd = (p.dcd || 0) - dt;
    p.dpos = p.dpos || [{ x: p.x, y: p.y }, { x: p.x, y: p.y }];
    const k = 1 - Math.exp(-11 * dt);
    for (let i = 0; i < p.drones; i++) {
      const d = p.dpos[i];
      d.x += (p.x + p.dx[i] - d.x) * k; d.y += (p.y + p.dy[i] + Math.sin(p.t * 3 + i * 2) * 2 - d.y) * k;
      if (fire && p.dcd <= 0) this.pbullet(d.x, d.y - 10, 0, 900, 0.8, 'dbolt');
    }
    if (fire && p.dcd <= 0) { p.dcd = 0.22; if (p.drones) A.sfx.droneShot(); }
    if (!S.reduced || Math.random() < 0.4) FX.trail(p.x + U.rand(-2, 2), p.y + 20, 'hsla(190,100%,60%,1)', U.rand(4, 7), 0.15);
  };

  /* attract-mode pilot: dodge bombs, slide under the lowest invaders */
  Game.autopilot = function (dt) {
    const p = this.player;
    this.apT = (this.apT || 0) - dt;
    if (this.apT <= 0 || this.apX === undefined) {
      this.apT = 0.08;
      let target = W / 2, bd = 1e9;
      for (const q of this.inv) { if (q.dead || q.spawnT > 0) continue; const s = Math.abs(q.x - p.x) - q.y * 0.15 + (q.shielded ? 400 : 0) - (q.type === 'cmd' ? 150 : 0); if (s < bd) { bd = s; target = q.x; } }
      if (this.boss && this.boss.state === 'fight') { const md = this.boss.mods.find((m) => m.alive && m.k !== 'core') || this.boss.mods.find((m) => m.alive); if (md) target = this.boss.x + md.x; }
      let best = p.x, bc = 1e9;
      for (let cx = 24; cx <= W - 24; cx += 10) {
        let cost = Math.abs(cx - p.x) * 0.012 + Math.abs(cx - target) * 0.025;
        for (const b of this.eb) {
          if (b.y < p.y - 280 || b.y > p.y + 6 || b.vy < 20) continue;
          const t = (p.y - b.y) / b.vy, bx = (b.kind === 'wobble' ? b.ax : b.x) + b.vx * t;
          const d = Math.abs(bx - cx), lim = b.kind === 'wobble' ? 40 : 28;
          if (d < lim) cost += (lim - d) * (1 + (280 - (p.y - b.y)) / 280) * 2;
        }
        for (const q of this.pods) if (Math.abs(q.x - cx) < 40 && q.y > p.y - 220) cost += 30;
        if (cost < bc) { bc = cost; best = cx; }
      }
      this.apX = best;
    }
    return { x: this.apX, bomb: this.eb.length > 8 && p.bombs > 0 && Math.random() < 0.04 };
  };

  /* ---------- collisions ---------- */
  const BOMB_POWER = { needle: 1.2, wobble: 1.8, plunger: 3.2, orb: 2, big: 2.6 };
  /* does the segment (x0,y0)-(x1,y1) touch the rectangle? (slab test) */
  function segHitsRect(x0, y0, x1, y1, rx0, ry0, rx1, ry1) {
    let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0;
    for (const [p, q] of [[-dx, x0 - rx0], [dx, rx1 - x0], [-dy, y0 - ry0], [dy, ry1 - y0]]) {
      if (p === 0) { if (q < 0) return false; } else { const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } }
    }
    return true;
  }
  Game.collide = function () {
    const p = this.player, boss = this.boss && this.boss.state === 'fight' ? this.boss : null;
    for (const b of this.pb) {
      if (b.dead) continue;
      if (b.kind !== 'lance' && Sh.hit(b.x, b.y, b.r, 0.5)) { b.dead = true; continue; }
      const u = this.ufo;
      if (u && Math.abs(b.x - u.x) < 34 && Math.abs(b.y - u.y) < 16) {
        if (b.pierce) { if (b.hit.indexOf('ufo') >= 0) continue; b.hit.push('ufo'); }
        u.flash = 0.06; Inv.killUfo(this);
        if (!b.pierce) { b.dead = true; continue; }
      }
      if (G.divers.shotHit(this, b, segHitsRect)) continue;
      for (const q of this.inv) {
        if (q.dead || q.spawnT > 0) continue;
        const tr = Inv.TYPES[q.type].r, hw = tr * 1.2 + b.r, hh = tr * 1.05 + b.r;                    /* q.r is the formation ROW (0-5): the old test used it as a radius, so the hit area was only a few pixels */
        if (segHitsRect(b.px === undefined ? b.x : b.px, b.py === undefined ? b.y : b.py, b.x, b.y, q.x - hw, q.y - hh, q.x + hw, q.y + hh)) {      /* the whole path the shot travelled this frame against a box a little bigger than the sprite: nothing slips between invaders */
          if (b.pierce) { if (b.hit.indexOf(q.id) >= 0) continue; b.hit.push(q.id); }
          Inv.damage(this, q, b.dmg);
          if (!b.pierce) { b.dead = true; break; }
        }
      }
      if (b.dead) continue;
      for (const q of this.pods) {
        if (q.dead) continue;
        const rr = q.r + b.r;
        if (U.dist2(b.x, b.y, q.x, q.y) < rr * rr) {
          if (b.pierce) { if (b.hit.indexOf(q) >= 0) continue; b.hit.push(q); }
          Inv.killPod(this, q);
          if (!b.pierce) { b.dead = true; break; }
        }
      }
      if (!b.dead && boss) G.boss.bulletHit(this, boss, b);
    }
    for (const b of this.eb) {
      if (b.dead) continue;
      if (Sh.hit(b.x, b.y, b.r, BOMB_POWER[b.kind] || 2)) { b.dead = true; FX.sparks(b.x, b.y, 4, 100, 'hsla(30,100%,60%,1)', 0.25); }
    }
    if (!p.alive) return;
    const pr = 9;
    for (const b of this.eb) {
      const rr = b.r + pr;
      if (!b.dead && U.dist2(b.x, b.y, p.x, p.y) < rr * rr) { b.dead = true; this.hitPlayer(); if (!p.alive) return; }
    }
    for (const q of this.pods) {
      if (q.dead) continue;
      const rr = q.r + pr;
      if (U.dist2(q.x, q.y, p.x, p.y) < rr * rr) { Inv.killPod(this, q, true); this.hitPlayer(); if (!p.alive) return; }
    }
    if (boss && G.boss.hitsPlayer(this, boss, p)) this.hitPlayer();
    for (const k of this.pk) {
      if (k.dead) continue;
      if (U.dist2(k.x, k.y, p.x, p.y) < 30 * 30) { k.dead = true; this.collect(k); }
    }
  };

  function step(arr, dt, w, h) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      b.t = (b.t || 0) + dt; b.px = b.x; b.py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.kind === 'wobble') { b.ax += b.vx * dt; b.x = b.ax + Math.sin(b.t * 7) * 16; }
      if (b.dead || b.y < -70 || b.y > h + 40 || b.x < -40 || b.x > w + 40) { arr[i] = arr[arr.length - 1]; arr.pop(); }
    }
  }

  Game.update = function (dt) {
    this.time += dt;
    this.stageTime += dt;
    if (this.freeze > 0) this.freeze -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.breakCombo(); }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    this.updatePlayer(dt);
    step(this.pb, dt, W, H);
    Inv.update(this, dt);
    Inv.updateUfo(this, dt);
    Inv.updatePods(this, dt);
    if (this.boss) G.boss.update(this, this.boss, dt);
    G.divers.update(this, dt);
    step(this.eb, dt, W, H);
    Sh.update(this, dt);
    for (let i = this.pk.length - 1; i >= 0; i--) {
      const k = this.pk[i];
      k.t += dt; k.y += k.vy * dt;
      if (k.dead || k.y > H + 30) { this.pk[i] = this.pk[this.pk.length - 1]; this.pk.pop(); }
    }
    this.collide();
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
    this.stage = n; this.stageTime = 0; this.perfect = true;
    this.world = Math.floor((n - 1) / C.BOSS_EVERY) % 5;
    this.clearEnemyBullets(false);
    this.inv = []; this.pods = []; this.ufo = null; this.form = null; G.divers.reset(this);
    Sh.build(this);
    const key = [0, 2, -2, 3, 5][this.world];
    if (n % C.BOSS_EVERY === 0) {
      this.state = 'bossWarn'; this.timer = 3.4;
      this.banner = { text: 'WARNING', sub: 'OVERLORD APPROACHING', t: 0, life: 3.4, warn: true };
      if (!this.demo) { A.sfx.warning(); A.music('boss', 3, key); }
    } else {
      this.state = 'intro'; this.timer = 1.7;
      this.banner = { text: 'WAVE ' + n, sub: '', t: 0, life: 1.7 };
      if (!this.demo) A.music('play', n >= 3 ? 2 : 1, key);
    }
    G.onStage && G.onStage(n);
  };

  Game.beginClear = function (boss) {
    this.state = 'clear';
    this.timer = boss ? 4.4 : 2.6;
    this.clearEnemyBullets(true);
    for (const q of this.pods.slice()) Inv.killPod(this, q, true);
    this.ufo = null;
    let bonus = 0;
    if (this.perfect && !this.demo) bonus = boss ? 5000 : 500 + this.stage * 100;
    if (bonus) { this.addScore(bonus); A.sfx.perfect(); }
    if (!this.demo) A.sfx.stageClear();
    this.banner = { text: boss ? 'OVERLORD DESTROYED' : 'WAVE ' + this.stage + ' CLEARED', sub: bonus ? 'PERFECT  +' + U.fmt(bonus) : '', t: 0, life: this.timer - 0.2 };
  };

  Game.flow = function (dt) {
    if (this.over) return;
    switch (this.state) {
      case 'intro':
        this.timer -= dt;
        if (this.timer <= 0) { Inv.spawnWave(this, this.stage); this.state = 'play'; }
        break;
      case 'play':
        for (const q of this.inv) if (!q.dead && q.y + 13 >= C.PLAYER_Y - 20) { this.invade(); break; }
        if (!this.over && this.form && this.form.ready && !this.inv.some((q) => !q.dead)) this.beginClear(false);
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
    this.inv = this.inv.filter((q) => !q.dead);
  };

  /* ---------- rendering (logical 540x720 space) ---------- */
  Game.drawPlayer = function (ctx) {
    const p = this.player, spr = GFX.spr, SS = C.SHIP_SCALE;
    if (!p.alive) return;
    const blink = p.invuln > 0 ? (Math.floor(p.t * 16) % 2 ? 0.35 : 0.85) : 1;
    ctx.globalCompositeOperation = 'lighter';
    const fl = (16 + Math.random() * 8 + (I.fire ? 4 : 0)) * SS * 1.3;
    for (const sx of [-14 * SS, 14 * SS]) {
      const g = ctx.createLinearGradient(0, p.y + 33 * SS, 0, p.y + 33 * SS + fl);
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.3, 'rgba(70,225,255,0.8)'); g.addColorStop(1, 'rgba(40,80,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(p.x + sx - 2.5 + p.tilt * 5, p.y + 32 * SS); ctx.lineTo(p.x + sx + 2.5 + p.tilt * 5, p.y + 32 * SS); ctx.lineTo(p.x + sx + p.tilt * 12, p.y + 33 * SS + fl); ctx.closePath(); ctx.fill();
    }
    if (p.muzzle > 0) GFX.drawGlow(ctx, 'hsla(190,100%,65%,1)', p.x, p.y - 26, 16, 0.9);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < p.drones; i++) {
      const d = p.dpos[i];
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(150,100%,60%,1)', d.x, d.y + 7, 7, 0.8);
      ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, spr.drone, d.x, d.y, p.tilt * 0.6, 0.62, 0.62, blink);
    }
    GFX.draw(ctx, spr.player, p.x, p.y, p.tilt * 0.4, SS, SS, blink);
    ctx.globalCompositeOperation = 'lighter';
    GFX.drawGlow(ctx, 'hsla(190,100%,70%,1)', p.x, p.y + 2, 5, 1);
    if (p.shield > 0) {
      const low = p.shield < 3 && Math.floor(p.t * 8) % 2;
      ctx.globalAlpha = low ? 0.25 : 0.6 + Math.sin(p.t * 6) * 0.15;
      const g = ctx.createRadialGradient(p.x, p.y, 12, p.x, p.y, 28);
      g.addColorStop(0, 'rgba(80,190,255,0)'); g.addColorStop(0.75, 'rgba(80,190,255,0.25)'); g.addColorStop(1, 'rgba(180,235,255,0.9)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 28, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  Game.render = function (ctx) {
    const spr = GFX.spr;
    // planet line the invaders must not cross
    ctx.strokeStyle = 'rgba(255,90,90,' + (0.18 + 0.08 * Math.sin(this.time * 3)) + ')'; ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(0, C.PLAYER_Y - 20); ctx.lineTo(W, C.PLAYER_Y - 20); ctx.stroke(); ctx.setLineDash([]);
    Sh.draw(ctx, this);
    for (const k of this.pk) {
      const spin = 0.55 + 0.45 * Math.abs(Math.cos(k.t * 3.2));
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(' + (k.kind === 'W' ? 45 : k.kind === 'D' ? 150 : k.kind === 'S' ? 205 : 350) + ',100%,60%,1)', k.x, k.y, 28, 0.55 + Math.sin(k.t * 6) * 0.15);
      ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, spr.pick[k.kind], k.x, k.y, 0, spin * 0.85, 0.85);
    }
    Inv.draw(ctx, this);
    if (this.boss) G.boss.draw(ctx, this, this.boss);
    G.divers.draw(ctx, this);
    FX.drawNorm(ctx);
    for (const b of this.eb) {
      if (b.kind === 'needle') GFX.draw(ctx, spr.eneedle, b.x, b.y, Math.atan2(b.vy, b.vx) - Math.PI / 2);
      else if (b.kind === 'plunger') GFX.draw(ctx, spr.ebig, b.x, b.y, this.time * 5, 0.7, 0.7);
      else if (b.kind === 'big') GFX.draw(ctx, spr.ebig, b.x, b.y, this.time * 4);
      else GFX.draw(ctx, spr.eorb, b.x, b.y, 0, b.kind === 'wobble' ? 0.9 : 1, b.kind === 'wobble' ? 0.9 : 1);
    }
    for (const b of this.pb) GFX.draw(ctx, spr[b.kind], b.x, b.y, b.ang, 0.85, 0.85);
    this.drawPlayer(ctx);
    ctx.globalCompositeOperation = 'lighter';
    FX.drawAdd(ctx);
    ctx.globalCompositeOperation = 'source-over';
    FX.drawText(ctx);
  };
})((window.SGS = window.SGS || {}));
