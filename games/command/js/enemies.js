/* Attackers: missiles (ICBM, MIRV, smart bomb), bombers and laser UFOs. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, A = G.audio, Wp = G.weapons, TAU = U.TAU;
  const W = C.W, H = C.H;
  const E = {};
  G.enemies = E;
  let uid = 0;

  E.targets = (g) => g.cities.concat(g.launchers).filter((s) => s.alive);
  const tpos = (s) => ({ x: s.x, y: C.GROUND - 20 });

  E.spawnMissile = function (g, o) {
    const s = o.target || U.pick(E.targets(g));
    if (!s) return null;
    const t = tpos(s), x0 = o.x, y0 = o.y, d = Math.hypot(t.x - x0, t.y - y0), sp = o.speed;
    const e = { id: ++uid, type: o.type || 'icbm', x: x0, y: y0, sx: x0, sy: y0, tx: t.x, ty: t.y, vx: (t.x - x0) / d * sp, vy: (t.y - y0) / d * sp, speed: sp, r: o.type === 'mirv' ? 6 : 4, carrier: !!o.carrier, dead: false, target: s, t: 0, splitY: U.rand(110, 210), dodgeT: 0, dodges: 0, pts: [{ x: x0, y: y0 }], autoT: 0 };
    g.en.push(e);
    return e;
  };

  /* ---------- wave script ---------- */
  E.planWave = function (g, n) {
    const ev = [], dur = 20 + Math.min(n, 12) * 1.2;
    const nI = Math.min(8 + 3 * n, 56), nM = n >= 3 ? Math.floor(n / 2) + 1 : 0, nS = n >= 5 ? Math.floor((n - 3) / 2) : 0;
    const nB = n >= 4 ? Math.min(1 + Math.floor((n - 4) / 3), 4) : 0, nU = n >= 3 ? Math.min(1 + Math.floor((n - 3) / 3), 4) : 0;
    let t = 1;
    for (let i = 0; i < nI; i++) { if (i % 4 === 0) t = U.rand(0.8, dur) ; ev.push({ t: t + (i % 4) * U.rand(0.12, 0.5), kind: 'icbm' }); }
    for (let i = 0; i < nM; i++) ev.push({ t: U.rand(3, dur), kind: 'mirv' });
    for (let i = 0; i < nS; i++) ev.push({ t: U.rand(5, dur), kind: 'smart' });
    for (let i = 0; i < nB; i++) ev.push({ t: U.rand(4, dur * 0.8), kind: 'bomber' });
    for (let i = 0; i < nU; i++) ev.push({ t: U.rand(6, dur * 0.85), kind: 'ufo' });
    ev.sort((a, b) => a.t - b.t);
    g.plan = ev; g.planI = 0; g.waveT = 0;
    g.msp = Math.min(170, 58 + 5.5 * n);
  };

  function spawnEvent(g, ev) {
    const n = g.stage, sp = g.msp * U.rand(0.92, 1.12);
    if (ev.kind === 'icbm') E.spawnMissile(g, { x: U.rand(20, W - 20), y: -10, speed: sp, carrier: Math.random() < 0.06 });
    else if (ev.kind === 'mirv') E.spawnMissile(g, { x: U.rand(80, W - 80), y: -10, speed: sp * 0.85, type: 'mirv', carrier: Math.random() < 0.3 });
    else if (ev.kind === 'smart') E.spawnMissile(g, { x: U.rand(40, W - 40), y: -10, speed: sp * 1.1, type: 'smart' });
    else if (ev.kind === 'bomber') {
      const dir = Math.random() < 0.5 ? 1 : -1;
      g.air.push({ type: 'bomber', x: dir > 0 ? -40 : W + 40, y: U.rand(80, 170), dir, speed: 85 + 3 * n, hp: 6, maxHp: 6, r: 17, dropT: U.rand(0.8, 1.6), drops: U.randInt(3, 5), flash: 0, dead: false, t: 0 });
      A.sfx.thief();
    } else {
      const dir = Math.random() < 0.5 ? 1 : -1, tg = U.pick(E.targets(g));
      if (!tg) return;
      g.air.push({ type: 'ufo', x: dir > 0 ? -40 : W + 40, y: U.rand(90, 150), dir, hp: 10, maxHp: 10, r: 20, state: 'enter', st: 0, target: tg, flash: 0, dead: false, t: 0 });
      A.sfx.thief();
    }
  }

  E.update = function (g, dt) {
    if (g.plan && (g.state === 'play')) {
      g.waveT += dt;
      while (g.planI < g.plan.length && g.plan[g.planI].t <= g.waveT) spawnEvent(g, g.plan[g.planI++]);
    }
    for (const e of g.en) {
      if (e.dead) continue;
      e.t += dt;
      if (e.autoT > 0) e.autoT -= dt;
      if (e.type === 'smart') smartDodge(g, e, dt);
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.type === 'smart') { e.ptT = (e.ptT || 0) - dt; if (e.ptT <= 0) { e.ptT = 0.05; e.pts.push({ x: e.x, y: e.y }); if (e.pts.length > 60) e.pts.shift(); } }
      if (e.type === 'mirv' && e.y >= e.splitY) split(g, e);
      else if (e.y >= e.ty - 2) { e.dead = true; E.hitStructure(g, e.target, e); }
    }
    g.en = g.en.filter((e) => !e.dead);
    for (const o of g.air) {
      if (o.dead) continue;
      o.t += dt; if (o.flash > 0) o.flash -= dt;
      if (o.type === 'bomber') updateBomber(g, o, dt); else updateUfo(g, o, dt);
    }
    g.air = g.air.filter((o) => !o.dead);
    for (const gh of g.ghosts) gh.t += dt;
    g.ghosts = g.ghosts.filter((gh) => gh.t < 0.9);
  };

  function smartDodge(g, e, dt) {
    if (e.dodgeT > 0) {
      e.dodgeT -= dt;
      if (e.dodgeT <= 0) {
        const t = tpos(e.target.alive ? e.target : U.pick(E.targets(g)) || e.target), d = Math.hypot(t.x - e.x, t.y - e.y) || 1;
        e.tx = t.x; e.ty = t.y; e.vx = (t.x - e.x) / d * e.speed; e.vy = (t.y - e.y) / d * e.speed;
      }
      return;
    }
    if (e.dodges >= 2) return;
    for (const b of g.blasts) {
      if (b.t < 0 || b.dmg > 5 || b.kind === 'chain') continue;
      const dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy);
      if (d < b.maxR + 55 && d > 1) {
        e.dodges++; e.dodgeT = 0.55;
        const side = (dx * e.vy - dy * e.vx) > 0 ? 1 : -1, px = -e.vy / e.speed * side, py = e.vx / e.speed * side;
        e.vx = (dx / d * 0.6 + px * 0.8) * e.speed; e.vy = Math.abs((dy / d * 0.6 + py * 0.8)) * e.speed * 0.6 + e.speed * 0.4;
        FX.sparks(e.x, e.y, 5, 120, 'hsla(140,100%,70%,1)', 0.25);
        return;
      }
    }
  }

  function split(g, e) {
    e.dead = true;
    g.ghosts.push({ x0: e.sx, y0: e.sy, x1: e.x, y1: e.y, t: 0 });
    FX.ring(e.x, e.y, 4, 34, 'hsla(300,100%,70%,1)', 0.35, 2); A.sfx.split();
    const n = U.randInt(3, Math.min(5, 3 + Math.floor(g.stage / 5))), ts = E.targets(g);
    for (let i = 0; i < n; i++) E.spawnMissile(g, { x: e.x, y: e.y, speed: e.speed * 1.05, type: 'warhead', target: U.pick(ts), carrier: e.carrier && i === 0 });
  }

  function updateBomber(g, o, dt) {
    o.x += o.dir * o.speed * dt; o.y += Math.sin(o.t * 1.6) * 12 * dt;
    o.dropT -= dt;
    if (o.dropT <= 0 && o.drops > 0 && o.x > 30 && o.x < W - 30 && g.state === 'play') {
      o.drops--; o.dropT = U.rand(1.0, 1.7);
      E.spawnMissile(g, { x: o.x, y: o.y + 8, speed: g.msp * 1.05 });
    }
    if ((o.dir > 0 && o.x > W + 60) || (o.dir < 0 && o.x < -60)) o.dead = true;
  }

  function updateUfo(g, o, dt) {
    o.st += dt;
    if (o.state === 'enter') {
      if (!o.target.alive) { const t = E.targets(g); if (t.length) o.target = U.pick(t); else o.state = 'leave'; }
      const dx = o.target.x - o.x;
      o.x += Math.sign(dx) * Math.min(Math.abs(dx), 135 * dt); o.y += (130 + Math.sin(o.t * 2) * 20 - o.y) * Math.min(1, 3 * dt);
      if (Math.abs(dx) < 4) { o.state = 'lock'; o.st = 0; A.sfx.lockOn(); }
    } else if (o.state === 'lock') {
      if (o.st > 1.1) { o.state = 'fire'; o.st = 0; }
    } else if (o.state === 'fire') {
      if (o.st > 2) {
        o.state = 'leave'; o.st = 0;
        if (o.target.alive) { E.hitStructure(g, o.target, null); }
      }
    } else { o.y -= 70 * dt; o.x += o.dir * 60 * dt; if (o.y < -50) o.dead = true; }
    if (o.state === 'fire' && Math.random() < 0.4) A.sfx.beam();
  }

  /* ---------- kills / damage / ground hits ---------- */
  E.killMissile = function (g, e, b) {
    if (e.dead) return;
    e.dead = true;
    const base = { icbm: 25, warhead: 25, mirv: 125, smart: 125 }[e.type] || 25, mult = b ? 1 + 0.25 * b.kills : 1;
    if (b) b.kills++;
    g.award(base * mult, e.x, e.y);
    g.credits += { icbm: 1, warhead: 1, mirv: 3, smart: 3 }[e.type] || 1;
    Wp.addNuke(g, 1.5);
    const cb = Wp.blast(g, e.x, e.y, 'chain', e.type === 'mirv' ? 40 : 26, { grow: 0.2, hold: 0.12, shrink: 0.2, hue: 20 });
    cb.kills = b ? b.kills : 0;
    FX.sparks(e.x, e.y, 6, 140, 'hsla(25,100%,65%,1)', 0.35);
    A.sfx.missileKill();
    if (e.carrier) Wp.dropPickup(g, e.x, e.y);
  };

  E.damageAir = function (g, o, dmg, b, isBeam) {
    if (o.dead) return;
    o.hp -= dmg; o.flash = 0.06;
    if (o.hp > 0) { if (!isBeam) { A.sfx.hit(); FX.sparks(o.x, o.y, 3, 120, 'hsla(40,100%,70%,1)', 0.25, 1.4); } return; }
    o.dead = true;
    const base = o.type === 'ufo' ? 300 : 150, mult = b ? 1 + 0.25 * b.kills : 1;
    if (b) b.kills++;
    g.award(base * mult, o.x, o.y);
    g.credits += o.type === 'ufo' ? 15 : 8;
    Wp.addNuke(g, 8);
    FX.explosion(o.x, o.y, 2.2, o.type === 'ufo' ? 0 : 30);
    A.sfx.kill(2);
    if (o.type === 'ufo' || Math.random() < 0.4) Wp.dropPickup(g, o.x, o.y);
  };

  E.hitStructure = function (g, s, e) {
    if (!s || !s.alive) return;
    const x = s.x, y = C.GROUND - 18;
    if (s.shield > 0) {
      s.shield--; s.flash = 0.3;
      FX.ring(x, y - 6, 10, 56, 'hsla(195,100%,70%,1)', 0.4, 4); FX.sparks(x, y - 6, 12, 200, 'hsla(195,100%,75%,1)', 0.4);
      A.sfx.shieldBreak(); FX.addShake(3);
      return;
    }
    s.alive = false; s.rubble = 0;
    FX.explosion(x, y, s.isCity ? 3.2 : 2.4, 15); FX.explosion(x, y - 10, 2, 40);
    FX.doFlash(0.4, '255,200,160'); FX.addShake(9);
    A.sfx.cityBoom();
    g.perfect = false;
    if (!s.isCity) FX.text(x, y - 40, 'LAUNCHER DOWN', '#ff7a7a', 16);
  };

  /* ---------- drawing ---------- */
  const COL = { icbm: '255,90,70', warhead: '255,150,60', mirv: '255,90,255', smart: '110,255,150' };

  function drawUfo(ctx, g, o) {
    const x = o.x, y = o.y, t = o.t;
    if (o.state === 'lock' || o.state === 'fire') {
      const tp = tpos(o.target);
      ctx.save();
      if (o.state === 'lock') {
        ctx.strokeStyle = 'rgba(255,60,60,' + (0.25 + 0.5 * (o.st / 1.1)) + ')'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(tp.x, tp.y); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.globalCompositeOperation = 'lighter';
        const w = 5 + Math.sin(t * 40) * 1.5;
        ctx.strokeStyle = 'rgba(255,60,50,0.55)'; ctx.lineWidth = w * 3; ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(tp.x, tp.y); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,230,220,0.95)'; ctx.lineWidth = w; ctx.stroke();
        G.gfx.drawGlow(ctx, 'hsla(5,100%,60%,1)', tp.x, tp.y, 34 + Math.sin(t * 30) * 5, 0.9);
      }
      ctx.restore();
    }
    ctx.save(); ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter'; G.gfx.drawGlow(ctx, 'hsla(0,100%,60%,1)', 0, 4, 40, 0.5); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = G.gfx.lg(ctx, 0, -4, 0, 12, [[0, '#ff9a9a'], [0.5, '#c02a2a'], [1, '#4a0a12']]);
    ctx.beginPath(); ctx.ellipse(0, 4, 26, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,60,60,0.3)'; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = '#ffd0d0'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = 'rgba(200,255,255,0.85)'; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-11, -14, 0, -14); ctx.quadraticCurveTo(11, -14, 12, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff4a4a'; ctx.beginPath(); ctx.ellipse(0, -5, 3, 4, 0, 0, TAU); ctx.fill();
    for (let i = -2; i <= 2; i++) { ctx.fillStyle = (i + Math.floor(t * 6)) % 2 ? '#fff3b0' : '#7dffd8'; ctx.beginPath(); ctx.arc(i * 9, 5 + Math.abs(i) * 0.8, 1.9, 0, TAU); ctx.fill(); }
    if (o.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(0, 2, 27, 12, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  function drawBomber(ctx, g, o) {
    ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.dir, 1);
    ctx.globalCompositeOperation = 'lighter'; G.gfx.drawGlow(ctx, 'hsla(20,100%,60%,1)', -22, 0, 18, 0.7); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = G.gfx.lg(ctx, 0, -18, 0, 18, [[0, '#6a7a9a'], [0.5, '#2a3350'], [1, '#6a7a9a']]);
    ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-4, -4); ctx.lineTo(-16, -19); ctx.lineTo(-21, -19); ctx.lineTo(-15, 0); ctx.lineTo(-21, 19); ctx.lineTo(-16, 19); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,120,60,0.3)'; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = '#ffb27a'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#7dffd8'; ctx.beginPath(); ctx.ellipse(8, 0, 6, 2.4, 0, 0, TAU); ctx.fill();
    if (o.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill(); }
    ctx.restore();
  }

  E.draw = function (ctx, g) {
    for (const gh of g.ghosts) {
      ctx.strokeStyle = 'rgba(255,120,255,' + (0.5 * (1 - gh.t / 0.9)) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gh.x0, gh.y0); ctx.lineTo(gh.x1, gh.y1); ctx.stroke();
    }
    for (const e of g.en) {
      const col = COL[e.type];
      ctx.lineCap = 'round';
      if (e.type === 'smart' && e.pts.length > 1) {
        ctx.strokeStyle = 'rgba(' + col + ',0.55)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(e.pts[0].x, e.pts[0].y); for (const p of e.pts) ctx.lineTo(p.x, p.y); ctx.lineTo(e.x, e.y); ctx.stroke();
      } else {
        const gr = ctx.createLinearGradient(e.sx, e.sy, e.x, e.y);
        gr.addColorStop(0, 'rgba(' + col + ',0)'); gr.addColorStop(1, 'rgba(' + col + ',0.85)');
        ctx.strokeStyle = gr; ctx.lineWidth = e.type === 'mirv' ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(e.sx, e.sy); ctx.lineTo(e.x, e.y); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
      G.gfx.drawGlow(ctx, 'hsla(' + (e.type === 'smart' ? 140 : e.type === 'mirv' ? 300 : 12) + ',100%,62%,1)', e.x, e.y, e.type === 'mirv' ? 15 : 10, 0.95);
      if (e.carrier) G.gfx.drawGlow(ctx, 'hsla(48,100%,60%,1)', e.x, e.y, 20 + Math.sin(e.t * 9) * 3, 0.65);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x, e.y, e.type === 'mirv' ? 3 : 2, 0, TAU); ctx.fill();
      if (e.type === 'smart') { ctx.strokeStyle = 'rgba(160,255,190,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(e.x, e.y, 7, 0, TAU); ctx.stroke(); }
    }
    for (const o of g.air) {
      if (o.type === 'ufo') drawUfo(ctx, g, o); else drawBomber(ctx, g, o);
      if (o.hp < o.maxHp) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(o.x - 18, o.y - o.r - 12, 36, 4);
        ctx.fillStyle = '#ff6a6a'; ctx.fillRect(o.x - 18, o.y - o.r - 12, 36 * Math.max(0, o.hp / o.maxHp), 4);
      }
    }
  };
})((window.SGS = window.SGS || {}));
