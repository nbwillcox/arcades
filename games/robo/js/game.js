/* Core game state: hero movement and shooting, bullets, collisions, rescues, upgrades and wave flow. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, GFX = G.gfx, A = G.audio, I = G.input, Bt = G.bots, TAU = U.TAU;
  const W = C.W, H = C.H, CY = (C.AY0 + C.AY1) / 2;
  const Game = { state: 'title', demo: true, time: 0 };
  G.game = Game;

  function newPlayer() {
    return { x: W / 2, y: CY, vx: 0, vy: 0, ang: -Math.PI / 2, alive: true, tier: 1, shield: 0, rapid: 0, speed: 0, bombs: 0, fireCd: 0, invuln: 2.5, respawn: 0, t: 0, hitFlash: 0, muzzle: 0, moving: 0 };
  }

  Game.reset = function (demo, startWave) {
    this.demo = !!demo;
    this.score = 0; this.lives = C.START_LIVES; this.stage = 0; this.endless = false; this.won = false;
    this.combo = 0; this.comboT = 0; this.mult = 1;
    this.lifeIdx = 0; this.nextLifeAt = C.EXTRA_LIFE_AT[0];
    this.pb = []; this.eb = []; this.pk = []; this.en = []; this.col = [];
    this.meter = 0; this.chain = 0; this.saved = 0; this.pick = null;
    this.banner = null; this.timer = 0; this.over = false; this.overDone = false; this.perfect = true; this.world = 0;
    this.player = newPlayer();
    this.hi = G.scores.best();
    FX.reset();
    this.startStage(startWave || 1);
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
      this.banner = { text: 'EXTRA LIFE', sub: '', t: 0, life: 1.6, small: true };
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

  /* ---------- bullets ---------- */
  Game.ebullet = function (x, y, vx, vy, kind, r, extra) {
    if (this.eb.length > 48) return;
    const b = { x, y, vx, vy, kind: kind || 'spark', r: r || 5, life: 4, dead: false, t: 0 };
    if (extra) Object.assign(b, extra);
    this.eb.push(b);
  };
  Game.clearEnemyBullets = function (fxOn) {
    if (fxOn) for (const b of this.eb) FX.sparks(b.x, b.y, 2, 80, 'hsla(320,100%,65%,1)', 0.3, 1.2);
    this.eb.length = 0;
  };
  Game.pbullet = function (x, y, vx, vy, dmg, kind, pierce, life) {
    this.pb.push({ x, y, vx, vy, ang: Math.atan2(vy, vx) + Math.PI / 2, dmg, kind, pierce: !!pierce, hit: pierce ? [] : null, r: kind === 'lance' ? 4.5 : 3.4, life: life || C.BULLET_LIFE, dead: false });
  };

  /* ---------- crates ---------- */
  Game.randomKind = function () {
    const p = this.player;
    const w = { W: p.tier >= C.MAX_TIER ? 0.6 : 3, R: 2.4, V: 2, S: 2, B: p.bombs >= C.MAX_BOMBS ? 0.5 : 1.3 };
    let tot = 0; for (const k in w) tot += w[k];
    let r = Math.random() * tot;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'W';
  };
  Game.dropPickup = function (x, y, kind) {
    const a = Math.random() * TAU;
    this.pk.push({ x, y, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26, kind: kind || this.randomKind(), t: 0, life: 11, dead: false });
  };
  Game.applyUpgrade = function (kind, x, y) {
    const p = this.player;
    if (kind === 'W') {
      if (p.tier < C.MAX_TIER) { p.tier++; A.sfx.weaponUp(); FX.text(p.x, p.y - 30, p.tier === C.MAX_TIER ? 'PIERCING LANCES!' : 'WEAPON UP', '#ffe27a', 16); }
      else { this.award(1000, x, y); A.sfx.pickup(); }
    } else if (kind === 'R') { p.rapid = C.RAPID_TIME; A.sfx.pickup(); FX.text(p.x, p.y - 30, 'RAPID FIRE', '#ff9ad8', 16); }
    else if (kind === 'V') { p.speed = C.SPEED_TIME; A.sfx.pickup(); FX.text(p.x, p.y - 30, 'SPEED BOOST', '#9bffd0', 16); }
    else if (kind === 'S') { p.shield = C.SHIELD_TIME; A.sfx.shield(); FX.text(p.x, p.y - 30, 'SHIELD', '#8fd4ff', 16); }
    else if (p.bombs < C.MAX_BOMBS) { p.bombs++; A.sfx.bombPickup(); FX.text(p.x, p.y - 30, 'SMART BOMB', '#ffb28a', 16); }
    else { this.award(1000, x, y); A.sfx.pickup(); }
  };
  Game.collect = function (pk) {
    FX.sparks(pk.x, pk.y, 12, 170, FX.col(50), 0.5);
    FX.ring(pk.x, pk.y, 6, 36, 'hsla(50,100%,70%,1)', 0.35, 2);
    this.applyUpgrade(pk.kind, pk.x, pk.y);
    this.addScore(200);
  };

  /* ---------- colonists ---------- */
  Game.rescue = function (c) {
    c.dead = true;
    this.chain = Math.min(5, this.chain + 1);
    const v = this.chain * 1000;
    this.addScore(v); this.saved++;
    FX.ring(c.x, c.y, 5, 34, 'hsla(185,100%,70%,1)', 0.4, 2.5); FX.sparks(c.x, c.y, 10, 150, FX.col(185), 0.5);
    FX.text(c.x, c.y - 18, '+' + U.fmt(v), '#7dfffa', 18);
    A.sfx.rescue(this.chain);
    this.meter++;
    if (this.meter >= C.PICK_EVERY && !this.demo) { this.meter = 0; this.openPick(); }
  };
  Game.colonistLost = function (c) {
    FX.sparks(c.x, c.y, 8, 120, 'hsla(0,100%,60%,1)', 0.5); FX.text(c.x, c.y - 14, 'LOST', '#ff6a6a', 13);
    A.sfx.humanDie(); this.perfect = false;
  };

  /* free upgrade pick: freezes the action while the player chooses 1 of 3 */
  Game.openPick = function () {
    const p = this.player, pool = ['W', 'R', 'V', 'S', 'B'].filter((k) => !(k === 'W' && p.tier >= C.MAX_TIER) && !(k === 'B' && p.bombs >= C.MAX_BOMBS));
    const opts = [];
    while (opts.length < 3 && pool.length) opts.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    this.pick = { opts, t: 0, prev: this.state };
    this.state = 'pick';
    A.sfx.weaponUp();
  };
  Game.cardRects = function () {
    const n = this.pick ? this.pick.opts.length : 3, cw = 190, gap = 26, x0 = W / 2 - (n * cw + (n - 1) * gap) / 2;
    return this.pick ? this.pick.opts.map((k, i) => ({ k, x: x0 + i * (cw + gap), y: 170, w: cw, h: 200 })) : [];
  };
  Game.updatePick = function (dt) {
    const pk = this.pick;
    pk.t += dt;
    let n = I.takePick();
    const clk = I.takeClick();
    if (clk && pk.t > 0.25) { const r = this.cardRects().findIndex((c) => clk.x >= c.x && clk.x <= c.x + c.w && clk.y >= c.y && clk.y <= c.y + c.h); if (r >= 0) n = r + 1; }
    if (n >= 1 && n <= pk.opts.length && pk.t > 0.2) {
      const kind = pk.opts[n - 1];
      this.pick = null; this.state = pk.prev;
      I.fire = false;
      this.applyUpgrade(kind, this.player.x, this.player.y);
    }
  };

  /* ---------- hits, death, respawn ---------- */
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
    this.killPlayer();
    return true;
  };
  Game.killPlayer = function () {
    const p = this.player;
    p.alive = false;
    FX.explosion(p.x, p.y, 2.6, 190); FX.explosion(p.x, p.y, 1.6, 320);
    A.sfx.playerDie(); FX.doFlash(0.45, '255,190,190'); FX.addShake(10);
    p.tier = Math.max(1, p.tier - 1); p.shield = 0; p.rapid = 0; p.speed = 0;
    this.lives--; this.perfect = false; this.breakCombo();
    this.clearEnemyBullets(true);
    if (this.lives <= 0) { this.over = true; this.overT = 2.4; A.music('off'); setTimeout(() => A.sfx.gameOver(), 700); }
    else p.respawn = 1.7;
  };
  function respawn(g, p) {
    Object.assign(p, { x: W / 2, y: CY, vx: 0, vy: 0, alive: true, invuln: 2.6, fireCd: 0, ang: -Math.PI / 2 });
    // shove nearby robots back so the hero never reappears inside a swarm
    for (const e of g.en) {
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < 120) { const k = (120 - d) / d; e.x += dx * k; e.y += dy * k; if (e.type === 'bulwark') e.stun = 1; }
    }
    FX.ring(p.x, p.y, 8, 90, 'hsla(190,100%,70%,1)', 0.5, 3);
  }
  Game.bomb = function () {
    const p = this.player;
    if (!p.alive || p.bombs <= 0 || this.state !== 'play') return;
    p.bombs--;
    FX.ring(p.x, p.y, 10, 520, 'hsla(25,100%,70%,1)', 0.7, 6); FX.ring(p.x, p.y, 6, 380, 'hsla(50,100%,80%,1)', 0.5, 3);
    FX.doFlash(0.6, '255,230,190'); FX.addShake(12); A.sfx.bomb();
    this.clearEnemyBullets(true);
    Bt.bombAll(this);
  };

  /* ---------- hero ---------- */
  const RATE = [0, 8, 8.5, 9, 10];
  Game.firePlayer = function (p, a) {
    const dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx, sp = C.BULLET_SPEED;
    const shot = (off, da, dmg, kind, pierce, v, life) => {
      const aa = a + da;
      this.pbullet(p.x + dx * 15 + px * off, p.y + dy * 15 + py * off, Math.cos(aa) * v, Math.sin(aa) * v, dmg, kind, pierce, life);
    };
    if (p.tier === 1) shot(0, 0, 1, 'bolt', false, sp);
    else if (p.tier === 2) { shot(-4.5, 0, 1, 'bolt', false, sp); shot(4.5, 0, 1, 'bolt', false, sp); }
    else if (p.tier === 3) { shot(0, 0, 1, 'bolt', false, sp); shot(-3, -0.15, 1, 'bolt', false, sp); shot(3, 0.15, 1, 'bolt', false, sp); }
    else { shot(-4, 0, 1.5, 'lance', true, sp * 1.1, 1.2); shot(4, 0, 1.5, 'lance', true, sp * 1.1, 1.2); shot(-8, -0.2, 1, 'bolt', false, sp); shot(8, 0.2, 1, 'bolt', false, sp); }
    p.fireCd = 1 / (RATE[p.tier] * (p.rapid > 0 ? 1.7 : 1));
    p.muzzle = 0.06;
    A.sfx.shoot(p.tier);
  };

  Game.updatePlayer = function (dt) {
    const p = this.player;
    p.t += dt;
    if (p.hitFlash > 0) p.hitFlash -= dt;
    if (p.muzzle > 0) p.muzzle -= dt;
    if (!p.alive) {
      p.respawn -= dt;
      if (p.respawn <= 0 && this.lives > 0 && !this.over) respawn(this, p);
      return;
    }
    let mx = 0, my = 0, aim = p.ang, fire = false, bomb = false;
    if (this.demo) { const c = this.autopilot(); mx = c.mx; my = c.my; aim = c.aim; fire = c.fire; }
    else {
      const m = I.move(), ar = I.arrows();
      mx = m.x; my = m.y;
      if (ar.x || ar.y) { aim = Math.atan2(ar.y, ar.x); fire = true; }
      else { if (I.mouseSeen) aim = Math.atan2(I.mouseY - p.y, I.mouseX - p.x); fire = I.fire; }
      bomb = I.takeBomb();
    }
    p.ang = aim;
    const l = Math.hypot(mx, my), spd = C.PLAYER_SPEED * (p.speed > 0 ? 1.4 : 1);
    const tx = l > 0 ? mx / l * spd : 0, ty = l > 0 ? my / l * spd : 0, k = Math.min(1, 16 * dt);
    p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
    p.x = U.clamp(p.x + p.vx * dt, C.AX0 + C.PLAYER_R, C.AX1 - C.PLAYER_R);
    p.y = U.clamp(p.y + p.vy * dt, C.AY0 + C.PLAYER_R, C.AY1 - C.PLAYER_R);
    p.moving = l > 0 ? 1 : 0;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.shield > 0) p.shield -= dt;
    if (p.rapid > 0) p.rapid -= dt;
    if (p.speed > 0) p.speed -= dt;
    p.fireCd = Math.max(0, p.fireCd - dt);
    if (fire && p.fireCd <= 0) this.firePlayer(p, p.ang);
    if (bomb) this.bomb();
    if (l > 0 && p.speed > 0 && (!S.reduced || Math.random() < 0.4)) FX.trail(p.x - p.vx * 0.03, p.y - p.vy * 0.03, 'hsla(150,100%,60%,1)', U.rand(4, 7), 0.18);
  };

  /* attract-mode pilot: steer away from trouble, grab colonists when it is safe, shoot the nearest robot */
  Game.autopilot = function () {
    const p = this.player;
    let tx = 0, ty = 0, near = null, nd = 1e9;
    for (const e of this.en) {
      if (e.dead || e.spawn > 0) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy), gap = d - e.r;
      if (gap < 150) { const k = (150 - gap) / 150; tx -= dx / d * k * 2; ty -= dy / d * k * 2; }
      if (e.type !== 'bulwark' && d < nd) { nd = d; near = { e, dx, dy, d }; }
    }
    for (const b of this.eb) { const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy); if (d < 110) { tx -= dx / d; ty -= dy / d; } }
    if (Math.hypot(tx, ty) < 0.4) {
      let best = null, bd = 1e9;
      for (const c of this.col) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
      if (best) { tx += (best.x - p.x) / bd * 0.7; ty += (best.y - p.y) / bd * 0.7; }
    }
    // stay off the walls
    if (p.x < C.AX0 + 60) tx += 1; if (p.x > C.AX1 - 60) tx -= 1; if (p.y < C.AY0 + 60) ty += 1; if (p.y > C.AY1 - 60) ty -= 1;
    const m = Math.hypot(tx, ty);
    let aim = p.ang, fire = false;
    if (near) { const t = Math.min(0.5, near.d / 700); aim = Math.atan2(near.dy - p.vy * t, near.dx - p.vx * t); fire = near.d < 420; }
    return { mx: m > 0.2 ? tx / Math.max(1, m) : 0, my: m > 0.2 ? ty / Math.max(1, m) : 0, aim, fire };
  };

  /* ---------- collisions ---------- */
  Game.collide = function () {
    const p = this.player;
    for (const b of this.pb) {
      if (b.dead) continue;
      for (const m of this.eb) {
        if (m.kind !== 'missile' || m.dead) continue;
        const rr = m.r + b.r + 2;
        if ((m.x - b.x) * (m.x - b.x) + (m.y - b.y) * (m.y - b.y) < rr * rr) { m.dead = true; FX.explosion(m.x, m.y, 0.6, 8); A.sfx.hit(); if (!b.pierce) { b.dead = true; break; } }
      }
      if (b.dead) continue;
      for (const e of this.en) {
        if (e.dead || e.spawn > 0) continue;
        const rr = e.r + b.r;
        if ((e.x - b.x) * (e.x - b.x) + (e.y - b.y) * (e.y - b.y) >= rr * rr) continue;
        if (b.pierce) { if (b.hit.indexOf(e.id) >= 0) continue; b.hit.push(e.id); }
        Bt.damage(this, e, b.dmg, b);
        if (!b.pierce || e.type === 'bulwark') { b.dead = true; break; }
      }
    }
    if (!p.alive) return;
    const pr = C.PLAYER_R * 0.85;
    for (const b of this.eb) {
      const rr = b.r + pr;
      if (!b.dead && (b.x - p.x) * (b.x - p.x) + (b.y - p.y) * (b.y - p.y) < rr * rr) { b.dead = true; this.hitPlayer(); if (!p.alive) return; }
    }
    for (const e of this.en) {
      if (e.dead || e.spawn > 0) continue;
      const rr = e.r + pr;
      if ((e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y) < rr * rr) {
        if (this.hitPlayer() && p.alive) { if (e.type === 'bulwark') { const a = Math.atan2(e.y - p.y, e.x - p.x); e.kx += Math.cos(a) * 300; e.ky += Math.sin(a) * 300; e.stun = 1; } else Bt.kill(this, e); }
        if (!p.alive) return;
      }
    }
    for (const c of this.col) {
      if (!c.dead && !(c.conv > 0) && (c.x - p.x) * (c.x - p.x) + (c.y - p.y) * (c.y - p.y) < 15 * 15) this.rescue(c);
    }
    this.col = this.col.filter((c) => !c.dead);
    for (const k of this.pk) {
      if (!k.dead && (k.x - p.x) * (k.x - p.x) + (k.y - p.y) * (k.y - p.y) < 24 * 24) { k.dead = true; this.collect(k); }
    }
  };

  function stepPb(g, dt) {
    const a = g.pb;
    for (let i = a.length - 1; i >= 0; i--) {
      const b = a[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.x < C.AX0 || b.x > C.AX1 || b.y < C.AY0 || b.y > C.AY1) { if (!b.dead) FX.sparks(U.clamp(b.x, C.AX0, C.AX1), U.clamp(b.y, C.AY0, C.AY1), 2, 90, 'hsla(190,100%,75%,1)', 0.2, 1.2); b.dead = true; }
      if (b.dead || b.life <= 0) { a[i] = a[a.length - 1]; a.pop(); }
    }
  }
  function stepEb(g, dt) {
    const a = g.eb, p = g.player;
    for (let i = a.length - 1; i >= 0; i--) {
      const b = a[i];
      b.t += dt; b.life -= dt;
      if (b.kind === 'missile' && p.alive) {
        const cur = Math.atan2(b.vy, b.vx);
        let d = Math.atan2(p.y - b.y, p.x - b.x) - cur;
        while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        const na = cur + U.clamp(d, -b.turn * dt, b.turn * dt);
        b.vx = Math.cos(na) * b.spd; b.vy = Math.sin(na) * b.spd;
        if (Math.random() < 0.3) FX.trail(b.x, b.y, 'hsla(10,100%,60%,1)', 4, 0.2);
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.kind === 'shell') {
        if (b.x < C.AX0 + b.r || b.x > C.AX1 - b.r) { b.x = U.clamp(b.x, C.AX0 + b.r, C.AX1 - b.r); b.vx = -b.vx; b.bounce--; }
        if (b.y < C.AY0 + b.r || b.y > C.AY1 - b.r) { b.y = U.clamp(b.y, C.AY0 + b.r, C.AY1 - b.r); b.vy = -b.vy; b.bounce--; }
        if (b.bounce < 0) b.dead = true;
      } else if (b.x < C.AX0 - 10 || b.x > C.AX1 + 10 || b.y < C.AY0 - 10 || b.y > C.AY1 + 10) b.dead = true;
      if (b.dead || b.life <= 0) { a[i] = a[a.length - 1]; a.pop(); }
    }
  }

  Game.update = function (dt) {
    this.time += dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.breakCombo(); }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    if (this.state === 'pick') { this.updatePick(dt); FX.update(dt); return; }
    this.updatePlayer(dt);
    stepPb(this, dt);
    Bt.update(this, dt);
    stepEb(this, dt);
    for (const k of this.pk) {
      k.t += dt; k.life -= dt; k.x += k.vx * dt; k.y += k.vy * dt;
      if (k.x < C.AX0 + 14 || k.x > C.AX1 - 14) { k.vx = -k.vx; k.x = U.clamp(k.x, C.AX0 + 14, C.AX1 - 14); }
      if (k.y < C.AY0 + 14 || k.y > C.AY1 - 14) { k.vy = -k.vy; k.y = U.clamp(k.y, C.AY0 + 14, C.AY1 - 14); }
      if (k.life <= 0) k.dead = true;
    }
    this.pk = this.pk.filter((k) => !k.dead);
    this.collide();
    FX.update(dt);
    this.flow(dt);
    if (this.over) {
      this.overT -= dt;
      if (this.overT <= 0) {
        if (this.demo) { this.reset(true, U.randInt(1, 12)); this.player.tier = U.randInt(1, 3); }
        else if (!this.overDone) { this.overDone = true; if (this.onOver) this.onOver(); }
      }
    }
  };

  /* ---------- wave flow ---------- */
  Game.startStage = function (n) {
    this.stage = n; this.perfect = true; this.chain = 0;
    this.world = Math.floor((n - 1) / 8) % 5;
    this.clearEnemyBullets(false);
    this.pk = []; this.pb = [];
    Bt.spawnWave(this, n);
    this.state = 'play';
    const first = (n - 1) % 8 === 0, name = GFX.art.WORLDS[this.world].name;
    const sub = n === C.FINAL_WAVE && !this.endless ? 'FINAL WAVE' : n === 1 ? 'RESCUE THE COLONISTS' : first ? name : '';
    this.banner = { text: 'WAVE ' + n, sub, t: 0, life: 1.9 };
    if (!this.demo) A.music(n === C.FINAL_WAVE && !this.endless ? 'boss' : 'play', n >= 6 ? 2 : 1, [0, 2, -2, 3, 5][this.world]);
  };

  Game.beginClear = function () {
    this.state = 'clear';
    this.clearEnemyBullets(true);
    for (const e of this.en) FX.explosion(e.x, e.y, 0.9, Bt.TYPES[e.type].hue);
    this.en = [];
    let bonus = this.demo ? 0 : this.col.length * 500;
    for (const c of this.col) { FX.ring(c.x, c.y, 5, 30, 'hsla(185,100%,70%,1)', 0.4, 2); FX.sparks(c.x, c.y, 8, 130, FX.col(185), 0.5); }
    this.col = [];
    const perfect = this.perfect && !this.demo ? 500 + this.stage * 100 : 0;
    bonus += perfect;
    if (bonus) { this.addScore(bonus); if (perfect) A.sfx.perfect(); }
    if (!this.demo) A.sfx.stageClear();
    const win = this.stage >= C.FINAL_WAVE && !this.endless && !this.demo;
    this.timer = win ? 3.4 : 2.6;
    this.banner = { text: win ? 'SECTOR LIBERATED' : 'WAVE ' + this.stage + ' CLEARED', sub: bonus ? (perfect ? 'PERFECT  +' : 'SURVIVOR BONUS  +') + U.fmt(bonus) : '', t: 0, life: this.timer - 0.2 };
    this.winning = win;
  };

  Game.flow = function (dt) {
    if (this.over) return;
    if (this.state === 'play') { if (Bt.remaining(this) === 0) this.beginClear(); }
    else if (this.state === 'clear') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.winning) { this.winning = false; this.won = true; this.state = 'won'; if (this.onWin) this.onWin(); }
        else this.startStage(this.stage + 1);
      }
    }
  };
  Game.continueEndless = function () {
    this.endless = true; this.won = false;
    this.startStage(this.stage + 1);
  };

  /* ---------- rendering (logical 960x540 space) ---------- */
  Game.hasBackdrop = true;
  Game.drawBackdrop = function (ctx) {
    ctx.drawImage(GFX.art.backdrop(this.world), 0, 0, W, H);
    GFX.art.overlay(ctx, this.time, this.world);
  };

  function drawHero(ctx, p) {
    const spr = GFX.spr, blink = p.invuln > 0 ? (Math.floor(p.t * 16) % 2 ? 0.35 : 0.85) : 1, rot = p.ang + Math.PI / 2;
    ctx.globalCompositeOperation = 'lighter';
    GFX.drawGlow(ctx, p.speed > 0 ? 'hsla(150,100%,60%,1)' : 'hsla(190,100%,60%,1)', p.x, p.y, 15, 0.38);
    if (p.muzzle > 0) GFX.drawGlow(ctx, p.rapid > 0 ? 'hsla(320,100%,65%,1)' : 'hsla(190,100%,65%,1)', p.x + Math.cos(p.ang) * 17, p.y + Math.sin(p.ang) * 17, 13, 0.9);
    ctx.globalCompositeOperation = 'source-over';
    const bob = p.moving ? 1 + Math.sin(p.t * 22) * 0.04 : 1;
    GFX.draw(ctx, spr.player, p.x, p.y, rot, 0.86 * bob, 0.86, blink);
    if (p.shield > 0) {
      const low = p.shield < 3 && Math.floor(p.t * 8) % 2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = low ? 0.25 : 0.6 + Math.sin(p.t * 6) * 0.15;
      const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 23);
      g.addColorStop(0, 'rgba(80,190,255,0)'); g.addColorStop(0.75, 'rgba(80,190,255,0.25)'); g.addColorStop(1, 'rgba(180,235,255,0.9)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 23, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  Game.render = function (ctx) {
    const spr = GFX.spr;
    Bt.drawColonists(ctx, this);
    for (const k of this.pk) {
      const spin = 0.55 + 0.45 * Math.abs(Math.cos(k.t * 3.2)), fade = k.life < 3 ? (Math.floor(k.t * 8) % 2 ? 0.4 : 1) : 1;
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(' + GFX.art.PICK[k.kind].hue + ',100%,60%,1)', k.x, k.y, 28, (0.55 + Math.sin(k.t * 6) * 0.15) * fade);
      ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, spr.pick[k.kind], k.x, k.y, 0, spin * 0.85, 0.85, fade);
    }
    Bt.draw(ctx, this);
    FX.drawNorm(ctx);
    for (const b of this.eb) {
      if (b.kind === 'missile') GFX.draw(ctx, spr.missile, b.x, b.y, Math.atan2(b.vy, b.vx) + Math.PI / 2, 0.9, 0.9);
      else if (b.kind === 'shell') GFX.draw(ctx, spr.shell, b.x, b.y, b.t * 6, 0.85, 0.85);
      else GFX.draw(ctx, spr.spark, b.x, b.y, 0, 0.85, 0.85);
    }
    for (const b of this.pb) GFX.draw(ctx, spr[b.kind], b.x, b.y, b.ang, 0.8, 0.8);
    if (this.player.alive) drawHero(ctx, this.player);
    ctx.globalCompositeOperation = 'lighter';
    FX.drawAdd(ctx);
    ctx.globalCompositeOperation = 'source-over';
    FX.drawText(ctx);
  };
})((window.SGS = window.SGS || {}));
