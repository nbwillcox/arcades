/* Orbital mothership boss: shield generators, laser cannons, missile bays, then the core. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, E = G.enemies, TAU = U.TAU;
  const W = C.W;
  const B = {};
  G.boss = B;

  const M = (k, lx, ly, r, hp) => ({ k, lx, ly, r, hp });
  const MODS = [M('gen', -78, -4, 15, 30), M('gen', 78, -4, 15, 30), M('cannon', -122, 16, 15, 36), M('cannon', 122, 16, 15, 36), M('bay', -40, 26, 14, 32), M('bay', 40, 26, 14, 32), M('core', 0, 6, 22, 100)];

  B.create = function (g, stage) {
    const idx = Math.round(stage / C.BOSS_EVERY) - 1, hpMul = 1.5 + 0.2 * idx;
    const mods = MODS.map((d, i) => ({ id: 'm' + i, k: d.k, lx: d.lx, ly: d.ly, r: d.r, hp: Math.ceil(d.hp * hpMul), maxHp: Math.ceil(d.hp * hpMul), alive: true, flash: 0, x: 0, y: 0, st: 'idle', cd: U.rand(3, 6), t: 0, target: null }));
    const b = { idx, state: 'enter', t: 0, x: W / 2, y: -140, mods, shielded: true, destroyed: 0, shieldFlash: 0, dying: 0, deathFx: 0, hits: new Map(), total: mods.reduce((s, q) => s + q.maxHp, 0), name: 'ORBITAL MOTHERSHIP' };
    B.place(b);
    return b;
  };
  B.place = function (b) { for (const m of b.mods) { m.x = b.x + m.lx; m.y = b.y + m.ly; } };

  function breakMod(g, b, m) {
    m.alive = false; m.hp = 0;
    const core = m.k === 'core';
    FX.explosion(m.x, m.y, core ? 4 : 2.2, 25); FX.debris(m.x, m.y, core ? 16 : 9, '#ff8a3d', 220);
    FX.doFlash(core ? 0.7 : 0.25, '255,235,210'); A.sfx.partBreak();
    b.destroyed++;
    g.award(core ? 5000 * (b.idx + 1) : 500, m.x, m.y);
    g.credits += core ? 100 : 12;
    if (!core && Math.random() < 0.3) G.weapons.dropPickup(g, m.x, m.y);
    if (core) { b.state = 'dying'; b.dying = 0; b.deathFx = 0; g.en.length = 0; g.air.length = 0; A.sfx.boom(); }
    else if (b.shielded && !b.mods.some((q) => q.k === 'gen' && q.alive)) {
      b.shielded = false;
      FX.text(b.x, b.y + 80, 'CORE EXPOSED!', '#ff7a7a', 24); FX.ring(b.x, b.y, 20, 190, 'hsla(0,100%,65%,1)', 0.7, 5); A.sfx.thief();
    }
  }

  function hurt(g, b, m, d) {
    if (m.k === 'core' && b.shielded) { b.shieldFlash = 0.15; A.sfx.armor(); return; }
    m.hp -= d; m.flash = 0.06;
    if (m.hp <= 0) breakMod(g, b, m); else A.sfx.hit();
  }

  B.blastHit = function (g, b, bl) {
    if (b.state !== 'fight') return;
    for (const m of b.mods) {
      if (!m.alive) continue;
      const rr = bl.r + m.r;
      if (U.dist2(bl.x, bl.y, m.x, m.y) > rr * rr) continue;
      const key = bl.hits, last = key.get(m);
      if (last !== undefined && bl.t - last < 0.25) continue;
      key.set(m, bl.t);
      FX.sparks(m.x, m.y, 3, 140, 'hsla(25,100%,70%,1)', 0.25, 1.4);
      hurt(g, b, m, bl.dmg);
    }
  };
  B.beamHit = function (g, b, x0, y0, x1, y1, dt) {
    if (b.state !== 'fight') return;
    for (const m of b.mods) {
      if (!m.alive) continue;
      const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1, t = U.clamp(((m.x - x0) * dx + (m.y - y0) * dy) / l2, 0, 1);
      if (Math.hypot(m.x - (x0 + dx * t), m.y - (y0 + dy * t)) < m.r + 5) { m.acc = (m.acc || 0) + 14 * dt; if (m.acc >= 1) { const d = m.acc; m.acc = 0; hurt(g, b, m, d); } }
    }
  };

  B.update = function (g, b, dt) {
    b.t += dt;
    if (b.shieldFlash > 0) b.shieldFlash -= dt;
    for (const m of b.mods) if (m.flash > 0) m.flash -= dt;
    if (b.state === 'enter') {
      const k = Math.min(1, b.t / 2.6);
      b.y = -140 + (112 + 140) * U.easeOutCubic(k); B.place(b);
      if (k >= 1) { b.state = 'fight'; b.t = 0; }
      return;
    }
    if (b.state === 'dying') {
      b.dying += dt; b.deathFx -= dt; B.place(b);
      if (b.deathFx <= 0) { b.deathFx = 0.1; FX.explosion(b.x + U.rand(-120, 120), b.y + U.rand(-40, 50), U.rand(1.5, 3), 25); if (Math.random() < 0.3) A.sfx.kill(2); }
      if (b.dying > 3.1) {
        FX.explosion(b.x, b.y, 7, 25); FX.ring(b.x, b.y, 20, 560, 'hsla(0,0%,100%,1)', 0.9, 6); FX.doFlash(1, '255,255,255'); FX.addShake(16); A.sfx.boom();
        for (let i = 0; i < 3; i++) G.weapons.dropPickup(g, b.x + (i - 1) * 70, b.y + 30);
        b.state = 'done';
      }
      return;
    }
    b.x = W / 2 + Math.sin(b.t * 0.25) * 230; b.y = 112 + Math.sin(b.t * 0.7) * 10; B.place(b);
    const rate = 1 + 0.1 * b.destroyed;
    for (const m of b.mods) {
      if (!m.alive) continue;
      if (m.k === 'bay') {
        m.cd -= dt * rate;
        if (m.cd <= 0) { m.cd = 6; for (let i = 0; i < 3; i++) E.spawnMissile(g, { x: m.x + (i - 1) * 8, y: m.y + 6, speed: g.msp * 1.05 }); A.sfx.launch(); }
      } else if (m.k === 'cannon') {
        m.t += dt;
        if (m.st === 'idle') { m.cd -= dt * rate; if (m.cd <= 0) { const ts = E.targets(g); if (ts.length) { m.target = U.pick(ts); m.st = 'lock'; m.t = 0; A.sfx.lockOn(); } else m.cd = 3; } }
        else if (m.st === 'lock') { if (!m.target.alive) { m.st = 'idle'; m.cd = 2; } else if (m.t > 1.2) { m.st = 'fire'; m.t = 0; } }
        else if (m.st === 'fire') {
          if (Math.random() < 0.4) A.sfx.beam();
          if (m.t > 1.6) { m.st = 'idle'; m.cd = 7 + Math.random() * 3; if (m.target.alive) E.hitStructure(g, m.target, null); }
        }
      }
    }
  };

  function hex(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = rot + i / 6 * TAU; if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  }

  B.draw = function (ctx, g, b) {
    if (b.state === 'done') return;
    const x = b.x, y = b.y, t = b.t;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = GFX.lg(ctx, 0, -48, 0, 56, [[0, '#4a5878'], [0.5, '#232c46'], [1, '#0c1226']]);
    ctx.beginPath(); ctx.moveTo(-170, 6); ctx.quadraticCurveTo(-150, -36, -70, -44); ctx.lineTo(70, -44); ctx.quadraticCurveTo(150, -36, 170, 6); ctx.quadraticCurveTo(110, 58, 0, 62); ctx.quadraticCurveTo(-110, 58, -170, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,140,60,0.14)'; ctx.lineWidth = 14; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,140,60,0.22)'; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,140,0.35)'; ctx.lineWidth = 1.2;
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 34, -42); ctx.lineTo(i * 30, 52); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,200,120,0.7)';
    for (let i = 0; i < 20; i++) { ctx.beginPath(); ctx.arc(-152 + i * 16, -20 + (i % 3) * 18, 1.3, 0, TAU); ctx.fill(); }
    ctx.restore();
    for (const m of b.mods) {
      if (!m.alive) { ctx.fillStyle = 'rgba(6,8,16,0.9)'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 0.9, 0, TAU); ctx.fill(); continue; }
      ctx.save(); ctx.translate(m.x, m.y);
      ctx.fillStyle = 'rgba(8,12,24,0.95)'; ctx.beginPath(); ctx.arc(0, 0, m.r + 3, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 1.6; ctx.stroke();
      if (m.k === 'cannon') {
        ctx.fillStyle = GFX.lg(ctx, -4, 0, 4, 0, [[0, '#2a3552'], [0.5, '#9fb2d8'], [1, '#2a3552']]); ctx.fillRect(-3, 2, 6, 20);
        ctx.fillStyle = m.st === 'idle' ? '#ff8a3d' : '#ff3030'; ctx.fillRect(-4, 18, 8, 4);
      } else if (m.k === 'bay') {
        ctx.fillStyle = '#05070f'; ctx.fillRect(-9, -9, 18, 18); ctx.fillStyle = '#34406a'; ctx.fillRect(-10, -10, 9, 20); ctx.fillRect(1, -10, 9, 20);
      } else if (m.k === 'core') {
        const p = 1 + Math.sin(t * 4) * 0.08;
        ctx.fillStyle = GFX.rg(ctx, 0, 0, 1, m.r * p, [[0, '#ffffff'], [0.35, b.shielded ? '#ffb04a' : '#ff5a5a'], [1, '#1a1030']]);
        ctx.beginPath(); ctx.arc(0, 0, m.r * p, 0, TAU); ctx.fill();
      } else {
        hex(ctx, 0, 0, m.r, t * 0.6 + m.lx); ctx.fillStyle = GFX.rg(ctx, 0, 0, 1, m.r, [[0, '#fff'], [0.4, '#ffb04a'], [1, '#10182c']]); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
      }
      ctx.restore();
      if (m.hp < m.maxHp) {
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(m.x, m.y, m.r + 6, 0, TAU); ctx.stroke();
        ctx.strokeStyle = m.hp / m.maxHp < 0.35 ? '#ff5a5a' : '#8dffb8'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * m.hp / m.maxHp); ctx.stroke();
      }
      if (m.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r + 2, 0, TAU); ctx.fill(); }
      if (m.k === 'cannon' && (m.st === 'lock' || m.st === 'fire') && m.target && m.target.alive) {
        const tp = { x: m.target.x, y: C.GROUND - 20 };
        ctx.save();
        if (m.st === 'lock') { ctx.strokeStyle = 'rgba(255,60,60,' + (0.25 + 0.5 * (m.t / 1.2)) + ')'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(m.x, m.y + 22); ctx.lineTo(tp.x, tp.y); ctx.stroke(); }
        else {
          ctx.globalCompositeOperation = 'lighter'; const w = 5 + Math.sin(t * 40) * 1.5;
          ctx.strokeStyle = 'rgba(255,60,50,0.55)'; ctx.lineWidth = w * 3; ctx.beginPath(); ctx.moveTo(m.x, m.y + 22); ctx.lineTo(tp.x, tp.y); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,230,220,0.95)'; ctx.lineWidth = w; ctx.stroke();
          GFX.drawGlow(ctx, 'hsla(5,100%,60%,1)', tp.x, tp.y, 36, 0.9);
        }
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    const core = b.mods.find((q) => q.k === 'core');
    if (core && core.alive) {
      GFX.drawGlow(ctx, b.shielded ? 'hsla(30,100%,60%,1)' : 'hsla(0,100%,60%,1)', core.x, core.y, 46 + Math.sin(t * 4) * 5, b.shielded ? 0.5 : 0.9);
      if (b.shielded) {
        ctx.globalAlpha = 0.5 + b.shieldFlash * 4 + Math.sin(t * 5) * 0.08; hex(ctx, core.x, core.y, core.r + 11, t * 0.5);
        ctx.fillStyle = 'rgba(70,170,255,0.22)'; ctx.fill(); ctx.strokeStyle = 'rgba(160,225,255,0.95)'; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (b.state === 'fight' || b.state === 'enter') {
      const left = b.mods.reduce((s, q) => s + (q.alive ? q.hp : 0), 0), bw = 320, bx = W / 2 - bw / 2, by = 72;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 9); ctx.fillStyle = '#ff8a3d'; ctx.fillRect(bx, by, bw * left / b.total, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '700 11px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(b.name + (b.shielded ? '  -  DESTROY THE GENERATORS' : '  -  DESTROY THE CORE'), W / 2, by - 6);
    }
  };
})((window.SGS = window.SGS || {}));
