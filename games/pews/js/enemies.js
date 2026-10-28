/* Organic enemies: cells, darters, larvae, spitters, wall turrets, tentacles and hives, plus wave and formation spawning. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, St = G.stage, TAU = U.TAU;
  const E = {};
  G.enemies = E;
  const WW = C.WW, W = C.W, H = C.H;

  const T = {
    cell: { r: 12, hp: 1, pts: 100, size: 0.8, hue: 335 }, carrier: { r: 14, hp: 1, pts: 150, size: 0.9, hue: 20 },
    darter: { r: 11, hp: 1, pts: 150, size: 0.8, hue: 165 }, larva: { r: 9, hp: 1, pts: 80, size: 0.7, hue: 75 },
    spitter: { r: 15, hp: 3, pts: 300, size: 1.2, hue: 100 }, turret: { r: 14, hp: 2, pts: 200, size: 1, hue: 10 },
    hive: { r: 38, hp: 30, pts: 3000, size: 3, hue: 330 }, tentacle: { r: 9, hp: 1e9, pts: 0, size: 1, hue: 340 },
  };
  E.T = T;
  let nextId = 1, nextFid = 1;

  E.spawn = function (g, type, x, y, extra) {
    const D = T[type];
    const e = Object.assign({ id: nextId++, type, x, y, vx: 0, vy: 0, r: D.r, hp: D.hp, t: 0, ph: Math.random() * TAU, cd: U.rand(0.8, 2.2), flash: 0, dead: false, fid: 0 }, extra || {});
    g.en.push(e);
    return e;
  };

  /* a formation that drops a power capsule if the player wipes the whole thing out */
  E.formation = function (g, kind, n, x0, y0, dir, cap) {
    const fid = nextFid++;
    g.forms[fid] = { left: n, cap: !!cap, lost: false, lx: x0, ly: y0 };
    const d = St.difficulty(g.stageNo);
    for (let i = 0; i < n; i++) {
      if (g.mode === 'free') E.spawn(g, cap ? 'carrier' : 'cell', U.wrap(x0 - dir * i * 46, WW), y0, { vx: dir * (135 + d * 6), y0, amp: 52, fid });
      else E.spawn(g, cap ? 'carrier' : 'cell', x0 + Math.sin(i * 0.7) * 40, y0 - i * 44, { vy: 95 + d * 4, x0, amp: 85, fid, ph: i * 0.55 });
    }
  };
  E.darters = function (g, n, side) {
    const p = g.player;
    for (let i = 0; i < n; i++) {
      let x, y;
      if (g.mode === 'free') { x = U.wrap(g.cam.x + side * (W / 2 + 60 + i * 50), WW); y = U.rand(C.YMIN + 20, C.YMAX - 40); }
      else { x = side < 0 ? 30 : W - 30; y = g.cam.y - 30 - i * 40; }
      const dx = g.mode === 'free' ? U.wrapD(p.x, x, WW) : p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1, sp = 300 + St.difficulty(g.stageNo) * 8;
      E.spawn(g, 'darter', x, y, { vx: dx / d * sp, vy: dy / d * sp, life: 5 });
    }
  };

  E.initWorld = function (g, n) {
    const d = St.difficulty(n);
    g.hives = [];
    const nh = Math.min(5, 3 + Math.floor((d - 1) / 3)), gap = WW / nh, off = U.rand(0, gap);
    for (let i = 0; i < nh; i++) {
      const x = U.wrap(off + i * gap + U.rand(-gap * 0.2, gap * 0.2), WW), ym = (St.ceilY(g, x) + St.floorY(g, x)) / 2;
      g.hives.push(E.spawn(g, 'hive', x, ym, { hp: 26 + d * 8, maxhp: 26 + d * 8, sp: U.rand(1, 3), kids: 0, y0: U.clamp(ym + U.rand(-60, 60), 170, 380) }));
    }
    const nt = 8 + d * 2;
    for (let i = 0; i < nt; i++) { const x = Math.random() * WW; E.spawn(g, 'turret', x, St.floorY(g, x) - 9, { cd: U.rand(1, 3) }); }
  };

  /* ---- forced-scroll script events ---- */
  E.runEvent = function (g, ev) {
    const top = g.cam.y - 40, d = St.difficulty(g.stageNo), c = St.cx(g, top), h = St.hw(g, top);
    if (ev.kind === 'cells') E.formation(g, 'wave', 5 + Math.min(3, d), c + (ev.rnd - 0.5) * h, top, 1, false);
    else if (ev.kind === 'carrierLine') E.formation(g, 'wave', 5, c, top, 1, true);
    else if (ev.kind === 'darters') E.darters(g, 2 + Math.floor(d / 2), ev.side);
    else if (ev.kind === 'spitter') E.spawn(g, 'spitter', c + ev.side * h * 0.4, top, { vy: 70, hp: 3 + Math.floor(d / 3) });
    else if (ev.kind === 'turrets') {
      for (const s of [-1, 1]) { const y = top - U.rand(0, 140), hw = St.hw(g, y), cx = St.cx(g, y); E.spawn(g, 'turret', cx + s * hw - s * 10, y, { wall: s }); }
    } else if (ev.kind === 'tentacle') {
      const y = top - 30;
      E.spawn(g, 'tentacle', St.cx(g, y) + ev.side * St.hw(g, y), y, { dirx: -ev.side, len: 7 });
    }
  };

  /* ---- free-flight wave spawner ---- */
  E.freeWave = function (g) {
    const d = St.difficulty(g.stageNo), p = g.player, side = Math.random() < 0.6 ? p.face : -p.face, r = Math.random();
    const x = U.wrap(g.cam.x + side * (W / 2 + 70), WW), y = U.rand(C.YMIN + 30, C.YMAX - 60);
    if (r < 0.5) E.formation(g, 'wave', 5 + Math.min(3, d), x, y, -side, g.waveNo++ % 2 === 0);
    else if (r < 0.75) E.darters(g, 2 + Math.floor(d / 2), side);
    else if (d >= 2) E.spawn(g, 'spitter', x, y, { vx: -side * 40, hp: 3 + Math.floor(d / 3) });
    else E.formation(g, 'wave', 6, x, y, -side, false);
  };

  /* ---- behaviour ---- */
  const dxw = (g, a, b) => (g.mode === 'free' ? U.wrapD(a, b, WW) : a - b);
  E.dxw = dxw;
  E.shoot = function (g, x, y, dx, dy, sp) {
    const d = Math.hypot(dx, dy) || 1;
    g.ebullet(x, y, dx / d * sp, dy / d * sp);
  };
  E.lose = function (g, e) {
    e.dead = true;
    if (e.fid && g.forms[e.fid]) g.forms[e.fid].lost = true;
    if (e.hive) e.hive.kids--;
  };
  E.update = function (g, dt) {
    const p = g.player, free = g.mode === 'free', d = St.difficulty(g.stageNo);
    for (const e of g.en) {
      if (e.dead) continue;
      e.t += dt; if (e.flash > 0) e.flash -= dt;
      const dx = dxw(g, p.x, e.x), dy = p.y - e.y, dist = Math.hypot(dx, dy) || 1;
      switch (e.type) {
        case 'cell': case 'carrier':
          if (free) { e.x = U.wrap(e.x + e.vx * dt, WW); e.y = e.y0 + Math.sin(e.t * 3.2 + e.ph) * e.amp; if (e.t > 1 && Math.abs(dxw(g, e.x, g.cam.x)) > W / 2 + 260) E.lose(g, e); }
          else { e.y += e.vy * dt; e.x = e.x0 + Math.sin(e.t * 2.4 + e.ph) * e.amp; }
          break;
        case 'darter': e.x += e.vx * dt; e.y += e.vy * dt; e.life -= dt; if (free) e.x = U.wrap(e.x, WW); if (e.life <= 0) e.dead = true; break;
        case 'larva': {
          const a = Math.atan2(dy, dx), cur = Math.atan2(e.vy || 0.01, e.vx || 0.01);
          let da = a - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
          const na = cur + U.clamp(da, -2.2 * dt, 2.2 * dt);
          e.vx = Math.cos(na) * 112; e.vy = Math.sin(na) * 112;
          e.x += e.vx * dt; e.y += e.vy * dt; if (free) e.x = U.wrap(e.x, WW);
          break;
        }
        case 'spitter':
          if (free) { e.x = U.wrap(e.x + (e.vx + Math.sign(dx) * 30) * dt, WW); e.y += Math.sin(e.t * 1.6 + e.ph) * 40 * dt; }
          else { e.y += e.vy * dt; e.x += Math.sin(e.t * 1.4 + e.ph) * 50 * dt; }
          e.cd -= dt;
          if (e.cd <= 0 && dist < 520 && p.alive) { e.cd = U.rand(1.6, 2.4); E.shoot(g, e.x, e.y, dx, dy, 190); }
          break;
        case 'turret':
          e.cd -= dt;
          if (e.cd <= 0 && dist < 560 && Math.abs(dx) < W / 2 + 30 && p.alive) { e.cd = U.rand(1.8, 2.8); E.shoot(g, e.x, e.y - 6, dx, dy, 175); }
          break;
        case 'tentacle': {
          const segs = [];
          let ax = e.x, ay = e.y, ang = (e.dirx > 0 ? 0 : Math.PI) + Math.sin(e.t * 1.7 + e.ph) * 0.55;
          for (let i = 0; i < e.len; i++) { ang += Math.sin(e.t * 2.3 + e.ph + i * 0.7) * 0.22; ax += Math.cos(ang) * 17; ay += Math.sin(ang) * 17; segs.push([ax, ay]); }
          e.segs = segs;
          break;
        }
        case 'hive':
          e.y = e.y0 + Math.sin(e.t * 0.8 + e.ph) * 24;
          if (dist < 1250) {
            e.sp -= dt;
            if (e.sp <= 0 && e.kids < 4) { e.sp = Math.max(1.2, 2.6 - d * 0.12); e.kids++; E.spawn(g, 'larva', e.x, e.y, { hive: e, vx: U.rand(-60, 60), vy: U.rand(-60, 60) }); A.sfx.spawnBot(); FX.ring(g.sx(e.x), g.sy(e.y), 8, 44, 'hsla(320,100%,70%,1)', 0.35, 2); }
            e.cd -= dt;
            if (e.cd <= 0 && dist < 640) { e.cd = U.rand(3.4, 4.6); const a0 = Math.atan2(dy, dx); for (let k = -2; k <= 2; k++) E.shoot(g, e.x, e.y, Math.cos(a0 + k * 0.28), Math.sin(a0 + k * 0.28), 175); A.sfx.enemyShot(); }
          }
          break;
        default: break;
      }
      if (!free && e.type !== 'tentacle' && e.y > g.cam.y + H + 90) E.lose(g, e);
      if (!free && e.y < g.cam.y - 400) e.dead = true;
    }
    g.en = g.en.filter((e) => !e.dead);
  };

  /* ---- damage ---- */
  E.damage = function (g, e, dmg, b) {
    if (e.type === 'tentacle') return;
    e.hp -= dmg; e.flash = 0.07;
    FX.sparks(g.sx(b ? b.x : e.x), g.sy(b ? b.y : e.y), 3, 110, FX.col(T[e.type].hue, 70), 0.25, 1.4);
    A.sfx.hit();
    if (e.hp <= 0) E.kill(g, e);
  };
  E.kill = function (g, e) {
    if (e.dead) return;
    e.dead = true;
    const D = T[e.type];
    FX.explosion(g.sx(e.x), g.sy(e.y), D.size, D.hue);
    A.sfx.kill(D.size > 2 ? 2 : D.size > 1 ? 1 : 0);
    g.award(D.pts, e.x, e.y);
    if (e.hive) e.hive.kids--;
    if (e.fid && g.forms[e.fid]) {
      const f = g.forms[e.fid]; f.left--; f.lx = e.x; f.ly = e.y;
      if (f.left <= 0 && f.cap && !f.lost) g.dropCap(f.lx, f.ly, 'P');
    }
    if (e.type === 'hive') { g.dropCap(e.x, e.y, 'P'); if (Math.random() < 0.5) g.dropCap(e.x + 40, e.y, 'B'); FX.addShake(8); FX.doFlash(0.3, '255,200,230'); }
    else if ((e.type === 'spitter' || e.type === 'turret') && Math.random() < 0.08) g.dropCap(e.x, e.y, Math.random() < 0.15 ? 'U' : 'B');
  };

  /* ---- drawing (positions are projected to the screen by the game) ---- */
  E.draw = function (ctx, g) {
    const spr = GFX.spr, fl = spr.flash;
    for (const e of g.en) {
      const x = g.sx(e.x), y = g.sy(e.y);
      if (x < -150 || x > W + 150 || y < -150 || y > H + 150) continue;
      const f = e.flash > 0;
      switch (e.type) {
        case 'cell': GFX.draw(ctx, f ? fl.cell : spr.cell, x, y, e.t * 1.5, 1, 1); break;
        case 'carrier':
          ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(40,100%,60%,1)', x, y, 22, 0.35 + 0.15 * Math.sin(e.t * 8)); ctx.globalCompositeOperation = 'source-over';
          GFX.draw(ctx, f ? fl.carrier : spr.carrier, x, y, e.t * 1.5, 1, 1); break;
        case 'darter': GFX.draw(ctx, f ? fl.darter : spr.darter, x, y, Math.atan2(e.vy, e.vx), 1, 1); break;
        case 'larva': GFX.draw(ctx, f ? fl.larva : spr.larva, x, y, Math.atan2(e.vy || 0.01, e.vx || 0.01), 1, 1); break;
        case 'spitter': GFX.draw(ctx, f ? fl.spitter : spr.spitter, x, y, Math.atan2(g.player.y - e.y, dxw(g, g.player.x, e.x)), 1, 1); break;
        case 'turret': {
          const a = Math.atan2(g.player.y - e.y, dxw(g, g.player.x, e.x));
          ctx.strokeStyle = '#ffd0a0'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + Math.cos(a) * 15, y - 6 + Math.sin(a) * 15); ctx.stroke();
          GFX.draw(ctx, f ? fl.turret : spr.turret, x, y, 0, 1, 1);
          break;
        }
        case 'hive': {
          const pulse = 1 + Math.sin(e.t * 3) * 0.04, k = e.hp / e.maxhp;
          ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(330,100%,60%,1)', x, y, 80, 0.3 + 0.1 * Math.sin(e.t * 3)); ctx.globalCompositeOperation = 'source-over';
          GFX.draw(ctx, f ? fl.hive : spr.hive, x, y, e.t * 0.3, pulse, pulse);
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 28, y - 54, 56, 5); ctx.fillStyle = k > 0.5 ? '#ff6ab0' : '#ffb04a'; ctx.fillRect(x - 28, y - 54, 56 * k, 5);
          break;
        }
        case 'tentacle':
          if (!e.segs) break;
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (const [w, c] of [[16, 'rgba(255,60,120,0.22)'], [9, '#c43a72'], [4, '#ff9ac4']]) {
            ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y);
            for (const s of e.segs) ctx.lineTo(g.sx(s[0]), g.sy(s[1]));
            ctx.stroke();
          }
          break;
        default: break;
      }
    }
  };
})((window.SGS = window.SGS || {}));
