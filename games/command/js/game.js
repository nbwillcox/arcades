/* Core game state: structures, waves, input handling, shop flow. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, I = G.input, Wp = G.weapons, E = G.enemies, Up = G.up, TAU = U.TAU;
  const W = C.W, H = C.H;
  const Game = { state: 'title', demo: true, time: 0 };
  G.game = Game;

  Game.reset = function (demo, startStage) {
    this.demo = !!demo;
    this.score = 0; this.credits = demo ? 0 : 0; this.stage = 0; this.nextBonus = C.BONUS_CITY_EVERY;
    this.up = Up.fresh(); this.st = Up.stats(this.up);
    this.cities = C.CITIES.map((x) => ({ x, alive: true, shield: 0, isCity: true, flash: 0, rubble: 0 }));
    this.launchers = C.LAUNCHERS.map((x) => ({ x, alive: true, ammo: 10, shield: 0, isCity: false, flash: 0, rubble: 0, aim: -Math.PI / 2, recoil: 0, autoT: 2 }));
    this.icp = []; this.blasts = []; this.en = []; this.air = []; this.pk = []; this.ghosts = []; this.plan = null; this.planI = 0; this.waveT = 0; this.msp = 60;
    this.beam = null; this.boss = null; this.banner = null; this.nuke = 0; this.energy = 100; this.laserLock = false; this.weapon = 'std';
    this.fireCd = 0; this.rapidT = 0; this.perfect = true; this.timer = 0; this.over = false; this.overDone = false; this.world = 0; this.tally = null;
    if (this.demo) { this.up.blast = 2; this.up.ammo = 2; this.up.speed = 1; this.up.rate = 1; this.st = Up.stats(this.up); for (const l of this.launchers) l.ammo = this.st.ammoMax; }
    this.hi = G.scores.best();
    FX.reset();
    if (startStage && startStage > 1) { for (let i = 1; i < startStage; i++) this.credits += 60; }
    this.startStage(startStage || 1);
  };

  /* ---------- scoring ---------- */
  Game.addScore = function (v) {
    this.score += v;
    if (this.demo) return;
    while (this.score >= this.nextBonus) {
      this.nextBonus += C.BONUS_CITY_EVERY;
      const dead = this.cities.filter((c) => !c.alive);
      if (dead.length) { const c = dead[0]; c.alive = true; c.shield = this.st.shieldHits; FX.explosion(c.x, C.GROUND - 20, 1.6, 150); this.banner = { text: 'BONUS CITY', sub: '', t: 0, life: 1.8, small: true }; A.sfx.extraLife(); }
      else { this.credits += 50; this.banner = { text: 'BONUS +50 CREDITS', sub: '', t: 0, life: 1.8, small: true }; A.sfx.extraLife(); }
    }
  };
  Game.award = function (base, x, y) {
    const v = Math.round(base);
    this.addScore(v);
    if (x !== undefined && base >= 100) FX.text(x, y - 14, '+' + U.fmt(v), base >= 300 ? '#ffd24a' : '#ffffff', base >= 1000 ? 22 : 14);
  };

  /* ---------- shop actions ---------- */
  Game.rebuild = function (kind, i) {
    const s = kind === 'city' ? this.cities[i] : this.launchers[i], cost = kind === 'city' ? C.REBUILD_CITY : C.REBUILD_LAUNCHER;
    if (!s || s.alive || this.credits < cost) return false;
    this.credits -= cost; s.alive = true; s.shield = this.st.shieldHits; s.rubble = 0;
    if (!s.isCity) s.ammo = this.st.ammoMax;
    return true;
  };

  /* ---------- wave flow ---------- */
  Game.startStage = function (n) {
    this.stage = n; this.perfect = true; this.waveT = 0; this.tally = null; this.beam = null;
    this.world = Math.floor((n - 1) / C.BOSS_EVERY) % 5;
    this.st = Up.stats(this.up);
    for (const l of this.launchers) if (l.alive) l.ammo = this.st.ammoMax;
    for (const s of this.cities.concat(this.launchers)) if (s.alive) s.shield = this.st.shieldHits;
    this.en = []; this.air = []; this.blasts = []; this.icp = []; this.ghosts = [];
    this.msp = Math.min(170, 58 + 5.5 * n);
    const key = [0, 2, -2, 3, 5][this.world];
    if (n % C.BOSS_EVERY === 0) {
      this.plan = null; this.state = 'bossWarn'; this.timer = 3.4;
      this.banner = { text: 'WARNING', sub: 'ORBITAL MOTHERSHIP INCOMING', t: 0, life: 3.4, warn: true };
      if (!this.demo) { A.sfx.warning(); A.music('boss', 3, key); }
    } else {
      E.planWave(this, n);
      this.state = 'intro'; this.timer = 1.8;
      this.banner = { text: 'WAVE ' + n, sub: '', t: 0, life: 1.8 };
      if (!this.demo) A.music('play', n >= 3 ? 2 : 1, key);
    }
    G.onStage && G.onStage(n);
  };

  Game.beginClear = function (boss) {
    const alive = this.cities.filter((c) => c.alive).length, ammo = this.launchers.reduce((s, l) => s + (l.alive ? l.ammo : 0), 0);
    const cityBonus = alive * 100, ammoBonus = ammo * 5, perfect = this.perfect ? (boss ? 5000 : 1000 + this.stage * 100) : 0;
    const credits = 20 + alive * 8 + Math.floor(ammo / 4) + (this.perfect ? 40 : 0) + (boss ? 80 : 0);
    this.state = 'clear'; this.timer = boss ? 4.6 : 3.2;
    this.tally = { cityBonus, ammoBonus, perfect, credits, alive, ammo };
    this.addScore(cityBonus + ammoBonus + perfect); this.credits += credits;
    for (const k of this.pk) k.dead = true;
    this.blasts = []; this.icp = []; this.en = []; this.air = [];
    if (!this.demo) { A.sfx.stageClear(); if (this.perfect) A.sfx.perfect(); }
    this.banner = { text: boss ? 'MOTHERSHIP DESTROYED' : 'WAVE ' + this.stage + ' DEFENDED', sub: '+' + U.fmt(cityBonus + ammoBonus + perfect) + ' PTS   +' + credits + ' CREDITS', t: 0, life: this.timer - 0.2 };
  };

  Game.flow = function (dt) {
    if (this.over) return;
    if (!this.cities.some((c) => c.alive)) {
      this.over = true; this.overT = 2.6;
      this.banner = { text: 'ALL CITIES LOST', sub: '', t: 0, life: 2.4 };
      A.music('off'); setTimeout(() => A.sfx.gameOver(), 700);
      return;
    }
    switch (this.state) {
      case 'intro':
        this.timer -= dt;
        if (this.timer <= 0) this.state = 'play';
        break;
      case 'play':
        if (this.plan && this.planI >= this.plan.length && !this.en.some((e) => !e.dead) && this.air.length === 0) this.beginClear(false);
        break;
      case 'bossWarn':
        this.timer -= dt;
        if (this.timer <= 0) { this.boss = G.boss.create(this, this.stage); this.state = 'bossFight'; }
        break;
      case 'bossFight':
        for (const l of this.launchers) if (l.alive && l.ammo < this.st.ammoMax) { l.regen = (l.regen || 0) + dt; if (l.regen > 1.3) { l.regen = 0; l.ammo++; } }
        if (this.boss && this.boss.state === 'done') { this.boss = null; this.beginClear(true); }
        break;
      case 'clear':
        this.timer -= dt;
        if (this.timer <= 0) {
          if (this.demo) this.startStage(this.stage + 1);
          else { this.state = 'shop'; G.onShop && G.onShop(); }
        }
        break;
      default:
    }
  };

  /* ---------- player input ---------- */
  Game.pickWeapon = function (code) {
    const list = Wp.WEAPONS.filter((w) => Wp.available(this, w));
    if (!list.length) return;
    if (code >= 1 && code <= 4) { const w = Wp.WEAPONS[code - 1]; if (Wp.available(this, w)) this.weapon = w; }
    else { const i = Math.max(0, list.indexOf(this.weapon)); this.weapon = list[(i + (code === 5 ? 1 : list.length - 1)) % list.length]; }
    A.sfx.blip();
  };

  Game.handleInput = function () {
    const code = I.takeWeapon();
    if (code) this.pickWeapon(code);
    if (I.takeNuke()) Wp.fireNuke(this, I.mouseX, I.mouseY);
    const click = I.takeClick();
    if (click) for (const k of this.pk) if (!k.dead && U.dist2(I.mouseX, I.mouseY, k.x, k.y) < 42 * 42) Wp.collect(this, k);
    // a click always fires once (even if released within a frame); holding repeats at the fire-rate cooldown
    if ((click || I.fire) && this.weapon !== 'laser' && I.mouseSeen) Wp.fire(this, I.mouseX, I.mouseY);
  };

  /* attract-mode gunner: shoots the missile closest to impact, leading the target */
  Game.autopilot = function (dt) {
    this.apT = (this.apT || 0) - dt;
    if (this.apT > 0 || this.fireCd > 0) return;
    this.apT = U.rand(0.22, 0.5);
    const bs = this.boss;
    if (bs && bs.state === 'fight') {
      const live = bs.mods.filter((m) => m.alive && !(m.k === 'core' && bs.shielded)), tg = live.find((m) => m.k !== 'core') || live[0];
      if (tg) { Wp.fire(this, tg.x, tg.y + 4); return; }
    }
    let best = null, bt = 1e9;
    for (const e of this.en) {
      if (e.dead || e.autoT > 0 || e.y < 20) continue;
      const t = (e.ty - e.y) / Math.max(20, e.vy);
      if (t < bt) { bt = t; best = e; }
    }
    if (!best) return;
    const l = Wp.nearestLauncher(this, best.x);
    if (!l) return;
    const tt = Math.hypot(best.x - l.x, best.y - C.GROUND) / this.st.speed;
    best.autoT = 1.4;
    Wp.fire(this, best.x + best.vx * tt, best.y + best.vy * tt);
  };

  Game.update = function (dt) {
    this.time += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    if (this.state === 'shop') return;
    if (!this.over) { if (this.demo) this.autopilot(dt); else this.handleInput(); }
    Wp.update(this, dt);
    E.update(this, dt);
    if (this.boss) G.boss.update(this, this.boss, dt);
    Wp.resolve(this, dt);
    for (const s of this.cities.concat(this.launchers)) { if (s.flash > 0) s.flash -= dt; if (!s.alive) s.rubble += dt; }
    FX.update(dt);
    this.flow(dt);
    if (this.over) {
      this.overT -= dt;
      if (this.overT <= 0) {
        if (this.demo) { this.reset(true, U.randInt(1, 3)); }
        else if (!this.overDone) { this.overDone = true; if (this.onOver) this.onOver(); }
      }
    }
  };

  Game.resumeFromShop = function () {
    if (this.state !== 'shop') return;
    this.startStage(this.stage + 1);
  };

  /* ---------- rendering (logical 960x540 space) ---------- */
  Game.hasBackdrop = true;
  Game.drawBackdrop = function (ctx) {
    ctx.drawImage(GFX.art.backdrop(this.world), 0, 0, W, H);
    GFX.art.overlay(ctx, this.time, this.world);
  };

  function drawShieldDome(ctx, x, y, n, t) {
    if (n <= 0) return;
    ctx.save();
    const g = ctx.createRadialGradient(x, y - 8, 8, x, y - 8, 40);
    g.addColorStop(0, 'rgba(90,190,255,0)'); g.addColorStop(0.8, 'rgba(90,190,255,0.14)'); g.addColorStop(1, 'rgba(170,230,255,0.5)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 8, 40, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(150,225,255,' + (0.5 + 0.2 * Math.sin(t * 4)) + ')'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x, y - 8, 40, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#9fe8ff';
    for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(x + (i - (n - 1) / 2) * 9, y - 52, 2.6, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  function drawWreck(ctx, s, t) {
    const x = s.x, y = C.GROUND;
    ctx.fillStyle = '#0a0f22';
    ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 15, y - 7); ctx.lineTo(x - 8, y - 4); ctx.lineTo(x - 2, y - 11); ctx.lineTo(x + 6, y - 5); ctx.lineTo(x + 14, y - 9); ctx.lineTo(x + 22, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,120,60,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    if (s.rubble < 14) {
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(20,100%,55%,1)', x + Math.sin(t * 9 + x) * 4, y - 10, 12 + Math.sin(t * 13 + x) * 3, 0.5 * (1 - s.rubble / 14));
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /* the glowing building outline is blurred once per size into a small canvas (2x for crispness) instead of a shadowBlur stroke per building per frame */
  const outlines = {};
  function glowOutline(w, h) {
    const k = w + 'x' + h; let o = outlines[k];
    if (!o) {
      const pad = 10, c = document.createElement('canvas'), x = c.getContext('2d'); c.width = Math.ceil((w + pad * 2) * 2); c.height = Math.ceil((h + pad * 2) * 2);
      x.scale(2, 2); x.shadowColor = 'rgba(80,220,255,0.9)'; x.shadowBlur = 6 * 2; x.strokeStyle = '#7fe8ff'; x.lineWidth = 1.5; x.strokeRect(pad, pad, w, h);
      o = outlines[k] = { c, pad, w: c.width / 2, h: c.height / 2 };
    }
    return o;
  }
  function drawCity(ctx, s, t) {
    if (!s.alive) { drawWreck(ctx, s, t); return; }
    const x = s.x, y = C.GROUND;
    ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(190,100%,60%,1)', x, y - 16, 36, 0.22 + (s.flash > 0 ? 0.5 : 0)); ctx.globalCompositeOperation = 'source-over';
    const blds = [[-19, 13, 26], [-5, 16, 40], [12, 13, 22]];
    blds.forEach((b, bi) => {
      const bx = x + b[0], by = y - b[2];
      ctx.fillStyle = 'rgba(8,18,44,0.92)'; ctx.fillRect(bx, by, b[1], b[2]);
      const ol = glowOutline(b[1], b[2]); ctx.drawImage(ol.c, bx - ol.pad, by - ol.pad, ol.w, ol.h);
      for (let wy = by + 5; wy < y - 4; wy += 7) for (let wx = bx + 3; wx < bx + b[1] - 3; wx += 5) {
        const on = Math.sin(wx * 12.9 + wy * 7.3 + bi) > -0.2 && Math.sin(t * 0.7 + wx + wy * 3) > -0.92;
        if (on) { ctx.fillStyle = 'rgba(190,245,255,0.85)'; ctx.fillRect(wx, wy, 2.2, 3); }
      }
    });
    ctx.strokeStyle = '#7fe8ff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 5 + 8, y - 40); ctx.lineTo(x - 5 + 8, y - 50); ctx.stroke();
    ctx.fillStyle = '#ff5a5a'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + x); ctx.beginPath(); ctx.arc(x + 3, y - 50, 1.8, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    if (s.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x - 19, y - 40, 44, 40); }
    drawShieldDome(ctx, x, y, s.shield, t);
  }

  Game.drawLauncher = function (ctx, l) {
    const t = this.time;
    if (!l.alive) { drawWreck(ctx, l, t); return; }
    const x = l.x, y = C.GROUND;
    let a = l.aim;
    if (!this.demo && I.mouseSeen) a = Math.atan2(Math.min(I.mouseY, C.TARGET_MAX_Y) - (y - 34), I.mouseX - x);
    a = U.clamp(a, -Math.PI * 0.97, -Math.PI * 0.03);
    l.aim = a;
    ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(205,100%,60%,1)', x, y - 12, 34, 0.2); ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(x, y - 14); ctx.rotate(a);
    ctx.fillStyle = GFX.lg(ctx, 0, -4, 0, 4, [[0, '#9fb2d8'], [1, '#2a3552']]); ctx.fillRect(-(l.recoil > 0 ? 4 : 0), -3.5, 30, 7);
    ctx.strokeStyle = '#7fe8ff'; ctx.lineWidth = 1.4; ctx.strokeRect(-(l.recoil > 0 ? 4 : 0), -3.5, 30, 7);
    ctx.restore();
    ctx.fillStyle = GFX.rg(ctx, x - 6, y - 24, 2, 28, [[0, '#cfe9ff'], [0.5, '#3a4f7a'], [1, '#101a3a']]);
    ctx.beginPath(); ctx.arc(x, y - 4, 24, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(80,200,255,0.28)'; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = '#7fe8ff'; ctx.lineWidth = 1.6; ctx.stroke();
    if (this.st.autoEvery) { ctx.fillStyle = '#7dffb8'; ctx.beginPath(); ctx.arc(x - 12, y - 6, 2.2, 0, TAU); ctx.fill(); }
    if (l.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(x, y - 4, 24, Math.PI, 0); ctx.fill(); }
    drawShieldDome(ctx, x, y + 2, l.shield, t);
    const max = this.st.ammoMax, per = max > 12 ? 12 : max;
    for (let i = 0; i < max; i++) {
      const col = i % per, row = Math.floor(i / per), px = x - per * 3 + col * 6, py = y + 9 + row * 10;
      ctx.fillStyle = i < l.ammo ? (l.ammo <= 3 ? '#ff9a5a' : '#8fe8ff') : 'rgba(255,255,255,0.15)';
      ctx.fillRect(px, py, 3.6, 7);
    }
  };

  function drawBlast(ctx, b, t) {
    if (b.t < 0 || b.r < 1) return;
    const r = b.r, nuke = b.kind === 'nuke', flak = b.kind === 'flak', chain = b.kind === 'chain';
    const g = ctx.createRadialGradient(b.x, b.y, r * 0.15, b.x, b.y, r);
    g.addColorStop(0, nuke ? 'rgba(30,20,6,0.8)' : 'rgba(2,4,14,0.82)');
    g.addColorStop(0.75, chain ? 'rgba(50,20,8,0.55)' : flak ? 'rgba(50,34,6,0.55)' : 'rgba(10,30,60,0.55)');
    g.addColorStop(1, chain ? 'rgba(255,140,60,0.3)' : flak ? 'rgba(255,200,80,0.3)' : nuke ? 'rgba(255,230,160,0.35)' : 'rgba(90,200,255,0.3)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const lw = nuke ? 5 : 2.4;
    if (flak) { ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 40; }
    ctx.strokeStyle = 'rgba(255,60,90,0.55)'; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(b.x + 1.8, b.y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(70,200,255,0.6)'; ctx.beginPath(); ctx.arc(b.x - 1.8, b.y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = chain ? 'rgba(255,200,140,0.95)' : flak ? 'rgba(255,230,150,0.95)' : nuke ? 'rgba(255,250,220,1)' : 'rgba(230,248,255,0.95)'; ctx.lineWidth = lw * 0.8;
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  Game.render = function (ctx) {
    const t = this.time;
    for (const c of this.cities) drawCity(ctx, c, t);
    for (const l of this.launchers) this.drawLauncher(ctx, l);
    E.draw(ctx, this);
    if (this.boss) G.boss.draw(ctx, this, this.boss);
    // interceptors with trails and target marks
    for (const ic of this.icp) {
      const col = ic.auto ? '125,255,184' : ic.kind === 'flak' ? '255,210,90' : ic.kind === 'cluster' ? '255,150,255' : '120,225,255';
      const gr = ctx.createLinearGradient(ic.sx, ic.sy, ic.x, ic.y);
      gr.addColorStop(0, 'rgba(' + col + ',0)'); gr.addColorStop(1, 'rgba(' + col + ',0.9)');
      ctx.strokeStyle = gr; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(ic.sx, ic.sy); ctx.lineTo(ic.x, ic.y); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(195,100%,70%,1)', ic.x, ic.y, 9, 0.9); ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(230,248,255,0.75)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(ic.tx - 5, ic.ty - 5); ctx.lineTo(ic.tx + 5, ic.ty + 5); ctx.moveTo(ic.tx + 5, ic.ty - 5); ctx.lineTo(ic.tx - 5, ic.ty + 5); ctx.stroke();
    }
    for (const b of this.blasts) drawBlast(ctx, b, t);
    if (this.beam) {
      const bm = this.beam;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(60,200,255,0.4)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(bm.x0, bm.y0); ctx.lineTo(bm.x1, bm.y1); ctx.stroke();
      ctx.strokeStyle = 'rgba(220,250,255,0.95)'; ctx.lineWidth = 3.5 + Math.sin(t * 50); ctx.stroke();
      ctx.restore();
    }
    for (const k of this.pk) {
      const hue = k.kind === 'A' ? 150 : k.kind === 'R' ? 48 : k.kind === 'S' ? 205 : 25;
      ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(' + hue + ',100%,60%,1)', k.x, k.y, 26, 0.55 + Math.sin(k.t * 6) * 0.15); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(8,14,34,0.9)'; ctx.beginPath(); ctx.arc(k.x, k.y, 13, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'hsl(' + hue + ',100%,70%)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '800 14px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(k.kind, k.x, k.y + 1);
    }
    FX.drawNorm(ctx);
    ctx.globalCompositeOperation = 'lighter'; FX.drawAdd(ctx); ctx.globalCompositeOperation = 'source-over';
    FX.drawText(ctx);
  };
})((window.SGS = window.SGS || {}));
