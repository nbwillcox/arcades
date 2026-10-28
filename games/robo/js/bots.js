/* Robots and colonists: wave composition, spawning, behaviour, damage and drawing. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, TAU = U.TAU;
  const B = {};
  G.bots = B;
  const X0 = C.AX0, X1 = C.AX1, Y0 = C.AY0, Y1 = C.AY1;

  const TYPES = {
    swarmer: { r: 8, hp: 1, pts: 100, size: 0.8, hue: 8 },
    pylon: { r: 9, hp: 1, pts: 25, size: 0.7, hue: 50 },
    bulwark: { r: 17, hp: 1e9, pts: 0, size: 1, hue: 140 },
    mindcore: { r: 12, hp: 3, pts: 500, size: 1.7, hue: 320, drop: 0.35 },
    thrall: { r: 8, hp: 1, pts: 150, size: 0.8, hue: 0 },
    sentinel: { r: 14, hp: 2, pts: 1000, size: 1.7, hue: 195, drop: 0.25 },
    striker: { r: 10, hp: 1, pts: 150, size: 1, hue: 280, drop: 0.1 },
    nexus: { r: 14, hp: 2, pts: 1000, size: 1.9, hue: 50, drop: 0.3 },
    crawler: { r: 13, hp: 3, pts: 200, size: 1.4, hue: 25, drop: 0.25 },
  };
  B.TYPES = TYPES;
  let nextId = 1;

  /* wave composition: a 5-wave rotation (swarm, mindcores, sentinels, nexuses, bulwark gauntlet) that scales up every loop */
  B.spec = function (n) {
    const k = (n - 1) % 5;
    const s = {};
    s.sw = Math.min(46, [12 + 3 * n, 8 + 2 * n, 10 + 2 * n, 8 + 2 * n, 14 + 2 * n][k]);
    s.pyl = Math.min(22, Math.round(k === 0 ? 4 + n * 0.8 : 2 + n * 0.5));
    s.bul = n < 2 ? 0 : Math.min(9, 1 + Math.floor(n / 4) + (k === 4 ? 2 : 0));
    s.mind = k === 1 ? Math.min(6, 2 + Math.floor(n / 5)) : n >= 11 ? Math.min(3, 1 + Math.floor(n / 14)) : 0;
    s.sent = k === 2 ? Math.min(5, 2 + Math.floor(n / 6)) : n >= 14 ? 1 : 0;
    s.nex = k === 3 ? Math.min(4, 2 + Math.floor(n / 8)) : n >= 17 ? 1 : 0;
    s.col = Math.min(10, 5 + Math.floor(n / 5) + (k === 1 ? 2 : 0));
    if (n === 1) { s.sw = 14; s.pyl = 4; }
    if (n === C.FINAL_WAVE) { s.sw = 46; s.bul = 9; s.mind = 5; s.sent = 4; s.nex = 3; s.pyl = 14; s.col = 10; }
    return s;
  };
  const swSpeed = (n) => Math.min(128, 56 + 3.4 * n);

  function make(type, x, y, spawnT) {
    const T = TYPES[type];
    return { id: nextId++, type, x, y, r: T.r, hp: T.hp, t: 0, spawn: spawnT || 0, sp0: spawnT || 0, flash: 0, dirT: 0, ha: Math.random() * TAU, kx: 0, ky: 0, stun: 0, cd: U.rand(1.2, 3), n: 0, vi: U.randInt(0, 2), wx: x, wy: y, dead: false };
  }
  B.spawn = function (g, type, x, y, spawnT) { const e = make(type, x, y, spawnT); g.en.push(e); return e; };

  B.spawnWave = function (g, n) {
    const s = B.spec(n), p = g.player, used = [];
    const place = (minP, minD) => {
      let x = 0, y = 0;
      for (let i = 0; i < 50; i++) {
        x = U.rand(X0 + 26, X1 - 26); y = U.rand(Y0 + 26, Y1 - 26);
        if (U.dist2(x, y, p.x, p.y) < minP * minP) continue;
        if (used.some((q) => U.dist2(x, y, q[0], q[1]) < minD * minD)) continue;
        break;
      }
      used.push([x, y]);
      return [x, y];
    };
    g.en = []; g.col = [];
    for (let i = 0; i < s.col; i++) { const q = place(130, 60); g.col.push({ x: q[0], y: q[1], ha: U.rand(0, TAU), dirT: U.rand(0.3, 2), vi: i % 3, t: U.rand(0, 5), conv: 0, dead: false }); }
    for (let i = 0; i < s.pyl; i++) { const q = place(120, 56); B.spawn(g, 'pylon', q[0], q[1], U.rand(0.2, 1.2)); }
    for (let i = 0; i < s.bul; i++) { const q = place(260, 90); B.spawn(g, 'bulwark', q[0], q[1], U.rand(0.4, 1.5)); }
    for (let i = 0; i < s.mind; i++) { const q = place(240, 80); B.spawn(g, 'mindcore', q[0], q[1], U.rand(0.5, 1.7)); }
    for (let i = 0; i < s.sent; i++) { const q = place(240, 80); B.spawn(g, 'sentinel', q[0], q[1], U.rand(0.5, 1.7)); }
    for (let i = 0; i < s.nex; i++) { const q = place(240, 80); B.spawn(g, 'nexus', q[0], q[1], U.rand(0.5, 1.7)); }
    for (let i = 0; i < s.sw; i++) { const q = place(200, 22); B.spawn(g, 'swarmer', q[0], q[1], U.rand(0.3, 2.0)); }
    A.sfx.warp();
  };

  B.remaining = (g) => g.en.reduce((n, e) => n + (!e.dead && e.type !== 'pylon' && e.type !== 'bulwark' ? 1 : 0), 0);

  function wallBounce(e) {
    let hit = false;
    if (e.x < X0 + e.r) { e.x = X0 + e.r; e.ha = Math.PI - e.ha; hit = true; }
    else if (e.x > X1 - e.r) { e.x = X1 - e.r; e.ha = Math.PI - e.ha; hit = true; }
    if (e.y < Y0 + e.r) { e.y = Y0 + e.r; e.ha = -e.ha; hit = true; }
    else if (e.y > Y1 - e.r) { e.y = Y1 - e.r; e.ha = -e.ha; hit = true; }
    return hit;
  }
  function nearestCol(g, e) {
    let best = null, bd = 1e12;
    for (const c of g.col) { if (c.dead || c.conv > 0) continue; const d = U.dist2(c.x, c.y, e.x, e.y); if (d < bd) { bd = d; best = c; } }
    return best;
  }
  const ang = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

  /* ---------- behaviour ---------- */
  function step(g, e, dt) {
    const p = g.player, alive = p.alive, n = g.stage;
    const pa = alive ? ang(e.x, e.y, p.x, p.y) : e.ha;
    switch (e.type) {
      case 'swarmer':
      case 'thrall': {
        e.dirT -= dt;
        if (e.dirT <= 0) { e.dirT = U.rand(0.2, 0.45); e.ha = alive ? pa + U.rand(-0.75, 0.75) : U.rand(0, TAU); }
        const sp = e.type === 'thrall' ? Math.min(165, 112 + 1.6 * n) : swSpeed(n);
        e.x += Math.cos(e.ha) * sp * dt; e.y += Math.sin(e.ha) * sp * dt;
        wallBounce(e);
        break;
      }
      case 'bulwark': {
        if (e.stun > 0) { e.stun -= dt; } else {
          e.dirT -= dt;
          if (e.dirT <= 0) {
            e.dirT = U.rand(1.2, 2.8);
            const r = Math.random(), c = nearestCol(g, e);
            e.ha = (r < 0.5 && c ? ang(e.x, e.y, c.x, c.y) : r < 0.8 && alive ? pa : U.rand(0, TAU)) + U.rand(-0.4, 0.4);
          }
          const sp = 46 + Math.min(30, n * 1.1);
          e.x += Math.cos(e.ha) * sp * dt; e.y += Math.sin(e.ha) * sp * dt;
        }
        e.x += e.kx * dt; e.y += e.ky * dt;
        const k = Math.max(0, 1 - 3.5 * dt); e.kx *= k; e.ky *= k;
        wallBounce(e);
        break;
      }
      case 'mindcore': {
        const c = nearestCol(g, e), tx = c ? c.x : p.x, ty = c ? c.y : p.y;
        e.dirT -= dt;
        if (e.dirT <= 0) { e.dirT = U.rand(0.3, 0.6); e.ha = ang(e.x, e.y, tx, ty) + U.rand(-0.5, 0.5); }
        e.x += Math.cos(e.ha) * 58 * dt; e.y += Math.sin(e.ha) * 58 * dt;
        wallBounce(e);
        if (c && U.dist2(c.x, c.y, e.x, e.y) < (e.r + 6) * (e.r + 6)) { c.conv = 1.3; A.sfx.convert(); FX.ring(c.x, c.y, 4, 26, 'hsla(320,100%,65%,1)', 0.5, 2.5); }
        e.cd -= dt;
        if (e.cd <= 0 && alive) {
          e.cd = U.rand(3.2, 4.8);
          g.ebullet(e.x, e.y, Math.cos(pa) * 120, Math.sin(pa) * 120, 'missile', 6, { hp: 1, turn: 2.1, spd: 135, life: 6 });
          A.sfx.missile();
        }
        break;
      }
      case 'sentinel': {
        e.dirT -= dt;
        if (e.dirT <= 0) { e.dirT = U.rand(1.6, 2.8); e.wx = U.rand(X0 + 70, X1 - 70); e.wy = U.rand(Y0 + 60, Y1 - 60); }
        const wa = ang(e.x, e.y, e.wx, e.wy), d = Math.hypot(e.wx - e.x, e.wy - e.y), sp = Math.min(85, d * 1.6);
        e.x += Math.cos(wa) * sp * dt; e.y += Math.sin(wa) * sp * dt;
        const max = 3 + Math.floor(n / 12);
        e.cd -= dt;
        if (e.cd <= 0 && e.n < max) { e.cd = 1.9; e.n++; B.spawn(g, 'striker', e.x, e.y, 0.3); A.sfx.spawnBot(); FX.ring(e.x, e.y, 6, 34, 'hsla(280,100%,70%,1)', 0.4, 2); }
        if (e.n >= max) { e.life = (e.life === undefined ? 2.4 : e.life) - dt; if (e.life <= 0) { e.dead = true; FX.sparks(e.x, e.y, 14, 150, FX.col(195), 0.5); FX.ring(e.x, e.y, 6, 40, 'hsla(195,100%,70%,1)', 0.4, 2); } }
        break;
      }
      case 'striker': {
        const d = alive ? Math.hypot(p.x - e.x, p.y - e.y) : 999, rad = d > 200 ? 1 : d < 125 ? -1 : 0;
        const strafe = Math.sin(e.t * 1.4 + e.id) * 0.7;
        const vx = Math.cos(pa) * rad - Math.sin(pa) * strafe, vy = Math.sin(pa) * rad + Math.cos(pa) * strafe;
        e.x += vx * 82 * dt; e.y += vy * 82 * dt;
        e.x = U.clamp(e.x, X0 + e.r, X1 - e.r); e.y = U.clamp(e.y, Y0 + e.r, Y1 - e.r);
        e.face = pa;
        e.cd -= dt;
        if (e.cd <= 0 && alive) {
          e.cd = U.rand(1.5, 2.4);
          const t = d / 230, la = ang(e.x, e.y, p.x + (p.vx || 0) * t * 0.5, p.y + (p.vy || 0) * t * 0.5);
          g.ebullet(e.x, e.y, Math.cos(la) * 215, Math.sin(la) * 215, 'spark', 5, { life: 4 });
          A.sfx.enemyShot();
        }
        break;
      }
      case 'nexus': {
        e.dirT -= dt;
        if (e.dirT <= 0) { e.dirT = U.rand(1.4, 3); e.ha = U.rand(0, TAU); }
        e.x += Math.cos(e.ha) * 52 * dt; e.y += Math.sin(e.ha) * 52 * dt;
        wallBounce(e);
        const max = 3 + Math.floor(n / 14);
        e.cd -= dt;
        if (e.cd <= 0 && e.n < max) { e.cd = 2.6; e.n++; B.spawn(g, 'crawler', e.x, e.y, 0.3); A.sfx.spawnBot(); FX.ring(e.x, e.y, 6, 38, 'hsla(30,100%,65%,1)', 0.4, 2); }
        break;
      }
      case 'crawler': {
        e.dirT -= dt;
        if (e.dirT <= 0) { e.dirT = U.rand(0.8, 1.6); e.ha = (alive ? pa : U.rand(0, TAU)) + U.rand(-0.7, 0.7); }
        const sp = 38 + Math.min(24, n * 0.6);
        e.x += Math.cos(e.ha) * sp * dt; e.y += Math.sin(e.ha) * sp * dt;
        wallBounce(e);
        e.face = pa;
        e.cd -= dt;
        if (e.cd <= 0 && alive) { e.cd = U.rand(2.3, 3.4); g.ebullet(e.x, e.y, Math.cos(pa) * 185, Math.sin(pa) * 185, 'shell', 6, { bounce: 3, life: 6 }); A.sfx.shell(); }
        break;
      }
      default: break; // pylons just sit there
    }
  }

  B.update = function (g, dt) {
    const list = g.en;
    for (const e of list) {
      if (e.dead) continue;
      if (e.spawn > 0) { e.spawn -= dt; continue; }
      e.t += dt;
      if (e.flash > 0) e.flash -= dt;
      step(g, e, dt);
    }
    // swarmers and thralls keep a little personal space so they stream rather than stack
    B.tick = (B.tick || 0) + 1;
    const crowd = B.tick & 1 ? [] : list.filter((e) => !e.dead && e.spawn <= 0 && (e.type === 'swarmer' || e.type === 'thrall'));
    for (let i = 0; i < crowd.length; i++) {
      for (let j = i + 1; j < crowd.length; j++) {
        const a = crowd[i], b = crowd[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < 144) { const d = Math.sqrt(d2), k = (12 - d) * 0.5 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
      }
    }
    // colonists wander; bulwarks crush them; converted ones turn into thralls
    for (const c of g.col) {
      if (c.dead) continue;
      c.t += dt;
      if (c.conv > 0) {
        c.conv -= dt;
        if (c.conv <= 0) { c.dead = true; B.spawn(g, 'thrall', c.x, c.y, 0); FX.sparks(c.x, c.y, 10, 140, FX.col(0), 0.5); }
        continue;
      }
      c.dirT -= dt;
      if (c.dirT <= 0) { c.dirT = U.rand(1, 3); c.ha = U.rand(0, TAU); c.still = Math.random() < 0.25; }
      if (!c.still) { c.x += Math.cos(c.ha) * 30 * dt; c.y += Math.sin(c.ha) * 30 * dt; }
      if (c.x < X0 + 8 || c.x > X1 - 8) { c.x = U.clamp(c.x, X0 + 8, X1 - 8); c.ha = Math.PI - c.ha; }
      if (c.y < Y0 + 8 || c.y > Y1 - 8) { c.y = U.clamp(c.y, Y0 + 8, Y1 - 8); c.ha = -c.ha; }
      for (const e of list) {
        if (e.dead || e.spawn > 0 || e.type !== 'bulwark') continue;
        const rr = e.r + 6;
        if (U.dist2(c.x, c.y, e.x, e.y) < rr * rr) { c.dead = true; g.colonistLost(c); break; }
      }
    }
    g.col = g.col.filter((c) => !c.dead);
    g.en = g.en.filter((e) => !e.dead);
  };

  /* ---------- damage ---------- */
  B.hitTest = function (g, x, y, r) {
    for (const e of g.en) {
      if (e.dead || e.spawn > 0) continue;
      const rr = e.r + r;
      if (U.dist2(x, y, e.x, e.y) < rr * rr) return e;
    }
    return null;
  };
  B.damage = function (g, e, dmg, b) {
    if (e.type === 'bulwark') {
      const a = Math.atan2(b.vy, b.vx);
      e.kx += Math.cos(a) * 55; e.ky += Math.sin(a) * 55;
      FX.sparks(b.x, b.y, 3, 120, 'hsla(140,100%,70%,1)', 0.25, 1.4);
      A.sfx.clunk();
      return;
    }
    e.hp -= dmg; e.flash = 0.08;
    FX.sparks(b ? b.x : e.x, b ? b.y : e.y, 3, 110, FX.col(TYPES[e.type].hue, 70), 0.25, 1.4);
    A.sfx.hit();
    if (e.hp <= 0) B.kill(g, e);
  };
  B.kill = function (g, e) {
    if (e.dead) return;
    e.dead = true;
    const T = TYPES[e.type];
    FX.explosion(e.x, e.y, T.size, T.hue);
    A.sfx.kill(T.size > 1.5 ? 2 : T.size > 1 ? 1 : 0);
    g.comboKill();
    g.award(T.pts, e.x, e.y);
    if (T.drop && !g.demo && Math.random() < T.drop) g.dropPickup(e.x, e.y);
  };
  /* smart bomb: wipes everything but bulwarks, which get shoved away and stunned */
  B.bombAll = function (g) {
    const p = g.player;
    for (const e of g.en) {
      if (e.dead || e.spawn > 0) continue;
      if (e.type === 'bulwark') {
        const a = ang(p.x, p.y, e.x, e.y); e.kx += Math.cos(a) * 420; e.ky += Math.sin(a) * 420; e.stun = 2.2;
      } else B.kill(g, e);
    }
  };

  /* ---------- drawing ---------- */
  const GLOWC = { mindcore: 'hsla(320,100%,60%,1)', sentinel: 'hsla(195,100%,60%,1)', striker: 'hsla(280,100%,65%,1)', nexus: 'hsla(50,100%,60%,1)', crawler: 'hsla(25,100%,60%,1)', bulwark: 'hsla(140,100%,55%,1)' };
  B.draw = function (ctx, g) {
    const spr = GFX.spr, fl = spr.flash;
    for (const e of g.en) {
      if (e.dead) continue;
      const x = e.x, y = e.y;
      if (e.spawn > 0) {
        const k = 1 - e.spawn / Math.max(0.01, e.sp0);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + 0.55 * k; ctx.strokeStyle = 'rgba(200,230,255,1)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 3 + (1 - k) * 16, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        continue;
      }
      const f = e.flash > 0;
      switch (e.type) {
        case 'swarmer': GFX.draw(ctx, f ? fl.swarmer : spr.swarmer, x, y, e.ha + Math.PI / 2, 0.8, 0.8); break;
        case 'thrall': GFX.draw(ctx, f ? fl.thrall : spr.thrall, x, y, e.ha + Math.PI / 2, 0.85, 0.85); break;
        case 'pylon': {
          const s = 0.85 + Math.sin(e.t * 5 + e.id) * 0.06;
          ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, ['hsla(45,100%,60%,1)', 'hsla(190,100%,60%,1)', 'hsla(315,100%,60%,1)'][e.vi], x, y, 15, 0.5); ctx.globalCompositeOperation = 'source-over';
          GFX.draw(ctx, spr.pylon[e.vi], x, y, 0, s, s);
          break;
        }
        case 'bulwark': GFX.draw(ctx, spr.bulwark, x, y, 0, 0.86, 0.86, e.stun > 0 ? 0.65 : 1); break;
        case 'mindcore': GFX.draw(ctx, f ? fl.mindcore : spr.mindcore, x, y, e.t * 0.9, 0.9 + Math.sin(e.t * 4) * 0.04, 0.9 + Math.sin(e.t * 4) * 0.04); break;
        case 'sentinel': GFX.draw(ctx, f ? fl.sentinel : spr.sentinel, x, y, e.t * 1.6, 0.9, 0.9); break;
        case 'striker': GFX.draw(ctx, f ? fl.striker : spr.striker, x, y, (e.face || 0) + Math.PI / 2, 0.9, 0.9); break;
        case 'nexus': GFX.draw(ctx, f ? fl.nexus : spr.nexus, x, y, e.t * 1.1, 0.9, 0.9); break;
        case 'crawler': GFX.draw(ctx, f ? fl.crawler : spr.crawler, x, y, (e.face || 0) + Math.PI / 2, 0.85, 0.85); break;
        default: break;
      }
      const gc = GLOWC[e.type];
      if (gc) { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, gc, x, y, e.r + 12, 0.28); ctx.globalCompositeOperation = 'source-over'; }
    }
  };
  B.drawColonists = function (ctx, g) {
    const spr = GFX.spr;
    for (const c of g.col) {
      const walk = !c.still && !(c.conv > 0), fr = walk ? Math.floor(c.t * 6) % 2 : 0;
      ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(185,100%,65%,1)', c.x, c.y, 13, 0.3 + Math.sin(c.t * 3) * 0.08); ctx.globalCompositeOperation = 'source-over';
      if (c.conv > 0) {
        const fk = Math.floor(c.t * 14) % 2;
        GFX.draw(ctx, fk ? spr.flash.thrall : spr.col[c.vi][0], c.x, c.y, 0, 1, 1);
        ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(320,100%,60%,1)', c.x, c.y, 18, 0.6); ctx.globalCompositeOperation = 'source-over';
      } else GFX.draw(ctx, spr.col[c.vi][fr], c.x, c.y, Math.sin(c.t * 1.3) * 0.15, 1, 1);
    }
  };
})((window.SGS = window.SGS || {}));
