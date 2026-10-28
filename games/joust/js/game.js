/* The rules: flapping flight, joust resolution (the higher rider wins), eggs that hatch into tougher riders, the lava hand, the wraith that hunts dawdlers, bosses, power-ups and the upgrade shop. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, A = G.audio, I = G.input, Art = G.art;
  const G0 = G.debug || {};
  const W = C.W, H = C.H, HW = 13, HH = 18;

  const Game = {
    demo: true, phase: 'demo', time: 0, wave: 1, score: 0, credits: 0, creditAcc: 0, lives: 3, plats: [], theme: C.THEMES[0], pads: [], p: null, foes: [], eggs: [], caps: [], bolts: [], boss: null, wraith: null,
    queue: [], waveT: 0, up: {}, chain: { n: 0, t: 0 }, nextLife: C.EXTRA_LIFE, onOver: null, onShop: null, banner: '', bannerT: 0, phaseT: 0, eggsLost: 0, eggsGot: 0, lifeBought: 0,
  };
  const U_ = (id) => Game.up[id] || 0;
  const wrapD = (a, b) => { let d = b - a; if (d > W / 2) d -= W; else if (d < -W / 2) d += W; return d; };

  /* ---------- the player's stats ---------- */
  const flapMul = () => 1 + 0.07 * U_('flap') + (Game.p && Game.p.pu.rapid > 0 ? 0.22 : 0);
  const maxSpeed = () => 215 * (1 + 0.06 * U_('speed')) * (Game.p && Game.p.pu.rapid > 0 ? 1.1 : 1);
  const lanceBonus = () => 3 * U_('lance') + (Game.p && Game.p.pu.lance > 0 ? 10 : 0);
  const lanceLen = () => 34 * (1 + 0.14 * U_('lance') + (Game.p && Game.p.pu.lance > 0 ? 0.3 : 0));
  const magnetRange = () => 45 * U_('magnet') + (Game.p && Game.p.pu.magnet > 0 ? 160 : 0);
  const hatchTime = (n) => Math.max(4.2, 7.6 - n * 0.12) + 1.2 * U_('timer');

  Game.shopItems = function () {
    return C.UPGRADES.map((u) => {
      const lvl = U_(u.id);
      const price = u.id === 'life' ? u.price + 130 * Game.lifeBought : Math.round(u.price * (1 + lvl * 0.9) / 10) * 10;
      return { id: u.id, name: u.name, desc: u.desc, have: u.id === 'life' ? Game.lives : lvl, max: u.id === 'life' ? 9 : u.max, price, life: u.id === 'life' };
    });
  };
  Game.buy = function (id) {
    const it = Game.shopItems().find((x) => x.id === id);
    if (!it || it.have >= it.max || Game.credits < it.price) return false;
    Game.credits -= it.price; Game.creditAcc = Math.min(Game.creditAcc, Game.credits);
    if (id === 'life') { Game.lives++; Game.lifeBought++; } else Game.up[id] = U_(id) + 1;
    A.sfx.buy();
    return true;
  };

  /* ---------- setup ---------- */
  Game.reset = function (demo) {
    Game.demo = !!demo; Game.score = 0; Game.credits = 0; Game.creditAcc = 0; Game.lives = C.START_LIVES; Game.up = {}; Game.lifeBought = 0; Game.nextLife = C.EXTRA_LIFE;
    Game.time = 0; FX.reset();
    Game.startWave(demo ? 1 : (G0.level || 1));
    Game.phase = demo ? 'demo' : 'ready';
  };

  Game.startWave = function (n) {
    Game.wave = n;
    const boss = n % 5 === 0 && !Game.demo;
    Game.isBoss = boss;
    const arena = boss ? C.BOSS_ARENA : C.ARENAS[(n - 1) % C.ARENAS.length];
    Game.plats = arena.map((a) => ({ x: a[0], y: a[1], w: a[2], h: C.PLAT_H }));
    Game.theme = C.THEMES[(n - 1) % C.THEMES.length];
    Game.pads = Game.plats.filter((p) => p.y < 420).map((p) => ({ x: p.x + p.w / 2, y: p.y, t: -1 }));
    Game.foes = []; Game.eggs = []; Game.caps = []; Game.bolts = []; Game.wraith = null; Game.boss = null;
    Game.waveT = 0; Game.eggsLost = 0; Game.eggsGot = 0; Game.chain = { n: 0, t: 0 };
    /* the start platform: the lowest one nearest the middle */
    let sp = Game.plats[0];
    for (const p of Game.plats) if (p.y > sp.y || (p.y === sp.y && Math.abs(p.x + p.w / 2 - W / 2) < Math.abs(sp.x + sp.w / 2 - W / 2))) sp = p;
    Game.startPlat = sp;
    const keep = Game.p;
    Game.p = { x: sp.x + sp.w / 2, y: sp.y - HH, vx: 0, vy: 0, face: 1, ground: true, flapA: 0, flapT: 0, run: 0, inv: 1.5, shield: U_('shield'), dead: false, pu: { rapid: 0, lance: 0, magnet: 0 }, grab: null, lance: 34 };
    const total = boss ? 2 : Math.min(16, 3 + n), q = [];
    let t = 1.6;
    for (let i = 0; i < total; i++) {
      const r = Math.random(), t3 = U.clamp((n - 5) * 0.08, 0, 0.5), t2 = U.clamp((n - 2) * 0.12, 0, 0.7);
      q.push({ t: (t += U.rand(1.1, 2.2)), tier: r < t3 ? 2 : r < t3 + t2 ? 1 : 0 });
    }
    Game.queue = q;
    if (boss) Game.spawnBoss();
    if (Game.demo) { for (let i = 0; i < 3; i++) Game.spawnFoe(0, Game.pads[i % Game.pads.length]); }
    Game.phase = Game.demo ? 'demo' : 'ready'; Game.phaseT = 2.0;
    Game.banner = boss ? 'BOSS: ' + C.BOSSES[Game.boss.skin].name : 'WAVE ' + n; Game.bannerT = 2.0;
    if (!Game.demo) A.sfx.ready();
  };

  Game.addScore = function (n) {
    Game.score += n; Game.creditAcc += n / 10; Game.credits = Math.floor(Game.creditAcc);
    while (Game.score >= Game.nextLife) { Game.nextLife += C.EXTRA_LIFE; Game.lives++; A.sfx.extra(); FX.text(W / 2, 200, '1UP', '#7dffb0', 26); }
  };

  /* ---------- physics ---------- */
  function collide(e, hw, hh, bounce) {
    e.ground = false;
    for (const pl of Game.plats) {
      const l = e.x - hw, r = e.x + hw, t = e.y - hh, b = e.y + hh;
      if (r <= pl.x || l >= pl.x + pl.w || b <= pl.y || t >= pl.y + pl.h) continue;
      const dTop = b - pl.y, dBot = pl.y + pl.h - t, dL = r - pl.x, dR = pl.x + pl.w - l, m = Math.min(dTop, dBot, dL, dR);
      if (m === dTop && e.vy >= -20) { e.y -= dTop; if (bounce && e.vy > 90) e.vy = -e.vy * bounce; else e.vy = 0; e.ground = true; }
      else if (m === dBot) { e.y += dBot; e.vy = Math.max(e.vy, 70); }
      else if (m === dL) { e.x -= dL; e.vx = -Math.abs(e.vx) * 0.5; }
      else { e.x += dR; e.vx = Math.abs(e.vx) * 0.5; }
    }
  }
  function wrapX(e) { if (e.x < -10) e.x += W + 20; else if (e.x > W + 10) e.x -= W + 20; }

  function stepRider(e, dt, dir, flap, maxS, fmul, accelMul) {
    if (e.grab) return;
    const ground = e.ground;
    const acc = (ground ? 1000 : 380) * (accelMul || 1);
    if (dir) { e.vx += dir * acc * dt; e.vx = U.clamp(e.vx, -maxS, maxS); e.face = dir; }
    else if (ground) { const f = 900 * dt; e.vx = Math.abs(e.vx) <= f ? 0 : e.vx - Math.sign(e.vx) * f; }
    else e.vx *= 1 - 0.3 * dt;
    e.vy = Math.min(C.MAX_FALL, e.vy + C.GRAVITY * dt);
    if (flap) {
      e.vy = Math.max(e.vy - C.FLAP * fmul, -C.MAX_RISE * fmul); e.ground = false; e.flapA = 0; e.flapping = 0.28; if (e === Game.p) A.sfx.flap();
      if (!S.reduced) { const col = e.tier === undefined ? 'rgba(126,232,255,0.8)' : C.TIERS[e.tier].col; for (let k = 0; k < 3; k++) FX.trail(e.x - e.face * (4 + k * 6) + U.rand(-3, 3), e.y + 14 + k * 2, col, 5 + k, 0.35); }
    }
    if (!S.reduced && !ground && Math.abs(e.vx) > 170 && Math.random() < dt * 22) FX.trail(e.x - e.face * 16, e.y + U.rand(-4, 8), e.tier === undefined ? 'rgba(126,232,255,0.6)' : C.TIERS[e.tier].col, 6, 0.3);
    if (e.flapping > 0) { e.flapping -= dt; e.flapA += dt * 30; } else e.flapA = ground ? 0.2 : 1.2 + Math.sin(Game.time * 3) * 0.2;
    e.x += e.vx * dt; e.y += e.vy * dt;
    wrapX(e);
    if (e.y < HH) { e.y = HH; e.vy = Math.max(e.vy, 50); }
    const wasAir = !ground, fall = e.vy;
    collide(e, HW, HH, 0);
    if (e.ground && wasAir && fall > 140 && !S.reduced) { FX.sparks(e.x, e.y + HH, 6, 70, 'rgba(200,230,255,0.9)', 0.3, 1.4); FX.ring(e.x, e.y + HH - 2, 3, 22, 'rgba(160,200,255,0.5)', 0.25, 1.5); }
    if (e.ground) e.run += Math.abs(e.vx) * dt * 0.12;
    if (e.vx > 25) e.face = 1; else if (e.vx < -25) e.face = -1;
  }

  /* the lava hand grabs riders that dip too low and pulls them under */
  function lavaGrab(e, dt, isPlayer, flapped) {
    if (!e.grab) {
      if (!e.ground && e.y + HH > C.GRAB_Y && e.y < C.LAVA_Y) { e.grab = { t: 0 }; if (isPlayer) A.sfx.grab(); }
      return;
    }
    e.vx *= 0.9; e.vy = 0; e.y += 74 * dt; e.grab.t += dt;
    if (flapped || (!isPlayer && Math.random() < dt * 7)) { e.y -= 38; if (isPlayer) A.sfx.flap(); }
    if (e.y + HH < C.GRAB_Y - 18) { e.grab = null; e.vy = -280; }
    else if (e.y + HH >= C.LAVA_Y) {
      FX.sparks(e.x, C.LAVA_Y, 18, 190, 'rgba(255,150,60,1)', 0.7); FX.ring(e.x, C.LAVA_Y, 6, 50, 'rgba(255,120,40,1)', 0.5, 3); A.sfx.sizzle();
      e.grab = null;
      if (isPlayer) {
        if (Game.p.shield > 0) { Game.p.shield--; Game.p.y = C.GRAB_Y - 90; Game.p.vy = -420; Game.p.inv = 1.4; A.sfx.shield(); }
        else hitPlayer(true);
      } else { e.dead = true; }
    }
  }

  /* ---------- foes ---------- */
  Game.spawnFoe = function (tier, pad, x, y, vy) {
    const t = C.TIERS[tier];
    const f = { x: x !== undefined ? x : pad.x, y: y !== undefined ? y : pad.y - HH - 2, vx: 0, vy: vy || -140, face: Math.random() < 0.5 ? -1 : 1, ground: false, flapA: 0, run: 0, tier, ai: { flapT: U.rand(0.1, 0.5), tgtT: 0, tx: W / 2, ty: 200, standT: 0 }, dead: false, grab: null, lance: 34 };
    Game.foes.push(f);
    return f;
  };

  function aiUpdate(f, dt) {
    const T = C.TIERS[f.tier], ai = f.ai, p = Game.p;
    ai.flapT -= dt;
    let dir = 0, wantFlap = false;
    const chase = !Game.demo && p && !p.dead && Game.phase === 'play';
    if (chase) {
      const dx = wrapD(f.x, p.x), above = f.y < p.y - 26;
      const aggr = T.aggr * (0.8 + 0.2 * Math.min(1, Game.wave / 8));
      if (Math.abs(dx) > 26) dir = Math.sign(dx);
      if (!above && Math.abs(dx) < 150 && Math.random() < 0.5 + (1 - aggr) * 0.4) dir = -dir || dir;            /* below the player: back off and climb */
      if (Math.abs(dx) < 40 && above && f.y > p.y - 70) dir = Math.sign(dx);
      const goalY = p.y - 30 - 80 * aggr + Math.sin(Game.time * 0.9 + f.x) * 24;
      if (f.y > goalY + 10 && f.vy > -90) wantFlap = true;
    } else {
      ai.tgtT -= dt;
      if (ai.tgtT <= 0) { ai.tgtT = U.rand(1.5, 3.5); ai.tx = U.rand(60, W - 60); ai.ty = U.rand(110, 380); }
      const dx = wrapD(f.x, ai.tx); if (Math.abs(dx) > 30) dir = Math.sign(dx);
      if (f.y > ai.ty + 10 && f.vy > -90) wantFlap = true;
    }
    if (f.y + HH > C.GRAB_Y - 40 && !f.ground) wantFlap = true;                    /* stay clear of the lava */
    if (f.ground) { ai.standT += dt; if (ai.standT > 0.5) { wantFlap = true; ai.standT = 0; } }
    if (!wantFlap && Math.random() < dt * 0.9) wantFlap = true;
    let flap = false;
    if (wantFlap && ai.flapT <= 0) { flap = true; ai.flapT = (1 / T.flapRate) * U.rand(0.7, 1.3) * (f.y + HH > C.GRAB_Y - 60 ? 0.5 : 1); }
    stepRider(f, dt, dir, flap, T.speed, 1, 1);
    lavaGrab(f, dt, false, false);
  }

  /* ---------- eggs and capsules ---------- */
  function dropEgg(f) {
    Game.eggs.push({ x: f.x, y: f.y, vx: f.vx * 0.4, vy: -130, tier: f.tier, t: 0, hatchT: hatchTime(Game.wave), hatching: 0, dead: false });
  }
  function dropCap(x, y, force) {
    if (!force && Math.random() > 0.13) return;
    const r = Math.random() * 100;
    const type = r < 28 ? 'S' : r < 52 ? 'R' : r < 74 ? 'L' : r < 96 ? 'M' : 'U';
    Game.caps.push({ x, y, vx: U.rand(-40, 40), vy: -150, type, t: 0, dead: false });
  }
  function bodyUpdate(o, dt, rest, ground) {
    o.vy = Math.min(C.MAX_FALL, o.vy + C.GRAVITY * dt);
    o.x += o.vx * dt; o.y += o.vy * dt; wrapX(o);
    collide(o, 8, 10, rest);
    if (o.ground) o.vx *= 1 - 3 * dt;
    if (o.y < 10) { o.y = 10; o.vy = Math.abs(o.vy) * 0.3; }
  }

  function eggsUpdate(dt) {
    const p = Game.p, mr = magnetRange();
    for (const g of Game.eggs) {
      g.t += dt;
      bodyUpdate(g, dt, 0.42);
      if (mr > 0 && p && !p.dead) {
        const dx = wrapD(g.x, p.x), dy = p.y - g.y, d = Math.hypot(dx, dy);
        if (d < mr && d > 1) { g.vx += dx / d * 520 * dt; g.vy += dy / d * 420 * dt - C.GRAVITY * dt * 0.5; }
      }
      if (g.y > C.LAVA_Y) { g.dead = true; Game.eggsLost++; Game.chain.n = 0; FX.sparks(g.x, C.LAVA_Y, 8, 130, 'rgba(255,150,60,1)', 0.5); A.sfx.sizzle(); continue; }
      if (g.hatching > 0) {
        g.hatching -= dt;
        if (g.hatching <= 0) { g.dead = true; hatchEgg(g); }
      } else if (g.t >= g.hatchT) { g.hatching = 1.4; A.sfx.crack(); }
      if (p && !p.dead && !g.dead && Math.abs(wrapD(g.x, p.x)) < 24 && Math.abs(g.y - p.y) < 28 && !Game.demo) collectEgg(g);
    }
    Game.eggs = Game.eggs.filter((g) => !g.dead);
  }
  function collectEgg(g) {
    g.dead = true; Game.eggsGot++;
    Game.chain.n = Game.chain.t > 0 ? Math.min(4, Game.chain.n + 1) : 1; Game.chain.t = 4;
    const pts = 250 * Game.chain.n;
    Game.addScore(pts);
    FX.text(g.x, g.y - 14, String(pts), '#ffe45a', 15 + Game.chain.n * 2);
    FX.ring(g.x, g.y, 4, 30, C.TIERS[g.tier].col, 0.4, 2.5);
    A.sfx.egg(Game.chain.n);
  }
  function hatchEgg(g) {
    const tier = Math.min(2, g.tier + 1);
    Game.spawnFoe(tier, null, g.x, g.y - 6, -170);
    FX.ring(g.x, g.y, 4, 38, C.TIERS[tier].col, 0.5, 3); A.sfx.hatch();
    Game.chain.n = 0;
  }
  function capsUpdate(dt) {
    const p = Game.p;
    for (const c of Game.caps) {
      c.t += dt; bodyUpdate(c, dt, 0.5);
      if (c.y > C.LAVA_Y || c.t > 14) { c.dead = true; continue; }
      if (p && !p.dead && Math.abs(wrapD(c.x, p.x)) < 24 && Math.abs(c.y - p.y) < 28 && !Game.demo) {
        c.dead = true;
        const names = { S: 'SHIELD', R: 'RAPID WINGS', L: 'BIG LANCE', M: 'MAGNET', U: '1UP' };
        if (c.type === 'S') p.shield = Math.min(2, p.shield + 1);
        else if (c.type === 'R') p.pu.rapid = 12; else if (c.type === 'L') p.pu.lance = 12; else if (c.type === 'M') p.pu.magnet = 12; else Game.lives = Math.min(9, Game.lives + 1);
        Game.addScore(200); FX.text(c.x, c.y - 18, names[c.type], Art.CAP[c.type][0], 14); FX.ring(c.x, c.y, 5, 36, Art.CAP[c.type][0], 0.45, 2.5); A.sfx.power();
      }
    }
    Game.caps = Game.caps.filter((c) => !c.dead);
  }

  /* ---------- the joust ---------- */
  function killFoe(f, byPlayer) {
    f.dead = true;
    const T = C.TIERS[f.tier];
    FX.explosion(f.x, f.y, 1.4, f.tier === 0 ? 355 : f.tier === 1 ? 225 : 45);
    if (byPlayer) { Game.addScore(T.pts); FX.text(f.x, f.y - 22, String(T.pts), '#fff', 15); }
    dropEgg(f); dropCap(f.x, f.y);
    A.sfx.kill();
  }
  function bounceApart(a, b) {
    const dx = wrapD(a.x, b.x) || (Math.random() - 0.5), s = Math.sign(dx) || 1;
    const va = a.vx, vb = b.vx;
    a.vx = vb * 0.9 - s * 70; b.vx = va * 0.9 + s * 70;
    const vya = a.vy; a.vy = Math.min(b.vy, -60) * 0.7; b.vy = Math.min(vya, -60) * 0.7;
    a.x -= s * 4; b.x += s * 4;
    A.sfx.clash();
  }
  function jousts() {
    const p = Game.p;
    for (const f of Game.foes) {
      if (f.dead) continue;
      if (!p.dead && Game.phase === 'play') {
        const dx = Math.abs(wrapD(p.x, f.x)), dy = p.y - f.y;
        if (dx < 28 && Math.abs(dy) < 34) {
          const d = dy - lanceBonus();
          if (Math.abs(d) <= 7) { bounceApart(p, f); FX.sparks((p.x + f.x) / 2, (p.y + f.y) / 2, 6, 120, 'rgba(255,255,255,1)', 0.3); }
          else if (d < 0) { killFoe(f, true); p.vy = -150; FX.addShake(2); }
          else if (p.inv <= 0) { if (hitPlayer(false, f)) { f.vx = Math.sign(wrapD(p.x, f.x)) * 160; } }
          else bounceApart(p, f);
        }
      }
    }
    for (let i = 0; i < Game.foes.length; i++) for (let j = i + 1; j < Game.foes.length; j++) {
      const a = Game.foes[i], b = Game.foes[j];
      if (a.dead || b.dead) continue;
      if (Math.abs(wrapD(a.x, b.x)) < 26 && Math.abs(a.y - b.y) < 30) bounceApart(a, b);
    }
  }

  function hitPlayer(lava, by) {
    const p = Game.p;
    if (p.dead || Game.demo || G0.god || Game.phase !== 'play') return false;
    if (!lava && p.shield > 0) { p.shield--; p.inv = 1.4; FX.ring(p.x, p.y, 8, 54, 'rgba(125,255,176,1)', 0.5, 3); A.sfx.shield(); p.vy = -160; p.vx = -p.face * 160; return true; }
    p.dead = true; Game.phase = 'dying'; Game.phaseT = 1.4;
    FX.explosion(p.x, p.y, 2.2, 50); FX.doFlash(0.3, '255,200,120'); FX.addShake(5);
    A.sfx.die();
    return true;
  }

  /* ---------- the wraith: a hunter that appears if a wave drags on ---------- */
  function wraithUpdate(dt) {
    const p = Game.p;
    const limit = Math.max(32, 58 - Game.wave * 1.6);
    if (!Game.wraith && !Game.isBoss && Game.waveT > limit && Game.phase === 'play') {
      const side = Math.random() < 0.5 ? -1 : 1;
      Game.wraith = { x: side < 0 ? -50 : W + 50, y: U.rand(110, 300), vx: -side * 200, face: -side, t: 0 };
      FX.text(W / 2, 90, 'THE WRAITH APPROACHES', '#c9a0ff', 18); A.sfx.wraith();
    }
    const w = Game.wraith;
    if (!w) return;
    w.t += dt;
    const dx = wrapD(w.x, p.x), dy = p.y - w.y, sp = 215 + Math.min(80, Game.wave * 6);
    const ax = Math.sign(dx) * 360, ay = Math.sign(dy) * 250 + Math.sin(w.t * 2.6) * 160;
    w.vx = U.clamp(w.vx + ax * dt, -sp, sp); w.vy = U.clamp((w.vy || 0) + ay * dt, -160, 160);
    w.x += w.vx * dt; w.y = U.clamp(w.y + w.vy * dt, 40, C.GRAB_Y - 30); wrapX(w);
    w.face = w.vx >= 0 ? 1 : -1;
    if (p.dead || Game.phase !== 'play') return;
    const tipX = p.x + p.face * (2 + lanceLen()), tipY = p.y - 15, hx = w.x + w.face * 26, hy = w.y - 1;
    if (Math.hypot(wrapD(tipX, hx), tipY - hy) < 12 + 2 * U_('lance') + (p.pu.lance > 0 ? 6 : 0)) {
      FX.explosion(w.x, w.y, 2.6, 275); Game.addScore(1000); FX.text(w.x, w.y - 26, '1000', '#c9a0ff', 20); FX.addShake(3); A.sfx.kill();
      Game.wraith = null; Game.waveT = limit - 28; dropCap(w.x, w.y, true);
    } else if (Math.abs(wrapD(w.x, p.x)) < 28 && Math.abs(w.y - p.y) < 20) {
      if (p.inv <= 0) { if (hitPlayer(false)) { w.vx = -w.vx; } }
    }
  }

  /* ---------- the boss ---------- */
  Game.spawnBoss = function () {
    const sk = ((Game.wave / 5 - 1) % 3 + 3) % 3, hp = 5 + 2 * Math.floor(Game.wave / 5);
    Game.boss = { skin: sk, x: W / 2, y: 140, face: 1, hp, max: hp, flash: 0, invul: 1.5, t: 0, spawnT: 4, atkT: 5, mode: 'cruise', modeT: 0, tx: 0, ty: 0, dead: false, arrive: 0 };
  };
  function bossUpdate(dt) {
    const b = Game.boss, p = Game.p;
    if (!b || b.dead) return;
    b.t += dt; if (b.flash > 0) b.flash -= dt; if (b.invul > 0) b.invul -= dt;
    b.arrive = Math.min(1, b.arrive + dt / 1.5);
    if (b.mode === 'cruise') {
      const nx = W / 2 + Math.sin(b.t * 0.55) * 330, ny = 130 + Math.sin(b.t * 0.9) * 26;
      b.face = nx > b.x ? 1 : -1; b.x += (nx - b.x) * Math.min(1, dt * 2.5); b.y += (ny - b.y) * Math.min(1, dt * 2.5);
    } else if (b.mode === 'tele') { b.modeT -= dt; b.flash = 0.05; if (b.modeT <= 0) { b.mode = 'dive'; b.modeT = 1.1; b.tx = p.x; b.ty = Math.min(p.y, C.GRAB_Y - 60); } }
    else if (b.mode === 'dive') {
      b.modeT -= dt; const dx = wrapD(b.x, b.tx), dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1;
      b.x += dx / d * 330 * dt; b.y += dy / d * 330 * dt; wrapX(b); b.face = dx > 0 ? 1 : -1;
      if (b.modeT <= 0) b.mode = 'cruise';
    }
    if (b.arrive < 1) return;
    b.spawnT -= dt; b.atkT -= dt;
    if (b.skin === 1 && b.spawnT <= 0 && Game.foes.length < 3) { b.spawnT = 5; Game.spawnFoe(0, null, b.x, b.y + 30, 40); }
    if (b.atkT <= 0) {
      b.atkT = Math.max(2.6, 5 - Game.wave * 0.05);
      if (b.skin === 0) { b.mode = 'tele'; b.modeT = 0.9; A.sfx.wraith(); }
      else if (b.skin === 2) { for (const a of [-0.45, 0, 0.45]) Game.bolts.push({ x: b.x, y: b.y + 10, vx: Math.sin(a) * 190 + b.face * 40, vy: Math.cos(a) * 190, life: 6 }); A.sfx.bolt(); }
    }
    if (p.dead || Game.phase !== 'play') return;
    const dx = wrapD(b.x, p.x), dy = p.y - b.y;
    if (Math.abs(dx) < 58 && Math.abs(dy) < 42) {
      if (dy < -6 && p.vy > -120 && b.invul <= 0) {
        b.hp--; b.flash = 0.5; b.invul = 1.1; p.vy = -330; p.vx = Math.sign(dx || 1) * -120;
        FX.explosion(p.x, p.y + 14, 1.2, 55); FX.addShake(3); Game.addScore(500); FX.text(b.x, b.y - 50, '500', '#fff', 16); A.sfx.core();
        if (b.hp <= 0) bossDie(b);
      } else if (b.invul <= 0 || dy > 0) { if (p.inv <= 0 && hitPlayer(false)) { p.vy = 120; } }
      else if (dy < -6) { p.vy = -250; }
    }
  }
  function bossDie(b) {
    b.dead = true;
    FX.explosion(b.x, b.y, 4.5, 30); for (let i = 0; i < 6; i++) FX.explosion(b.x + U.rand(-70, 70), b.y + U.rand(-40, 40), 2, 20 + i * 45);
    FX.doFlash(0.6, '255,230,160'); FX.addShake(6); A.sfx.bossDie();
    const bonus = 5000 + Game.wave * 300; Game.addScore(bonus); FX.text(b.x, b.y - 60, 'BOSS DOWN +' + bonus, '#ffe45a', 24);
    for (const f of Game.foes) { f.dead = true; FX.explosion(f.x, f.y, 1.2, 355); }
    Game.bolts = []; dropCap(b.x, b.y, true); dropCap(b.x + 30, b.y, true);
  }
  function boltsUpdate(dt) {
    const p = Game.p;
    for (const b of Game.bolts) {
      b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; wrapX(b);
      if (b.life <= 0 || b.y > C.LAVA_Y) { b.dead = true; continue; }
      for (const pl of Game.plats) if (b.x > pl.x && b.x < pl.x + pl.w && b.y > pl.y && b.y < pl.y + pl.h) { b.dead = true; FX.sparks(b.x, b.y, 5, 80, 'rgba(200,150,255,1)', 0.25); }
      if (!b.dead && !p.dead && Math.abs(wrapD(b.x, p.x)) < 16 && Math.abs(b.y - p.y) < 22) { b.dead = true; if (p.inv <= 0) hitPlayer(false); }
    }
    Game.bolts = Game.bolts.filter((b) => !b.dead);
  }

  /* ---------- phases ---------- */
  function respawn() {
    const p = Game.p, sp = Game.startPlat;
    p.dead = false; p.x = sp.x + sp.w / 2; p.y = sp.y - HH; p.vx = p.vy = 0; p.ground = true; p.inv = 2.6; p.grab = null; p.shield = Math.max(p.shield, U_('shield'));
    p.pu = { rapid: 0, lance: 0, magnet: 0 };
    for (const f of Game.foes) if (Math.abs(wrapD(f.x, p.x)) < 120 && f.y > sp.y - 120) { f.y = Math.max(40, sp.y - 200); f.vy = -100; }
    Game.bolts = [];
  }

  Game.update = function (dt) {
    Game.time += dt;
    FX.update(dt);
    const p = Game.p, ph = Game.phase;
    if (Game.demo) {
      for (const f of Game.foes) aiUpdate(f, dt);
      Game.foes = Game.foes.filter((f) => !f.dead);
      while (Game.foes.length < 3) Game.spawnFoe(Math.floor(Math.random() * 3), Game.pads[Math.floor(Math.random() * Game.pads.length)]);
      return;
    }
    if (Game.bannerT > 0) Game.bannerT -= dt;
    if (p.inv > 0) p.inv -= dt;
    for (const k in p.pu) if (p.pu[k] > 0) p.pu[k] -= dt;
    p.lance = lanceLen();
    if (Game.chain.t > 0) Game.chain.t -= dt;
    if (ph === 'ready') {
      Game.phaseT -= dt; I.takeFlap();
      stepRider(p, dt, 0, false, maxSpeed(), 1, 1);
      if (Game.phaseT <= 0) Game.phase = 'play';
      return;
    }
    if (ph === 'dying') {
      Game.phaseT -= dt;
      for (const f of Game.foes) aiUpdate(f, dt);
      eggsUpdate(dt); capsUpdate(dt);
      if (Game.phaseT <= 0) {
        Game.lives--;
        if (Game.lives <= 0) { Game.phase = 'over'; if (Game.onOver) Game.onOver(); return; }
        respawn(); Game.phase = 'play';
      }
      return;
    }
    if (ph === 'clear') { Game.phaseT -= dt; stepRider(p, dt, I.dir, I.takeFlap(), maxSpeed(), flapMul(), 1); if (Game.phaseT <= 0) { Game.phase = 'shop'; if (Game.onShop) Game.onShop(); else Game.leaveShop(); } return; }
    if (ph !== 'play') return;
    Game.waveT += dt;
    /* the player */
    const flapped = I.takeFlap() > 0;
    if (p.grab) { p.vx = 0; lavaGrab(p, dt, true, flapped); }
    else { stepRider(p, dt, I.dir, flapped, maxSpeed(), flapMul(), p.pu.rapid > 0 ? 1.25 : 1); lavaGrab(p, dt, true, false); }
    if (Game.phase !== 'play') return;
    /* spawns */
    Game.waveClock = (Game.waveClock || 0);
    while (Game.queue.length && Game.queue[0].t <= Game.waveT && Game.foes.length < Math.min(8, 3 + Math.floor(Game.wave / 2))) {
      const q = Game.queue.shift(), pad = Game.pads[Math.floor(Math.random() * Game.pads.length)];
      pad.t = 0; pad.tier = q.tier; pad.spawning = true;
    }
    for (const pad of Game.pads) if (pad.spawning) { pad.t += dt; if (pad.t >= 0.9) { pad.spawning = false; Game.spawnFoe(pad.tier, pad); A.sfx.spawn(); pad.t = -1; } }
    for (const f of Game.foes) aiUpdate(f, dt);
    jousts();
    Game.foes = Game.foes.filter((f) => !f.dead);
    eggsUpdate(dt); capsUpdate(dt); wraithUpdate(dt); bossUpdate(dt); boltsUpdate(dt);
    if (Game.phase !== 'play') return;
    const bossDone = !Game.boss || Game.boss.dead;
    const padsBusy = Game.pads.some((q) => q.spawning);
    if (!Game.queue.length && !Game.foes.length && !Game.eggs.length && bossDone && !padsBusy) {
      Game.phase = 'clear'; Game.phaseT = 1.6; Game.wraith = null;
      let bonus = 1000 * Game.wave;
      if (Game.eggsLost === 0 && Game.eggsGot > 0) { bonus += 2000; FX.text(W / 2, 250, 'PERFECT CLUTCH +2000', '#7dffb0', 18); }
      Game.addScore(bonus); Game.creditAcc += 15 + Game.wave * 5; Game.credits = Math.floor(Game.creditAcc);
      Game.banner = Game.isBoss ? 'BOSS DEFEATED' : 'WAVE CLEAR'; Game.bannerT = 1.8; Game.clearBonus = bonus;
      A.sfx.clear();
    }
  };
  Game.leaveShop = function () { Game.startWave(Game.wave + 1); };

  /* ---------- drawing ---------- */
  Game.render = function (ctx) {
    const t = Game.time, th = Game.theme, p = Game.p;
    Art.drawLava(ctx, t, th);
    for (const pl of Game.plats) { Art.platformGlow(ctx, pl, th); Art.drawPlatform(ctx, pl, th, t); }
    for (const pad of Game.pads) if (pad.spawning) Art.drawPad(ctx, pad.x, pad.y, pad.t / 0.9, th);
    const hands = [];
    if (p.grab && !p.dead) hands.push(p);
    for (const f of Game.foes) if (f.grab) hands.push(f);
    for (const h of hands) Art.drawHand(ctx, h.x, h.y + HH, t, th);
    for (const g of Game.eggs) Art.drawEgg(ctx, g, t);
    for (const c of Game.caps) Art.drawCapsule(ctx, c, t);
    if (Game.boss && !Game.boss.dead) Art.drawBoss(ctx, Game.boss, t);
    for (const f of Game.foes) Art.drawRider(ctx, f, t, null);
    if (Game.wraith) Art.drawWraith(ctx, Game.wraith, t);
    for (const b of Game.bolts) Art.drawBolt(ctx, b, t);
    if (!Game.demo && !(p.dead && Game.phase === 'dying')) Art.drawRider(ctx, p, t, { shield: p.shield > 0, blink: p.inv > 0 && Math.floor(t * 14) % 2 && Game.phase !== 'ready', big: p.pu.lance > 0 });
    ctx.globalCompositeOperation = 'lighter'; FX.drawAdd(ctx); ctx.globalCompositeOperation = 'source-over';
    FX.drawNorm(ctx); FX.drawText(ctx);
  };

  G.game = Game;
})((window.SGS = window.SGS || {}));
