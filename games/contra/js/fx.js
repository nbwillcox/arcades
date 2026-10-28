/* Pixel-art particles: square sparks, frame-animated fireballs, chunky smoke and debris, shockwave rings, screen shake and floating text. */
(function (G) {
  'use strict';
  const U = G.U, S = G.settings, TAU = U.TAU, PX = G.px, K = PX.K;
  const FX = { add: [], norm: [], texts: [], shake: 0, flash: 0, flashColor: '255,255,255' };
  const pool = [];
  const MAX = 600;

  const col = (h, l) => `hsla(${Math.round(h / 10) * 10},100%,${l || 60}%,1)`;
  FX.col = col;

  function np(o) {
    const p = pool.pop() || {};
    p.t = 0; p.life = 1; p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.drag = 0; p.size = 2; p.grow = 0;
    p.rot = 0; p.vr = 0; p.color = '#fff'; p.lw = 2; p.kind = 'spark'; p.r1 = 0; p.g = 0; p.cls = 'S';
    return Object.assign(p, o);
  }
  const lim = () => (S.reduced ? 0.4 : window.TK && window.TK.on ? 0.7 : 1);                    /* fewer particles on a phone */

  FX.reset = function () {
    while (FX.add.length) pool.push(FX.add.pop());
    while (FX.norm.length) pool.push(FX.norm.pop());
    FX.texts.length = 0; FX.shake = 0; FX.flash = 0;
  };

  /* particles live in screen space; when the camera moves, slide them with the world */
  FX.shift = function (dx, dy) {
    for (const arr of [FX.add, FX.norm]) for (const p of arr) { p.x += dx; p.y += dy; }
    for (const t of FX.texts) { t.x += dx; t.y += dy; }
  };
  FX.addShake = function (a) { if (S.shake && !S.reduced) FX.shake = Math.min(18, FX.shake + a); };
  FX.doFlash = function (a, c) { if (!S.reduced) { FX.flash = Math.max(FX.flash, a); FX.flashColor = c || '255,255,255'; } };

  FX.sparks = function (x, y, n, speed, color, life, size) {
    n = Math.ceil(n * lim());
    if (FX.add.length > MAX) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = speed * (0.35 + Math.random() * 0.75);
      FX.add.push(np({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: (life || 0.5) * (0.6 + Math.random() * 0.6), drag: 2.2, color, size: size || 1.6, g: 40 }));
    }
  };
  FX.glowPop = function (x, y, r, color, dur) { FX.add.push(np({ kind: 'glow', x, y, size: r, grow: 0.8, life: dur || 0.35, color })); };
  FX.ring = function (x, y, r0, r1, color, dur, lw) { FX.add.push(np({ kind: 'ring', x, y, size: r0, r1, life: dur || 0.5, color, lw: lw || 3 })); };
  FX.trail = function (x, y, color, size, life) { if (FX.add.length <= MAX) FX.add.push(np({ kind: 'glow', x, y, size: size || 6, grow: -0.7, life: life || 0.2, color })); };
  FX.smoke = function (x, y, n, size) {
    n = Math.ceil(n * lim());
    for (let i = 0; i < n; i++) {
      if (FX.norm.length > MAX) return;
      FX.norm.push(np({ kind: 'smoke', x: x + U.rand(-6, 6), y: y + U.rand(-6, 6), vx: U.rand(-25, 25), vy: U.rand(-45, -10), size: (size || 10) * U.rand(0.7, 1.2), grow: 0.4, life: U.rand(0.7, 1.3), drag: 1.5 }));
    }
  };
  FX.debris = function (x, y, n, color, speed) {
    n = Math.ceil(n * lim());
    for (let i = 0; i < n; i++) {
      if (FX.norm.length > MAX) return;
      const a = Math.random() * TAU, v = (speed || 160) * U.rand(0.3, 1);
      FX.norm.push(np({ kind: 'debris', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, size: U.rand(1.5, 3.2), life: U.rand(0.6, 1.3), drag: 0.8, color, g: 520 }));
    }
  };
  /* size 1 = small enemy, 2 = medium, 3+ = big; hue = tint of the chunks */
  FX.explosion = function (x, y, size, hue) {
    hue = hue === undefined ? 28 : hue;
    const cls = size < 1.15 ? 'S' : size < 2.3 ? 'M' : 'L', life = cls === 'S' ? 0.4 : cls === 'M' ? 0.6 : 0.85;
    FX.add.push(np({ kind: 'boom', x, y, cls, life }));
    if (size >= 3.4) for (let i = 0; i < 5; i++) FX.add.push(np({ kind: 'boom', x: x + U.rand(-60, 60), y: y + U.rand(-46, 46), cls: i % 2 ? 'M' : 'L', life: 0.7, t: -i * 0.07 }));
    if (size >= 1.9) FX.add.push(np({ kind: 'ring', x, y, size: 6 * size, r1: 46 * size, life: 0.42, color: '#ffd9a0', lw: 2 }));
    FX.sparks(x, y, 7 * size, 130 + 40 * size, 'hsla(40,100%,66%,1)', 0.5, 2);
    FX.sparks(x, y, 3 * size, 90 + 30 * size, 'rgba(255,255,255,1)', 0.35, 2);
    if (size >= 1.2) { FX.smoke(x, y, 2 + size, 7 * size); FX.debris(x, y, 3 * size, col(hue, 55), 130 + 40 * size); }
    FX.addShake(size * 1.2);
  };
  FX.text = function (x, y, str, color, size) {
    if (FX.texts.length > 40) FX.texts.shift();
    FX.texts.push({ x, y, str, color: color || '#fff', size: size || 16, t: 0, life: 0.9 });
  };

  FX.update = function (dt) {
    const rm = (arr, i) => { pool.push(arr[i]); arr[i] = arr[arr.length - 1]; arr.pop(); };
    for (const arr of [FX.add, FX.norm]) {
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.t += dt;
        if (p.t >= p.life) { rm(arr, i); continue; }
        if (p.t < 0) continue;
        if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
        p.x += p.vx * dt; p.y += (p.vy + p.g * (p.kind === 'debris' ? 0 : 0)) * dt;
        if (p.g) p.vy += p.g * dt;
      }
    }
    for (let i = FX.texts.length - 1; i >= 0; i--) {
      const t = FX.texts[i];
      t.t += dt; t.y -= 30 * dt;
      if (t.t >= t.life) FX.texts.splice(i, 1);
    }
    FX.shake *= Math.max(0, 1 - 7 * dt);
    if (FX.shake < 0.05) FX.shake = 0;
    FX.flash = Math.max(0, FX.flash - dt * 2.2);
  };

  /* ---------- pixel sprites for the effects ---------- */
  const A = G.gfx.art, Pix = PX.Pix;
  const FRAMES = 8;
  function boomFrames(R, seed) {
    const out = [], nz = PX.noise(seed), size = R * 2 + 6, c = size / 2;
    const cols = ['#fff8dc', '#ffe066', '#ffa22a', '#ee5a1c', '#a02a18', '#4a2a30'].map(PX.rgb), rad = [0.45, 0.72, 0.95, 1, 0.96, 0.88, 0.76, 0.6];
    for (let f = 0; f < FRAMES; f++) {
      const p = new Pix(size, size), r = R * rad[f], t = f / (FRAMES - 1);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / r, n = nz(x * 0.3 + f * 3.1, y * 0.3 + f * 1.7), v = d + (n - 0.5) * 0.6 * (0.6 + t * 0.6);
        if (v > 1.02) continue;
        if (f >= 5 && !PX.dither(x, y, 1 - (f - 4) / 4.2)) continue;
        const s = v + t * 0.85;
        p.set(x, y, cols[s < 0.22 ? 0 : s < 0.45 ? 1 : s < 0.68 ? 2 : s < 0.88 ? 3 : s < 1.05 ? 4 : 5]);
      }
      out.push(PX.sprite(p, c, c, { outline: false }));
    }
    return out;
  }
  function puff(d) {
    const n = d + 2, p = new Pix(n, n), ramp = ['#7a7488', '#5a566c', '#403c52', '#2a2838', '#1c1a28'].map(PX.rgb);
    const m = new Pix(n, n); m.disc(n / 2, n / 2, d / 2, 1); p.paint(m, 0, 0, ramp, 2);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (p.get(x, y) && ((x + y) & 1) && x > n * 0.6) p.set(x, y, 0);
    return PX.sprite(p, n / 2, n / 2, { outline: false });
  }
  A.initFx = function () {
    A.fx = { boom: { S: boomFrames(8, 3), M: boomFrames(15, 7), L: boomFrames(26, 11) }, puff: [puff(4), puff(7), puff(10), puff(14)] };
  };

  /* ---------- drawing ---------- */
  const sparkGroups = new Map();
  /* additive layer (call with globalCompositeOperation 'lighter'); pixel parts draw in normal mode */
  FX.drawAdd = function (ctx) {
    const fx = A.fx;
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < FX.add.length; i++) {
      const p = FX.add[i];
      if (p.t < 0) continue;
      const k = p.t / p.life;
      if (p.kind === 'boom') { const fr = fx.boom[p.cls], idx = Math.min(FRAMES - 1, (k * FRAMES) | 0); PX.draw(ctx, fr[idx], p.x, p.y, 1); }
      else if (p.kind === 'spark') {
        if (k > 0.55 && (((i + ((p.t * 28) | 0)) & 1))) continue;
        const key = p.color + '|' + (p.size >= 2.2 ? 2 : 1);
        let g = sparkGroups.get(key);
        if (!g) { g = { color: p.color, s: (p.size >= 2.2 ? 2 : 1) * K, pts: [] }; sparkGroups.set(key, g); }
        g.pts.push(Math.round(p.x / K) * K, Math.round(p.y / K) * K);
      } else if (p.kind === 'ring') {
        const r = p.size + (p.r1 - p.size) * U.easeOutCubic(k), n = Math.max(12, Math.round(TAU * r / 3.4));
        ctx.fillStyle = p.color; ctx.globalAlpha = 1 - k;
        for (let j = 0; j < n; j++) { const a = j / n * TAU; ctx.fillRect(Math.round((p.x + Math.cos(a) * r) / K) * K, Math.round((p.y + Math.sin(a) * r) / K) * K, K, K); }
        ctx.globalAlpha = 1;
      }
    }
    for (const g of sparkGroups.values()) {
      const n = g.pts.length;
      if (!n) continue;
      ctx.fillStyle = g.color;
      for (let j = 0; j < n; j += 2) ctx.fillRect(g.pts[j], g.pts[j + 1], g.s, g.s);
      g.pts.length = 0;
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < FX.add.length; i++) {
      const p = FX.add[i];
      if (p.kind !== 'glow') continue;
      const k = p.t / p.life, r = Math.max(1, p.size * (1 + p.grow * k));
      ctx.globalAlpha = (1 - k) * (1 - k * 0.5);
      ctx.drawImage(G.gfx.glow(p.color), p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  };
  /* normal layer: smoke and debris */
  FX.drawNorm = function (ctx) {
    const fx = A.fx;
    for (let i = 0; i < FX.norm.length; i++) {
      const p = FX.norm[i], k = p.t / p.life;
      if (p.kind === 'smoke') {
        const d = p.size * (1 + p.grow * k) * (1 - k * 0.3), idx = d < 5 ? 0 : d < 9 ? 1 : d < 13 ? 2 : 3;
        ctx.globalAlpha = 0.85 * (1 - k * k);
        PX.draw(ctx, fx.puff[idx], p.x, p.y, 1);
      } else {
        if (k > 0.7 && ((i + ((p.t * 24) | 0)) & 1)) continue;
        const s = (p.size >= 2.4 ? 2 : 1) * K, x = Math.round(p.x / K) * K, y = Math.round(p.y / K) * K;
        ctx.globalAlpha = 1; ctx.fillStyle = '#262e4c'; ctx.fillRect(x, y, s + K * 0, s); ctx.fillStyle = p.color; ctx.fillRect(x, y, K, K);
      }
    }
    ctx.globalAlpha = 1;
  };
  FX.drawText = function (ctx) {
    for (const t of FX.texts) {
      const k = t.t / t.life;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      PX.text(ctx, t.str, Math.round(t.x), Math.round(t.y - 7), { s: t.size >= 20 ? 3 : K, c: t.color, o: '#0b0d1a', a: 'c' });
    }
    ctx.globalAlpha = 1;
  };

  G.fx = FX;
})((window.SGS = window.SGS || {}));
