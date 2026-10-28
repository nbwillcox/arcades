/* Alien enemies: runners, snipers, turrets, pillboxes, swooping flyers, capsule pods and leapers. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, TAU = U.TAU;
  const E = {};
  G.enemies = E;
  const H = C.H;

  const T = {
    grunt: { w: 22, h: 40, hp: 1, pts: 100, hue: 110 }, sniper: { w: 22, h: 44, hp: 1, pts: 200, hue: 14 }, turret: { w: 34, h: 30, hp: 4, pts: 300, hue: 20 },
    pillbox: { w: 44, h: 34, hp: 3, pts: 300, hue: 220 }, flyer: { w: 36, h: 24, hp: 1, pts: 150, hue: 320 }, pod: { w: 58, h: 24, hp: 1, pts: 300, hue: 200 }, leaper: { w: 30, h: 24, hp: 1, pts: 150, hue: 40 },
  };
  E.T = T;
  let nextId = 1;
  /* hitbox: ground units use their feet as y, the rest are centred */
  const FEET = { grunt: 1, sniper: 1, turret: 1, pillbox: 1, leaper: 1 };
  E.box = function (e) { const D = T[e.type]; return FEET[e.type] ? { x0: e.x - D.w / 2, x1: e.x + D.w / 2, y0: e.y - D.h, y1: e.y } : { x0: e.x - D.w / 2, x1: e.x + D.w / 2, y0: e.y - D.h / 2, y1: e.y + D.h / 2 }; };
  E.center = function (e) { const b = E.box(e); return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }; };

  E.spawn = function (g, type, x, y, extra) {
    const D = T[type];
    const e = Object.assign({ id: nextId++, type, x, y, vx: 0, vy: 0, hp: D.hp, t: 0, ph: Math.random() * TAU, cd: U.rand(0.6, 1.8), flash: 0, dead: false, face: -1, onGround: false, y0: y }, extra || {});
    g.en.push(e);
    return e;
  };
  const dBoost = (g) => Math.min(3.2, 1 + (g.stageNo - 1) * 0.16);
  const aimAt = (g, e, sp, spread) => {
    const c = E.center(e), p = g.player, a = Math.atan2(p.y - 22 - c.y, p.x - c.x) + (spread || 0);
    g.ebullet(c.x, c.y, Math.cos(a) * sp, Math.sin(a) * sp);
  };
  E.aim = aimAt;

  /* spawn a scripted group when its trigger point scrolls into range */
  E.runEvent = function (g, ev) {
    const sx = g.cam.x + C.W + 50;
    if (ev.type === 'runners') {
      for (let i = 0; i < ev.n; i++) E.spawn(g, 'grunt', sx + i * 64, g.groundY(sx + i * 64, 40), { shooter: Math.random() < 0.3 });
    } else if (ev.type === 'sniper' || ev.type === 'turret') E.spawn(g, ev.type, ev.x, ev.y, { cd: 1.1 });
    else if (ev.type === 'pillbox') E.spawn(g, 'pillbox', ev.x, ev.y, { open: false, cap: ev.cap });
    else if (ev.type === 'flyers') { const y0 = U.rand(90, 250); for (let i = 0; i < ev.n; i++) E.spawn(g, 'flyer', sx + i * 58, y0 + (i % 2) * 22, { y0: y0 + (i % 2) * 22 }); }
    else if (ev.type === 'pod') { const y0 = U.rand(110, 190); E.spawn(g, 'pod', sx, y0, { letter: ev.letter, y0 }); }
    else if (ev.type === 'leaper') E.spawn(g, 'leaper', sx, g.groundY(sx, 40), {});
  };

  E.update = function (g, dt) {
    const p = g.player, d = dBoost(g), camR = g.cam.x + C.W;
    for (const e of g.en) {
      if (e.dead) continue;
      e.t += dt; if (e.flash > 0) e.flash -= dt; e.cd -= dt;
      const c = E.center(e), dx = p.x - c.x, vis = e.x > g.cam.x - 30 && e.x < camR + 30;
      switch (e.type) {
        case 'grunt': {
          e.face = dx > 0 ? 1 : -1;
          const sp = (125 + 14 * d) * (e.shooter && Math.abs(dx) < 330 ? 0.25 : 1);
          e.vx = e.face * sp; G.game.phys(e, dt);
          if (e.shooter && e.cd <= 0 && vis && Math.abs(dx) < 560 && p.alive) { e.cd = U.rand(2.2, 3.2); aimAt(g, e, 250); }
          break;
        }
        case 'sniper':
          e.face = dx > 0 ? 1 : -1;
          if (e.cd <= 0 && vis && Math.abs(dx) < 720 && p.alive) { e.cd = U.rand(1.7, 2.5) / Math.sqrt(d); aimAt(g, e, 270); A.sfx.enemyShot(); }
          break;
        case 'turret':
          e.face = dx > 0 ? 1 : -1;
          if (e.cd <= 0 && vis && p.alive) { e.cd = 2.6 / Math.sqrt(d); e.burst = 3; e.bt = 0; }
          if (e.burst > 0) { e.bt -= dt; if (e.bt <= 0) { e.bt = 0.16; e.burst--; aimAt(g, e, 300); A.sfx.enemyShot(); } }
          break;
        case 'pillbox':
          e.open = vis && Math.abs(dx) < 520;
          if (e.open && e.cd <= 0 && p.alive) { e.cd = 1.7 / Math.sqrt(d); aimAt(g, e, 280, -0.08); aimAt(g, e, 280, 0.08); A.sfx.enemyShot(); }
          break;
        case 'flyer':
          e.x -= (185 + 10 * d) * dt; e.y = e.y0 + Math.sin(e.t * 4 + e.ph) * 55; e.face = -1;
          if (e.cd <= 0 && vis && Math.abs(dx) < 420 && Math.random() < 0.01 && p.alive) { e.cd = 3; aimAt(g, e, 230); }
          break;
        case 'pod': e.x -= 105 * dt; e.y = e.y0 + Math.sin(e.t * 2 + e.ph) * 34; e.face = -1; break;
        case 'leaper':
          e.face = dx > 0 ? 1 : -1;
          if (e.onGround) { e.vx = 0; if (e.cd <= 0 && vis && Math.abs(dx) < 400) { e.vy = -560; e.vx = e.face * (170 + 15 * d); e.cd = U.rand(1.1, 1.8); e.onGround = false; } }
          G.game.phys(e, dt);
          break;
        default: break;
      }
      if (e.y > H + 120 || e.x < g.cam.x - 260) e.dead = true;
    }
    g.en = g.en.filter((e) => !e.dead);
  };

  E.damage = function (g, e, dmg, b) {
    e.hp -= dmg; e.flash = 0.07;
    FX.sparks(b ? b.x - g.cam.x : e.x - g.cam.x, b ? b.y : e.y, 3, 110, 'hsla(50,100%,70%,1)', 0.22, 1.4);
    if (e.hp > 0) { A.sfx.hit(); return; }
    E.kill(g, e);
  };
  E.kill = function (g, e) {
    if (e.dead) return;
    e.dead = true;
    const D = T[e.type], c = E.center(e);
    FX.explosion(c.x - g.cam.x, c.y, e.type === 'pillbox' || e.type === 'turret' ? 1.4 : 0.9, D.hue);
    A.sfx.kill(D.pts >= 300 ? 1 : 0);
    g.award(D.pts, c.x, c.y);
    if (e.type === 'pod') g.dropCap(c.x, c.y, e.letter);
    else if (e.type === 'pillbox' && e.cap) g.dropCap(c.x, c.y - 10, e.cap);
  };

  E.draw = function (ctx, g) {
    const A = GFX.art, PX = G.px, th = g.st.theme, F = A.foes(th), L = A.fl, cam = g.cam.x;
    for (const e of g.en) {
      const sx = e.x - cam;
      if (sx < -80 || sx > C.W + 80) continue;
      const f = e.face > 0 ? -1 : 1, fl = e.flash > 0;
      switch (e.type) {
        case 'grunt': PX.draw(ctx, (fl ? F.gruntF : F.grunt)[Math.floor(Math.abs(e.x) / 9) % 4], sx, e.y, f); break;
        case 'sniper': PX.draw(ctx, (fl ? F.sniperF : F.sniper)[Math.floor(e.t * 1.6) % 2], sx, e.y, f); break;
        case 'leaper': PX.draw(ctx, (fl ? F.leaperF : F.leaper)[e.onGround ? 0 : 1], sx, e.y, f); break;
        case 'flyer': { const S = A.flyerSet(th); PX.draw(ctx, (fl ? S.f : S.n)[[0, 1, 2, 1][Math.floor(e.t * 10) % 4]], sx, e.y, 1); break; }
        case 'pillbox': PX.draw(ctx, (fl ? L.pillF : L.pill)[e.open ? 1 : 0], sx, e.y, 1); break;
        case 'pod':
          ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(205,100%,70%,1)', sx, e.y, 38, 0.22); ctx.globalCompositeOperation = 'source-over';
          PX.draw(ctx, L.pod[Math.floor(e.t * 8) % 2], sx, e.y, 1);
          if (!fl || true) PX.draw(ctx, L.podL[e.letter], sx, e.y, 1);
          break;
        case 'turret': {
          const c = E.center(e), a = Math.atan2(g.player.y - 22 - c.y, g.player.x - c.x), bi = ((Math.round(a / (TAU / 16)) % 16) + 16) % 16;
          PX.draw(ctx, L.barrel[bi], sx, e.y - 16, 1); PX.draw(ctx, fl ? L.domeF : L.dome, sx, e.y, 1);
          break;
        }
        default: break;
      }
    }
  };
})((window.SGS = window.SGS || {}));
