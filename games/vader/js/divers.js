/* Divers: Galaga-style ships that peel off the top of the screen during a boss fight and swoop down in S-curves, firing as they come. Shoot them down. A diver that reaches a barrier blows
   it up completely and costs 1000 points; one that rams the player hurts. Divers keep coming in waves for as long as the boss is alive. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, Sh = G.shields, W = C.W, H = C.H, D = {};
  G.divers = D;
  D.PENALTY = 1000;

  D.reset = function (g) { g.divers = []; g.diverT = 4.5; g.diverQ = []; };

  const liveBunkers = (g) => g.bunkers.filter((b) => b.cells.some((c) => c));
  const bez = (p0, p1, p2, p3, u) => { const v = 1 - u; return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3; };
  const bezD = (p0, p1, p2, p3, u) => { const v = 1 - u; return 3 * v * v * (p1 - p0) + 6 * v * u * (p2 - p1) + 3 * u * u * (p3 - p2); };

  /* send one diver: it starts above a top corner, swings out in an S-curve and arrives over a barrier (or, if they are all gone, over the player) */
  function launch(g, side, delay, level) {
    const bunkers = liveBunkers(g), tb = bunkers.length ? bunkers[U.randInt(0, bunkers.length - 1)] : null;
    const sx = side < 0 ? U.rand(30, 120) : W - U.rand(30, 120), tx = tb ? tb.x + tb.w / 2 + U.rand(-20, 20) : g.player.x, ty = tb ? tb.y + tb.h * 0.55 : C.PLAYER_Y + 10;
    const dir = tx >= sx ? 1 : -1;
    g.diverQ.push({ at: delay, s: {
      x: sx, y: -40, rot: Math.PI, hp: 2, flash: 0, t: 0, dur: U.rand(4.4, 5.2) - Math.min(1.2, level * 0.25), anim: Math.random() * 3, fireT: 1.0 + Math.random() * 0.6, level, dead: false, id: Math.random(),
      px: [sx, sx + dir * U.rand(180, 260), tx - dir * U.rand(150, 230), tx], py: [-40, H * 0.2, ty - 300, ty], target: tb,
    } });
  }
  D.spawnWave = function (g, level, n) {
    const side = Math.random() < 0.5 ? -1 : 1;
    for (let i = 0; i < n; i++) launch(g, i % 2 ? -side : side, i * 0.42, level);
    A.sfx.warning && A.sfx.blip && A.sfx.blip();
  };

  D.kill = function (g, s, o) {
    if (s.dead) return; s.dead = true;
    FX.explosion(s.x, s.y, 0.9, 40);
    if (!o || !o.silent) {
      g.award(150, s.x, s.y); g.comboKill(); A.sfx.kill(1);
      if (Math.random() < 0.08) g.dropPickup(s.x, s.y);
    }
  };

  function destroyBunker(g, b, s) {
    for (let k = 0; k < b.cells.length; k++) b.cells[k] = 0;
    b.dirty = true;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    FX.explosion(cx, cy, 1.9, 195); FX.ring(cx, cy, 8, 130, 'hsla(190,100%,70%,1)', 0.7, 4); FX.sparks(cx, cy, 24, 260, 'hsla(190,100%,70%,1)', 0.7, 2); FX.addShake(9); A.sfx.boom();
    g.score = Math.max(0, g.score - D.PENALTY);
    FX.text(cx, cy - 26, '-' + U.fmt(D.PENALTY), '#ff5a5a', 24);
    g.perfect = false;
  }

  D.update = function (g, dt) {
    const boss = g.boss, on = !!boss && boss.state === 'fight' && !(boss.dying > 0);
    if (!g.divers) D.reset(g);
    if (on) {
      g.diverT -= dt;
      if (g.diverT <= 0) {
        const lvl = boss.idx + 5 * boss.loop;
        D.spawnWave(g, lvl, 3 + Math.min(3, Math.floor(lvl / 2)));
        g.diverT = Math.max(4.6, 8 - lvl * 0.5);
      }
    } else if (g.divers.length || g.diverQ.length) {                                   /* the boss is gone (or not there yet): the divers go with it */
      for (const s of g.divers) D.kill(g, s, { silent: true });
      g.diverQ.length = 0;
    }
    for (const e of g.diverQ) e.at -= dt;
    while (g.diverQ.length && g.diverQ[0].at <= 0) g.divers.push(g.diverQ.shift().s);
    const p = g.player;
    for (const s of g.divers) {
      if (s.dead) continue;
      s.t += dt; s.anim += dt * 9; if (s.flash > 0) s.flash -= dt;
      const u = Math.min(1, s.t / s.dur), e = u * (1.12 - 0.12 * u);                  /* a little slower at the start, quicker as it dives */
      const x0 = s.x, y0 = s.y;
      if (s.t < s.dur) { s.x = bez(s.px[0], s.px[1], s.px[2], s.px[3], e); s.y = bez(s.py[0], s.py[1], s.py[2], s.py[3], e); s.rot = Math.atan2(bezD(s.py[0], s.py[1], s.py[2], s.py[3], e), bezD(s.px[0], s.px[1], s.px[2], s.px[3], e)) + Math.PI / 2; }
      else { s.y += 240 * dt; s.x += Math.sin(s.t * 3) * 30 * dt; s.rot = Math.PI; if (s.y > H + 40) s.dead = true; }            /* it missed everything: it flies on down and off the screen */
      s.fireT -= dt;
      if (s.fireT <= 0 && s.y > 30 && s.y < C.PLAYER_Y - 80) { s.fireT = 0.9 + Math.random() * 0.55; g.aimed(s.x, s.y + 10, 230 + s.level * 14, 'needle', 0.08, 4); }       /* they shoot all the way down */
      // reaching a barrier: it is gone entirely, and so is the score
      for (const b of g.bunkers) {
        if (s.dead || !b.cells.some((c) => c)) continue;
        if (s.x > b.x - 10 && s.x < b.x + b.w + 10 && s.y > b.y - 8 && s.y < b.y + b.h + 8) { destroyBunker(g, b, s); s.dead = true; FX.explosion(s.x, s.y, 0.8, 40); }
      }
      if (!s.dead && p.alive && Math.abs(s.x - p.x) < 22 && Math.abs(s.y - p.y) < 22) { D.kill(g, s, { silent: true }); g.hitPlayer(); }
    }
    g.divers = g.divers.filter((s) => !s.dead);
  };

  /* a player shot against the divers: true if it was absorbed */
  D.shotHit = function (g, b, segHit) {
    for (const s of g.divers) {
      if (s.dead) continue;
      if (!segHit(b.px === undefined ? b.x : b.px, b.py === undefined ? b.y : b.py, b.x, b.y, s.x - 17 - b.r, s.y - 16 - b.r, s.x + 17 + b.r, s.y + 16 + b.r)) continue;
      if (b.pierce) { if (b.hit.indexOf(s.id) >= 0) continue; b.hit.push(s.id); }
      s.hp -= b.dmg; s.flash = 0.08; A.sfx.hit();
      FX.sparks(s.x, s.y, 4, 130, 'hsla(40,100%,70%,1)', 0.25, 1.4);
      if (s.hp <= 0) D.kill(g, s);
      if (!b.pierce) { b.dead = true; return true; }
    }
    return false;
  };

  D.bombed = function (g) { for (const s of g.divers) D.kill(g, s); };

  D.draw = function (ctx, g) {
    const spr = GFX.spr;
    for (const s of g.divers) {
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(40,100%,60%,1)', s.x, s.y, 26, 0.45);
      ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, s.flash > 0 ? spr.diverF[Math.floor(s.anim) & 1] : spr.diver[Math.floor(s.anim) & 1], s.x, s.y, s.rot, 1, 1);
    }
  };

  /* the sprite: a swept-wing butterfly fighter, nose up, wings that flap */
  D.art = function () {
    const mk = GFX.mk, lg = GFX.lg, poly = GFX.poly, mirror = GFX.mirror, TAU = U.TAU, s = GFX.spr;
    const draw = (f) => (x) => {
      const fl = f ? 5 : 0;
      x.shadowColor = 'rgba(255,170,40,0.9)'; x.shadowBlur = 8;
      x.fillStyle = lg(x, 0, -14, 22, 12, [[0, '#4aa4ff'], [1, '#1a2a90']]);
      mirror(x, (c) => { poly(c, [[3, -8], [22, -16 + fl], [26, 4 + fl], [11, 13], [3, 8]]); c.fill(); c.strokeStyle = '#e4f4ff'; c.lineWidth = 1.2; c.stroke(); c.fillStyle = 'rgba(160,220,255,0.28)'; poly(c, [[7, -6], [19, -12 + fl], [21, 0 + fl], [9, 5]]); c.fill(); c.strokeStyle = 'rgba(255,200,90,0.9)'; c.lineWidth = 1; c.beginPath(); c.moveTo(4, -2); c.lineTo(22, -8 + fl); c.stroke(); c.fillStyle = lg(c, 0, -14, 22, 12, [[0, '#4aa4ff'], [1, '#1a2a90']]); });
      x.shadowBlur = 0;
      x.fillStyle = lg(x, 0, -15, 0, 15, [[0, '#fff3b0'], [0.45, '#ffb030'], [1, '#a04a10']]);
      x.beginPath(); x.ellipse(0, 0, 6.5, 14, 0, 0, TAU); x.fill(); x.strokeStyle = '#ffe9a0'; x.lineWidth = 1; x.stroke();
      x.fillStyle = '#ff4a4a'; x.beginPath(); x.arc(-2.6, -8, 1.8, 0, TAU); x.arc(2.6, -8, 1.8, 0, TAU); x.fill();
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(-2.6, -8.4, 0.6, 0, TAU); x.arc(2.6, -8.4, 0.6, 0, TAU); x.fill();
      x.fillStyle = '#6a2a0a'; x.fillRect(-1.2, 2, 2.4, 8);
    };
    s.diver = [mk(56, 44, draw(0)), mk(56, 44, draw(1))];
    s.diverF = s.diver.map(GFX.flashOf);
  };
})((window.SGS = window.SGS || {}));
