/* Boss every 5th level: a shielded core guarded by cannons, spawner pods or orbiting shield orbs. Break the guards, then the core. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, TAU = U.TAU;
  const Bo = {};
  G.boss = Bo;
  const SKINS = [{ name: 'TWIN CANNON', hue: 8 }, { name: 'HIVE MOTHER', hue: 140 }, { name: 'PRISM GUARD', hue: 285 }];
  Bo.SKINS = SKINS;

  Bo.create = function (g, lvl) {
    const k = Math.floor(lvl / C.BOSS_EVERY) - 1, skin = k % 3, tier = Math.floor(k / 3);
    const mhp = 4 + tier + Math.floor(k / 2), mod = (kind, dx, dy, r, ph) => ({ k: kind, dx, dy, r, hp: mhp, maxhp: mhp, alive: true, hitT: 0, x: 0, y: 0, ph: ph || 0 });
    const mods = skin === 0 ? [mod('cannon', -100, 16, 19), mod('cannon', 100, 16, 19)]
      : skin === 1 ? [mod('spawner', -88, -6, 20), mod('spawner', 88, -6, 20), mod('cannon', 0, 54, 17)]
        : [0, 1, 2, 3].map((i) => mod('shield', 0, 0, 16, i * Math.PI / 2));
    const hp = 14 + 3 * k;
    return { skin, name: SKINS[skin].name, hue: SKINS[skin].hue, x: C.W / 2, y: -90, ty: 150, t: 0, state: 'enter', hp, maxhp: hp, mods, cd: 2.4, sp: 3, hit: 0, r: 40, dieT: 0, id: lvl };
  };
  Bo.exposed = (b) => !b.mods.some((m) => m.alive);

  function place(b) {
    for (const m of b.mods) {
      if (m.k === 'shield') { const a = b.t * (Bo.exposed(b) ? 1.4 : 1) + m.ph; m.dx = Math.cos(a) * 84; m.dy = Math.sin(a) * 58; }
      m.x = b.x + m.dx; m.y = b.y + m.dy;
    }
  }

  Bo.update = function (g, b, dt) {
    b.t += dt;
    if (b.hit > 0) b.hit -= dt;
    for (const m of b.mods) if (m.hitT > 0) m.hitT -= dt;
    if (b.state === 'enter') {
      b.y += (b.ty - b.y) * Math.min(1, 2 * dt); place(b);
      if (Math.abs(b.y - b.ty) < 3) { b.state = 'fight'; }
      return;
    }
    if (b.state === 'dying') {
      b.dieT -= dt;
      if (Math.random() < 0.35) { FX.explosion(b.x + U.rand(-90, 90), b.y + U.rand(-40, 40), U.rand(0.8, 1.6), b.hue + U.rand(-20, 20)); FX.addShake(5); }
      if (b.dieT <= 0) { b.state = 'done'; FX.explosion(b.x, b.y, 4, b.hue); FX.doFlash(0.6, '255,230,200'); A.sfx.boom(); }
      return;
    }
    const ex = Bo.exposed(b), sp = ex ? 1.5 : 1;
    b.x = C.W / 2 + Math.sin(b.t * 0.55 * sp) * 250;
    b.y = b.ty + Math.sin(b.t * 0.9) * 12;
    place(b);
    const pad = g.paddle;
    b.cd -= dt;
    if (b.cd <= 0) {
      b.cd = (ex ? 1.25 : 2.1) * U.rand(0.8, 1.2);
      const shoot = (sx, sy, spread) => { const a = Math.atan2(pad.y - sy, pad.x - sx) + spread; g.ebolt(sx, sy, Math.cos(a) * 235, Math.sin(a) * 235); };
      const guns = b.mods.filter((m) => m.alive && m.k === 'cannon');
      for (const m of guns) shoot(m.x, m.y + 8, U.rand(-0.1, 0.1));
      if (ex) { shoot(b.x, b.y + 30, -0.28); shoot(b.x, b.y + 30, 0); shoot(b.x, b.y + 30, 0.28); }
      else if (!guns.length && b.skin === 2) shoot(b.x, b.y + 36, 0);
      if (guns.length || ex) A.sfx.enemyShot();
    }
    b.sp -= dt;
    const pod = b.mods.find((m) => m.alive && m.k === 'spawner');
    if (b.sp <= 0 && pod && g.drifters.length < 4) { b.sp = 4.2; g.spawnDrifter(pod.x, pod.y + 22); A.sfx.spawnBot(); }
  };

  function hurtMod(g, b, m, dmg) {
    m.hp -= dmg; m.hitT = 0.12; A.sfx.hit();
    FX.sparks(m.x, m.y, 4, 120, FX.col(b.hue, 70), 0.3, 1.4);
    if (m.hp <= 0) {
      m.alive = false; FX.explosion(m.x, m.y, 1.5, b.hue); A.sfx.partBreak(); FX.addShake(6);
      g.award(1500, m.x, m.y); g.maybeDrop(m.x, m.y, 0.6);
      if (Bo.exposed(b)) { g.banner = { text: 'CORE EXPOSED', sub: '', t: 0, life: 1.6, small: true }; FX.doFlash(0.3, '255,200,200'); }
    }
  }
  function hurtCore(g, b, dmg) {
    b.hp -= dmg; b.hit = 0.1; A.sfx.hit();
    FX.sparks(b.x, b.y + 10, 5, 140, FX.col(b.hue, 70), 0.3, 1.5);
    if (b.hp <= 0 && b.state !== 'dying') {
      b.state = 'dying'; b.dieT = 2.2; g.clearBolts(true);
      g.award(10000 + g.level * 500, b.x, b.y); A.sfx.boom();
      for (let i = 0; i < 2; i++) g.maybeDrop(b.x + U.rand(-50, 50), b.y, 1);
    }
  }

  /* targets: alive guards, then the core. Returns the target hit (or null). */
  function target(b, x, y, r) {
    if (b.state === 'enter' || b.state === 'dying' || b.state === 'done') return null;
    for (const m of b.mods) { if (!m.alive) continue; const rr = m.r + r; if ((x - m.x) * (x - m.x) + (y - m.y) * (y - m.y) < rr * rr) return m; }
    const rr = b.r + r;
    if ((x - b.x) * (x - b.x) + (y - b.y) * (y - b.y) < rr * rr) return b;
    return null;
  }
  Bo.ballHit = function (g, b, ball) {
    const t = target(b, ball.x, ball.y, C.BALL_R);
    if (!t) return false;
    const exposed = Bo.exposed(b), core = t === b;
    if (!core) { if (t.hitT <= 0) hurtMod(g, b, t, ball.fire > 0 ? 2 : 1); }
    else if (exposed) { if (b.hit <= 0) hurtCore(g, b, ball.fire > 0 ? 2 : 1); }
    else if (b.hit <= 0) { b.hit = 0.1; A.sfx.clink(); }
    const tx = core ? b.x : t.x, ty = core ? b.y : t.y, d = Math.hypot(ball.x - tx, ball.y - ty) || 1, nx = (ball.x - tx) / d, ny = (ball.y - ty) / d;
    const rr = (core ? b.r : t.r) + C.BALL_R;
    ball.x = tx + nx * (rr + 0.5); ball.y = ty + ny * (rr + 0.5);
    const dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0) { ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny; }
    return true;
  };
  Bo.shotHit = function (g, b, s) {
    const t = target(b, s.x, s.y, 3);
    if (!t) return false;
    if (t !== b) hurtMod(g, b, t, 0.5); else if (Bo.exposed(b)) hurtCore(g, b, 0.5); else A.sfx.clink();
    return true;
  };
  Bo.bombHit = function (g, b, x, y, r, dmg) {
    if (b.state !== 'fight') return;
    for (const m of b.mods) if (m.alive && Math.hypot(m.x - x, m.y - y) < r + m.r) hurtMod(g, b, m, dmg);
    if (Bo.exposed(b) && Math.hypot(b.x - x, b.y - y) < r + b.r) hurtCore(g, b, dmg);
  };

  /* ---------- drawing (all procedural, one boss on screen) ---------- */
  Bo.draw = function (ctx, g, b) {
    if (b.state === 'done') return;
    const x = b.x, y = b.y, h = b.hue, flash = b.hit > 0, ex = Bo.exposed(b), t = b.t;
    const fade = b.state === 'dying' ? 0.5 + 0.5 * Math.sin(t * 40) : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(x, y);
    // hull wings
    ctx.fillStyle = GFX.lg(ctx, 0, -40, 0, 50, [[0, '#56627e'], [0.5, '#273046'], [1, '#0e1322']]);
    ctx.beginPath(); ctx.moveTo(-150, 12); ctx.quadraticCurveTo(-132, -34, -64, -42); ctx.lineTo(64, -42); ctx.quadraticCurveTo(132, -34, 150, 12);
    ctx.quadraticCurveTo(110, 52, 0, 58); ctx.quadraticCurveTo(-110, 52, -150, 12); ctx.fill();
    ctx.strokeStyle = U.hsl(h, 100, 62, 0.25); ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = U.hsl(h, 100, 66, 0.95); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 30, -38); ctx.lineTo(i * 34, 48); ctx.stroke(); }
    // core
    ctx.fillStyle = GFX.rg(ctx, -8, -10, 4, 46, flash ? [[0, '#ffffff'], [1, '#ffd0d0']] : [[0, '#ffffff'], [0.3, U.hsl(h, 100, 66)], [1, U.hsl(h, 70, 18)]]);
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = U.hsl(h, 100, 78, 0.95); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#10050a'; ctx.beginPath(); ctx.ellipse(0, 2, 17, 10, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = ex ? 'rgba(255,60,60,' + (0.7 + 0.3 * Math.sin(t * 12)) + ')' : 'rgba(120,220,255,0.9)'; ctx.beginPath(); ctx.ellipse(0, 2, 7, 7, 0, 0, TAU); ctx.fill();
    if (!ex) { ctx.strokeStyle = 'rgba(120,220,255,' + (0.45 + 0.2 * Math.sin(t * 5)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, b.r + 4, 0, TAU); ctx.stroke(); }
    ctx.restore();
    for (const m of b.mods) {
      if (!m.alive) continue;
      const mf = m.hitT > 0;
      ctx.save(); ctx.translate(m.x, m.y); ctx.globalAlpha = fade;
      ctx.fillStyle = GFX.rg(ctx, -4, -4, 2, m.r + 4, mf ? [[0, '#ffffff'], [1, '#ffe0e0']] : m.k === 'spawner' ? [[0, '#e8ffe0'], [0.5, '#46d86a'], [1, '#0c4a22']] : m.k === 'shield' ? [[0, '#ffffff'], [0.45, U.hsl(h, 100, 66)], [1, U.hsl(h, 70, 22)]] : [[0, '#c8d2ea'], [0.5, '#5a6684'], [1, '#1c2236']]);
      ctx.beginPath(); ctx.arc(0, 0, m.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = U.hsl(h, 100, 72, 0.95); ctx.lineWidth = 2; ctx.stroke();
      if (m.k === 'cannon') { ctx.fillStyle = '#e4ecff'; ctx.fillRect(-3, 4, 6, 20); ctx.fillStyle = '#ff6a6a'; ctx.fillRect(-2, 21, 4, 4); }
      if (m.k === 'spawner') { ctx.fillStyle = 'rgba(20,60,30,0.8)'; ctx.beginPath(); ctx.arc(0, 4, 7, 0, TAU); ctx.fill(); }
      const k = m.hp / m.maxhp; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(-12, -m.r - 8, 24, 3); ctx.fillStyle = k > 0.5 ? '#6cffa0' : '#ffb04a'; ctx.fillRect(-12, -m.r - 8, 24 * k, 3);
      ctx.restore();
    }
    if (ex && b.state !== 'dying') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 60, y - 64, 120, 6);
      ctx.fillStyle = '#ff5a5a'; ctx.fillRect(x - 60, y - 64, 120 * Math.max(0, b.hp / b.maxhp), 6);
    }
    ctx.globalCompositeOperation = 'lighter';
    GFX.drawGlow(ctx, 'hsla(' + h + ',100%,60%,1)', x, y, 90, 0.18 + (ex ? 0.12 : 0));
    ctx.globalCompositeOperation = 'source-over';
  };
})((window.SGS = window.SGS || {}));
