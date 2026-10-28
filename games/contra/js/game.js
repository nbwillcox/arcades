/* Core game state: the astronaut, platform physics, weapons, capsules, bullets, collisions and stage flow. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, GFX = G.gfx, A = G.audio, I = G.input, St = G.stage, E = G.enemies, Bo = G.boss, TAU = U.TAU;
  const H = C.H, FL = C.FLOOR;
  const Game = { state: 'title', demo: true, time: 0 };
  G.game = Game;

  Game.reset = function (demo, startStage) {
    this.demo = !!demo;
    this.score = 0; this.lives = C.START_LIVES; this.stageNo = 0;
    this.lifeIdx = 0; this.nextLifeAt = C.EXTRA_LIFE_AT[0];
    this.banner = null; this.over = false; this.overDone = false; this.timer = 0;
    this.hi = G.scores.best();
    this.player = { x: 120, y: FL, vx: 0, vy: 0, face: 1, onGround: true, jumped: false, prone: false, aim: 0, phase: 0, wp: {}, rapid: false, shield: 0, fireCd: 0, alive: true, respawn: 0, invuln: 2, dropT: 0, t: 0, moving: false, jt: 0, noCut: false, jb: 0, cy: 0 };
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
      this.banner = { text: 'EXTRA LIFE', sub: '', t: 0, life: 1.6, small: true };
    }
  };
  Game.award = function (v, x, y) {
    this.addScore(v);
    if (x !== undefined && v >= 150) FX.text(x - this.cam.x, y - 14, '+' + U.fmt(v), '#ffffff', v >= 1000 ? 22 : 14);
  };

  /* ---------- stage setup ---------- */
  Game.startStage = function (n) {
    const P = this.player, st = this.st = St.gen(n);
    this.stageNo = n; this.cam = { x: 0 }; this.locked = false; this.evIdx = 0;
    this.en = []; this.eb = []; this.pb = []; this.caps = []; this.boss = null; this.bossState = null; this.state = 'play';
    Object.assign(P, { x: 120, y: FL, vx: 0, vy: 0, alive: true, invuln: 2.4, onGround: true });
    this.banner = { text: 'STAGE ' + n, sub: St.THEMES[st.theme].name, t: 0, life: 2.4 };
    if (!this.demo) A.music('play', n >= 3 ? 2 : 1, [0, 2, -2, 3, 5][st.theme]);
  };
  Game.groundY = function () { return FL; };

  /* ---------- platform physics shared by the player and ground enemies ---------- */
  Game.phys = function (e, dt) {
    const rp = e.onGround && e.plat;
    if (rp && !rp.off) { e.x += rp.dx || 0; e.y = rp.y; }   // ride moving platforms
    const prev = e.y;
    e.vy = Math.min(C.MAXFALL, e.vy + C.GRAV * dt);
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.onGround = false; e.plat = null;
    if (e.vy < 0) return;
    for (const p of this.st.plats) {
      if (p.off) continue;
      if (e.x < p.x0 - 5 || e.x > p.x1 + 5) continue;
      if (e.dropT > 0 && !p.solid) continue;
      if (prev <= Math.max(p.y, p.y - (p.dy || 0)) + 2 && e.y >= p.y) { e.y = p.y; e.vy = 0; e.onGround = true; e.platSolid = p.solid; e.plat = p; break; }
    }
  };

  /* moving, crumbling and blinking platforms */
  Game.updatePlats = function (dt) {
    const t = this.time, P = this.player;
    for (const p of this.st.plats) {
      if (!p.t) continue;
      p.dx = 0; p.dy = 0;
      if (p.mv) {
        const o = Math.sin(t * TAU / p.mv.per + p.mv.ph) * p.mv.r, d = o - p.o; p.o = o;
        if (p.mv.ax === 'x') { p.x0 = p.bx0 + o; p.x1 = p.bx1 + o; p.dx = d; } else { p.y = p.by + o; p.dy = d; }
      } else if (p.cr) {
        const c = p.cr;
        if (c.s === 0) { if (P.alive && P.onGround && P.plat === p) { c.s = 1; c.tm = 0.55; } }
        else if (c.s === 1) { c.tm -= dt; if (c.tm <= 0) { c.s = 2; c.vy = 0; p.off = true; A.sfx.thud(); } }
        else { c.vy += 1500 * dt; p.y += c.vy * dt; if (p.y > H + 80) p.t = null; }
      } else if (p.bl) {
        const b = p.bl, ph = ((t + b.ph) % b.per) / b.per;
        p.off = ph > b.on; p.warn = !p.off && ph > b.on - 0.16;
      }
    }
  };
  /* spikes, flame jets, falling spikes and spring pads */
  Game.updateTraps = function (dt) {
    const P = this.player, hb = this.hurtBox(), cam = this.cam.x;
    for (const T of this.st.traps) {
      if (T.k === 'spikes') { if (P.alive && hb.x1 > T.x0 + 3 && hb.x0 < T.x1 - 3 && hb.y1 > T.y - 15) this.killPlayer(); }
      else if (T.k === 'flame') {
        const c = (this.time + T.ph) % T.per, fs = T.per - T.on;
        T.s = c >= fs ? 2 : c >= fs - T.warn ? 1 : 0;
        if (T.s === 2 && P.alive && hb.x1 > T.x - 10 && hb.x0 < T.x + 10 && hb.y1 > T.y - 104 && hb.y0 < T.y) this.killPlayer();
      } else if (T.k === 'drop') {
        if (T.st === 0 && P.alive && T.x > cam - 10 && T.x < cam + C.W + 10 && Math.abs(P.x - T.x) < 175) { T.st = 1; T.t = 0.5; }
        else if (T.st === 1) { T.t -= dt; if (T.t <= 0) { T.st = 2; T.vy = 0; } }
        else if (T.st === 2) {
          T.vy = Math.min(900, T.vy + 1700 * dt); T.dy += T.vy * dt;
          const tip = T.y0 + 34 + T.dy;
          if (P.alive && hb.x1 > T.x - 9 && hb.x0 < T.x + 9 && hb.y1 > T.y0 + T.dy && hb.y0 < tip) this.killPlayer();
          if (tip >= FL && this.st.plats.some((p) => p.solid && T.x > p.x0 && T.x < p.x1)) { T.st = 3; FX.explosion(T.x - cam, FL - 6, 0.7, 40); A.sfx.thud(); }
          else if (T.y0 + T.dy > H + 40) T.st = 3;
        }
      } else if (T.k === 'spring') {
        T.cd -= dt; if (T.t > 0) T.t -= dt;
        if (P.alive && T.cd <= 0 && P.vy >= 0 && P.x > T.x0 && P.x < T.x1 && P.y >= T.y - 12 && P.y <= T.y + 6) {
          P.vy = C.SPRING; P.onGround = false; P.plat = null; P.jumped = true; P.noCut = true; T.cd = 0.45; T.t = 0.35; A.sfx.jump(); FX.sparks(P.x - cam, T.y - 6, 6, 120, 'hsla(50,100%,70%,1)', 0.3, 2);
        }
      }
    }
  };

  /* ---------- bullets and capsules ---------- */
  Game.ebullet = function (x, y, vx, vy, extra) {
    if (this.eb.length > 44) return;
    this.eb.push(Object.assign({ x, y, vx, vy, ay: 0, r: 5, life: 5, dead: false }, extra || {}));
  };
  Game.clearBullets = function (fxOn) {
    if (fxOn) for (const b of this.eb) FX.sparks(b.x - this.cam.x, b.y, 2, 80, 'hsla(320,100%,65%,1)', 0.3, 1.2);
    this.eb.length = 0;
  };
  Game.dropCap = function (x, y, letter) { this.caps.push({ x, y: y + 8, vx: 0, vy: -320, letter, t: 0, life: 14, onGround: false }); };
  Game.collect = function (c) {
    const P = this.player, L = c.letter, info = GFX.art.CAPS[L];
    A.sfx.capsule(); FX.sparks(c.x - this.cam.x, c.y, 10, 150, 'hsla(50,100%,70%,1)', 0.45);
    FX.text(P.x - this.cam.x, P.y - 60, info.name, info.c, 15);
    if (L === 'R') P.rapid = true; else if (L === 'B') P.shield = 12; else if (L === '1UP') { this.lives = Math.min(9, this.lives + 1); A.sfx.extraLife(); } else P.wp[L] = true;                     /* weapons stack: every one you pick up keeps firing */
    this.addScore(200);
  };

  /* ---------- the astronaut ---------- */
  Game.killPlayer = function () {
    const P = this.player;
    if (!P.alive || P.invuln > 0 || P.shield > 0 || (G.debug && G.debug.god)) return;
    P.alive = false; P.wp = {}; P.rapid = false;
    FX.explosion(P.x - this.cam.x, P.y - 20, 1.7, 15); A.sfx.playerDie(); FX.addShake(7); FX.doFlash(0.25, '255,200,200');
    if (!G.cheat.inf) this.lives--;
    if (this.lives <= 0) { this.over = true; this.overT = 2.2; A.music('off'); setTimeout(() => A.sfx.gameOver(), 600); }
    else this.player.respawn = 1.5;
  };
  Game.respawnPlayer = function () {
    const P = this.player;
    let x = this.cam.x + 110;
    const bad = (cx) => this.st.traps.some((T) => (T.k === 'spikes' && cx > T.x0 - 50 && cx < T.x1 + 50) || (T.k === 'flame' && Math.abs(cx - T.x) < 70) || (T.k === 'drop' && T.st < 3 && Math.abs(cx - T.x) < 50));
    for (let cx = this.cam.x + 90; cx < this.cam.x + 600; cx += 20) if (!bad(cx) && this.st.plats.some((p) => !p.t && cx > p.x0 + 10 && cx < p.x1 - 10 && p.y >= FL - 110)) { x = cx; break; }
    Object.assign(P, { x, y: -50, vx: 0, vy: 0, alive: true, invuln: 2.8, onGround: false, jumped: false, prone: false });
  };
  /* Weapons stack. With none you have the plain rifle; each capsule adds its weapon and one trigger pull fires all of them (machine gun stream + spread fan + piercing laser + flame spiral),
     at the fastest rate among them. Shots fly on until they leave the screen. */
  const RATE = { N: 4.2, M: 9, S: 3.2, L: 3, F: 5.2 }, FAR = 4;
  Game.owned = (P) => ['S', 'M', 'L', 'F'].filter((k) => P.wp[k]);
  Game.shoot = function (P) {
    const f = P.face, ad = P.ad || { x: f, y: 0 }, dx = ad.x, dy = ad.y, ox = P.x + f * 4 + dx * 22, oy = P.y - (P.prone ? 10 : 22) + dy * 22, ang = Math.atan2(dy, dx);
    const shot = (da, sp, dmg, kind, life, extra) => this.pb.push(Object.assign({ x: ox, y: oy, vx: Math.cos(ang + da) * sp, vy: Math.sin(ang + da) * sp, ang: ang + da, dmg, kind, life, r: 5, pierce: false, hit: null, dead: false, t: 0 }, extra || {}));
    const own = this.owned(P);
    let rate = RATE.N;
    if (!own.length) { if (this.pb.filter((b) => b.kind === 'N').length >= 8) return; shot(0, 640, 1, 'N', FAR); }
    else {
      rate = Math.max(...own.map((k) => RATE[k]));
      if (P.wp.M) shot(U.rand(-0.04, 0.04), 660, 1, 'M', FAR);
      if (P.wp.S) for (const da of [-0.36, -0.18, 0, 0.18, 0.36]) shot(da, 580, 1, 'S', FAR);
      if (P.wp.L) shot(0, 950, 2.4, 'L', FAR, { pierce: true, hit: [], r: 7 });
      if (P.wp.F) shot(0, 430, 1.4, 'F', FAR, { r: 9, ph: Math.random() * TAU });
    }
    P.fireCd = 1 / (rate * (P.rapid ? 1.6 : 1)); P.mz = 0.08;
    A.sfx.gun(own.length ? own[0] : 'N');
  };

  Game.updatePlayer = function (dt, inp) {
    const P = this.player;
    P.t += dt;
    if (P.invuln > 0) P.invuln -= dt;
    if (P.shield > 0) P.shield -= dt;
    if (P.dropT > 0) P.dropT -= dt;
    if (P.mz > 0) P.mz -= dt;
    if (!P.alive) { P.respawn -= dt; if (P.respawn <= 0 && !this.over) this.respawnPlayer(); return; }
    if (P.jumped && !P.noCut && P.vy < -260 && !inp.held && P.jt > 0.06) P.vy *= C.JUMP_CUT, P.noCut = true;
    P.jt += dt;
    const run = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    P.moving = run !== 0 && P.onGround;
    const ad = inp.aim || null;                                           /* where the cursor / the aim stick points (unit vector), or null: shoot the way you face */
    if (ad) { if (Math.abs(ad.x) > 0.12) P.face = ad.x > 0 ? 1 : -1; } else if (run) P.face = run;
    P.back = !!(ad && run && run !== P.face);                             /* running away from where you aim: the legs backpedal */
    P.prone = P.onGround && inp.d && !run;
    P.vx = P.prone ? 0 : run * C.RUN;
    // jump with a little forgiveness: a press just before landing still counts, and so does one just after running off an edge
    if (inp.jump) P.jb = 0.11;
    if (P.jb > 0) P.jb -= dt;
    P.cy = P.onGround ? 0.09 : Math.max(0, (P.cy || 0) - dt);
    if (P.jb > 0) {
      if (P.onGround && inp.d && !P.platSolid) { P.dropT = 0.3; P.onGround = false; P.vy = 120; P.jb = 0; }
      else if ((P.onGround || (P.cy > 0 && !P.jumped)) && !P.prone) { P.vy = C.JUMP; P.onGround = false; P.plat = null; P.jumped = true; P.noCut = false; P.jt = 0; P.jb = 0; P.cy = 0; A.sfx.jump(); }
    }
    this.phys(P, dt);
    if (P.onGround) { P.jumped = false; P.noCut = false; }
    P.x = U.clamp(P.x, this.cam.x + 14, this.cam.x + C.W - 14);
    P.phase += dt * 14 * (P.back ? -1 : 1);
    P.ad = P.prone || !ad ? { x: P.face, y: 0 } : ad;                      /* prone you can only shoot along the ground */
    P.aim = P.prone ? 0 : Math.atan2(P.ad.y, Math.abs(P.ad.x));            /* the same aim as a local angle for the sprite's arm */
    P.fireCd -= dt;
    if (inp.fire && P.fireCd <= 0) this.shoot(P);
    if (P.y > H + 70) { P.invuln = 0; P.shield = 0; this.killPlayer(); }
  };

  /* the aim as a unit vector: the right stick on a touch screen, otherwise the mouse (from the shoulder to the cursor), otherwise null */
  Game.aimInput = function () {
    const P = this.player;
    if (I.stick) { const m = Math.hypot(I.stick.x, I.stick.y); if (m > 0.2) return { x: I.stick.x / m, y: I.stick.y / m }; }
    if (I.mouse.on && P.alive) { const dx = I.mouse.x + this.cam.x - P.x, dy = I.mouse.y - (P.y - 22), d = Math.hypot(dx, dy); if (d > 14) return { x: dx / d, y: dy / d }; }
    return null;
  };

  Game.hurtBox = function () {
    const P = this.player, spin = P.jumped && !P.onGround;
    return P.prone ? { x0: P.x - 17, x1: P.x + 17, y0: P.y - 14, y1: P.y } : spin ? { x0: P.x - 10, x1: P.x + 10, y0: P.y - 30, y1: P.y - 6 } : { x0: P.x - 8, x1: P.x + 8, y0: P.y - 38, y1: P.y };
  };

  /* ---------- bullets, capsules, contact ---------- */
  Game.updateBullets = function (dt) {
    const cam = this.cam.x;
    for (const b of this.pb) {
      b.t += dt;
      if (b.kind === 'F') { const wob = Math.cos(b.t * 18 + b.ph) * 150 * dt; b.x += -Math.sin(b.ang) * wob; b.y += Math.cos(b.ang) * wob; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < cam - 80 || b.x > cam + C.W + 80 || b.y < -80 || b.y > H + 80) { b.dead = true; continue; }
      for (const e of this.en) {
        if (e.dead) continue;
        const bx = E.box(e);
        if (b.x + b.r < bx.x0 || b.x - b.r > bx.x1 || b.y + b.r < bx.y0 || b.y - b.r > bx.y1) continue;
        if (b.pierce) { if (b.hit.indexOf(e.id) >= 0) continue; b.hit.push(e.id); }
        E.damage(this, e, b.dmg, b);
        if (!b.pierce) { b.dead = true; break; }
      }
      if (!b.dead && this.boss && this.boss.state === 'fight') { b.bt = (b.bt || 0) - dt; if (b.bt <= 0 && Bo.hit(this, this.boss, b)) { b.bt = 0.1; if (!b.pierce) b.dead = true; } }
    }
    this.pb = this.pb.filter((b) => !b.dead);
    const hb = this.hurtBox(), P = this.player;
    for (const b of this.eb) {
      b.vy += b.ay * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < cam - 100 || b.x > cam + C.W + 100 || b.y < -100 || b.y > H + 40) { b.dead = true; continue; }
      if (P.alive && b.x + b.r > hb.x0 && b.x - b.r < hb.x1 && b.y + b.r > hb.y0 && b.y - b.r < hb.y1) { b.dead = true; this.killPlayer(); }
    }
    this.eb = this.eb.filter((b) => !b.dead);
    for (const c of this.caps) {
      c.t += dt; c.life -= dt; this.phys(c, dt);
      if (c.onGround) c.vx *= 0.9;
      if (P.alive && Math.hypot(P.x - c.x, (P.y - 18) - (c.y - 8)) < 28) { c.dead = true; this.collect(c); }
      if (c.life <= 0 || c.y > H + 60) c.dead = true;
    }
    this.caps = this.caps.filter((c) => !c.dead);
    if (P.alive) {
      for (const e of this.en) {
        if (e.dead || e.type === 'pod') continue;
        const bx = E.box(e);
        if (bx.x1 > hb.x0 + 3 && bx.x0 < hb.x1 - 3 && bx.y1 > hb.y0 + 3 && bx.y0 < hb.y1) { this.killPlayer(); break; }
      }
      if (this.boss && P.alive && Bo.touches(this, this.boss, P)) this.killPlayer();
    }
  };

  /* ---------- main update ---------- */
  Game.update = function (dt) {
    this.time += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    if (this.state === 'clear') { this.timer -= dt; FX.update(dt); this.updatePlats(dt); this.updatePlayer(dt, { l: false, r: false, u: false, d: false, fire: false, jump: false }); if (this.timer <= 0) this.startStage(this.stageNo + 1); return; }
    const inp = this.demo ? this.autopilot() : { l: I.l, r: I.r, d: I.d, fire: I.fire, jump: I.takeJump(), held: I.jumpHeld, aim: this.aimInput() };
    this.updatePlats(dt);
    this.updatePlayer(dt, inp);
    this.updateTraps(dt);
    if (this.demo) { const P0 = this.player; P0.invuln = Math.max(P0.invuln, 0.4); if (P0.y > H + 40 && P0.alive) this.respawnPlayer(); }
    const P = this.player, st = this.st, prev = this.cam.x;
    const lockX = st.arenaX - Math.max(0, C.W - 960);   // on wide screens the arena keeps its classic right edge and the extra width shows ground behind you
    if (!this.locked) {
      this.cam.x = Math.max(this.cam.x, P.x - Math.round(C.W * 0.396));
      if (this.cam.x >= lockX) { this.cam.x = lockX; this.locked = true; }
    } else this.cam.x = lockX;
    if (this.cam.x !== prev) FX.shift(-(this.cam.x - prev), 0);
    while (this.evIdx < st.events.length && st.events[this.evIdx].x <= this.cam.x + C.W + 60) E.runEvent(this, st.events[this.evIdx++]);
    E.update(this, dt);
    if (this.boss) Bo.update(this, this.boss, dt);
    this.updateBullets(dt);
    FX.update(dt);
    this.flow(dt);
    if (this.over) {
      this.overT -= dt;
      if (this.overT <= 0) {
        if (this.demo) this.reset(true, 1);
        else if (!this.overDone) { this.overDone = true; if (this.onOver) this.onOver(); }
      }
    }
    if (this.demo && this.time > 110) { this.time = 0; this.reset(true, 1); }
  };

  Game.flow = function (dt) {
    if (this.over) return;
    if (this.locked && !this.bossState) {
      this.bossState = 'warn'; this.timer = 2.4;
      this.banner = { text: 'WARNING', sub: C.BOSS_NAMES[this.st.boss], t: 0, life: 2.4, warn: true };
      if (!this.demo) { A.sfx.warning(); A.music('boss', 3, [0, 2, -2, 3, 5][this.st.theme]); }
    } else if (this.bossState === 'warn') {
      this.timer -= dt;
      if (this.timer <= 0) { this.boss = Bo.create(this, this.stageNo); this.bossState = 'fight'; }
    } else if (this.bossState === 'fight' && this.boss && this.boss.state === 'done') this.beginClear();
  };
  Game.beginClear = function () {
    this.state = 'clear'; this.timer = 3.2;
    this.clearBullets(true);
    for (const e of this.en) { const c = E.center(e); FX.explosion(c.x - this.cam.x, c.y, 0.9, E.T[e.type].hue); }
    this.en = []; this.boss = null;
    const bonus = this.demo ? 0 : 5000 + 1000 * this.stageNo;
    if (bonus) { this.addScore(bonus); A.sfx.stageClear(); }
    this.banner = { text: 'STAGE ' + this.stageNo + ' CLEAR', sub: bonus ? 'BONUS  +' + U.fmt(bonus) : '', t: 0, life: 2.9 };
  };

  /* attract-mode soldier: run right, gun blazing, hop over pits and things in the way */
  Game.autopilot = function () {
    const P = this.player;
    let jump = false, up = false;
    const plats = this.st.plats, ok = (p) => !p.off && !(p.cr && p.cr.s > 0);
    const edge = P.onGround && !plats.some((p) => ok(p) && P.x + 16 > p.x0 && P.x + 16 < p.x1 && p.y > P.y - 30 && p.y < P.y + 20);
    let wait = false;
    if (edge) {
      // at a ledge: go when something reachable is in range, otherwise wait for a moving / blinking platform to come
      const tgt = plats.some((p) => ok(p) && p.x1 > P.x + 45 && p.x0 < P.x + 150 && p.y > P.y - 130 && p.y < P.y + 40);
      this.apWait = (this.apWait || 0) + 1 / 120;
      if (tgt || this.apWait > 5) { jump = true; this.apWait = 0; } else wait = true;
    } else this.apWait = 0;
    if (P.onGround && P.plat && (P.plat.cr || (P.plat.bl && P.plat.warn))) jump = true;   // do not linger on crumbling / fading platforms
    for (const T of this.st.traps) if (T.k === 'spikes' && T.x1 > P.x - 10 && T.x0 < P.x + 90 && P.onGround) jump = true;
    for (const T of this.st.traps) if (T.k === 'flame' && T.s >= 1 && T.x > P.x && T.x < P.x + 110) wait = true;
    for (const e of this.en) { if (e.dead) continue; const dx = e.x - P.x, c = E.center(e); if (e.type !== 'pod' && dx > 0 && dx < 110 && Math.abs(c.y - (P.y - 20)) < 40 && P.onGround) jump = true; if (c.y < P.y - 110 && Math.abs(dx) < 260) up = true; }
    return { l: false, r: !wait && (!this.locked || this.player.x < this.st.arenaX + 600), d: false, fire: true, aim: up ? { x: 0.7071, y: -0.7071 } : null, jump, held: true };
  };

  /* ---------- rendering (logical 960x540 space) ---------- */
  Game.hasBackdrop = true;
  const edgeCache = {};
  Game.edgeColors = function () {
    const th = this.st.theme;
    if (edgeCache[th]) return edgeCache[th];
    const px = (c, x, y) => { const d = c.getContext('2d').getImageData(x, y, 1, 1).data; return 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')'; };
    const A2 = GFX.art, sky = A2.layer(th, 0), gr = A2.ground(th).c;
    return (edgeCache[th] = { top: px(sky, 2, 2), bottom: px(gr, 2, gr.height - 3) });
  };
  const sn = (v) => Math.round(v / 2) * 2;
  Game.drawBackdrop = function (ctx) {
    const th = this.st.theme, cam = this.cam.x, A2 = GFX.art, plats = this.st.plats;
    ctx.imageSmoothingEnabled = false;
    // far sky is full height; the mountains and flora only occupy the lower part of their tiles, so only that strip is blitted
    for (const [idx, k, sy] of [[0, 0.08, 0], [1, 0.3, 170], [2, 0.62, H - 190]]) {
      const tile = A2.layer(th, idx), off = sn(-(((cam * k) % 1024) + 1024) % 1024), sh = H - sy;
      for (let o = off; o < C.W; o += 1024) ctx.drawImage(tile, 0, sy, 1024, sh, o, sy, 1024, sh);
    }
    const gd = A2.ground(th), cp = A2.cap(th), lg = A2.ledge(th), CAPW = 16, TA = A2.trapArt(th), PX = G.px;
    for (const p of plats) {
      const px0 = sn(p.x0 - cam), px1 = sn(p.x1 - cam);
      if (px1 < -140 || px0 > C.W + 140) continue;
      if (p.solid) {
        const y = p.y - gd.top - 2, covL = plats.some((q) => q !== p && q.solid && q.x0 < p.x0 - 4 && q.x1 > p.x0 + 4), covR = plats.some((q) => q !== p && q.solid && q.x0 < p.x1 - 4 && q.x1 > p.x1 + 4);
        const a = covL ? px0 : px0 + CAPW, b = covR ? px1 : px1 - CAPW, ca = Math.max(a, -4), cb = Math.min(b, C.W + 4);
        if (cb > ca) {
          ctx.save(); ctx.beginPath(); ctx.rect(ca, y, cb - ca, H - y + 4); ctx.clip();
          for (let wx = a + Math.floor((ca - a) / 128) * 128; wx < cb; wx += 128) ctx.drawImage(gd.c, wx, y);
          ctx.restore();
        }
        if (!covL && px0 > -CAPW - 4) ctx.drawImage(cp.c, px0, y);
        if (!covR && px1 < C.W + CAPW + 4) { ctx.save(); ctx.translate(px1, y); ctx.scale(-1, 1); ctx.drawImage(cp.c, 0, 0); ctx.restore(); }
      } else {
        let S = lg, x0 = px0, x1 = px1;
        if (p.t === 'move') S = TA.mover;
        else if (p.t === 'crumble') { S = TA.crumble; if (p.cr.s === 1) { const j = sn(Math.sin(this.time * 70) * 2.4); x0 += j; x1 += j; } }
        else if (p.t === 'blink') S = p.off ? TA.blink.ghost : p.warn ? (Math.floor(this.time * 14) % 2 ? TA.blink.hot : TA.blink.ghost) : TA.blink.on;
        else if (p.t === null) continue;
        stripDraw(ctx, S, x0, x1, p.y, CAPW);
      }
    }
    for (const T of this.st.traps) {
      if (T.k === 'spikes') { const sp = TA.spike, a = sn(T.x0 - cam); if (a > C.W + 20 || T.x1 - cam < -20) continue; for (let x = a; x < sn(T.x1 - cam) - 6; x += 12) ctx.drawImage(sp.c, x - sp.ox, T.y - sp.oy); }
      else if (T.k === 'flame') { if (Math.abs(T.x - cam - C.W / 2) < C.W / 2 + 40) PX.draw(ctx, TA.vent, T.x - cam, T.y + 2, 1); }
      else if (T.k === 'spring') { if (T.x1 - cam > -30 && T.x0 - cam < C.W + 30) PX.draw(ctx, TA.spring[T.t > 0 ? 1 : 0], (T.x0 + T.x1) / 2 - cam, T.y + 2, 1); }
    }
  };
  function stripDraw(ctx, S, px0, px1, y, CAPW) {
    ctx.drawImage(S.left.c, px0, y);
    for (let wx = px0 + CAPW; wx < px1 - CAPW; wx += 64) { const w = Math.min(64, px1 - CAPW - wx); if (wx + w > -4 && wx < C.W + 4) ctx.drawImage(S.mid.c, 0, 0, w, 30, wx, y, w, 30); }
    ctx.drawImage(S.right.c, px1 - CAPW, y);
  }

  Game.render = function (ctx) {
    const A = GFX.art, PXL = G.px, L = A.fl, cam = this.cam.x, P = this.player;
    ctx.imageSmoothingEnabled = false;
    const TA = A.trapArt(this.st.theme);
    for (const T of this.st.traps) {
      if (T.k === 'flame') {
        const x = T.x - cam;
        if (x < -40 || x > C.W + 40) continue;
        if (T.s === 1) { ctx.fillStyle = this.st.theme === 4 ? '#6ae8ff' : '#ffa22a'; for (let i = 0; i < 3; i++) PXL.dot(ctx, x - 8 + ((this.time * 40 + i * 7) % 16), T.y - 10 - ((this.time * 60 + i * 13) % 14), 1); }
        else if (T.s === 2) { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, this.st.theme === 4 ? 'hsla(190,100%,60%,1)' : 'hsla(25,100%,55%,1)', x, T.y - 52, 46, 0.32); ctx.globalCompositeOperation = 'source-over'; PXL.draw(ctx, TA.flame[Math.floor(this.time * 14) % 4], x, T.y - 8, 1); }
      } else if (T.k === 'drop' && T.st < 3) {
        const x = T.x - cam;
        if (x < -30 || x > C.W + 30) continue;
        PXL.draw(ctx, TA.drop, x + (T.st === 1 ? Math.round(Math.sin(this.time * 80) * 2) : 0), T.y0 + T.dy, 1);
      }
    }
    E.draw(ctx, this);
    if (this.boss) Bo.draw(ctx, this, this.boss);
    FX.drawNorm(ctx);
    for (const c of this.caps) {
      const x = c.x - cam;
      ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(50,100%,65%,1)', x, c.y - 8, 26, 0.3 + 0.1 * Math.sin(c.t * 8)); ctx.globalCompositeOperation = 'source-over';
      const blink = c.life < 3 && Math.floor(c.t * 8) % 2;
      if (!blink) PXL.draw(ctx, L.cap[c.letter], x, c.y - 10 + Math.round(Math.sin(c.t * 5) * 1.2), 1);
    }
    for (const b of this.eb) { const k = b.r <= 6 ? 0 : b.r <= 10 ? 1 : 2; PXL.draw(ctx, L.eb[k], b.x - cam, b.y, 1); }
    for (const b of this.pb) {
      const x = b.x - cam;
      if (b.kind === 'L') {
        const ex = Math.cos(b.ang) * 38, ey = Math.sin(b.ang) * 38;
        ctx.fillStyle = '#2a7cff'; PXL.pline(ctx, x - ex, b.y - ey, x + ex, b.y + ey, 3);
        ctx.fillStyle = '#9fdcff'; PXL.pline(ctx, x - ex, b.y - ey, x + ex, b.y + ey, 2);
        ctx.fillStyle = '#ffffff'; PXL.pline(ctx, x - ex * 0.8, b.y - ey * 0.8, x + ex * 0.8, b.y + ey * 0.8, 1);
      } else if (b.kind === 'F') { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(30,100%,60%,1)', x, b.y, 18, 0.4); ctx.globalCompositeOperation = 'source-over'; PXL.draw(ctx, L.fire[Math.floor(b.t * 18) % 4], x, b.y, 1); }
      else PXL.draw(ctx, b.kind === 'S' ? L.bS : b.kind === 'M' ? L.bM : L.bN, x, b.y, 1);
    }
    if (P.alive) {
      const blink = P.invuln > 0 ? (Math.floor(P.t * 16) % 2 ? 0.35 : 0.9) : 1;
      ctx.globalAlpha = blink;
      A.drawAstro(ctx, { x: P.x - cam, y: P.y, face: P.face, aim: P.aim, phase: P.phase, prone: P.prone, spin: P.jumped && !P.onGround, air: !P.onGround, moving: P.moving, t: P.t });
      ctx.globalAlpha = 1;
      if (P.mz > 0) {
        const f = P.face, dx = P.ad.x, dy = P.ad.y, mi = P.mz > 0.05 ? 0 : P.mz > 0.025 ? 1 : 2;
        PXL.draw(ctx, A.muzzle[mi], P.x - cam + f * 4 + dx * 24, P.y - (P.prone ? 10 : 22) + dy * 24, 1);
      }
      if (P.shield > 0) {
        const low = P.shield < 3 && Math.floor(P.t * 8) % 2;
        ctx.globalAlpha = low ? 0.35 : 0.9; PXL.draw(ctx, L.shield[Math.floor(P.t * 6) % 2], P.x - cam, P.y - 20, 1); ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    FX.drawAdd(ctx);
    ctx.globalCompositeOperation = 'source-over';
    FX.drawText(ctx);
    if (!this.demo && P.alive && G.main && G.main.mode === 'play') {
      if (I.mouse.on && !I.stick) reticle(ctx, I.mouse.x, I.mouse.y);
      else if (I.stick && Math.hypot(I.stick.x, I.stick.y) > 0.2) { const m = Math.hypot(I.stick.x, I.stick.y), ax = P.x - cam + I.stick.x / m * 78, ay = P.y - 22 + I.stick.y / m * 78; reticle(ctx, ax, ay, true); }
    }
  };
  /* the aiming reticle: a cross with a gap, outlined so it reads on any backdrop */
  function reticle(ctx, x, y, small) {
    const a = small ? 6 : 10, b = small ? 2 : 3;
    x = Math.round(x); y = Math.round(y);
    for (const [col, o] of [['#0a0e2c', 1], ['#ffd24a', 0]]) {
      ctx.fillStyle = col;
      ctx.fillRect(x - a - o, y - 1 - o, a - b + 2 * o, 2 + 2 * o); ctx.fillRect(x + b - o, y - 1 - o, a - b + 2 * o, 2 + 2 * o);
      ctx.fillRect(x - 1 - o, y - a - o, 2 + 2 * o, a - b + 2 * o); ctx.fillRect(x - 1 - o, y + b - o, 2 + 2 * o, a - b + 2 * o);
    }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2);
  }
})((window.SGS = window.SGS || {}));
