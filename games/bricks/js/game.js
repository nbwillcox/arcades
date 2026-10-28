/* Core game state: paddle, balls, bricks, capsules, drifters, boss and level flow. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, GFX = G.gfx, A = G.audio, I = G.input, Lv = G.levels, Bo = G.boss, TAU = U.TAU;
  const W = C.W, H = C.H;
  const Game = { state: 'title', demo: true, time: 0 };
  G.game = Game;

  Game.reset = function (demo, startLevel) {
    this.demo = !!demo;
    this.score = 0; this.lives = C.START_LIVES; this.level = 0;
    this.combo = 0; this.comboT = 0; this.mult = 1;
    this.lifeIdx = 0; this.nextLifeAt = C.EXTRA_LIFE_AT[0];
    this.bricks = []; this.balls = []; this.caps = []; this.shots = []; this.ebs = []; this.drifters = [];
    this.boss = null; this.banner = null; this.net = false; this.timer = 0; this.over = false; this.overDone = false; this.world = 0;
    this.paddle = { x: W / 2, y: C.PADDLE_Y, w: C.PADDLE_W, laser: 0, sticky: 0, big: 0, slow: 0, fire: 0, cd: 0, invuln: 0, t: 0, flash: 0 };
    this.hi = G.scores.best();
    FX.reset();
    this.startLevel(startLevel || 1);
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
    if (x !== undefined && base >= 100) FX.text(x, y - 14, '+' + U.fmt(v), this.mult > 1 ? '#ffd24a' : '#ffffff', base >= 1000 ? 22 : 14);
  };
  Game.breakCombo = function () { this.combo = 0; this.comboT = 0; this.mult = 1; };
  Game.comboHit = function () {
    this.combo++;
    const m = Math.min(8, 1 + Math.floor(this.combo / 5));
    if (m > this.mult) { this.mult = m; FX.text(this.paddle.x, this.paddle.y - 36, 'COMBO x' + m, '#ffd24a', 20); A.sfx.combo(m); }
  };

  /* ---------- level setup ---------- */
  Game.startLevel = function (n) {
    const P = this.paddle, lv = Lv.generate(n);
    this.level = n; this.world = Lv.worldOf(n); this.lvName = lv.name;
    this.bricks = lv.bricks.map((b) => Object.assign(b, { x: C.BX0 + b.c * C.PX, y: C.BY0 + b.r * C.PY, w: C.BW, h: C.BH, dead: false, flash: 0, fuse: -1 }));
    this.caps = []; this.shots = []; this.ebs = []; this.drifters = []; this.balls = [];
    this.boss = lv.boss ? Bo.create(this, n) : null;
    P.laser = P.sticky = P.big = P.slow = P.fire = 0; P.invuln = 0; this.net = false;
    this.speedBoost = 0; this.hitCount = 0; this.idleT = 0; this.noMiss = true; this.driftT = U.rand(7, 11); this.warped = false;
    this.newBall();
    this.state = 'play';
    if (lv.boss) {
      this.banner = { text: 'WARNING', sub: this.boss.name, t: 0, life: 2.6, warn: true };
      if (!this.demo) { A.sfx.warning(); A.music('boss', 3, [0, 2, -2, 3, 5][this.world]); }
    } else {
      this.banner = { text: 'LEVEL ' + n, sub: lv.name, t: 0, life: 1.8 };
      if (!this.demo) A.music('play', n >= 6 ? 2 : 1, [0, 2, -2, 3, 5][this.world]);
    }
  };
  Game.newBall = function () {
    const P = this.paddle;
    this.balls.push({ x: P.x, y: P.y - C.PADDLE_H / 2 - C.BALL_R - 0.5, vx: 0, vy: 0, stuck: true, so: 0, held: 0 });
  };
  Game.ballSpeed = function () {
    const base = 300 + Math.min(150, (this.level - 1) * 7) + this.speedBoost;
    return base * (this.paddle.slow > 0 ? 0.7 : 1) * (this.boss ? 0.92 : 1);
  };
  Game.release = function (b) {
    const P = this.paddle, off = U.clamp(b.so / (P.w / 2), -1, 1), a = Math.abs(off) < 0.08 ? U.rand(-0.18, 0.18) : off * 0.95, sp = this.ballSpeed();
    b.stuck = false; b.vx = Math.sin(a) * sp; b.vy = -Math.cos(a) * sp;
    A.sfx.launch();
  };

  /* ---------- capsules ---------- */
  Game.pickCap = function () {
    const w = { E: 3, C: 2.4, L: 2.4, S: 1.8, M: 2.6, F: 1.6, N: 1.8, B: 1.3 };
    if (!this.boss && this.bricks.filter((b) => !b.dead && b.type !== 'gold').length > 20) w.W = 0.35;
    if (this.lives < 9) w.U = 0.45;
    let tot = 0; for (const k in w) tot += w[k];
    let r = Math.random() * tot;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'E';
  };
  Game.maybeDrop = function (x, y, chance) {
    if (this.caps.length >= 4 || Math.random() >= (chance === undefined ? C.DROP_CHANCE : chance)) return;
    this.caps.push({ x, y, vy: 105, kind: this.pickCap(), t: 0 });
  };
  Game.applyCap = function (kind, x, y) {
    const P = this.paddle, nm = GFX.art.CAPS[kind].name;
    if (kind === 'L') { P.laser = C.LASER_T; P.sticky = 0; }
    else if (kind === 'C') { P.sticky = C.CATCH_T; P.laser = 0; }
    else if (kind === 'E') P.big = C.BIG_T;
    else if (kind === 'S') P.slow = C.SLOW_T;
    else if (kind === 'F') P.fire = C.FIRE_T;
    else if (kind === 'N') this.net = true;
    else if (kind === 'M') {
      const add = [];
      for (const b of this.balls) {
        if (b.stuck || this.balls.length + add.length >= 9) continue;
        for (const da of [-0.42, 0.42]) { const c = Math.cos(da), s = Math.sin(da); add.push({ x: b.x, y: b.y, vx: b.vx * c - b.vy * s, vy: b.vx * s + b.vy * c, stuck: false, so: 0 }); }
      }
      this.balls.push(...add);
    } else if (kind === 'B') {
      const src = this.balls.filter((b) => !b.stuck);
      if (!src.length) src.push({ x: P.x, y: P.y - 40 });
      for (const b of src) this.blastAt(b.x, b.y, 105, 3);
    } else if (kind === 'W') this.warp();
    else if (kind === 'U') { this.lives = Math.min(9, this.lives + 1); A.sfx.extraLife(); }
    A.sfx.capsule();
    FX.text(P.x, P.y - 34, nm, '#ffffff', 15);
    FX.sparks(x, y, 10, 150, FX.col(GFX.art.CAPS[kind].hue), 0.45);
    this.addScore(100);
  };
  Game.blastAt = function (x, y, r, dmg) {
    FX.ring(x, y, 8, r * 1.2, 'hsla(40,100%,70%,1)', 0.5, 4); FX.ring(x, y, 4, r * 0.8, 'hsla(20,100%,70%,1)', 0.4, 2.5);
    FX.sparks(x, y, 14, 220, FX.col(35), 0.5); FX.addShake(5); A.sfx.blast();
    for (const b of this.bricks) {
      if (b.dead || b.type === 'gold') continue;
      if (Math.hypot(b.x + b.w / 2 - x, b.y + b.h / 2 - y) < r + 18) this.hitBrick(b, dmg);
    }
    for (const d of this.drifters) if (!d.dead && Math.hypot(d.x - x, d.y - y) < r + d.r) this.killDrifter(d);
    if (this.boss) Bo.bombHit(this, this.boss, x, y, r, dmg);
  };
  Game.warp = function () {
    if (this.state !== 'play') return;
    for (const b of this.bricks) if (!b.dead && b.type !== 'gold') { b.dead = true; FX.sparks(b.x + b.w / 2, b.y + b.h / 2, 3, 110, FX.col(b.hue), 0.4); }
    if (this.boss && this.boss.state !== 'done') { this.boss.state = 'done'; FX.explosion(this.boss.x, this.boss.y, 3, this.boss.hue); }
    A.sfx.warp();
    this.warped = true;
  };

  /* ---------- bricks ---------- */
  Game.hitBrick = function (b, dmg) {
    if (b.dead) return;
    if (b.type === 'gold') { b.flash = 0.12; A.sfx.clink(); FX.sparks(b.x + b.w / 2, b.y + b.h / 2, 2, 90, 'hsla(48,100%,70%,1)', 0.2, 1.2); return; }
    b.hp -= dmg; b.flash = 0.1; this.idleT = 0;
    this.hitCount++;
    if (this.hitCount % 14 === 0 && this.speedBoost < 70) this.speedBoost += 5;
    this.comboHit();
    if (b.hp <= 0) this.destroyBrick(b);
    else { A.sfx.armor(); FX.sparks(b.x + b.w / 2, b.y + b.h / 2, 3, 100, 'hsla(210,30%,80%,1)', 0.25, 1.3); this.award(30, b.x, b.y); }
  };
  Game.destroyBrick = function (b) {
    if (b.dead) return;
    b.dead = true; b.fuse = -1;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, hue = b.type === 'explosive' ? 12 : b.hue;
    FX.sparks(cx, cy, 8, 170, FX.col(hue), 0.5, 1.8); FX.ring(cx, cy, 4, 24, FX.col(hue, 70), 0.3, 2);
    this.award(b.type === 'armored' ? 100 * b.maxhp : b.type === 'explosive' ? 150 : 50, cx, cy);
    A.sfx.brick(this.combo);
    this.maybeDrop(cx, cy);
    if (b.type === 'explosive') {
      FX.explosion(cx, cy, 1.4, 20); A.sfx.blast();
      for (const o of this.bricks) {
        if (o.dead || o === b || o.type === 'gold' || o.fuse >= 0) continue;
        const d = Math.hypot(o.x - b.x, o.y - b.y);
        if (d < 100) o.fuse = 0.07 + d / 650;
      }
    }
  };

  /* ---------- drifters and enemy bolts ---------- */
  Game.spawnDrifter = function (x, y) {
    this.drifters.push({ x: x === undefined ? U.rand(C.AX0 + 60, C.AX1 - 60) : x, y: y === undefined ? C.AY0 + 8 : y, t: 0, ph: U.rand(0, TAU), r: 13, dead: false });
  };
  Game.killDrifter = function (d) {
    if (d.dead) return;
    d.dead = true; FX.explosion(d.x, d.y, 1.1, 320); A.sfx.kill(0);
    this.award(200, d.x, d.y); this.maybeDrop(d.x, d.y, 0.2);
  };
  Game.ebolt = function (x, y, vx, vy) {
    if (this.ebs.length > 14) return;
    this.ebs.push({ x, y, vx, vy, dead: false });
  };
  Game.clearBolts = function (fxOn) {
    if (fxOn) for (const b of this.ebs) FX.sparks(b.x, b.y, 2, 80, 'hsla(320,100%,65%,1)', 0.3, 1.2);
    this.ebs.length = 0;
  };

  /* ---------- paddle ---------- */
  Game.updatePaddle = function (dt) {
    const P = this.paddle;
    P.t += dt;
    for (const k of ['laser', 'sticky', 'big', 'slow', 'fire']) if (P[k] > 0) P[k] -= dt;
    if (P.invuln > 0) P.invuln -= dt;
    if (P.flash > 0) P.flash -= dt;
    if (P.cd > 0) P.cd -= dt;
    P.w += (C.PADDLE_W * (P.big > 0 ? 1.5 : 1) - P.w) * Math.min(1, 9 * dt);
    let want = null, launch = false, fire = false;
    if (this.demo) { want = this.autoAim(dt); launch = this.autoLaunch(dt); fire = P.laser > 0; }
    else {
      const d = I.dir();
      if (d) P.x += d * 640 * dt; else if (I.mouseSeen && I.mouseActive) want = I.mouseX;
      launch = I.takeLaunch(); fire = I.fire;
    }
    if (want !== null) P.x += U.clamp(want - P.x, -1900 * dt, 1900 * dt);
    P.x = U.clamp(P.x, C.AX0 + P.w / 2, C.AX1 - P.w / 2);
    if (launch) for (const b of this.balls) if (b.stuck) this.release(b);
    if (fire && P.laser > 0 && P.cd <= 0 && this.state === 'play') {
      P.cd = 0.24;
      for (const sx of [-0.36, 0.36]) this.shots.push({ x: P.x + sx * P.w, y: P.y - 16, vy: -640, dead: false });
      A.sfx.shoot(1);
    }
  };

  /* attract-mode paddle: tracks where the ball will land (with a wobble so it sometimes misses) */
  Game.autoAim = function () {
    const P = this.paddle;
    let tgt = null;
    for (const b of this.balls) if (!b.stuck && b.vy > 0 && (!tgt || b.y > tgt.y)) tgt = b;
    if (!tgt) tgt = this.balls.find((b) => !b.stuck) || this.balls[0];
    for (const c of this.caps) if (c.y > 330 && (!tgt || tgt.vy < 0 || tgt.y < 300)) return c.x;
    if (!tgt) return P.x;
    let x = tgt.x;
    if (!tgt.stuck && tgt.vy > 0) {
      x += tgt.vx / tgt.vy * (P.y - tgt.y);
      const L = C.AX0 + 8, R = C.AX1 - 8, span = R - L;
      x = (((x - L) % (2 * span)) + 2 * span) % (2 * span); if (x > span) x = 2 * span - x; x += L;
    }
    return x + Math.sin(this.time * 0.9) * P.w * 0.34;
  };
  Game.autoLaunch = function (dt) {
    const b = this.balls.find((q) => q.stuck);
    if (!b) return false;
    b.held += dt;
    if (b.held > (this.level === 1 && this.time < 3 ? 1.6 : 0.8)) { b.so = U.rand(-0.5, 0.5) * this.paddle.w * 0.5; return true; }
    return false;
  };

  /* ---------- balls ---------- */
  function sideHit(b, ball) {
    const dx = ball.x - U.clamp(ball.x, b.x, b.x + b.w), dy = ball.y - U.clamp(ball.y, b.y, b.y + b.h);
    if (dx === 0 && dy === 0) {
      const l = ball.x - b.x, r = b.x + b.w - ball.x, t = ball.y - b.y, bt = b.y + b.h - ball.y, m = Math.min(l, r, t, bt);
      return m === l ? [-1, 0] : m === r ? [1, 0] : m === t ? [0, -1] : [0, 1];
    }
    return Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
  }
  Game.collideBricks = function (ball, fireOn) {
    const r = C.BALL_R;
    let best = null, bd = 1e9;
    for (const b of this.bricks) {
      if (b.dead || ball.x < b.x - r || ball.x > b.x + b.w + r || ball.y < b.y - r || ball.y > b.y + b.h + r) continue;
      const dx = ball.x - U.clamp(ball.x, b.x, b.x + b.w), dy = ball.y - U.clamp(ball.y, b.y, b.y + b.h), d2 = dx * dx + dy * dy;
      if (d2 < r * r && d2 < bd) { bd = d2; best = b; }
    }
    if (!best) return;
    const n = sideHit(best, ball), pierce = fireOn && best.type !== 'gold';
    this.hitBrick(best, pierce ? 3 : 1);
    if (pierce) return;
    if (n[0]) { ball.x = n[0] < 0 ? best.x - r - 0.01 : best.x + best.w + r + 0.01; if (ball.vx * n[0] < 0) ball.vx = -ball.vx; }
    else { ball.y = n[1] < 0 ? best.y - r - 0.01 : best.y + best.h + r + 0.01; if (ball.vy * n[1] < 0) ball.vy = -ball.vy; }
  };

  Game.updateBalls = function (dt) {
    const P = this.paddle, r = C.BALL_R, fireOn = P.fire > 0, target = this.ballSpeed();
    for (const ball of this.balls) {
      if (ball.stuck) { ball.x = U.clamp(P.x + ball.so, C.AX0 + r, C.AX1 - r); ball.y = P.y - C.PADDLE_H / 2 - r - 0.5; continue; }
      let sp = Math.hypot(ball.vx, ball.vy) || 1;
      const k = 1 + (target / sp - 1) * Math.min(1, 5 * dt);
      ball.vx *= k; ball.vy *= k; sp *= k;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (Math.random() < 0.7 && (!S.reduced || Math.random() < 0.4)) FX.trail(ball.x, ball.y, fireOn ? 'hsla(25,100%,60%,1)' : 'hsla(195,100%,65%,1)', fireOn ? 7 : 4.5, 0.16);
      if (ball.x < C.AX0 + r) { ball.x = C.AX0 + r; ball.vx = Math.abs(ball.vx); A.sfx.wall(); }
      else if (ball.x > C.AX1 - r) { ball.x = C.AX1 - r; ball.vx = -Math.abs(ball.vx); A.sfx.wall(); }
      if (ball.y < C.AY0 + r) { ball.y = C.AY0 + r; ball.vy = Math.abs(ball.vy); A.sfx.wall(); }
      // paddle
      const pTop = P.y - C.PADDLE_H / 2;
      if (ball.vy > 0 && ball.y + r >= pTop && ball.y - r <= P.y + C.PADDLE_H / 2 && Math.abs(ball.x - P.x) <= P.w / 2 + r * 0.6) {
        ball.y = pTop - r - 0.01;
        const off = U.clamp((ball.x - P.x) / (P.w / 2), -1, 1);
        if (P.sticky > 0) { ball.stuck = true; ball.so = ball.x - P.x; ball.vx = ball.vy = 0; ball.held = 0; }
        else { const a = off * 1.02 + U.rand(-0.03, 0.03); ball.vx = Math.sin(a) * sp; ball.vy = -Math.cos(a) * sp; }
        this.breakCombo(); A.sfx.paddle(); P.flash = 0.1;
        FX.sparks(ball.x, pTop, 4, 120, 'hsla(190,100%,75%,1)', 0.25, 1.3);
        continue;
      }
      this.collideBricks(ball, fireOn);
      for (const d of this.drifters) {
        if (d.dead) continue;
        const rr = d.r + r, dx = ball.x - d.x, dy = ball.y - d.y, dd = Math.hypot(dx, dy) || 1;
        if (dd < rr) {
          const nx = dx / dd, ny = dy / dd, dot = ball.vx * nx + ball.vy * ny, jit = U.rand(-0.3, 0.3);
          if (dot < 0) { ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny; }
          const c = Math.cos(jit), s = Math.sin(jit); const vx = ball.vx * c - ball.vy * s; ball.vy = ball.vx * s + ball.vy * c; ball.vx = vx;
          ball.x = d.x + nx * (rr + 0.5); ball.y = d.y + ny * (rr + 0.5);
          this.killDrifter(d);
        }
      }
      if (this.boss) Bo.ballHit(this, this.boss, ball);
      // keep the ball from going near-horizontal
      const minVy = 0.22 * sp;
      if (Math.abs(ball.vy) < minVy) { ball.vy = (ball.vy < 0 ? -1 : 1) * minVy; const rest = Math.sqrt(Math.max(1, sp * sp - ball.vy * ball.vy)); ball.vx = (ball.vx < 0 ? -1 : 1) * rest; }
      // bottom: safety net, then lost
      if (ball.vy > 0 && ball.y + r >= C.NET_Y && (this.net || (G.debug && G.debug.god))) {
        ball.vy = -Math.abs(ball.vy); ball.y = C.NET_Y - r - 1;
        if (this.net) { this.net = false; A.sfx.shieldBreak(); FX.ring(ball.x, C.NET_Y, 10, 80, 'hsla(220,100%,75%,1)', 0.4, 3); FX.sparks(ball.x, C.NET_Y, 12, 200, FX.col(220), 0.5); }
      }
      if (ball.y > H + 16) ball.dead = true;
    }
    this.balls = this.balls.filter((b) => !b.dead);
    if (this.balls.length === 0 && this.state === 'play' && !this.over) this.loseLife('ball');
  };

  /* ---------- lives ---------- */
  Game.loseLife = function (reason) {
    const P = this.paddle;
    if (reason === 'bolt' && P.invuln > 0) return;
    if (G.debug && G.debug.god) { if (reason === 'ball') this.newBall(); return; }
    this.lives--; this.noMiss = false; this.breakCombo(); this.speedBoost = 0;
    FX.explosion(P.x, P.y, 1.8, 190); A.sfx.playerDie(); FX.addShake(8); FX.doFlash(0.3, '255,190,190');
    P.laser = P.sticky = P.big = P.slow = P.fire = 0;
    this.shots.length = 0; this.caps.length = 0; this.clearBolts(true);
    if (this.lives <= 0) {
      this.over = true; this.overT = 2.4; A.music('off'); setTimeout(() => A.sfx.gameOver(), 700);
      this.balls.length = 0;
    } else {
      P.invuln = 2;
      if (reason === 'ball') this.newBall();
    }
  };

  /* ---------- everything else that moves ---------- */
  Game.updateStuff = function (dt) {
    const P = this.paddle, pTop = P.y - C.PADDLE_H / 2;
    for (const s of this.shots) {
      s.y += s.vy * dt;
      if (s.y < C.AY0) { s.dead = true; continue; }
      for (const b of this.bricks) {
        if (b.dead || s.x < b.x || s.x > b.x + b.w || s.y < b.y || s.y > b.y + b.h) continue;
        this.hitBrick(b, 1); s.dead = true; break;
      }
      if (s.dead) continue;
      for (const d of this.drifters) if (!d.dead && Math.hypot(d.x - s.x, d.y - s.y) < d.r + 4) { this.killDrifter(d); s.dead = true; break; }
      if (!s.dead && this.boss && Bo.shotHit(this, this.boss, s)) s.dead = true;
    }
    this.shots = this.shots.filter((s) => !s.dead);
    for (const c of this.caps) {
      c.t += dt; c.y += c.vy * dt;
      if (c.y + 10 >= pTop && c.y - 10 <= P.y + C.PADDLE_H / 2 && Math.abs(c.x - P.x) <= P.w / 2 + 18) { c.dead = true; this.applyCap(c.kind, c.x, c.y); }
      else if (c.y > H + 24) c.dead = true;
    }
    this.caps = this.caps.filter((c) => !c.dead);
    for (const b of this.ebs) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y + 6 >= pTop && b.y - 6 <= P.y + C.PADDLE_H / 2 && Math.abs(b.x - P.x) <= P.w / 2 + 4 && P.invuln <= 0) { b.dead = true; this.loseLife('bolt'); }
      else if (b.y > H + 12 || b.x < C.AX0 - 10 || b.x > C.AX1 + 10) b.dead = true;
    }
    this.ebs = this.ebs.filter((b) => !b.dead);
    for (const d of this.drifters) {
      d.t += dt;
      d.y += (55 + this.level * 1.5) * dt; d.x += Math.sin(d.t * 1.7 + d.ph) * 70 * dt;
      if (d.x < C.AX0 + d.r || d.x > C.AX1 - d.r) d.x = U.clamp(d.x, C.AX0 + d.r, C.AX1 - d.r);
      if (d.y + d.r >= pTop && d.y - d.r <= P.y + C.PADDLE_H / 2 && Math.abs(d.x - P.x) <= P.w / 2 + d.r) this.killDrifter(d);
      else if (d.y > H + 24) d.dead = true;
    }
    this.drifters = this.drifters.filter((d) => !d.dead);
    this.driftT -= dt;
    if (this.driftT <= 0 && !this.boss && this.state === 'play') {
      this.driftT = Math.max(5, 12 - this.level * 0.4) * U.rand(0.8, 1.3);
      if (this.drifters.length < Math.min(3, 1 + Math.floor(this.level / 4)) && this.level >= 2) this.spawnDrifter();
    }
    for (const b of this.bricks) {
      if (b.dead) continue;
      if (b.flash > 0) b.flash -= dt;
      if (b.fuse >= 0) { b.fuse -= dt; if (b.fuse < 0) this.destroyBrick(b); }
    }
    if (this.boss) Bo.update(this, this.boss, dt);
    // fail-safe: if nothing has been broken for a long while, gold bricks melt into armor so no level can dead-lock
    this.idleT += dt;
    if (this.idleT > 30 && this.state === 'play' && !this.boss) {
      this.idleT = 0;
      const gold = this.bricks.filter((b) => !b.dead && b.type === 'gold');
      if (gold.length) {
        for (const b of gold) { b.type = 'armored'; b.hp = b.maxhp = 2; FX.sparks(b.x + b.w / 2, b.y + b.h / 2, 8, 140, 'hsla(48,100%,70%,1)', 0.5); }
        this.banner = { text: 'GOLD MELTS', sub: '', t: 0, life: 1.6, small: true }; A.sfx.warp();
      }
    }
  };

  Game.update = function (dt) {
    this.time += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    this.updatePaddle(dt);
    this.updateBalls(dt);
    this.updateStuff(dt);
    FX.update(dt);
    this.flow(dt);
    if (this.over) {
      this.overT -= dt;
      if (this.overT <= 0) {
        if (this.demo) { this.reset(true, U.randInt(1, 14)); }
        else if (!this.overDone) { this.overDone = true; if (this.onOver) this.onOver(); }
      }
    }
  };

  /* ---------- level flow ---------- */
  Game.remaining = function () { return this.bricks.reduce((n, b) => n + (!b.dead && b.type !== 'gold' ? 1 : 0), 0); };
  Game.beginClear = function () {
    this.state = 'clear'; this.timer = 2.7;
    this.shots.length = 0; this.caps.length = 0; this.drifters.length = 0; this.clearBolts(true);
    for (const b of this.balls) FX.sparks(b.x, b.y, 8, 150, FX.col(190), 0.5);
    this.balls.length = 0;
    let bonus = 0;
    if (!this.demo) {
      bonus = 1000 + this.level * 100 + (this.noMiss ? 2000 : 0) + (this.net ? 500 : 0);
      this.addScore(bonus); A.sfx.stageClear(); if (this.noMiss) A.sfx.perfect();
    }
    this.banner = { text: this.boss ? 'BOSS DESTROYED' : 'LEVEL ' + this.level + ' CLEARED', sub: bonus ? (this.noMiss ? 'NO MISS  +' : 'BONUS  +') + U.fmt(bonus) : '', t: 0, life: this.timer - 0.2 };
  };
  Game.flow = function (dt) {
    if (this.over) return;
    if (this.state === 'play') {
      const done = this.boss ? this.boss.state === 'done' : this.remaining() === 0;
      if (done && !this.bricks.some((b) => !b.dead && b.fuse >= 0)) this.beginClear();
    } else if (this.state === 'clear') {
      this.timer -= dt;
      if (this.timer <= 0) this.startLevel(this.level + 1);
    }
  };

  /* ---------- rendering (logical 960x540 space) ---------- */
  Game.hasBackdrop = true;
  Game.drawBackdrop = function (ctx) {
    ctx.drawImage(GFX.art.backdrop(this.world), 0, 0, W, H);
    GFX.art.overlay(ctx, this.time, this.world);
  };

  Game.render = function (ctx) {
    const spr = GFX.spr, A2 = GFX.art, P = this.paddle, t = this.time;
    for (const b of this.bricks) {
      if (b.dead) continue;
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if (b.type === 'explosive') { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(10,100%,55%,1)', cx, cy, 30, 0.2 + 0.14 * Math.sin(t * 6 + b.c)); ctx.globalCompositeOperation = 'source-over'; }
      GFX.draw(ctx, A2.brick(b.type, b.hue, b.hp, b.maxhp), cx, cy, 0, 1, 1, b.fuse >= 0 ? (Math.floor(t * 30) % 2 ? 0.5 : 1) : 1);
      if (b.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.globalCompositeOperation = 'source-over'; }
    }
    if (this.net) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(120,160,255,' + (0.55 + 0.25 * Math.sin(t * 9)) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(C.AX0, C.NET_Y); ctx.lineTo(C.AX1, C.NET_Y); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,200,255,0.18)'; ctx.lineWidth = 9; ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    for (const d of this.drifters) {
      ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(310,100%,60%,1)', d.x, d.y, 24, 0.35); ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, spr.drifter, d.x, d.y, d.t * 2.2, 0.85, 0.85);
    }
    if (this.boss) Bo.draw(ctx, this, this.boss);
    FX.drawNorm(ctx);
    for (const c of this.caps) {
      ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(' + A2.CAPS[c.kind].hue + ',100%,60%,1)', c.x, c.y, 26, 0.35 + 0.12 * Math.sin(c.t * 8)); ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, spr.cap[c.kind], c.x, c.y, 0, 1, 1);
    }
    for (const s of this.shots) GFX.draw(ctx, spr.laser, s.x, s.y, 0, 1, 1);
    for (const b of this.ebs) GFX.draw(ctx, spr.bolt, b.x, b.y, 0, 0.9, 0.9);
    const blink = P.invuln > 0 ? (Math.floor(P.t * 14) % 2 ? 0.4 : 0.9) : 1;
    if (!this.over) {
      if (P.flash > 0) { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(190,100%,65%,1)', P.x, P.y - 4, P.w * 0.7, 0.5); ctx.globalCompositeOperation = 'source-over'; }
      GFX.draw(ctx, A2.paddle(P.w, P.laser > 0, P.sticky > 0), P.x, P.y, 0, 1, 1, blink);
    }
    const fireOn = P.fire > 0;
    for (const b of this.balls) {
      ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, fireOn ? 'hsla(25,100%,58%,1)' : 'hsla(195,100%,62%,1)', b.x, b.y, fireOn ? 20 : 14, 0.55); ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, fireOn ? spr.fireball : spr.ball, b.x, b.y, 0, 1, 1);
    }
    ctx.globalCompositeOperation = 'lighter';
    FX.drawAdd(ctx);
    ctx.globalCompositeOperation = 'source-over';
    FX.drawText(ctx);
  };
})((window.SGS = window.SGS || {}));
