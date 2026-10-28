/* Bosses: a random pick of Rock Titan, Rock Hive or Mining Mothership. Shoot the armor/nodes/generators
   off, then the core. Modules ride on the (rotating) hull. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, R = G.rocks, Sa = G.saucers, TAU = U.TAU;
  const W = C.W, H = C.H;
  const B = {};
  G.boss = B;

  const rim = (k, n, i, d, r, hp, off) => ({ k, lx: Math.cos(i / n * TAU + (off || 0)) * d, ly: Math.sin(i / n * TAU + (off || 0)) * d, r, hp });
  const DEFS = {
    titan: {
      name: 'ROCK TITAN', hue: 205, accent: '#6ee1ff', rock: 'iron', hullR: 90, spin: 0.22, armor: ['plate'],
      mods: [rim('plate', 8, 0, 74, 18, 34), rim('turret', 8, 1, 76, 14, 40), rim('plate', 8, 2, 74, 18, 34), rim('plate', 8, 3, 74, 18, 34),
        rim('plate', 8, 4, 74, 18, 34), rim('turret', 8, 5, 76, 14, 40), rim('plate', 8, 6, 74, 18, 34), rim('plate', 8, 7, 74, 18, 34), { k: 'core', lx: 0, ly: 0, r: 24, hp: 190 }],
    },
    hive: {
      name: 'ROCK HIVE', hue: 42, accent: '#ffd24a', rock: 'ore', hullR: 80, spin: 0.16, armor: ['node'],
      mods: [0, 1, 2, 3, 4, 5, 6].map((i) => rim('node', 7, i, 64, 17, 38)).concat([{ k: 'core', lx: 0, ly: 0, r: 22, hp: 170 }]),
    },
    mother: {
      name: 'MINING MOTHERSHIP', hue: 20, accent: '#ff8a3d', hullR: 0, spin: 0, armor: ['gen'],
      mods: [{ k: 'gen', lx: -62, ly: -8, r: 15, hp: 62 }, { k: 'gen', lx: 62, ly: -8, r: 15, hp: 62 }, { k: 'turret', lx: -98, ly: 18, r: 14, hp: 46 }, { k: 'turret', lx: 98, ly: 18, r: 14, hp: 46 },
        { k: 'turret', lx: 0, ly: -44, r: 14, hp: 46 }, { k: 'bay', lx: -36, ly: 40, r: 16, hp: 56 }, { k: 'bay', lx: 36, ly: 40, r: 16, hp: 56 }, { k: 'core', lx: 0, ly: 8, r: 22, hp: 175 }],
    },
  };
  const ORDER = ['titan', 'hive', 'mother'];

  B.nameFor = (stage) => 'BOSS';

  B.create = function (g, stage) {
    const idx = Math.round(stage / C.BOSS_EVERY) - 1;
    let pool = ORDER.filter((t) => t !== g.lastBoss);
    const type = U.pick(pool);
    g.lastBoss = type;
    const def = DEFS[type], hpMul = 1 + 0.15 * idx;
    const mods = def.mods.map((d, i) => ({ id: 'm' + i, k: d.k, lx: d.lx, ly: d.ly, r: d.r, hp: Math.ceil(d.hp * hpMul), maxHp: Math.ceil(d.hp * hpMul), alive: true, flash: 0, cd: U.rand(1.5, 3.5), burst: 0, bt: 0, x: 0, y: 0 }));
    const a = U.rand(0.4, 1.2) * (Math.random() < 0.5 ? 1 : -1);
    const sp = 52;
    const b = {
      type, def, name: def.name, hue: def.hue, accent: def.accent, state: 'enter', t: 0, ft: 0, x: W / 2, y: -150, vx: Math.cos(a) * sp, vy: Math.abs(Math.sin(a)) * sp * 0.6 + 8,
      ang: 0, mods, shielded: true, destroyed: 0, shieldFlash: 0, dying: 0, deathFx: 0, total: mods.reduce((s, q) => s + q.maxHp, 0), spT: 2, sang: 0, ringT: 5, sp: 0,
      hullR: def.hullR, idx,
    };
    B.place(b);
    return b;
  };

  B.place = function (b) {
    const c = Math.cos(b.ang), s = Math.sin(b.ang);
    for (const m of b.mods) { m.x = b.x + c * m.lx - s * m.ly; m.y = b.y + s * m.lx + c * m.ly; }
  };

  function breakMod(g, b, m) {
    m.alive = false; m.hp = 0;
    const core = m.k === 'core';
    FX.explosion(m.x, m.y, core ? 4 : 2.2, b.hue);
    FX.debris(m.x, m.y, core ? 16 : 9, b.accent, 220);
    FX.doFlash(core ? 0.7 : 0.22, '255,235,210');
    A.sfx.partBreak();
    b.destroyed++;
    g.award(core ? 5000 * (b.idx + 1) : 500, m.x, m.y);
    g.comboKill();
    if (!core && Math.random() < 0.3) g.dropPickup(m.x, m.y);
    if (m.k === 'plate' || m.k === 'node') R.spawnChunk(g, 'plain', 'M', m.x, m.y, 70);
    if (core) {
      b.state = 'dying'; b.dying = 0; b.deathFx = 0;
      g.clearEnemyBullets(true);
      A.sfx.boom();
    } else if (b.shielded && !b.mods.some((q) => b.def.armor.indexOf(q.k) >= 0 && q.alive)) {
      b.shielded = false;
      FX.text(b.x, b.y + b.def.hullR * 0.4 + 30, 'CORE EXPOSED!', '#ff7a7a', 24);
      FX.ring(b.x, b.y, 20, 190, 'hsla(0,100%,65%,1)', 0.7, 5);
      A.sfx.thief();
      if (b.type === 'titan') for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; R.spawnChunk(g, 'plain', 'L', b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 60, 85); }
    }
  }

  function dmg(g, b, m, d) {
    m.hp -= d; m.flash = 0.06;
    if (m.hp <= 0) breakMod(g, b, m); else A.sfx.hit();
  }

  B.bulletHit = function (g, b, bu) {
    for (const m of b.mods) {
      if (!m.alive) continue;
      const rr = m.r + bu.r;
      if (U.dist2(bu.x, bu.y, m.x, m.y) < rr * rr) {
        if (m.k === 'core' && b.shielded) {
          if (!bu.pierce) bu.dead = true;
          b.shieldFlash = 0.15; A.sfx.armor();
          FX.sparks(bu.x, bu.y, 3, 160, 'hsla(200,100%,75%,1)', 0.25, 1.4);
          return;
        }
        if (bu.pierce) { if (bu.hit.indexOf(m.id) >= 0) return; bu.hit.push(m.id); }
        FX.sparks(bu.x, bu.y, 3, 140, FX.col(b.hue, 75), 0.25, 1.4);
        dmg(g, b, m, bu.dmg);
        if (!bu.pierce) bu.dead = true;
        return;
      }
    }
    if (b.shielded && !bu.pierce && b.type !== 'mother') {
      const rr = b.hullR * 0.95, inside = U.dist2(bu.x, bu.y, b.x, b.y) < rr * rr;
      if (inside) { bu.dead = true; A.sfx.armor(); FX.sparks(bu.x, bu.y, 2, 120, 'hsla(45,100%,70%,1)', 0.2, 1.2); }
    }
  };

  B.hitsPlayer = function (g, b, p) {
    if (b.state !== 'fight') return false;
    for (const m of b.mods) { if (!m.alive) continue; const rr = m.r + C.SHIP_R; if (U.dist2(m.x, m.y, p.x, p.y) < rr * rr) return true; }
    if (b.type === 'mother') { const dx = (p.x - b.x) / 100, dy = (p.y - b.y) / 54; return dx * dx + dy * dy < 1; }
    const rr = b.hullR * 0.88 + C.SHIP_R;
    return U.dist2(p.x, p.y, b.x, b.y) < rr * rr;
  };

  function fire(g, x, y, ang, sp, kind, r) { g.ebullet(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, kind, r, { life: 3 }); }

  B.update = function (g, b, dt) {
    b.t += dt;
    if (b.shieldFlash > 0) b.shieldFlash -= dt;
    for (const m of b.mods) if (m.flash > 0) m.flash -= dt;
    if (b.state === 'enter') {
      const k = Math.min(1, b.t / 2.6);
      b.y = -150 + (H * 0.3 + 150) * U.easeOutCubic(k);
      b.ang += b.def.spin * dt;
      B.place(b);
      if (k >= 1) { b.state = 'fight'; b.ft = 0; }
      return;
    }
    if (b.state === 'dying') {
      b.dying += dt; b.deathFx -= dt; b.ang += b.def.spin * dt * 2;
      B.place(b);
      if (b.deathFx <= 0) { b.deathFx = 0.1; FX.explosion(b.x + U.rand(-70, 70), b.y + U.rand(-50, 50), U.rand(1.5, 3), b.hue); if (Math.random() < 0.3) A.sfx.kill(2); }
      if (b.dying > 3.1) {
        FX.explosion(b.x, b.y, 7, b.hue); FX.ring(b.x, b.y, 20, 560, 'hsla(0,0%,100%,1)', 0.9, 6);
        FX.doFlash(1, '255,255,255'); FX.addShake(16); A.sfx.boom();
        for (let i = 0; i < 3; i++) g.dropPickup(b.x + (i - 1) * 50, b.y + 20, i === 0 ? 'W' : undefined);
        b.state = 'done';
      }
      return;
    }
    b.ft += dt;
    const spd = 1 + 0.1 * b.destroyed;
    if (b.type === 'mother') {
      b.x = W / 2 + Math.sin(b.ft * 0.3 * spd) * W * 0.28;
      b.y = 150 + Math.sin(b.ft * 0.42 * spd + 1) * 55;
    } else {
      b.ang += b.def.spin * dt;
      b.x += b.vx * spd * dt; b.y += b.vy * spd * dt;
      const m = b.hullR + 12;
      if (b.x < m) { b.x = m; b.vx = Math.abs(b.vx); } else if (b.x > W - m) { b.x = W - m; b.vx = -Math.abs(b.vx); }
      if (b.y < m + 40) { b.y = m + 40; b.vy = Math.abs(b.vy); } else if (b.y > H - m - 10) { b.y = H - m - 10; b.vy = -Math.abs(b.vy); }
    }
    B.place(b);
    const rate = (1 + 0.1 * b.destroyed) * (g.demo ? 0.7 : 1), sp = 205 + 12 * b.idx;
    const p = g.player;
    for (const m of b.mods) {
      if (!m.alive) continue;
      m.cd -= dt * rate;
      if (m.k === 'turret') {
        if (m.cd <= 0) { m.burst = 3; m.bt = 0; m.cd = 3; }
        if (m.burst > 0) { m.bt -= dt; if (m.bt <= 0 && p.alive) { fire(g, m.x, m.y, Math.atan2(p.y - m.y, p.x - m.x), sp, 'orb', 5); m.burst--; m.bt = 0.14; } }
      } else if (m.k === 'bay') {
        if (m.cd <= 0) { m.cd = 10; if (g.saucers.length < 2) Sa.spawn(g, { small: true, x: m.x, y: m.y, dir: m.x < W / 2 ? 1 : -1 }); }
      } else if (m.k === 'node') {
        if (m.cd <= 0) {
          m.cd = 9;
          if (g.rocks.length < 14) {
            const a = Math.atan2(m.y - b.y, m.x - b.x);
            R.spawnChunk(g, 'plain', 'M', m.x, m.y, 60);
            const q = g.rocks[g.rocks.length - 1]; q.vx = Math.cos(a) * 70; q.vy = Math.sin(a) * 70;
            FX.ring(m.x, m.y, 4, 30, FX.col(b.hue), 0.3, 2);
          }
        }
      } else if (m.k === 'core') {
        if (b.shielded) { if (m.cd <= 0 && p.alive) { m.cd = 3.4; fire(g, m.x, m.y, Math.atan2(p.y - m.y, p.x - m.x), sp, 'orb', 5); } }
        else {
          b.spT -= dt;
          if (b.spT > 0) { b.sp -= dt; if (b.sp <= 0) { b.sp = 0.12; b.sang += 0.42; for (let q = 0; q < 2; q++) fire(g, m.x, m.y, b.sang + q * Math.PI, sp * 0.9, 'needle', 4); } }
          else if (b.spT < -1.5) b.spT = 2.4;
          b.ringT -= dt;
          if (b.ringT <= 0) { b.ringT = 5; for (let i = 0; i < 16; i++) fire(g, m.x, m.y, i / 16 * TAU, sp * 0.75, 'orb', 5); FX.ring(m.x, m.y, 10, 90, 'hsla(0,100%,65%,1)', 0.5, 3); }
        }
      }
    }
  };

  function hexPath(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = rot + i / 6 * TAU; if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  }

  let motherHull = null;
  function hullSprite(hue) {
    if (motherHull) return motherHull;
    return (motherHull = GFX.mk(260, 150, (x) => {
      const pts = [[0, -58], [40, -50], [70, -34], [118, -26], [128, 6], [112, 36], [84, 46], [58, 62], [0, 66]];
      const full = pts.concat(pts.slice().reverse().map((p) => [-p[0], p[1]]));
      x.shadowColor = 'rgba(255,140,60,0.95)'; x.shadowBlur = 14;
      GFX.poly(x, full);
      x.fillStyle = GFX.lg(x, 0, -60, 0, 66, [[0, U.hsl(hue, 30, 34)], [0.6, U.hsl(hue, 34, 18)], [1, U.hsl(hue, 38, 9)]]); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = '#ff8a3d'; x.lineWidth = 2.4; x.stroke();
      x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 1.2;
      for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(i * 30, -50); x.lineTo(i * 32, 56); x.stroke(); }
      x.fillStyle = 'rgba(255,200,120,0.6)';
      for (let i = 0; i < 18; i++) { x.beginPath(); x.arc(-100 + i * 12, -4 + (i % 3) * 14, 1.3, 0, TAU); x.fill(); }
    }, 1.5));
  }

  function drawMod(ctx, g, b, m) {
    const x = m.x, y = m.y, r = m.r, t = b.t, p = g.player;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(8,12,24,0.92)'; ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, TAU); ctx.fill();
    ctx.strokeStyle = b.accent; ctx.lineWidth = 1.6; ctx.stroke();
    if (m.k === 'turret') {
      const a = Math.atan2(p.y - y, p.x - x);
      ctx.rotate(a - Math.PI / 2);
      ctx.fillStyle = GFX.lg(ctx, -4, 0, 4, 0, [[0, '#2a3552'], [0.5, '#9fb2d8'], [1, '#2a3552']]); ctx.fillRect(-2.5, 0, 5, r * 1.6);
      ctx.fillStyle = b.accent; ctx.fillRect(-3.5, r * 1.6 - 3, 7, 3);
      ctx.rotate(-(a - Math.PI / 2));
      ctx.fillStyle = GFX.rg(ctx, -2, -2, 1, r, [[0, '#dfe8ff'], [1, '#2d3a5e']]); ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, TAU); ctx.fill();
    } else if (m.k === 'bay') {
      ctx.fillStyle = '#05070f'; ctx.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
      ctx.fillStyle = '#34406a'; ctx.fillRect(-r * 0.75, -r * 0.75, r * 0.7, r * 1.5); ctx.fillRect(r * 0.05, -r * 0.75, r * 0.7, r * 1.5);
    } else if (m.k === 'core') {
      const pulse = 1 + Math.sin(t * 4) * 0.08;
      ctx.fillStyle = GFX.rg(ctx, 0, 0, 1, r * pulse, [[0, '#ffffff'], [0.35, b.shielded ? b.accent : '#ff5a5a'], [1, '#1a1030']]);
      ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, TAU); ctx.fill();
    } else {
      hexPath(ctx, 0, 0, r, t * 0.6 + m.lx);
      ctx.fillStyle = GFX.rg(ctx, 0, 0, 1, r, [[0, '#ffffff'], [0.4, b.accent], [1, '#10182c']]); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
    if (m.hp < m.maxHp) {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 6, 0, TAU); ctx.stroke();
      ctx.strokeStyle = m.hp / m.maxHp < 0.35 ? '#ff5a5a' : '#8dffb8'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(x, y, r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * m.hp / m.maxHp); ctx.stroke();
    }
    if (m.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.fill(); }
  }

  B.draw = function (ctx, g, b) {
    if (b.state === 'done') return;
    if (b.type === 'mother') GFX.draw(ctx, hullSprite(b.hue), b.x, b.y, 0, 1, 1);
    else {
      const art = GFX.art.rock(b.def.rock, 'G', b.type === 'titan' ? 0 : 1);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang); ctx.drawImage(art.spr.c, -art.spr.w / 2, -art.spr.h / 2, art.spr.w, art.spr.h); ctx.restore();
    }
    for (const m of b.mods) {
      if (m.alive) drawMod(ctx, g, b, m);
      else { ctx.fillStyle = 'rgba(6,8,16,0.85)'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 0.9, 0, TAU); ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'lighter';
    const core = b.mods.find((q) => q.k === 'core');
    if (core && core.alive) {
      GFX.drawGlow(ctx, b.shielded ? FX.col(b.hue, 60) : 'hsla(0,100%,60%,1)', core.x, core.y, 46 + Math.sin(b.t * 4) * 5, b.shielded ? 0.5 : 0.9);
      if (b.shielded) {
        ctx.globalAlpha = 0.5 + b.shieldFlash * 4 + Math.sin(b.t * 5) * 0.08;
        hexPath(ctx, core.x, core.y, core.r + 11, b.t * 0.5);
        ctx.fillStyle = 'rgba(70,170,255,0.22)'; ctx.fill(); ctx.strokeStyle = 'rgba(160,225,255,0.95)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (b.state === 'fight' || b.state === 'enter') {
      const left = b.mods.reduce((s, q) => s + (q.alive ? q.hp : 0), 0), bw = 300, bx = W / 2 - bw / 2, by = 72;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 9);
      ctx.fillStyle = FX.col(b.hue, 60); ctx.fillRect(bx, by, bw * left / b.total, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '700 11px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const goal = b.shielded ? 'SHATTER THE ' + (b.type === 'hive' ? 'NODES' : b.type === 'mother' ? 'GENERATORS' : 'ARMOR PLATES') : 'DESTROY THE CORE';
      ctx.fillText(b.name + '  -  ' + goal, W / 2, by - 6);
    }
  };
})((window.SGS = window.SGS || {}));
