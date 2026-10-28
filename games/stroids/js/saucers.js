/* Hostile saucers: the big one fires wildly, the small one aims. They cross the arena and leave (no wrap). */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio;
  const W = C.W, H = C.H;
  const S = {};
  G.saucers = S;
  let sid = 0;

  S.spawn = function (g, o) {
    o = o || {};
    const dir = o.dir || (Math.random() < 0.5 ? 1 : -1), small = !!o.small;
    g.saucers.push({ id: 's' + (++sid), x: o.x !== undefined ? o.x : (dir > 0 ? -30 : W + 30), y: o.y !== undefined ? o.y : U.rand(60, H - 60), dir, vy: U.chance(0.5) ? 70 : -70, zt: U.rand(0.6, 1.4), t: 0, small, hp: small ? 1 : 2, r: small ? 12 : 20, fireT: U.rand(0.6, 1.3), flash: 0, dead: false, tick: 0 });
    A.sfx.thief();
  };

  S.update = function (g, dt) {
    if (g.state === 'play' && !g.over) {
      const maxS = 1 + Math.floor(g.stage / 6);
      g.saucerT -= dt * (g.stall > 0 ? 2 : 1);
      if (g.saucerT <= 0) {
        g.saucerT = U.rand(18, 28);
        if (g.saucers.length < maxS && g.rocks.length > 0) S.spawn(g, { small: g.stage >= 3 && Math.random() < Math.min(0.7, 0.15 * g.stage) });
      }
    }
    for (const s of g.saucers) {
      s.t += dt; s.zt -= dt;
      if (s.flash > 0) s.flash -= dt;
      if (s.zt <= 0) { s.vy = (Math.random() < 0.5 ? -1 : 1) * U.rand(50, 100); s.zt = U.rand(0.7, 1.5); }
      s.x += s.dir * (s.small ? 135 : 95) * dt; s.y += s.vy * dt;
      if (s.y < 40) { s.y = 40; s.vy = Math.abs(s.vy); } else if (s.y > H - 40) { s.y = H - 40; s.vy = -Math.abs(s.vy); }
      s.tick -= dt;
      if (s.tick <= 0) { s.tick = 0.1; A.sfx.ufo(s.t + (s.small ? 3 : 0)); }
      s.fireT -= dt;
      if (s.fireT <= 0 && g.player.alive && g.state === 'play') {
        s.fireT = s.small ? U.rand(0.9, 1.4) : U.rand(1.2, 2);
        let a = Math.random() * Math.PI * 2;
        if (s.small) {
          const dx = U.wrapD(g.player.x, s.x, W), dy = U.wrapD(g.player.y, s.y, H);
          a = Math.atan2(dy, dx) + U.rand(-1, 1) * Math.max(0.04, 0.4 - 0.035 * g.stage);
        }
        g.ebullet(s.x, s.y, Math.cos(a) * 230, Math.sin(a) * 230, 'orb', 4, { life: 2.4 });
        A.sfx.bombDrop();
      }
      if ((s.dir > 0 && s.x > W + 40) || (s.dir < 0 && s.x < -40) || g.state === 'clear') s.dead = true;
    }
    g.saucers = g.saucers.filter((s) => !s.dead);
  };

  S.hitTest = function (g, x, y, rad, skip) {
    for (const s of g.saucers) {
      if (s.dead || (skip && skip.indexOf(s.id) >= 0)) continue;
      const rr = s.r + rad;
      if (U.dist2(x, y, s.x, s.y) < rr * rr) return s;
    }
    return null;
  };

  S.damage = function (g, s, dmg) {
    if (s.dead) return;
    s.hp -= dmg; s.flash = 0.07;
    if (s.hp <= 0) {
      s.dead = true;
      g.award(s.small ? 1000 : 200, s.x, s.y); g.comboKill();
      FX.explosion(s.x, s.y, s.small ? 1.4 : 2, 0);
      A.sfx.kill(2);
      if (Math.random() < (s.small ? 0.7 : 0.4)) g.dropPickup(s.x, s.y);
    } else { A.sfx.hit(); FX.sparks(s.x, s.y, 3, 120, 'hsla(40,100%,70%,1)', 0.25, 1.4); }
  };

  S.draw = function (ctx, g) {
    for (const s of g.saucers) {
      const spr = s.small ? GFX.spr.saucerS : GFX.spr.saucer, f = Math.floor(s.t * 6) % 2;
      const sc = s.small ? 0.62 : 1;
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, s.small ? 'hsla(28,100%,60%,1)' : 'hsla(0,100%,60%,1)', s.x, s.y + 3, 34 * sc, 0.5);
      ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, s.flash > 0 ? GFX.spr.saucerF : spr[f], s.x, s.y, 0, sc, sc);
    }
  };
})((window.SGS = window.SGS || {}));
