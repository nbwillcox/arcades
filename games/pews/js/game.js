/* Core game state: ship, power-up meter, shots, collisions, free-flight and forced-scroll stage flow. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, GFX = G.gfx, A = G.audio, I = G.input, St = G.stage, E = G.enemies, Bo = G.boss, TAU = U.TAU;
  const W = C.W, H = C.H, WW = C.WW;
  const Game = { state: 'title', demo: true, time: 0 };
  G.game = Game;
  Game.SLOTS = ['SPEED', 'MISSILE', 'DOUBLE', 'LASER', 'OPTION', 'SHIELD'];

  function newPlayer() {
    return { x: 600, y: 300, vx: 0, vy: 0, face: 1, speedLv: 0, missile: 0, dbl: 0, laser: 0, opt: 0, shield: 0, meter: 0, fireCd: 0, missCd: 0, alive: true, invuln: 2.5, respawn: 0, t: 0, hyperCd: 0, hist: [], thr: 0, flip: 0 };
  }
  Game.reset = function (demo, startStage) {
    this.demo = !!demo;
    this.score = 0; this.lives = C.START_LIVES; this.bombs = C.START_BOMBS; this.stageNo = 0;
    this.lifeIdx = 0; this.nextLifeAt = C.EXTRA_LIFE_AT[0];
    this.en = []; this.eb = []; this.pb = []; this.caps = []; this.forms = {}; this.hives = [];
    this.boss = null; this.banner = null; this.over = false; this.overDone = false; this.timer = 0; this.cam = { x: 0, y: 0 };
    this.player = newPlayer();
    this.hi = G.scores.best();
    FX.reset();
    this.startStage(startStage || 1);
  };

  /* world -> screen projection (free flight wraps horizontally; forced scroll moves the camera up) */
  Game.sx = function (x) { return this.mode === 'free' ? W / 2 + U.wrapD(x, this.cam.x, WW) : x; };
  Game.sy = function (y) { return this.mode === 'free' ? y : y - this.cam.y; };

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
  Game.award = function (v, x, y) {
    this.addScore(v);
    if (x !== undefined && v >= 150) FX.text(this.sx(x), this.sy(y) - 14, '+' + U.fmt(v), '#ffffff', v >= 1000 ? 22 : 14);
  };

  /* ---------- stage setup ---------- */
  Game.startStage = function (n) {
    const P = this.player, kind = St.kind(n), th = St.themeIdx(n);
    this.stageNo = n; this.mode = kind;
    St.setup(this, n);
    this.en = []; this.eb = []; this.pb = []; this.caps = []; this.forms = {}; this.hives = [];
    this.boss = null; this.bossState = null; this.waveNo = 0; this.waveT = 2.5; this.noHit = true; this.state = 'play';
    P.invuln = 2.5; P.hist.length = 0;
    if (kind === 'free') {
      P.x = 400; P.y = 260; P.face = 1; this.cam.x = P.x + 163; this.cam.y = 0;
      E.initWorld(this, n);
    } else {
      const sc = St.script(this, n);
      this.len = sc.len; this.events = sc.events; this.evIdx = 0;
      this.cam.y = this.len; P.face = 1; P.x = St.cx(this, this.len + 400); P.y = this.cam.y + 400;
    }
    this.banner = { text: 'STAGE ' + n, sub: GFX.art.THEMES[th].name + (kind === 'free' ? '  -  DESTROY THE HIVES' : '  -  PUSH FORWARD'), t: 0, life: 2.4 };
    if (!this.demo) A.music(kind === 'free' ? 'play' : 'play', n >= 5 ? 2 : 1, [0, 2, -2, 3, 5][th]);
  };

  /* ---------- power-up meter ---------- */
  Game.dropCap = function (x, y, kind) {
    this.caps.push({ x, y, kind, t: 0, life: 14, vx: U.rand(-25, 25), vy: this.mode === 'free' ? U.rand(-10, 20) : 0 });
  };
  Game.collect = function (c) {
    const P = this.player;
    A.sfx.capsule();
    FX.sparks(this.sx(c.x), this.sy(c.y), 10, 150, FX.col(GFX.art.CAPS[c.kind].hue), 0.45);
    if (c.kind === 'P') { P.meter = P.meter % 6 + 1; }
    else if (c.kind === 'B') { if (this.bombs < C.MAX_BOMBS) { this.bombs++; A.sfx.bombPickup(); } else this.award(1000, c.x, c.y); }
    else if (c.kind === 'U') { this.lives = Math.min(9, this.lives + 1); A.sfx.extraLife(); }
    this.addScore(50);
  };
  Game.usePower = function () {
    const P = this.player;
    if (!P.alive || !P.meter) return;
    const slot = this.SLOTS[P.meter - 1];
    let ok = true;
    if (slot === 'SPEED') { if (P.speedLv < C.MAX_SPEED_LV) P.speedLv++; else ok = false; }
    else if (slot === 'MISSILE') { if (P.missile < 2) P.missile++; else ok = false; }
    else if (slot === 'DOUBLE') { if (!P.dbl) P.dbl = 1; else ok = false; }
    else if (slot === 'LASER') { if (!P.laser) P.laser = 1; else ok = false; }
    else if (slot === 'OPTION') { if (P.opt < C.MAX_OPTIONS) P.opt++; else ok = false; }
    else { if (P.shield < 3) P.shield = 3; else ok = false; }
    P.meter = 0;
    if (ok) { A.sfx.weaponUp(); FX.text(this.sx(P.x), this.sy(P.y) - 30, slot, '#ffd27a', 16); } else { this.award(500, P.x, P.y); A.sfx.pickup(); }
  };

  /* ---------- bullets ---------- */
  Game.ebullet = function (x, y, vx, vy) {
    if (this.eb.length > 60) return;
    this.eb.push({ x, y, vx, vy, life: 6, dead: false });
  };
  Game.clearBullets = function (fxOn) {
    if (fxOn) for (const b of this.eb) FX.sparks(this.sx(b.x), this.sy(b.y), 2, 80, 'hsla(80,100%,65%,1)', 0.3, 1.2);
    this.eb.length = 0;
  };
  Game.pshot = function (x, y, ang, sp, dmg, kind, life, pierce) {
    this.pb.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, ang, kind, dmg, r: kind === 'laser' ? 5 : 4, life, pierce: !!pierce, hit: pierce ? [] : null, dead: false });
  };

  /* ---------- hits, death, bombs, hyperspace ---------- */
  Game.hitPlayer = function () {
    const P = this.player;
    if (!P.alive || P.invuln > 0 || (G.debug && G.debug.god)) return false;
    this.noHit = false;
    if (P.shield > 0) {
      P.shield--; P.invuln = 0.8; A.sfx.shieldBreak(); FX.addShake(4);
      FX.ring(this.sx(P.x), this.sy(P.y), 10, 50, 'hsla(200,100%,70%,1)', 0.35, 3);
      return true;
    }
    P.alive = false;
    FX.explosion(this.sx(P.x), this.sy(P.y), 2.4, 190); A.sfx.playerDie(); FX.doFlash(0.4, '255,190,190'); FX.addShake(9);
    P.missile = P.dbl = P.laser = P.opt = P.shield = 0; P.meter = 0;      // everything but SPEED is lost
    this.lives--;
    this.clearBullets(true);
    if (this.lives <= 0) { this.over = true; this.overT = 2.4; A.music('off'); setTimeout(() => A.sfx.gameOver(), 700); }
    else P.respawn = 1.4;
    return true;
  };
  Game.bombBlast = function () {
    const P = this.player;
    if (!P.alive || this.bombs <= 0 || this.state !== 'play') return;
    this.bombs--;
    FX.ring(this.sx(P.x), this.sy(P.y), 10, 560, 'hsla(30,100%,70%,1)', 0.7, 6); FX.doFlash(0.55, '255,235,200'); FX.addShake(12); A.sfx.bomb();
    for (const e of this.en) {
      if (e.dead || e.type === 'tentacle') continue;
      const x = this.sx(e.x), y = this.sy(e.y);
      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
      if (e.type === 'hive') E.damage(this, e, 10, null); else E.kill(this, e);
    }
    if (this.boss) Bo.bomb(this, this.boss, 10);
    this.clearBullets(true);
  };
  Game.hyperspace = function () {
    const P = this.player;
    if (!P.alive || P.hyperCd > 0 || this.mode !== 'free') return;
    P.hyperCd = C.HYPER_CD;
    FX.ring(this.sx(P.x), this.sy(P.y), 6, 60, 'hsla(280,100%,75%,1)', 0.4, 3);
    P.x = U.rand(0, WW); P.y = U.rand(C.YMIN + 30, 400); P.vx = P.vy = 0; P.invuln = Math.max(P.invuln, 1.2); P.hist.length = 0;
    this.cam.x = P.x + P.face * 163;
    A.sfx.hyper();
    if (Math.random() < 0.05 && !(G.debug && G.debug.god)) { P.invuln = 0; FX.text(W / 2, P.y - 24, 'BAD JUMP!', '#ff6a6a', 18); this.hitPlayer(); }
  };

  /* ---------- the ship ---------- */
  Game.fire = function (P) {
    const free = this.mode === 'free', base = free ? (P.face > 0 ? 0 : Math.PI) : -Math.PI / 2, sp = 800;
    const ox = Math.cos(base) * 22, oy = Math.sin(base) * 22;
    if (P.laser) this.pshot(P.x + ox, P.y + oy, base, 1100, 1.4, 'laser', 0.22, true);
    else this.pshot(P.x + ox, P.y + oy, base, sp, 1, 'bolt', 0.9, false);
    if (P.dbl) this.pshot(P.x + ox * 0.4, P.y + oy * 0.4, base + (free ? -0.78 * P.face : 0.78), sp, 1, 'bolt', 0.9, false);
    for (let i = 0; i < P.opt; i++) { const h = P.hist[Math.min(P.hist.length - 1, (i + 1) * 14)]; if (h) this.pshot(h.x + ox * 0.6, h.y + oy * 0.6, base, sp, 1, 'bolt', 0.9, false); }
    P.fireCd = 1 / (P.laser ? 7 : 9);
    A.sfx.shoot(P.laser ? 4 : 1);
  };
  Game.fireMissiles = function (P) {
    const free = this.mode === 'free';
    for (let i = 0; i < P.missile; i++) {
      const a = free ? (P.face > 0 ? 0.9 : Math.PI - 0.9) : -Math.PI / 2 + (i ? 0.7 : -0.7);
      this.pb.push({ x: P.x, y: P.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, ang: a, kind: 'missile', dmg: 3, r: 5, life: 2.2, pierce: false, hit: null, dead: false });
    }
    P.missCd = 0.85; A.sfx.missile();
  };

  Game.updatePlayer = function (dt) {
    const P = this.player, free = this.mode === 'free';
    P.t += dt;
    if (P.invuln > 0) P.invuln -= dt;
    if (P.hyperCd > 0) P.hyperCd -= dt;
    if (!P.alive) {
      P.respawn -= dt;
      if (P.respawn <= 0 && this.lives > 0 && !this.over) {
        P.alive = true; P.invuln = 3; P.vx = P.vy = 0;
        if (!free) P.x = St.cx(this, P.y);
        FX.ring(this.sx(P.x), this.sy(P.y), 8, 70, 'hsla(190,100%,70%,1)', 0.5, 3);
      }
      return;
    }
    let mx, my, fire, rev = false, pow = false, bomb = false, hyp = false;
    if (this.demo) { const c = this.autopilot(); mx = c.mx; my = c.my; fire = c.fire; rev = c.rev; }
    else { mx = (I.r ? 1 : 0) - (I.l ? 1 : 0); my = (I.d ? 1 : 0) - (I.u ? 1 : 0); fire = I.fire; rev = I.takeRev(); pow = I.takePow(); bomb = I.takeBomb(); hyp = I.takeHyper(); }
    if (free && rev) { P.face = -P.face; P.flip = 0.18; A.sfx.blip(); }
    if (!free) P.face = 1;
    const l = Math.hypot(mx, my), sp = C.SPEED_BASE + P.speedLv * C.SPEED_STEP, k = Math.min(1, 14 * dt);
    P.vx += ((l ? mx / l * sp : 0) - P.vx) * k; P.vy += ((l ? my / l * sp : 0) - P.vy) * k;
    P.thr = l ? 1 : 0;
    if (P.flip > 0) P.flip -= dt;
    if (free) {
      P.x = U.wrap(P.x + P.vx * dt, WW);
      P.y = U.clamp(P.y + P.vy * dt, Math.max(C.YMIN, St.ceilY(this, P.x) + 16), Math.min(C.YMAX, St.floorY(this, P.x) - 14));
    } else {
      P.x = U.clamp(P.x + P.vx * dt, 18, W - 18);
      P.y = U.clamp(P.y + P.vy * dt - this.scrollDy, this.cam.y + C.YMIN, this.cam.y + C.YMAX);
    }
    P.hist.unshift({ x: P.x, y: P.y }); if (P.hist.length > 80) P.hist.pop();
    P.fireCd = Math.max(0, P.fireCd - dt); P.missCd = Math.max(0, P.missCd - dt);
    if (fire && P.fireCd <= 0) this.fire(P);
    if (P.missile && P.missCd <= 0 && fire) this.fireMissiles(P);
    if (pow) this.usePower();
    if (bomb) this.bombBlast();
    if (hyp) this.hyperspace();
    if (P.thr && (!S.reduced || Math.random() < 0.4)) { const bx = free ? -P.face : 0, by = free ? 0 : 1; FX.trail(this.sx(P.x) + bx * 22 + U.rand(-2, 2), this.sy(P.y) + by * 14 + U.rand(-2, 2), 'hsla(190,100%,60%,1)', U.rand(4, 7), 0.15); }
  };

  /* attract-mode pilot (free-flight only): hunt the nearest enemy, dodge shots, otherwise head for a hive */
  Game.autopilot = function () {
    const P = this.player;
    let tgt = null, td = 1e9, mx = 0, my = 0;
    for (const e of this.en) {
      if (e.dead || e.type === 'tentacle') continue;
      const dx = U.wrapD(e.x, P.x, WW), d = Math.abs(dx) + Math.abs(e.y - P.y) * 0.6;
      if (d < td && Math.abs(dx) < 560) { td = d; tgt = e; }
    }
    if (!tgt && this.hives.length) { let bd = 1e9; for (const h of this.hives) if (!h.dead) { const d = Math.abs(U.wrapD(h.x, P.x, WW)); if (d < bd) { bd = d; tgt = h; } } }
    let rev = false, fire = false;
    if (tgt) {
      const dx = U.wrapD(tgt.x, P.x, WW), dy = tgt.y - P.y, want = dx >= 0 ? 1 : -1;
      if (want !== P.face && P.flip <= 0) rev = true;
      my = Math.abs(dy) > 14 ? Math.sign(dy) : 0;
      mx = Math.abs(dx) > 300 ? Math.sign(dx) : Math.abs(dx) < 160 ? -Math.sign(dx) * 0.6 : 0;
      fire = Math.abs(dy) < 26 && want === P.face && Math.abs(dx) < 620;
    }
    for (const b of this.eb) { const dx = U.wrapD(b.x, P.x, WW), dy = b.y - P.y; if (Math.abs(dx) < 120 && Math.abs(dy) < 70) { my = dy > 0 ? -1 : 1; mx = -Math.sign(dx) * 0.5; } }
    if (P.meter && Math.random() < 0.02) this.usePower();
    return { mx, my, fire, rev };
  };

  /* ---------- shots, enemy bullets, capsules ---------- */
  Game.onScreen = function (x, y, m) { const sx = this.sx(x), sy = this.sy(y); return sx > -m && sx < W + m && sy > -m && sy < H + m; };
  Game.updateBullets = function (dt) {
    const free = this.mode === 'free';
    for (const b of this.pb) {
      if (b.kind === 'missile') {
        let tg = null, td = 1e9;
        for (const e of this.en) { if (e.dead || e.type === 'tentacle' || !this.onScreen(e.x, e.y, 20)) continue; const d = Math.hypot(E.dxw(this, e.x, b.x), e.y - b.y); if (d < td) { td = d; tg = e; } }
        if (!tg && this.boss && this.boss.state === 'fight') {
          const bb = this.boss; tg = bb;
          for (const p of bb.parts) if (p.alive) { const d = Math.hypot(E.dxw(this, p.x, b.x), p.y - b.y); if (tg === bb || d < td) { td = d; tg = p; } }
        }
        const cur = Math.atan2(b.vy, b.vx);
        let na = cur;
        if (tg) { let da = Math.atan2(tg.y - b.y, E.dxw(this, tg.x, b.x)) - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; na = cur + U.clamp(da, -5 * dt, 5 * dt); }
        const sp = Math.min(430, Math.hypot(b.vx, b.vy) + 500 * dt);
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; b.ang = na;
        if (Math.random() < 0.5) FX.trail(this.sx(b.x), this.sy(b.y), 'hsla(30,100%,60%,1)', 4, 0.2);
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (free) b.x = U.wrap(b.x, WW);
      if (!this.onScreen(b.x, b.y, 40)) b.dead = true;
      if (b.dead || b.life <= 0) { b.dead = true; continue; }
      for (const e of this.en) {
        if (e.dead || e.type === 'tentacle') continue;
        const dx = E.dxw(this, b.x, e.x), dy = b.y - e.y, rr = e.r + b.r;
        if (dx * dx + dy * dy >= rr * rr) continue;
        if (b.pierce) { if (b.hit.indexOf(e.id) >= 0) continue; b.hit.push(e.id); }
        E.damage(this, e, b.dmg, b);
        if (b.kind === 'missile') { FX.explosion(this.sx(b.x), this.sy(b.y), 0.6, 30); }
        if (!b.pierce) { b.dead = true; break; }
      }
      if (!b.dead && this.boss) {
        b.bt = (b.bt || 0) - dt;
        if (b.bt <= 0 && Bo.hit(this, this.boss, b.x, b.y, b.r, b.dmg)) { b.bt = 0.14; if (!b.pierce) b.dead = true; }
      }
    }
    this.pb = this.pb.filter((b) => !b.dead);
    const P = this.player;
    for (const b of this.eb) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (free) b.x = U.wrap(b.x, WW);
      if (b.life <= 0 || !this.onScreen(b.x, b.y, 80)) { b.dead = true; continue; }
      const dx = E.dxw(this, b.x, P.x), dy = b.y - P.y;
      if (P.alive && dx * dx + dy * dy < (4 + C.SHIP_R) * (4 + C.SHIP_R)) { b.dead = true; this.hitPlayer(); }
    }
    this.eb = this.eb.filter((b) => !b.dead);
    for (const c of this.caps) {
      c.t += dt; c.life -= dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (free) c.x = U.wrap(c.x, WW);
      const dx = E.dxw(this, c.x, P.x), dy = c.y - P.y;
      if (P.alive && dx * dx + dy * dy < 24 * 24) { c.dead = true; this.collect(c); }
      else if (c.life <= 0 || (!free && c.y > this.cam.y + H + 40)) c.dead = true;
    }
    this.caps = this.caps.filter((c) => !c.dead);
  };

  Game.collide = function () {
    const P = this.player, R = C.SHIP_R;
    if (!P.alive) return;
    for (const e of this.en) {
      if (e.dead) continue;
      if (e.type === 'tentacle') {
        if (e.segs) for (const s of e.segs) { const dx = s[0] - P.x, dy = s[1] - P.y; if (dx * dx + dy * dy < (9 + R) * (9 + R)) { this.hitPlayer(); break; } }
        continue;
      }
      const dx = E.dxw(this, e.x, P.x), dy = e.y - P.y, rr = e.r + R * 0.8;
      if (dx * dx + dy * dy < rr * rr) {
        if (this.hitPlayer() && e.type !== 'hive' && e.type !== 'turret' && e.type !== 'spitter') E.kill(this, e);
        if (!P.alive) return;
      }
    }
    if (this.boss && Bo.touches(this, this.boss, P)) this.hitPlayer();
    if (this.mode === 'forced' && P.alive) {
      const c = St.cx(this, P.y), h = St.hw(this, P.y);
      if (Math.abs(P.x - c) + R > h) this.hitPlayer();
    }
  };

  /* ---------- main update ---------- */
  Game.update = function (dt) {
    this.time += dt;
    const P = this.player, free = this.mode === 'free';
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    this.scrollDy = !free && this.cam.y > 0 && this.state === 'play' && !this.bossState ? C.SCROLL * dt : 0;
    this.updatePlayer(dt);
    // camera
    if (free) {
      const dc = U.wrapD(P.x + P.face * 163, this.cam.x, WW) * Math.min(1, 4.5 * dt);
      this.cam.x = U.wrap(this.cam.x + dc, WW); FX.shift(-dc, 0);
    } else if (this.scrollDy) { this.cam.y = Math.max(0, this.cam.y - this.scrollDy); FX.shift(0, this.scrollDy); }
    // spawning
    if (this.state === 'play' && !this.over) {
      if (free) {
        this.waveT -= dt;
        const live = this.en.reduce((n, e) => n + (e.type !== 'hive' && e.type !== 'turret' ? 1 : 0), 0);
        if (this.waveT <= 0 && !this.bossState) { this.waveT = Math.max(3.2, 6.5 - St.difficulty(this.stageNo) * 0.35); if (live < 24) E.freeWave(this); }
      } else {
        while (this.evIdx < this.events.length && this.cam.y <= this.events[this.evIdx].at) E.runEvent(this, this.events[this.evIdx++]);
      }
    }
    this.updateBullets(dt);
    E.update(this, dt);
    if (this.boss) Bo.update(this, this.boss, dt);
    this.collide();
    FX.update(dt);
    this.flow(dt);
    if (this.over) {
      this.overT -= dt;
      if (this.overT <= 0) {
        if (this.demo) this.reset(true, U.pick([1, 3, 5]));
        else if (!this.overDone) { this.overDone = true; if (this.onOver) this.onOver(); }
      }
    }
    if (this.demo && this.time > 100) this.reset(true, U.pick([1, 3, 5]));
  };

  /* ---------- stage flow ---------- */
  Game.beginClear = function () {
    this.state = 'clear'; this.timer = 3.2;
    this.clearBullets(true);
    for (const e of this.en) if (e.type !== 'hive') FX.explosion(this.sx(e.x), this.sy(e.y), 0.9, E.T[e.type].hue);
    this.en = []; this.boss = null;
    const bonus = this.demo ? 0 : 3000 + 500 * this.stageNo + (this.noHit ? 3000 : 0);
    if (bonus) { this.addScore(bonus); A.sfx.stageClear(); if (this.noHit) A.sfx.perfect(); }
    this.banner = { text: 'STAGE ' + this.stageNo + ' CLEAR', sub: bonus ? (this.noHit ? 'NO DAMAGE  +' : 'BONUS  +') + U.fmt(bonus) : '', t: 0, life: this.timer - 0.3 };
  };
  Game.flow = function (dt) {
    if (this.over) return;
    if (this.state === 'play') {
      if (!this.bossState) {
        const ready = this.mode === 'free' ? !this.en.some((e) => e.type === 'hive') : this.cam.y <= 0;
        if (ready) {
          this.bossState = 'warn'; this.timer = 2.6;
          this.banner = { text: 'WARNING', sub: this.mode === 'free' ? 'THE GATE IS OPEN' : 'MASSIVE SIGNATURE AHEAD', t: 0, life: 2.6, warn: true };
          if (!this.demo) { A.sfx.warning(); A.music('boss', 3, [0, 2, -2, 3, 5][St.themeIdx(this.stageNo)]); }
        }
      } else if (this.bossState === 'warn') {
        this.timer -= dt;
        if (this.timer <= 0) {
          const P = this.player;
          this.boss = this.mode === 'free' ? Bo.create(this, this.stageNo, U.wrap(P.x + 640 * P.face, WW), 250) : Bo.create(this, this.stageNo, 480, this.cam.y + 170);
          this.bossState = 'fight';
        }
      } else if (this.bossState === 'fight' && this.boss && this.boss.state === 'done') this.beginClear();
    } else if (this.state === 'clear') {
      this.timer -= dt;
      if (this.timer <= 0) this.startStage(this.stageNo + 1);
    }
  };

  /* ---------- rendering (logical 960x540 space) ---------- */
  Game.hasBackdrop = true;
  Game.drawBackdrop = function (ctx) {
    const th = St.themeIdx(this.stageNo), T = GFX.art.THEMES[th], free = this.mode === 'free', A2 = GFX.art;
    ctx.fillStyle = U.hsl(T.h, 60, 4); ctx.fillRect(0, 0, W, H);
    for (const [layer, k] of [[0, 0.22], [1, 0.5]]) {
      const tile = A2.tile(th, layer), m = ((free ? this.cam.x : -this.cam.y) * k % 1024 + 1024) % 1024;
      if (free) { ctx.drawImage(tile, -m, 0); ctx.drawImage(tile, 1024 - m, 0); }
      else { ctx.drawImage(tile, 0, m - 1024); ctx.drawImage(tile, 0, m); }
    }
    const fill = ctx.createLinearGradient(0, 0, 0, H);
    fill.addColorStop(0, U.hsl(T.h, 55, 20)); fill.addColorStop(1, U.hsl(T.h, 60, 8));
    ctx.lineJoin = 'round';
    const edge = () => { for (const [w, a, l] of [[9, 0.12, 60], [4, 0.28, 64], [1.8, 0.95, 74]]) { ctx.strokeStyle = U.hsl(T.h, 100, l, a); ctx.lineWidth = w; ctx.stroke(); } };
    if (free) {
      ctx.beginPath(); ctx.moveTo(-24, H);
      for (let x = -24; x <= W + 24; x += 24) ctx.lineTo(x, St.floorY(this, this.cam.x + x - W / 2));
      ctx.lineTo(W + 24, H); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      ctx.beginPath(); for (let x = -24; x <= W + 24; x += 24) { const y = St.floorY(this, this.cam.x + x - W / 2); if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } edge();
      ctx.beginPath(); ctx.moveTo(-24, 0);
      for (let x = -24; x <= W + 24; x += 24) ctx.lineTo(x, St.ceilY(this, this.cam.x + x - W / 2));
      ctx.lineTo(W + 24, 0); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      ctx.beginPath(); for (let x = -24; x <= W + 24; x += 24) { const y = St.ceilY(this, this.cam.x + x - W / 2); if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } edge();
    } else {
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s < 0 ? -2 : W + 2, -12);
        for (let y = -12; y <= H + 12; y += 12) { const wy = this.cam.y + y; ctx.lineTo(St.cx(this, wy) + s * St.hw(this, wy), y); }
        ctx.lineTo(s < 0 ? -2 : W + 2, H + 12); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
        ctx.beginPath(); for (let y = -12; y <= H + 12; y += 12) { const wy = this.cam.y + y, x = St.cx(this, wy) + s * St.hw(this, wy); if (y < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } edge();
      }
    }
  };

  Game.render = function (ctx) {
    const spr = GFX.spr, P = this.player, free = this.mode === 'free';
    E.draw(ctx, this);
    if (this.boss) Bo.draw(ctx, this, this.boss);
    FX.drawNorm(ctx);
    for (const c of this.caps) {
      const x = this.sx(c.x), y = this.sy(c.y);
      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
      ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(' + GFX.art.CAPS[c.kind].hue + ',100%,60%,1)', x, y, 26, 0.4 + 0.12 * Math.sin(c.t * 8)); ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, spr.cap[c.kind], x, y, 0, 1, 1, c.life < 3 ? (Math.floor(c.t * 8) % 2 ? 0.4 : 1) : 1);
    }
    for (const b of this.eb) GFX.draw(ctx, spr.spore, this.sx(b.x), this.sy(b.y), 0, 0.9, 0.9);
    for (const b of this.pb) {
      const x = this.sx(b.x), y = this.sy(b.y);
      if (b.kind === 'laser') {
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        const ex = Math.cos(b.ang) * 46, ey = Math.sin(b.ang) * 46;
        for (const [w, c] of [[9, 'rgba(255,90,120,0.3)'], [3.5, 'rgba(255,255,255,0.95)']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x - ex, y - ey); ctx.lineTo(x + ex, y + ey); ctx.stroke(); }
        ctx.globalCompositeOperation = 'source-over';
      } else GFX.draw(ctx, b.kind === 'missile' ? spr.missile : spr.bolt, x, y, b.ang, 0.9, 0.9);
    }
    if (P.alive) {
      for (let i = 0; i < P.opt; i++) {
        const h = P.hist[Math.min(P.hist.length - 1, (i + 1) * 14)];
        if (!h) continue;
        const x = this.sx(h.x), y = this.sy(h.y);
        ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(30,100%,60%,1)', x, y, 14, 0.6); ctx.globalCompositeOperation = 'source-over';
        GFX.draw(ctx, spr.option, x, y, 0, 1, 1);
      }
      const x = this.sx(P.x), y = this.sy(P.y), blink = P.invuln > 0 ? (Math.floor(P.t * 16) % 2 ? 0.35 : 0.85) : 1;
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(190,100%,60%,1)', x - (free ? P.face * 22 : 0), y + (free ? 0 : 16), P.thr ? 14 : 9, P.thr ? 0.85 : 0.5);
      ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, spr.ship, x, y, free ? 0 : -Math.PI / 2, free ? P.face * 0.9 : 0.9, 0.9, blink);
      if (P.shield > 0) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + 0.12 * Math.sin(P.t * 7) + P.shield * 0.08;
        const g = ctx.createRadialGradient(x, y, 12, x, y, 28);
        g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(0.75, 'rgba(120,200,255,0.25)'); g.addColorStop(1, 'rgba(190,235,255,0.9)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 28, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    FX.drawAdd(ctx);
    ctx.globalCompositeOperation = 'source-over';
    FX.drawText(ctx);
  };
})((window.SGS = window.SGS || {}));
