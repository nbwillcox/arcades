/* The invasion: marching formation, armor, Bombers and Commanders, bombs, the flyby mothership. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, Sh = G.shields, TAU = U.TAU;
  const W = C.W, H = C.H, MID = (C.COLS - 1) / 2;
  const I = {};
  G.invaders = I;
  let uid = 0;
  const WORLD_HUE = [130, 200, 290, 20, 55];
  I.worldHue = (g) => WORLD_HUE[(g.world || 0) % 5];

  const TYPES = {
    scout: { r: 13, pts: 30, size: 1 },
    raider: { r: 14, pts: 20, size: 1 },
    brute: { r: 14, pts: 10, size: 1 },
    bomber: { r: 14, pts: 40, size: 1.2 },
    cmd: { r: 16, pts: 150, size: 1.6 },
  };
  I.TYPES = TYPES;

  const SHAPES = {
    block: ['11111111111', '11111111111', '11111111111', '11111111111', '11111111111'],
    diamond: ['00011111000', '00111111100', '01111111110', '11111111111', '01111111110', '00111111100'],
    chevron: ['11000000011', '11100000111', '01110001110', '00111011100', '00011111000'],
    split: ['11111011111', '11111011111', '11111011111', '11111011111', '11111011111'],
    rings: ['11111111111', '11000000011', '11011111011', '11010001011', '11011111011', '11000000011'],
    pyramid: ['00000100000', '00001110000', '00011111000', '00111111100', '01111111110', '11111111111'],
  };
  const CYCLE = ['diamond', 'chevron', 'split', 'rings', 'pyramid'];
  I.shapeFor = (n) => (n < 6 ? 'block' : CYCLE[(n - 6) % CYCLE.length]);

  function make(type, c, r, hp, armor) {
    return { id: ++uid, type, c, r, x: W / 2, y: -50, hp, maxHp: hp, armor, carrier: false, flash: 0, dead: false, shielded: false, spawnT: 0, anim: Math.random() * 5 };
  }
  const posX = (f, c) => f.x + (c - MID) * C.SX;
  const posY = (f, r) => f.y + r * C.SY;

  I.spawnWave = function (g, n) {
    const shape = SHAPES[I.shapeFor(n)], R = shape.length;
    const f = g.form = { x: W / 2, y: 118 + Math.min(n - 1, 6) * 12, px: W / 2, py: 0, dir: 1, stepT: 0, since: 9, frame: 0, rows: R, ready: false, n, beat: 0, wait: 0 };
    f.py = f.y;
    const list = [];
    const pArmor = U.clamp(0.12 * (n - 2), 0, 0.65), p3 = U.clamp(0.05 * (n - 8), 0, 0.3);
    for (let r = 0; r < R; r++) {
      const frac = r / (R - 1);
      const type = frac < 0.2 ? 'scout' : frac < 0.65 ? 'raider' : 'brute';
      for (let c = 0; c < C.COLS; c++) {
        if (shape[r][c] !== '1') continue;
        let hp = 1, armor = false;
        if (Math.random() < pArmor) { armor = true; hp = Math.random() < p3 ? 3 : 2; }
        const inv = make(type, c, r, hp, armor);
        inv.spawnT = 0.15 + r * 0.14 + Math.abs(c - MID) * 0.025;
        list.push(inv);
      }
    }
    if (n >= 3) {
      const cand = list.filter((q) => q.type === 'raider');
      for (let k = 0; k < Math.min(1 + Math.floor((n - 3) / 2), 5) && cand.length; k++) { const q = cand.splice(U.randInt(0, cand.length - 1), 1)[0]; q.type = 'bomber'; }
    }
    if (n >= 4) {
      const lowest = {}; for (const q of list) if (!lowest[q.c] || q.r > lowest[q.c]) lowest[q.c] = q.r;
      const cand = list.filter((q) => q.c >= 2 && q.c <= 8 && q.r >= 1 && q.r === lowest[q.c] && q.type !== 'bomber');
      for (let k = 0; k < Math.min(1 + Math.floor((n - 4) / 4), 3) && cand.length; k++) {
        const q = cand.splice(U.randInt(0, cand.length - 1), 1)[0];
        q.type = 'cmd'; q.hp = q.maxHp = 3; q.armor = false;
      }
    }
    const carriers = list.filter((q) => q.type !== 'cmd');
    for (let k = 0; k < Math.min(4, 1 + Math.floor(n / 3)) && carriers.length; k++) carriers.splice(U.randInt(0, carriers.length - 1), 1)[0].carrier = true;
    g.inv = list;
    g.bombT = 2.2; g.ufoT = U.rand(12, 17);
    g.baseInterval = Math.max(0.28, 0.62 * Math.pow(0.93, n - 1));
  };

  function alive(g) { return g.inv.filter((q) => !q.dead); }

  function tickFormation(g, f, list) {
    let cmin = 99, cmax = -1;
    for (const q of list) { if (q.c < cmin) cmin = q.c; if (q.c > cmax) cmax = q.c; }
    f.px = f.x; f.py = f.y; f.since = 0;
    const step = 8, left = posX(f, cmin) - 17, right = posX(f, cmax) + 17;
    if (f.dir > 0 && right + step > W - 6) { f.y += 16; f.dir = -1; }
    else if (f.dir < 0 && left - step < 6) { f.y += 16; f.dir = 1; }
    else f.x += f.dir * step;
    f.frame ^= 1;
    A.sfx.march(f.beat++);
  }

  I.update = function (g, dt) {
    const f = g.form;
    if (!f) return;
    const list = alive(g);
    for (const q of list) {
      if (q.spawnT > 0) q.spawnT -= dt; else q.appear = (q.appear || 0) + dt;
      if (q.flash > 0) q.flash -= dt;
      q.anim += dt;
    }
    f.since += dt;
    const glide = Math.min(0.12, g.baseInterval * 0.5), k = U.smooth(Math.min(1, f.since / glide));
    for (const q of list) {
      q.x = U.lerp(posX({ x: f.px, y: f.py }, q.c), posX(f, q.c), k);
      q.y = U.lerp(posY({ x: f.px, y: f.py }, q.r), posY(f, q.r), k);
    }
    if (!f.ready) { f.ready = !list.some((q) => q.spawnT > 0); return; }
    if (g.freeze > 0 || g.state !== 'play' || g.over) return;
    // commander shielding
    for (const q of list) q.shielded = false;
    for (const cm of list) {
      if (cm.type !== 'cmd') continue;
      for (const q of list) if (q !== cm && q.type !== 'cmd' && Math.abs(q.c - cm.c) <= 1 && Math.abs(q.r - cm.r) <= 1) q.shielded = true;      /* never another Commander: two side by side would shield each other and could not be killed */
    }
    const interval = Math.max(0.035, list.length / 55 * g.baseInterval);
    f.stepT += dt;
    if (f.stepT >= interval) { f.stepT = 0; tickFormation(g, f, list); }
    // invaders trample the bunkers
    for (const q of list) if (q.y + 14 > C.BUNKER_Y) Sh.crush(q.x - 15, q.y - 12, q.x + 15, q.y + 12);
    // bombs from the lowest invader in a random column
    g.bombT -= dt;
    if (g.bombT <= 0) {
      g.bombT = Math.max(0.35, 1.25 - 0.06 * f.n) * U.rand(0.6, 1.3);
      dropBomb(g, list);
    }
  };

  function dropBomb(g, list) {
    if (g.eb.length >= Math.min(10, 3 + Math.floor(g.form.n / 2)) || !g.player.alive) return;
    const cols = {};
    for (const q of list) if (!cols[q.c] || q.r > cols[q.c].r) cols[q.c] = q;
    const keys = Object.keys(cols);
    if (!keys.length) return;
    const q = cols[U.pick(keys)], n = g.form.n, sp = Math.min(1.5, 1 + 0.04 * (n - 1));
    if (q.type === 'bomber') {
      for (const a of [-0.3, 0, 0.3]) g.ebullet(q.x, q.y + 12, Math.sin(a) * 210 * sp, Math.cos(a) * 210 * sp, 'needle', 4);
      A.sfx.bombDrop(); return;
    }
    const roll = Math.random();
    if (roll < (n < 2 ? 0.7 : 0.45)) g.ebullet(q.x, q.y + 12, 0, 260 * sp, 'needle', 4);
    else if (roll < 0.8 || n < 2) g.ebullet(q.x, q.y + 12, 0, 190 * sp, 'wobble', 5, { ax: q.x });
    else g.ebullet(q.x, q.y + 12, 0, 150 * sp, 'plunger', 7);
    A.sfx.bombDrop();
  }

  /* ---------- damage / kills ---------- */
  I.damage = function (g, q, dmg) {
    if (q.dead || q.spawnT > 0) return;
    if (q.shielded) { A.sfx.armor(); q.flash = 0.05; FX.sparks(q.x, q.y, 3, 140, 'hsla(190,100%,75%,1)', 0.25, 1.4); FX.ring(q.x, q.y, 8, 20, 'hsla(190,100%,75%,1)', 0.2, 1.5); return; }
    q.hp -= dmg; q.flash = 0.07;
    if (q.hp <= 0) I.kill(g, q);
    else { A.sfx.hit(); FX.sparks(q.x, q.y, 4, 130, q.armor ? 'hsla(48,100%,70%,1)' : 'hsla(40,100%,70%,1)', 0.25, 1.4); }
  };

  I.kill = function (g, q, o) {
    if (q.dead) return;
    q.dead = true;
    const T = TYPES[q.type], hue = (I.worldHue(g) + (q.type === 'raider' ? 60 : q.type === 'brute' ? 120 : 0)) % 360;
    if (!o || !o.silent) {
      g.award(T.pts * q.maxHp, q.x, q.y);
      g.comboKill();
      A.sfx.kill(q.type === 'cmd' ? 2 : q.maxHp > 1 ? 1 : 0);
    }
    FX.explosion(q.x, q.y, T.size, hue);
    if (q.carrier && !(o && o.silent)) g.dropPickup(q.x, q.y);
    else if (!g.demo && Math.random() < 0.025 && !(o && o.silent)) g.dropPickup(q.x, q.y);
  };

  I.killAll = function (g, o) { for (const q of g.inv) if (!q.dead) I.kill(g, q, o); };

  /* ---------- flyby mothership ---------- */
  const UFO_SCORES = [100, 100, 150, 200, 300, 500];
  I.updateUfo = function (g, dt) {
    if (g.state === 'play' && !g.ufo && g.form && g.form.ready) {
      g.ufoT -= dt;
      if (g.ufoT <= 0) {
        if (g.inv.length > 7) { const dir = Math.random() < 0.5 ? 1 : -1; g.ufo = { x: dir > 0 ? -50 : W + 50, y: 92, dir, t: 0, flash: 0, tick: 0 }; }
        g.ufoT = U.rand(18, 28);
      }
    }
    const u = g.ufo;
    if (!u) return;
    u.t += dt; u.x += u.dir * 130 * dt;
    if (u.flash > 0) u.flash -= dt;
    u.tick -= dt;
    if (u.tick <= 0) { u.tick = 0.1; A.sfx.ufo(u.t); }
    if ((u.dir > 0 && u.x > W + 60) || (u.dir < 0 && u.x < -60) || g.state !== 'play') g.ufo = null;
  };
  I.killUfo = function (g) {
    const u = g.ufo;
    g.ufo = null;
    const pts = U.pick(UFO_SCORES);
    g.award(pts, u.x, u.y); g.comboKill();
    FX.explosion(u.x, u.y, 2.4, 320); FX.ring(u.x, u.y, 10, 90, 'hsla(48,100%,70%,1)', 0.5, 4);
    A.sfx.kill(2); A.sfx.ufoDie();
    g.dropPickup(u.x, u.y);
  };

  /* ---------- boss pods: small invaders that float down ---------- */
  I.spawnPod = function (g, x, y) {
    g.pods.push({ x, y, ax: x, t: Math.random() * 6, vy: 85, hp: 1, r: 12, flash: 0, dead: false });
  };
  I.updatePods = function (g, dt) {
    for (const p of g.pods) {
      p.t += dt; p.y += p.vy * dt; p.x = p.ax + Math.sin(p.t * 2.4) * 40;
      if (p.flash > 0) p.flash -= dt;
      if (p.y + 12 > C.BUNKER_Y) Sh.crush(p.x - 12, p.y - 10, p.x + 12, p.y + 10);
      if (p.y > H + 20) p.dead = true;
    }
    g.pods = g.pods.filter((p) => !p.dead);
  };
  I.killPod = function (g, p, silent) {
    if (p.dead) return;
    p.dead = true;
    if (!silent) { g.award(50, p.x, p.y); g.comboKill(); A.sfx.kill(0); }
    FX.explosion(p.x, p.y, 0.9, I.worldHue(g));
  };

  /* ---------- drawing ---------- */
  const NAME = { scout: 'scout', raider: 'raider', brute: 'brute', bomber: 'bomber', cmd: 'cmd' };
  I.draw = function (ctx, g) {
    const art = GFX.art.inv(I.worldHue(g)), f = g.form, spr = GFX.spr, t = g.time;
    const frame = f ? f.frame : Math.floor(t * 3) % 2;
    if (f) {
      ctx.globalCompositeOperation = 'lighter';
      for (const cm of g.inv) {
        if (cm.dead || cm.type !== 'cmd' || cm.spawnT > 0) continue;
        for (const q of g.inv) {
          if (q.dead || !q.shielded || q === cm || Math.abs(q.c - cm.c) > 1 || Math.abs(q.r - cm.r) > 1) continue;
          ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 6 + q.c);
          ctx.strokeStyle = 'rgba(120,230,255,0.9)'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(cm.x, cm.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          ctx.beginPath(); ctx.arc(q.x, q.y, 18, 0, TAU); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    for (const q of g.inv) {
      if (q.dead) continue;
      const sc = q.spawnT > 0 ? 0 : Math.min(1, (q.appear || 0) * 5);
      if (sc <= 0) continue;
      const set = art[NAME[q.type]], fl = art.F[NAME[q.type]];
      const idx = q.type === 'cmd' || f ? frame : Math.floor(q.anim * 3) % 2;
      if (q.carrier) {
        ctx.globalCompositeOperation = 'lighter';
        GFX.drawGlow(ctx, 'hsla(48,100%,60%,1)', q.x, q.y, 26 + Math.sin(t * 8 + q.c) * 3, 0.6);
        ctx.globalCompositeOperation = 'source-over';
      }
      GFX.draw(ctx, q.flash > 0 ? fl[idx] : set[idx], q.x, q.y, 0, sc * 0.92, sc * 0.92);
      if (q.armor && q.maxHp > 1) GFX.draw(ctx, spr.armor[q.hp >= 2 ? 1 : 0], q.x, q.y, 0, 0.95, 0.95);
    }
    for (const p of g.pods) GFX.draw(ctx, p.flash > 0 ? art.F.scout[Math.floor(t * 4) % 2] : art.scout[Math.floor(t * 4) % 2], p.x, p.y, 0, 0.8, 0.8);
    const u = g.ufo;
    if (u) {
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(320,100%,60%,1)', u.x, u.y + 4, 46, 0.55);
      ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, u.flash > 0 ? spr.ufoF[0] : spr.ufo[Math.floor(u.t * 6) % 2], u.x, u.y, 0, 1, 1);
    }
  };
})((window.SGS = window.SGS || {}));
