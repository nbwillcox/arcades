/* Player weapons: interceptors, blasts (standard, cluster, flak, nuke), beam laser, auto-turrets, pickups. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, A = G.audio, TAU = U.TAU;
  const W = C.W, H = C.H;
  const Wp = {};
  G.weapons = Wp;
  const DAMAGE = { std: 3, mini: 2, flak: 1.4, nuke: 40, chain: 99 };

  Wp.WEAPONS = ['std', 'cluster', 'flak', 'laser'];
  Wp.available = (g, w) => w === 'std' || (w === 'cluster' && g.up.cluster > 0) || (w === 'flak' && g.up.flak > 0) || (w === 'laser' && g.up.laser > 0);

  Wp.blast = function (g, x, y, kind, maxR, o) {
    o = o || {};
    const b = { x, y, r: 0, maxR, kind, t: -(o.delay || 0), grow: o.grow || 0.42, hold: o.hold !== undefined ? o.hold : 0.12, shrink: o.shrink || 0.38, dmg: DAMAGE[kind] || 3, hits: new Map(), kills: 0, dead: false, hue: o.hue || 195 };
    g.blasts.push(b);
    return b;
  };

  Wp.nearestLauncher = function (g, tx) {
    let best = null, bd = 1e9;
    for (const l of g.launchers) { if (!l.alive || l.ammo <= 0) continue; const d = Math.abs(l.x - tx); if (d < bd) { bd = d; best = l; } }
    return best;
  };

  Wp.launch = function (g, l, tx, ty, kind, auto) {
    const st = g.st, sy = C.GROUND - 34;
    l.ammo--; l.recoil = 0.15; l.aim = Math.atan2(ty - sy, tx - l.x);
    g.icp.push({ x: l.x, y: sy, sx: l.x, sy, tx, ty, speed: st.speed * (auto ? 0.9 : 1), kind, dead: false, auto: !!auto, t: 0 });
    A.sfx.launch();
  };

  Wp.fire = function (g, tx, ty) {
    if (g.fireCd > 0 || g.state === 'clear') return;
    tx = U.clamp(tx, 4, W - 4); ty = U.clamp(ty, 40, C.TARGET_MAX_Y);
    if (g.weapon === 'laser') return;
    const l = Wp.nearestLauncher(g, tx);
    if (!l) { if (!g.demo) A.sfx.empty(); g.fireCd = 0.18; return; }
    Wp.launch(g, l, tx, ty, g.weapon);
    g.fireCd = g.st.cooldown * (g.rapidT > 0 ? 0.5 : 1);
  };

  Wp.detonate = function (g, ic) {
    const st = g.st, x = ic.tx, y = ic.ty;
    A.sfx.blastBoom();
    if (ic.kind === 'cluster') {
      const n = st.clusterN || 3;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + Math.random() * 0.6, d = i === 0 ? 0 : 30 + Math.random() * 30;
        Wp.blast(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 'mini', st.blastR * 0.62, { delay: i * 0.07, grow: 0.28, hold: 0.1, shrink: 0.28 });
      }
    } else if (ic.kind === 'flak') Wp.blast(g, x, y, 'flak', st.blastR * 0.85, { hold: st.flakTime || 3, grow: 0.4, shrink: 0.5, hue: 45 });
    else Wp.blast(g, x, y, 'std', st.blastR);
  };

  Wp.update = function (g, dt) {
    g.st = G.up.stats(g.up);
    if (g.fireCd > 0) g.fireCd -= dt;
    if (g.rapidT > 0) g.rapidT -= dt;
    for (const l of g.launchers) { if (l.recoil > 0) l.recoil -= dt; if (l.alive && l.autoT === undefined) l.autoT = U.rand(1, 3); }
    // interceptors
    for (const ic of g.icp) {
      ic.t += dt;
      const dx = ic.tx - ic.x, dy = ic.ty - ic.y, d = Math.hypot(dx, dy), step = ic.speed * dt;
      if (d <= step) { ic.x = ic.tx; ic.y = ic.ty; ic.dead = true; Wp.detonate(g, ic); }
      else { ic.x += dx / d * step; ic.y += dy / d * step; }
    }
    g.icp = g.icp.filter((i) => !i.dead);
    // blasts
    for (const b of g.blasts) {
      b.t += dt;
      if (b.t < 0) { b.r = 0; continue; }
      if (b.t < b.grow) b.r = b.maxR * U.easeOutCubic(b.t / b.grow);
      else if (b.t < b.grow + b.hold) b.r = b.maxR * (1 + 0.025 * Math.sin(b.t * 18));
      else { const k = (b.t - b.grow - b.hold) / b.shrink; b.r = b.maxR * Math.max(0, 1 - k); if (k >= 1) b.dead = true; }
    }
    g.blasts = g.blasts.filter((b) => !b.dead);
    Wp.laser(g, dt);
    Wp.auto(g, dt);
  };

  /* ---------- beam laser ---------- */
  function segDist(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
    const t = U.clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1);
    return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
  }
  Wp.laser = function (g, dt) {
    const I = G.input, st = g.st;
    const want = !g.demo && g.weapon === 'laser' && I.fire && g.state !== 'clear' && g.state !== 'shop';
    if (g.laserLock && g.energy >= 20) g.laserLock = false;
    g.beam = null;
    if (want && !g.laserLock && g.energy > 0) {
      const l = g.launchers.filter((q) => q.alive).sort((a, b) => Math.abs(a.x - I.mouseX) - Math.abs(b.x - I.mouseX))[0];
      if (l) {
        const x0 = l.x, y0 = C.GROUND - 34, a = Math.atan2(Math.min(I.mouseY, C.TARGET_MAX_Y) - y0, I.mouseX - x0), x1 = x0 + Math.cos(a) * 1100, y1 = y0 + Math.sin(a) * 1100;
        g.beam = { x0, y0, x1, y1 };
        g.energy = Math.max(0, g.energy - st.laserDrain * dt);
        if (g.energy <= 0) g.laserLock = true;
        for (const e of g.en) if (!e.dead && segDist(e.x, e.y, x0, y0, x1, y1) < 9) G.enemies.killMissile(g, e, null);
        for (const o of g.air) if (!o.dead && segDist(o.x, o.y, x0, y0, x1, y1) < o.r + 6) G.enemies.damageAir(g, o, 14 * dt, null, true);
        for (const k of g.pk) if (!k.dead && segDist(k.x, k.y, x0, y0, x1, y1) < 20) Wp.collect(g, k);
        if (g.boss && G.boss.beamHit) G.boss.beamHit(g, g.boss, x0, y0, x1, y1, dt);
        if (Math.random() < 0.5) A.sfx.beam();
        return;
      }
    }
    g.energy = Math.min(100, g.energy + 24 * dt);
  };

  /* ---------- auto-turrets ---------- */
  Wp.auto = function (g, dt) {
    const every = g.st.autoEvery;
    if (!every || g.state === 'clear' || g.state === 'shop') return;
    for (const l of g.launchers) {
      if (!l.alive || l.ammo < 2) continue;
      l.autoT -= dt;
      if (l.autoT > 0) continue;
      l.autoT = every * U.rand(0.8, 1.2);
      let best = null, bd = 1e9;
      for (const e of g.en) {
        if (e.dead || e.y < 30 || e.autoT > 0) continue;
        const d = Math.abs(e.x - l.x) + (C.GROUND - e.y) * 0.3;
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) continue;
      const t = Math.hypot(best.x - l.x, best.y - C.GROUND) / (g.st.speed * 0.9);
      const tx = U.clamp(best.x + best.vx * t, 4, W - 4), ty = U.clamp(best.y + best.vy * t, 40, C.TARGET_MAX_Y);
      best.autoT = 2.2;
      Wp.launch(g, l, tx, ty, 'std', true);
    }
    for (const e of g.en) if (e.autoT > 0) e.autoT -= dt;
  };

  /* ---------- nuke ---------- */
  Wp.nukeReady = (g) => g.st.nukeGain > 0 && g.nuke >= 100;
  Wp.fireNuke = function (g, tx, ty) {
    if (!Wp.nukeReady(g) || g.state === 'clear' || g.state === 'shop') return;
    g.nuke = 0;
    Wp.blast(g, U.clamp(tx, 0, W), U.clamp(ty, 60, C.TARGET_MAX_Y), 'nuke', 470, { grow: 0.9, hold: 0.15, shrink: 0.5, hue: 48 });
    A.sfx.nuke(); FX.doFlash(0.9, '255,245,210'); FX.addShake(14);
  };
  Wp.addNuke = function (g, amount) { if (g.st.nukeGain > 0) g.nuke = Math.min(100, g.nuke + amount * g.st.nukeGain); };

  /* ---------- pickups: A ammo, R rapid fire, S shield, N nuke charge ---------- */
  Wp.dropPickup = function (g, x, y, kind) {
    const k = kind || U.pick(['A', 'A', 'R', 'S', 'N']);
    g.pk.push({ x, y, kind: k, t: 0, vy: 38, dead: false, r: 16 });
  };
  Wp.collect = function (g, k) {
    if (k.dead) return;
    k.dead = true;
    FX.sparks(k.x, k.y, 14, 180, 'hsla(50,100%,70%,1)', 0.5); FX.ring(k.x, k.y, 6, 40, 'hsla(50,100%,70%,1)', 0.35, 2);
    A.sfx.pickup();
    if (k.kind === 'A') { for (const l of g.launchers) if (l.alive) l.ammo = g.st.ammoMax; FX.text(k.x, k.y - 12, 'AMMO REFILL', '#7dffb8', 16); }
    else if (k.kind === 'R') { g.rapidT = 10; FX.text(k.x, k.y - 12, 'RAPID FIRE', '#ffe27a', 16); }
    else if (k.kind === 'S') { for (const s of g.launchers.concat(g.cities)) if (s.alive) s.shield = Math.max(s.shield, g.st.shieldHits) + 1; FX.text(k.x, k.y - 12, 'SHIELDS UP', '#8fd4ff', 16); }
    else { g.nuke = 100; FX.text(k.x, k.y - 12, 'NUKE CHARGED', '#ffb04a', 16); }
  };

  /* ---------- blasts vs everything ---------- */
  Wp.resolve = function (g, dt) {
    const E = G.enemies;
    for (const b of g.blasts) {
      if (b.t < 0 || b.r < 2) continue;
      for (const e of g.en) {
        if (e.dead) continue;
        const rr = b.r + e.r;
        if (U.dist2(b.x, b.y, e.x, e.y) <= rr * rr) E.killMissile(g, e, b);
      }
      for (const o of g.air) {
        if (o.dead) continue;
        const rr = b.r + o.r;
        if (U.dist2(b.x, b.y, o.x, o.y) <= rr * rr) {
          const last = b.hits.get(o);
          if (last === undefined || b.t - last >= 0.25) { b.hits.set(o, b.t); E.damageAir(g, o, b.dmg, b, false); }
        }
      }
      for (const k of g.pk) if (!k.dead && U.dist2(b.x, b.y, k.x, k.y) <= (b.r + k.r) * (b.r + k.r)) Wp.collect(g, k);
      if (g.boss && g.boss.state === 'fight') G.boss.blastHit(g, g.boss, b);
    }
    for (const k of g.pk) { k.t += dt; k.y += k.vy * dt; if (k.y > C.GROUND - 10) k.dead = true; }
    g.pk = g.pk.filter((k) => !k.dead);
  };
})((window.SGS = window.SGS || {}));
