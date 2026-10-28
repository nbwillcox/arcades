/* The rules: the climber, barrels, fireballs, pies, springs, lifts, rivets, hammers and the four stages. All positions are arcade units (224 x 256). */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, A = G.audio, I = G.input, Stages = G.stages, Art = G.art;
  const G0 = G.debug || {};
  const PH = 14;                                                   /* the climber's height */

  const Game = {
    demo: true, phase: 'demo', time: 0, stage: 0, st: null, score: 0, lives: 3, p: null, barrels: [], fires: [], pies: [], springs: [], nextLife: C.EXTRA_LIFE, onOver: null,
    banner: '', bannerT: 0, phaseT: 0, victory: false, dkT: 2, pieT: 2, springT: 2, fireT: 8, jumpCombo: 0, collapse: 0,
  };
  Game.sx = (x) => C.OX + x * C.K; Game.sy = (y) => C.OY + y * C.K;
  const wx = Game.sx, wy = Game.sy;

  /* ---------- setup ---------- */
  Game.reset = function (demo) {
    Game.demo = !!demo; Game.score = 0; Game.lives = C.START_LIVES; Game.nextLife = C.EXTRA_LIFE; Game.time = 0; Game.victory = false; FX.reset();
    Game.startStage(demo ? 0 : Math.max(0, Math.min(3, (G0.level || 1) - 1)));
    Game.phase = demo ? 'demo' : 'ready';
  };

  Game.startStage = function (i) {
    Game.stage = i; Game.st = Stages.make(i);
    Game.barrels = []; Game.fires = []; Game.pies = []; Game.springs = [];
    Game.dkT = 2.4; Game.pieT = 1.8; Game.springT = 2.2; Game.fireT = 9; Game.collapse = 0; Game.jumpCombo = 0;
    for (const f of (Game.st.fires || [])) Game.spawnFire(f.g, f.x, f.hunt);
    Game.spawnPlayer();
    Game.phase = Game.demo ? 'demo' : 'ready'; Game.phaseT = 2.0;
    const si = C.STAGES[i];
    Game.banner = si.name; Game.banner2 = si.sub; Game.bannerT = 2.0;
    if (!Game.demo) A.sfx.ready();
  };

  Game.spawnPlayer = function () {
    const s = Game.st.start;
    Game.p = { x: s.x, y: s.g.at(s.x), vx: 0, vy: 0, state: 'ground', g: s.g, lad: null, face: 1, hammer: 0, anim: 0, peak: 0, dead: false, inv: 1.6, jumped: new Set(), swing: 0, moving: false };
  };

  Game.addScore = function (n) {
    Game.score += n;
    while (Game.score >= Game.nextLife) { Game.nextLife += C.EXTRA_LIFE; Game.lives++; A.sfx.extra(); FX.text(wx(112), wy(120), '1UP', '#7dffb0', 24); }
  };

  /* ---------- spawning ---------- */
  Game.spawnBarrel = function () {
    const g = Game.st.top, x = Game.st.dk.x + 22;
    Game.barrels.push({ x, y: g.at(x) - 5, g, dir: 1, state: 'roll', vy: 0, vx: 0, lad: null, rot: 0, scored: false, skip: null, dead: false });
    A.sfx.throw();
  };
  Game.spawnFire = function (g, x, hunt) {
    Game.fires.push({ x, y: g.at(x) - 6, g, dir: Math.random() < 0.5 ? -1 : 1, state: 'walk', lad: null, dv: 0, skip: null, frozen: 0, hunt: !!hunt, t: Math.random() * 6, dead: false, turnT: U.rand(1, 3) });
  };
  Game.spawnPie = function (g) {
    const x = g.v > 0 ? g.x1 + 2 : g.x2 - 2;
    Game.pies.push({ x, y: g.at(x) - 3, g, dead: false });
  };
  Game.spawnSpring = function () {
    const dk = Game.st.dk, g = Game.st.top;
    Game.springs.push({ x: dk.x + 22, y: g.at(dk.x + 22) - 6, vx: 34, vy: -60, dead: false, t: 0 });
    A.sfx.throw();
  };

  /* ---------- the climber ---------- */
  function ladderNear(p, dy) {
    for (const L of Game.st.ladders) {
      if (Math.abs(p.x - L.x) > 5) continue;
      if (dy < 0 && p.g === L.gb && Math.abs(p.y - L.yb) < 4) return L;
      if (dy > 0 && p.g === L.gt && Math.abs(p.y - L.yt) < 4) return L;
    }
    return null;
  }
  Game.die = function (why) {
    const p = Game.p;
    if (p.dead || Game.demo || G0.god || Game.phase !== 'play') return;
    p.dead = true; Game.phase = 'dying'; Game.phaseT = 1.7; Game.deathWhy = why;
    FX.explosion(wx(p.x), wy(p.y - 7), 1.8, 50); FX.doFlash(0.25, '255,200,120'); FX.addShake(4);
    A.sfx.die();
  };

  function updatePlayer(dt) {
    const p = Game.p, st = Game.st, dx = I.dx, dy = I.dy;
    p.anim += dt; p.moving = false;
    if (p.hammer > 0) { p.hammer -= dt; p.swing += dt * 12; if (!S.reduced && Math.random() < dt * 14) FX.sparks(wx(p.x + p.face * 11), wy(p.y - 12), 2, 50, 'rgba(255,230,120,1)', 0.3, 1.2); }
    if (p.state === 'ground') {
      const g = p.g;
      if (dx) {
        p.x += dx * C.SPEED * dt; p.face = dx; p.moving = true;
        p.stepFx = (p.stepFx || 0) - dt;
        if (p.stepFx <= 0 && !S.reduced) { p.stepFx = 0.16; FX.sparks(wx(p.x - dx * 2), wy(p.y) - 2, 2, 28, 'rgba(190,210,255,0.8)', 0.3, 1.2); }
      }
      if (g.v) p.x += g.v * dt;
      if (g.lift) { /* ride it */ }
      if (p.x < g.x1 - 1 || p.x > g.x2 + 1) {                                 /* walked off the end */
        p.state = 'air'; p.vy = 0; p.vx = dx * C.SPEED * 0.6; p.peak = p.y;
      } else { p.x = U.clamp(p.x, g.x1, g.x2); p.y = g.at(p.x); }
      if (p.state === 'ground') {
        if (I.takeJump() && p.hammer <= 0) { p.state = 'air'; p.vy = C.JUMP_V; p.vx = dx * C.SPEED; p.peak = p.y; p.jumped = new Set(); A.sfx.jump(); if (!S.reduced) { FX.sparks(wx(p.x), wy(p.y) - 2, 6, 60, 'rgba(255,220,140,0.9)', 0.3, 1.3); FX.ring(wx(p.x), wy(p.y) - 1, 2, 14, 'rgba(160,200,255,0.5)', 0.25, 1.4); } }
        else if (dy && p.hammer <= 0) { const L = ladderNear(p, dy); if (L) { p.state = 'ladder'; p.lad = L; p.x = L.x; } }
      }
    } else if (p.state === 'ladder') {
      const L = p.lad;
      if (dy) { p.y += dy * C.CLIMB * dt; p.moving = true; }
      p.x = L.x; I.takeJump();
      if (p.y <= L.yt) { p.y = L.yt; p.state = 'ground'; p.g = L.gt; }
      else if (p.y >= L.yb) { p.y = L.yb; p.state = 'ground'; p.g = L.gb; }
    } else if (p.state === 'air') {
      I.takeJump();
      const prev = p.y;
      p.vy += C.GRAVITY * dt; p.y += p.vy * dt; p.x = U.clamp(p.x + p.vx * dt, 3, 221);
      if (p.vy < 0) p.peak = Math.min(p.peak, p.y);
      if (p.vy > 0) {
        for (const g of st.girders) {
          if (p.x < g.x1 || p.x > g.x2) continue;
          const gy = g.at(p.x);
          if (prev <= gy + 0.8 && p.y >= gy) {
            const drop = gy - p.peak;
            if (drop > C.DEADLY_DROP && !G0.god) { p.y = gy; p.state = 'ground'; p.g = g; Game.die('fell'); return; }
            p.state = 'ground'; p.g = g; p.y = gy; p.vx = 0; p.vy = 0; A.sfx.land(); Game.jumpCombo = 0; if (!S.reduced) { FX.sparks(wx(p.x), wy(gy) - 2, 5, 50, 'rgba(190,210,255,0.8)', 0.3, 1.2); FX.ring(wx(p.x), wy(gy) - 1, 2, 16, 'rgba(160,200,255,0.4)', 0.25, 1.3); }
            break;
          }
        }
      }
      if (p.y > 268) { if (G0.god) { Game.spawnPlayer(); } else Game.die('fell'); }
    }
    /* pick things up */
    for (const h of st.hammers) if (!h.taken && Math.abs(h.x - p.x) < 8 && Math.abs(h.y - p.y) < 12) { h.taken = true; p.hammer = C.HAMMER_TIME; A.sfx.power(); FX.text(wx(h.x), wy(h.y - 18), 'HAMMER!', '#ffe45a', 15); }
    for (const it of st.items) if (!it.taken && Math.abs(it.x - p.x) < 8 && Math.abs(it.y - p.y) < 14) {
      it.taken = true; const pts = { hat: 300, purse: 500, parasol: 800 }[it.type];
      Game.addScore(pts); FX.text(wx(it.x), wy(it.y - 14), String(pts), '#fff', 15); FX.ring(wx(it.x), wy(it.y - 6), 4, 28, '#ffe45a', 0.4, 2.5); A.sfx.item();
    }
    for (const r of st.rivets) if (!r.taken && p.state === 'ground' && p.g === r.g && Math.abs(r.x - p.x) < 6) {
      r.taken = true; Game.addScore(100); FX.text(wx(r.x), wy(r.g.at(r.x) - 14), '100', '#ffd24a', 14); FX.sparks(wx(r.x), wy(r.g.at(r.x) - 3), 8, 90, 'rgba(255,220,100,1)', 0.4); A.sfx.rivet();
    }
    /* reached Nova? */
    if (st.pg && p.state === 'ground' && p.g === st.pg && Math.abs(p.x - st.princess.x) < 16) stageWin();
    if (st.rivets.length && st.rivets.every((r) => r.taken) && Game.phase === 'play') stageCollapse();
  }

  function stageWin() {
    if (Game.phase !== 'play') return;
    Game.phase = 'win'; Game.phaseT = 2.2;
    const b = 1500 * (Game.stage + 1); Game.addScore(b);
    Game.banner = 'NOVA IS SAFE!'; Game.banner2 = 'BONUS +' + U.fmt(b); Game.bannerT = 2.2;
    for (let i = 0; i < 8; i++) FX.text(wx(Game.st.princess.x + U.rand(-20, 20)), wy(Game.st.princess.g.at(120) - 24 - i * 6), '♥', '#ff7ad9', 18);
    FX.doFlash(0.3, '255,230,240'); A.sfx.clear();
    Game.barrels.length = 0; Game.pies.length = 0; Game.springs.length = 0;
    for (const f of Game.fires) { FX.explosion(wx(f.x), wy(f.y), 1, 30); } Game.fires.length = 0;
  }
  function stageCollapse() {
    Game.phase = 'collapse'; Game.phaseT = 3.2; Game.collapse = 0;
    Game.banner = 'ALL RIVETS PULLED!'; Game.banner2 = ''; Game.bannerT = 3;
    Game.barrels.length = 0; for (const f of Game.fires) FX.explosion(wx(f.x), wy(f.y), 1, 30); Game.fires.length = 0;
    FX.doFlash(0.5, '255,240,200'); FX.addShake(6); A.sfx.bossDie();
  }

  /* ---------- hammer swings ---------- */
  function smashAt(list, getPos, radius) {
    const p = Game.p, hx = p.x + p.face * 10, hy = p.y - 8;
    for (const e of list) {
      if (e.dead) continue;
      const ep = getPos(e);
      if (Math.hypot(ep[0] - hx, ep[1] - hy) < radius) {
        e.dead = true; const pts = [300, 500, 800][Math.floor(Math.random() * 3)]; Game.addScore(pts);
        FX.explosion(wx(ep[0]), wy(ep[1]), 1.1, 40); FX.text(wx(ep[0]), wy(ep[1] - 10), String(pts), '#ffe45a', 16); A.sfx.smash();
      }
    }
  }

  /* ---------- barrels ---------- */
  function updateBarrel(b, dt) {
    const st = Game.st;
    b.rot += dt * 7 * b.dir;
    if (b.state === 'roll') {
      b.x += b.dir * C.BARREL_V * dt; b.y = b.g.at(b.x) - 5;
      if (b.skip && Math.abs(b.x - b.skip.x) > 4) b.skip = null;
      for (const L of st.ladders) {
        if (L.gt !== b.g || L === b.skip) continue;
        if (Math.abs(b.x - L.x) < 1.5) { b.skip = L; if (Math.random() < 0.3) { b.state = 'lad'; b.lad = L; b.x = L.x; } }
      }
      if (b.g === st.g0 && st.drum && b.x < st.drum.x + 6) {                   /* into the oil drum */
        b.dead = true; FX.sparks(wx(st.drum.x), wy(b.g.at(st.drum.x) - 14), 8, 90, 'rgba(255,170,60,1)', 0.4);
        if (Game.fires.length < 2 + Game.stage && Math.random() < 0.3) Game.spawnFire(st.g0, st.drum.x + 10, false);
        return;
      }
      if (b.x < b.g.x1 || b.x > b.g.x2) { b.state = 'fall'; b.vy = 0; b.vx = b.dir * C.BARREL_V * 0.7; }
    } else if (b.state === 'fall') {
      const prev = b.y;
      b.vy += C.GRAVITY * dt; b.y += b.vy * dt; b.x += b.vx * dt;
      for (const g of st.girders) {
        if (g.lift || b.x < g.x1 || b.x > g.x2 || b.vy <= 0) continue;
        const gy = g.at(b.x) - 5;
        if (prev <= gy + 0.8 && b.y >= gy) { b.g = g; b.y = gy; b.state = 'roll'; b.dir = g.y2 > g.y1 ? 1 : g.y2 < g.y1 ? -1 : b.dir; break; }
      }
      if (b.y > 270 || b.x < -10 || b.x > 234) b.dead = true;
    } else {
      const L = b.lad;
      b.y += 30 * dt;
      if (b.y + 5 >= L.yb) { b.g = L.gb; b.y = L.yb - 5; b.state = 'roll'; b.dir = L.gb.y2 > L.gb.y1 ? 1 : L.gb.y2 < L.gb.y1 ? -1 : b.dir; }
    }
  }

  /* ---------- fireballs ---------- */
  function updateFire(f, dt) {
    const st = Game.st, p = Game.p;
    f.t += dt;
    if (f.frozen > 0) { f.frozen -= dt; return; }
    const sp = (C.FIRE_V + Game.stage * 3) * (f.hunt ? 1.15 : 1);
    if (f.state === 'walk') {
      f.x += f.dir * sp * dt; f.y = f.g.at(f.x) - 6;
      if (f.x < f.g.x1) { f.x = f.g.x1; f.dir = 1; } else if (f.x > f.g.x2) { f.x = f.g.x2; f.dir = -1; }
      f.turnT -= dt;
      if (f.turnT <= 0) { f.turnT = U.rand(1.2, 3.2); if (Math.random() < (f.hunt ? 0.2 : 0.5)) f.dir = -f.dir; else if (f.hunt) f.dir = Math.sign(p.x - f.x) || f.dir; }
      if (f.skip && Math.abs(f.x - f.skip.x) > 4) f.skip = null;
      for (const L of st.ladders) {
        if (L === f.skip || (L.gt !== f.g && L.gb !== f.g) || Math.abs(f.x - L.x) > 1.3) continue;
        f.skip = L;
        const wantUp = p.y < f.y - 8, up = L.gb === f.g, down = L.gt === f.g;
        let go = false;
        if (f.hunt) go = (up && wantUp && Math.random() < 0.65) || (down && !wantUp && Math.random() < 0.65);
        else go = Math.random() < 0.28;
        if (go) { f.state = 'lad'; f.lad = L; f.dv = up ? -1 : 1; f.x = L.x; break; }
      }
    } else {
      const L = f.lad;
      f.y += f.dv * sp * 0.9 * dt;
      if (f.dv < 0 && f.y + 6 <= L.yt) { f.g = L.gt; f.state = 'walk'; f.y = L.yt - 6; f.dir = Math.random() < 0.5 ? -1 : 1; }
      else if (f.dv > 0 && f.y + 6 >= L.yb) { f.g = L.gb; f.state = 'walk'; f.y = L.yb - 6; f.dir = Math.random() < 0.5 ? -1 : 1; }
    }
  }

  /* ---------- pies and springs ---------- */
  function updatePie(pi, dt) {
    pi.x += pi.g.v * dt * 1.15; pi.y = pi.g.at(pi.x) - 3;
    if (pi.x < pi.g.x1 - 2 || pi.x > pi.g.x2 + 2) pi.dead = true;
  }
  function updateSpring(sp, dt) {
    const st = Game.st, prev = sp.y;
    sp.t += dt; sp.vy += 480 * dt; sp.y += sp.vy * dt; sp.x += sp.vx * dt;
    if (sp.vy > 0) for (const g of st.girders) {
      if (g.lift || sp.x < g.x1 || sp.x > g.x2) continue;
      const gy = g.at(sp.x) - 6;
      if (prev <= gy + 0.8 && sp.y >= gy) { sp.y = gy; sp.vy = -150; A.sfx.boing(); break; }
    }
    if (sp.x > 230 || sp.y > 270) sp.dead = true;
  }

  /* ---------- contact ---------- */
  function contacts() {
    const p = Game.p;
    if (p.dead || Game.phase !== 'play') return;
    const cx = p.x, cy = p.y - 7;
    for (const b of Game.barrels) {
      if (b.dead) continue;
      const d = Math.hypot(b.x - cx, b.y - cy);
      if (p.hammer > 0) continue;
      if (p.state === 'air' && !b.scored && Math.abs(b.x - p.x) < 10 && p.y < b.y - 3 && p.y > b.y - 26) {
        b.scored = true; Game.jumpCombo++; const pts = Game.jumpCombo >= 2 ? 300 : 100; Game.addScore(pts); FX.text(wx(b.x), wy(b.y - 14), String(pts), '#fff', 14); A.sfx.item();
      }
      if (d < 8.5 && p.inv <= 0) { Game.die('barrel'); return; }
    }
    const hit = (list, r, yoff) => { for (const e of list) { if (e.dead || (e.frozen > 0 && false)) continue; if (p.hammer > 0) continue; if (Math.hypot(e.x - cx, (e.y + (yoff || 0)) - cy) < r && p.inv <= 0) return true; } return false; };
    if (hit(Game.fires, 8)) { Game.die('fire'); return; }
    if (hit(Game.pies, 7, -2)) { Game.die('pie'); return; }
    if (hit(Game.springs, 7)) { Game.die('spring'); return; }
    if (p.state === 'air') for (const sp of Game.springs) if (!sp.scored && Math.abs(sp.x - p.x) < 10 && p.y < sp.y - 3 && p.y > sp.y - 26) { sp.scored = true; Game.addScore(100); FX.text(wx(sp.x), wy(sp.y - 14), '100', '#fff', 14); }
  }

  /* ---------- phases ---------- */
  function updateDK(dt) {
    const st = Game.st, dk = st.dk;
    dk.anim = (dk.anim || 0) + dt;
    if (dk.mode === 'barrels') {
      Game.dkT -= dt;
      if (Game.dkT <= 0) { Game.dkT = Math.max(1.5, 3.1 - Game.stage * 0.1) * U.rand(0.75, 1.2); dk.throwing = 0.55; }
      if (dk.throwing > 0) { dk.throwing -= dt; if (dk.throwing <= 0) Game.spawnBarrel(); }
    } else if (dk.mode === 'springs') {
      Game.springT -= dt;
      if (Game.springT <= 0) { Game.springT = U.rand(2.2, 3.4); dk.throwing = 0.4; }
      if (dk.throwing > 0) { dk.throwing -= dt; if (dk.throwing <= 0) Game.spawnSpring(); }
    } else if (dk.mode === 'pies') {
      Game.pieT -= dt;
      if (Game.pieT <= 0) { Game.pieT = U.rand(2.0, 3.2); Game.spawnPie(st.belts[Math.floor(Math.random() * st.belts.length)]); }
    }
    if (Game.stage === 1 && Game.fires.length < 3) { Game.fireT -= dt; if (Game.fireT <= 0) { Game.fireT = 14; Game.spawnFire(st.g0, 200, false); } }
    if (st.princess) st.princess.t = (st.princess.t || 0) + dt;
  }

  function updateLifts(dt) {
    const st = Game.st, p = Game.p;
    for (const g of st.lifts) {
      g.y += g.v * dt;
      if (g.y < g.top) {
        g.y += g.bottom - g.top;
        if (p.state === 'ground' && p.g === g) { p.state = 'air'; p.vy = 0; p.vx = 0; p.peak = p.y; }
      }
    }
  }

  Game.update = function (dt) {
    Game.time += dt;
    FX.update(dt);
    const st = Game.st;
    if (Game.demo) {
      updateDK(dt);
      for (const b of Game.barrels) updateBarrel(b, dt);
      Game.barrels = Game.barrels.filter((b) => !b.dead);
      for (const f of Game.fires) updateFire(f, dt);
      return;
    }
    if (Game.bannerT > 0) Game.bannerT -= dt;
    const p = Game.p, ph = Game.phase;
    if (p.inv > 0) p.inv -= dt;
    if (ph === 'ready') { Game.phaseT -= dt; I.takeJump(); updateLifts(dt); if (Game.phaseT <= 0) Game.phase = 'play'; return; }
    if (ph === 'dying') {
      Game.phaseT -= dt; updateLifts(dt);
      if (Game.phaseT <= 0) {
        Game.lives--;
        if (Game.lives <= 0) { Game.phase = 'over'; Game.victory = false; if (Game.onOver) Game.onOver(false); return; }
        Game.barrels.length = 0; Game.pies.length = 0; Game.springs.length = 0; Game.fires.length = 0;
        for (const f of (st.fires || [])) Game.spawnFire(f.g, f.x, f.hunt);
        Game.spawnPlayer(); Game.phase = 'ready'; Game.phaseT = 1.2; Game.banner = 'GET READY'; Game.banner2 = ''; Game.bannerT = 1.2; Game.dkT = 2.2;
      }
      return;
    }
    if (ph === 'win') { Game.phaseT -= dt; if (Game.phaseT <= 0) { if (Game.stage >= 3) startVictory(); else Game.startStage(Game.stage + 1); } return; }
    if (ph === 'collapse') { Game.phaseT -= dt; Game.collapse += dt; if (Game.collapse > 0.2 && Math.random() < dt * 14) FX.explosion(wx(U.rand(20, 200)), wy(U.rand(70, 240)), 1.3, U.rand(20, 60)); if (Game.phaseT <= 0) startVictory(); return; }
    if (ph === 'victory') { Game.phaseT -= dt; if (Math.random() < dt * 5) FX.sparks(wx(U.rand(0, 224)), wy(U.rand(40, 200)), 10, 140, 'rgba(255,230,120,1)', 0.8); if (Game.phaseT <= 0) { Game.phase = 'over'; Game.victory = true; if (Game.onOver) Game.onOver(true); } return; }
    if (ph !== 'play') return;
    updateLifts(dt);
    updatePlayer(dt);
    if (Game.phase !== 'play') return;
    updateDK(dt);
    for (const b of Game.barrels) { updateBarrel(b, dt); if (!S.reduced && b.state === 'roll' && Math.random() < dt * 16) FX.sparks(wx(b.x - b.dir * 4), wy(b.y + 4), 1, 26, 'rgba(255,170,70,0.9)', 0.3, 1.1); }
    for (const f of Game.fires) { updateFire(f, dt); if (!S.reduced && Math.random() < dt * 9) FX.sparks(wx(f.x), wy(f.y - 6), 1, 30, f.frozen > 0 ? 'rgba(160,220,255,0.9)' : 'rgba(255,140,50,0.9)', 0.5, 1.1); }
    for (const pi of Game.pies) updatePie(pi, dt);
    for (const sp of Game.springs) updateSpring(sp, dt);
    if (p.hammer > 0) {
      smashAt(Game.barrels, (e) => [e.x, e.y], 12); smashAt(Game.fires, (e) => [e.x, e.y], 12); smashAt(Game.pies, (e) => [e.x, e.y], 12); smashAt(Game.springs, (e) => [e.x, e.y], 12);
    }
    contacts();
    Game.barrels = Game.barrels.filter((b) => !b.dead); Game.fires = Game.fires.filter((f) => !f.dead); Game.pies = Game.pies.filter((q) => !q.dead); Game.springs = Game.springs.filter((q) => !q.dead);
  };

  function startVictory() {
    Game.phase = 'victory'; Game.phaseT = 4.5;
    const b = 10000 + Game.lives * 2000; Game.addScore(b);
    Game.banner = 'YOU RESCUED NOVA!'; Game.banner2 = 'FINAL BONUS +' + U.fmt(b); Game.bannerT = 4.5;
    A.sfx.clear();
  }

  /* ---------- drawing ---------- */
  Game.render = function (ctx) {
    const st = Game.st;
    if (!st) return;
    const t = Game.time, th = C.STAGES[Game.stage];
    ctx.save();
    ctx.translate(C.OX, C.OY); ctx.scale(C.K, C.K);
    Art.drawBackdrop(ctx, st, th, t);
    for (const g of st.girders) Art.drawGirder(ctx, g, th, t);
    for (const L of st.ladders) Art.drawLadder(ctx, L, th);
    for (const r of st.rivets) if (!r.taken) Art.drawRivet(ctx, r, t);
    if (st.drum) Art.drawDrum(ctx, st.drum, t);
    if (st.princess) Art.drawPrincess(ctx, st.princess, t, Game.phase === 'win' || Game.phase === 'victory');
    if (st.dk) Art.drawKong(ctx, st.dk, t, Game.phase, Game.collapse);
    for (const h of st.hammers) if (!h.taken) Art.drawHammerItem(ctx, h, t);
    for (const it of st.items) if (!it.taken) Art.drawItem(ctx, it, t);
    for (const pi of Game.pies) Art.drawPie(ctx, pi, t);
    for (const b of Game.barrels) Art.drawBarrel(ctx, b, t);
    for (const sp of Game.springs) Art.drawSpring(ctx, sp, t);
    for (const f of Game.fires) Art.drawFire(ctx, f, t);
    if (!Game.demo && !(Game.p.dead && Game.phase === 'dying' && Game.phaseT < 1.2)) Art.drawClimber(ctx, Game.p, t, Game.phase);
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter'; FX.drawAdd(ctx); ctx.globalCompositeOperation = 'source-over';
    FX.drawNorm(ctx); FX.drawText(ctx);
  };

  G.game = Game;
})((window.SGS = window.SGS || {}));
