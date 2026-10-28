/* Rocks: plain, ore (drops power-ups), volatile (explodes) and iron (armored). Large -> medium -> small. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, TAU = U.TAU;
  const W = C.W, H = C.H;
  const R = {};
  G.rocks = R;
  let uid = 0;
  const SCORE = { L: 20, M: 50, S: 100 };
  const NEXT = { L: 'M', M: 'S' };
  const BLAST = { L: 105, M: 70, S: 46 };
  const IRON_HP = { L: 3, M: 2, S: 1 };

  R.dist2 = (ax, ay, bx, by) => { const dx = U.wrapD(ax, bx, W), dy = U.wrapD(ay, by, H); return dx * dx + dy * dy; };

  function make(type, size, x, y, vx, vy) {
    const hp = type === 'iron' ? IRON_HP[size] : 1;
    return { id: ++uid, type, size, x, y, vx, vy, ang: Math.random() * TAU, spin: U.rand(-1.2, 1.2), hp, maxHp: hp, r: GFX.art.SIZE_R[size] * 0.9, variant: U.randInt(0, 2), flash: 0, dead: false, t: Math.random() * 6 };
  }

  R.spawnWave = function (g, n) {
    const count = Math.min(3 + n, 12);
    const ore = n >= 2 ? Math.min(1 + Math.floor(n / 4), 3) : 0;
    const vol = n >= 3 ? Math.min(Math.floor((n - 1) / 2), 4) : 0;
    const iron = n >= 4 ? Math.min(Math.floor((n - 2) / 2), 4) : 0;
    const types = [];
    for (let i = 0; i < count; i++) types.push(i < ore ? 'ore' : i < ore + vol ? 'volatile' : i < ore + vol + iron ? 'iron' : 'plain');
    const sp = Math.min(140, 40 + n * 4);
    for (const type of types) {
      let x, y;
      do {
        if (Math.random() < 0.5) { x = Math.random() < 0.5 ? 0 : W; y = U.rand(0, H); } else { x = U.rand(0, W); y = Math.random() < 0.5 ? 0 : H; }
      } while (R.dist2(x, y, W / 2, H / 2) < 170 * 170);
      const a = Math.random() * TAU, s = sp * U.rand(0.55, 1.15);
      g.rocks.push(make(type, 'L', x, y, Math.cos(a) * s, Math.sin(a) * s));
    }
  };

  R.spawnChunk = function (g, type, size, x, y, speed) {
    const a = Math.random() * TAU;
    g.rocks.push(make(type, size, x, y, Math.cos(a) * speed, Math.sin(a) * speed));
  };

  R.update = function (g, dt) {
    const k = g.stall > 0 ? 1.5 : 1;
    for (const r of g.rocks) {
      r.x = U.wrap(r.x + r.vx * dt * k, W); r.y = U.wrap(r.y + r.vy * dt * k, H);
      r.ang += r.spin * dt; r.t += dt;
      if (r.flash > 0) r.flash -= dt;
    }
  };

  /* first rock overlapping a circle (wrap-aware), optionally skipping ids already hit by a piercing shot */
  R.hitTest = function (g, x, y, rad, skip) {
    for (const r of g.rocks) {
      if (r.dead || (skip && skip.indexOf(r.id) >= 0)) continue;
      const rr = r.r + rad;
      if (R.dist2(x, y, r.x, r.y) < rr * rr) return r;
    }
    return null;
  };

  R.damage = function (g, r, dmg, o) {
    if (r.dead) return;
    r.hp -= dmg; r.flash = 0.07;
    if (r.hp <= 0) R.destroy(g, r, o);
    else { A.sfx.armor(); FX.sparks(r.x, r.y, 4, 120, 'hsla(210,60%,85%,1)', 0.25, 1.4); }
  };

  R.destroy = function (g, r, o) {
    if (r.dead) return;
    r.dead = true;
    o = o || {};
    const hue = r.type === 'volatile' ? 15 : r.type === 'ore' ? 42 : 205;
    if (!o.silent) { g.award(SCORE[r.size], r.x, r.y); g.comboKill(); }
    FX.explosion(r.x, r.y, r.size === 'L' ? 1.7 : r.size === 'M' ? 1.1 : 0.7, hue);
    A.sfx.rockBreak(r.size);
    if (NEXT[r.size]) {
      const base = Math.hypot(r.vx, r.vy), sp = Math.min(190, Math.max(base * 1.25, 45) + (r.size === 'L' ? 14 : 28));
      const a0 = Math.atan2(r.vy, r.vx);
      for (const side of [-1, 1]) {
        const a = a0 + side * U.rand(0.5, 1.1);
        g.rocks.push(make('plain', NEXT[r.size], r.x, r.y, Math.cos(a) * sp, Math.sin(a) * sp));
      }
    }
    if (r.type === 'ore' && !o.silent) g.dropPickup(r.x, r.y);
    if (r.type === 'volatile') R.blast(g, r, o.depth || 0);
  };

  R.blast = function (g, src, depth) {
    const rad = BLAST[src.size];
    FX.ring(src.x, src.y, 8, rad, 'hsla(20,100%,62%,1)', 0.45, 5);
    FX.ring(src.x, src.y, 4, rad * 0.7, 'hsla(48,100%,75%,1)', 0.3, 3);
    FX.glowPop(src.x, src.y, rad * 0.9, 'hsla(20,100%,60%,1)', 0.3);
    FX.addShake(src.size === 'L' ? 6 : 3);
    A.sfx.blast();
    if (depth < 4) {
      for (const r of g.rocks.slice()) {
        if (r.dead || r === src) continue;
        const rr = rad + r.r * 0.5;
        if (R.dist2(src.x, src.y, r.x, r.y) < rr * rr) R.damage(g, r, 1, { depth: depth + 1 });
      }
    }
    for (const s of g.saucers.slice()) { const rr = rad + 14; if (R.dist2(src.x, src.y, s.x, s.y) < rr * rr) G.saucers.damage(g, s, 2); }
    const p = g.player, rr = rad * 0.8 + C.SHIP_R;
    if (p.alive && R.dist2(src.x, src.y, p.x, p.y) < rr * rr) g.hitPlayer();
  };

  R.cull = function (g) { g.rocks = g.rocks.filter((r) => !r.dead); };

  function drawAt(ctx, r, x, y, art) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(r.ang);
    const s = r.flash > 0 ? art.flash : art.spr;
    ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
    ctx.restore();
    if (r.type === 'iron' && r.hp < r.maxHp) GFX.draw(ctx, GFX.spr.crack[r.size], x, y, r.ang);
    if (r.type === 'volatile') {
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(15,100%,55%,1)', x, y, r.r * (1.25 + 0.15 * Math.sin(r.t * 7)), 0.55);
      ctx.globalCompositeOperation = 'source-over';
    } else if (r.type === 'ore') {
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(45,100%,60%,1)', x, y, r.r * (1.2 + 0.1 * Math.sin(r.t * 5)), 0.4);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  R.draw = function (ctx, g) {
    for (const r of g.rocks) {
      const art = GFX.art.rock(r.type, r.size, r.variant), m = r.r * 1.3;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const x = r.x + ox * W, y = r.y + oy * H;
          if (x < -m || x > W + m || y < -m || y > H + m) continue;
          drawAt(ctx, r, x, y, art);
        }
      }
    }
  };
})((window.SGS = window.SGS || {}));
