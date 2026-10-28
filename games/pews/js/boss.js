/* Stage bosses: three organic multi-part bosses. Break the guard parts, then the exposed core. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, St = G.stage, E = G.enemies, TAU = U.TAU;
  const Bo = {};
  G.boss = Bo;
  const WW = C.WW, W = C.W, H = C.H;
  const SKINS = [{ name: 'THE WATCHER', hue: 330 }, { name: 'OVERMIND', hue: 275 }, { name: 'MOTHER CORE', hue: 20 }];
  Bo.SKINS = SKINS;

  Bo.create = function (g, n, x, y) {
    const d = St.difficulty(n), skin = (Math.floor((n - 1) / 2)) % 3, php = 6 + d * 2;
    const part = (k, dx, dy, r, ph) => ({ k, dx, dy, r, hp: php, maxhp: php, alive: true, hitT: 0, cd: U.rand(0.8, 2), ph: ph || 0, x: 0, y: 0 });
    const parts = skin === 0 ? [part('gun', -76, -28, 17), part('gun', 76, -28, 17), part('gun', -76, 34, 17), part('gun', 76, 34, 17)]
      : skin === 1 ? [0, 1, 2, 3].map((i) => part('orbit', 0, 0, 15, i * Math.PI / 2))
        : [part('gun', 0, -66, 16), part('gun', 0, 66, 16), part('gun', -80, 0, 16), part('spawner', 80, 0, 18)];
    const hp = 24 + 8 * d;
    return { skin, name: SKINS[skin].name, hue: SKINS[skin].hue, x0: x, x, y, y0: y, t: 0, state: 'fight', hp, maxhp: hp, parts, r: 42, hit: 0, dieT: 0, cd: 2.5, id: n };
  };
  Bo.exposed = (b) => !b.parts.some((p) => p.alive);

  Bo.update = function (g, b, dt) {
    b.t += dt;
    if (b.hit > 0) b.hit -= dt;
    for (const p of b.parts) if (p.hitT > 0) p.hitT -= dt;
    const ex = Bo.exposed(b), enter = 1 - Math.min(1, b.t / 2.2);
    if (b.state === 'dying') {
      b.dieT -= dt;
      if (Math.random() < 0.4) { FX.explosion(g.sx(b.x) + U.rand(-70, 70), g.sy(b.y) + U.rand(-50, 50), U.rand(0.8, 1.6), b.hue + U.rand(-20, 20)); FX.addShake(5); }
      if (b.dieT <= 0) { b.state = 'done'; FX.explosion(g.sx(b.x), g.sy(b.y), 4, b.hue); FX.doFlash(0.6, '255,230,230'); A.sfx.boom(); }
      return;
    }
    const sp = ex ? 1.5 : 1;
    if (g.mode === 'free') { b.x = U.wrap(b.x0 + Math.sin(b.t * 0.5 * sp) * 240, WW); b.y = b.y0 + Math.sin(b.t * 0.9 * sp) * 60 - enter * 320; }
    else { b.x = 480 + Math.sin(b.t * 0.6 * sp) * 230; b.y = g.cam.y + 170 + Math.sin(b.t * 0.9) * 22 - enter * 300; }
    for (const p of b.parts) {
      if (p.k === 'orbit') { const a = b.t * (ex ? 1.6 : 1.1) + p.ph; p.dx = Math.cos(a) * 82; p.dy = Math.sin(a) * 62; }
      p.x = b.x + p.dx; p.y = b.y + p.dy;
    }
    if (enter > 0.3) return;
    const pl = g.player, aim = (x, y, off) => { const dx = E.dxw(g, pl.x, x), dy = pl.y - y, a = Math.atan2(dy, dx) + (off || 0); g.ebullet(x, y, Math.cos(a) * 205, Math.sin(a) * 205); };
    for (const p of b.parts) {
      if (!p.alive) continue;
      p.cd -= dt;
      if (p.k === 'gun' && p.cd <= 0 && pl.alive) { p.cd = U.rand(1.7, 2.6); aim(p.x, p.y, U.rand(-0.08, 0.08)); A.sfx.enemyShot(); }
      if (p.k === 'spawner' && p.cd <= 0) { p.cd = 3.4; if (g.en.filter((e) => e.type === 'larva').length < 6) { E.spawn(g, 'larva', p.x, p.y, { vx: U.rand(-50, 50), vy: U.rand(-50, 50) }); A.sfx.spawnBot(); } }
    }
    b.cd -= dt;
    if (b.cd <= 0) {
      b.cd = (ex ? 1.5 : 2.6) * U.rand(0.85, 1.15);
      if (ex && pl.alive) { for (let k = -2; k <= 2; k++) aim(b.x, b.y, k * 0.26); A.sfx.enemyShot(); }
      else if (b.skin === 1 && pl.alive) { aim(b.x, b.y + 20, 0); A.sfx.enemyShot(); }
    }
  };

  function hurtPart(g, b, p, dmg) {
    p.hp -= dmg; p.hitT = 0.1; A.sfx.hit();
    FX.sparks(g.sx(p.x), g.sy(p.y), 4, 120, FX.col(b.hue, 70), 0.3, 1.4);
    if (p.hp <= 0) {
      p.alive = false; FX.explosion(g.sx(p.x), g.sy(p.y), 1.5, b.hue); A.sfx.partBreak(); FX.addShake(6);
      g.award(1500, p.x, p.y);
      if (Bo.exposed(b)) { g.banner = { text: 'CORE EXPOSED', sub: '', t: 0, life: 1.6, small: true }; FX.doFlash(0.3, '255,200,200'); g.dropCap(b.x, b.y + 40, 'P'); }
    }
  }
  function hurtCore(g, b, dmg) {
    b.hp -= dmg; b.hit = 0.08; A.sfx.hit();
    FX.sparks(g.sx(b.x), g.sy(b.y), 4, 140, FX.col(b.hue, 70), 0.3, 1.5);
    if (b.hp <= 0 && b.state !== 'dying') {
      b.state = 'dying'; b.dieT = 2.4; g.clearBullets(true);
      g.award(15000 + g.stageNo * 500, b.x, b.y); A.sfx.boom(); g.dropCap(b.x, b.y, 'P');
    }
  }
  /* shot/bomb test at world point (x,y) with radius r. Returns true if it struck the boss. */
  Bo.hit = function (g, b, x, y, r, dmg) {
    if (b.state !== 'fight' || b.t < 1.4) return false;
    for (const p of b.parts) {
      if (!p.alive) continue;
      const dx = E.dxw(g, x, p.x), dy = y - p.y, rr = p.r + r;
      if (dx * dx + dy * dy < rr * rr) { hurtPart(g, b, p, dmg); return true; }
    }
    const dx = E.dxw(g, x, b.x), dy = y - b.y, rr = b.r + r;
    if (dx * dx + dy * dy < rr * rr) { if (Bo.exposed(b)) hurtCore(g, b, dmg); else if (b.hit <= 0) { b.hit = 0.08; FX.sparks(g.sx(x), g.sy(y), 2, 90, 'hsla(190,100%,75%,1)', 0.2, 1.2); } return true; }
    return false;
  };
  Bo.bomb = function (g, b, dmg) {
    if (b.state !== 'fight') return;
    for (const p of b.parts) if (p.alive) hurtPart(g, b, p, dmg);
    if (Bo.exposed(b)) hurtCore(g, b, dmg);
  };
  Bo.touches = function (g, b, pl) {
    if (b.state !== 'fight' || b.t < 1.4) return false;
    const R = C.SHIP_R;
    for (const p of b.parts) { if (!p.alive) continue; const dx = E.dxw(g, pl.x, p.x), dy = pl.y - p.y, rr = p.r + R; if (dx * dx + dy * dy < rr * rr) return true; }
    const dx = E.dxw(g, pl.x, b.x), dy = pl.y - b.y, rr = b.r + R;
    return dx * dx + dy * dy < rr * rr;
  };

  /* ---------- drawing ---------- */
  Bo.draw = function (ctx, g, b) {
    if (b.state === 'done') return;
    const x = g.sx(b.x), y = g.sy(b.y), h = b.hue, ex = Bo.exposed(b), t = b.t, flash = b.hit > 0;
    if (x < -200 || x > W + 200 || y < -200 || y > H + 200) return;
    ctx.save();
    ctx.globalAlpha = b.state === 'dying' ? 0.5 + 0.5 * Math.sin(t * 40) : 1;
    ctx.translate(x, y);
    // fleshy body
    ctx.fillStyle = GFX.rg(ctx, -12, -14, 6, 64, [[0, U.hsl(h, 70, 70)], [0.45, U.hsl(h, 65, 34)], [1, U.hsl(h, 70, 10)]]);
    ctx.beginPath(); ctx.arc(0, 0, b.skin === 1 ? 52 : 58, 0, TAU); ctx.fill();
    ctx.strokeStyle = U.hsl(h, 100, 62, 0.25); ctx.lineWidth = 10; ctx.stroke();
    ctx.strokeStyle = U.hsl(h, 100, 72, 0.95); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.strokeStyle = U.hsl(h, 60, 20, 0.7); ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + t * 0.1; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20); ctx.quadraticCurveTo(Math.cos(a + 0.4) * 36, Math.sin(a + 0.4) * 36, Math.cos(a) * 54, Math.sin(a) * 54); ctx.stroke(); }
    // core / eye
    ctx.fillStyle = flash ? '#ffffff' : '#12040a'; ctx.beginPath(); ctx.arc(0, 0, 32, 0, TAU); ctx.fill();
    ctx.strokeStyle = U.hsl(h, 100, 78, 0.9); ctx.lineWidth = 2; ctx.stroke();
    const open = ex ? 1 : 0.35 + 0.1 * Math.sin(t * 3);
    ctx.fillStyle = ex ? 'rgba(255,70,70,' + (0.75 + 0.25 * Math.sin(t * 12)) + ')' : 'rgba(255,240,150,0.9)';
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 22 * open, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a0408'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 17 * open, 0, 0, TAU); ctx.fill();
    if (!ex) { ctx.strokeStyle = 'rgba(120,220,255,' + (0.4 + 0.2 * Math.sin(t * 5)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 36, 0, TAU); ctx.stroke(); }
    ctx.restore();
    for (const p of b.parts) {
      if (!p.alive) continue;
      const px = g.sx(p.x), py = g.sy(p.y), pf = p.hitT > 0;
      ctx.save(); ctx.translate(px, py);
      ctx.fillStyle = GFX.rg(ctx, -4, -4, 2, p.r + 4, pf ? [[0, '#ffffff'], [1, '#ffe0e0']] : p.k === 'spawner' ? [[0, '#f0ffd0'], [0.5, '#8ad83a'], [1, '#1c4a0a']] : [[0, U.hsl(h, 90, 82)], [0.5, U.hsl(h, 75, 48)], [1, U.hsl(h, 70, 16)]]);
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = U.hsl(h, 100, 78, 0.95); ctx.lineWidth = 2; ctx.stroke();
      if (p.k === 'gun') { const a = Math.atan2(g.player.y - p.y, E.dxw(g, g.player.x, p.x)); ctx.strokeStyle = '#ffe0c8'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * (p.r + 6), Math.sin(a) * (p.r + 6)); ctx.stroke(); }
      const k = p.hp / p.maxhp; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(-12, -p.r - 8, 24, 3); ctx.fillStyle = k > 0.5 ? '#6cffa0' : '#ffb04a'; ctx.fillRect(-12, -p.r - 8, 24 * k, 3);
      ctx.restore();
    }
    if (ex && b.state !== 'dying') { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 60, y - 76, 120, 6); ctx.fillStyle = '#ff5a5a'; ctx.fillRect(x - 60, y - 76, 120 * Math.max(0, b.hp / b.maxhp), 6); }
    ctx.globalCompositeOperation = 'lighter';
    GFX.drawGlow(ctx, 'hsla(' + h + ',100%,60%,1)', x, y, 100, 0.2 + (ex ? 0.12 : 0));
    ctx.globalCompositeOperation = 'source-over';
  };
})((window.SGS = window.SGS || {}));
