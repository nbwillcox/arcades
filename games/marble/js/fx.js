/* World-space particles (they live in tile coordinates with a height, so they tumble, bounce on the tiles and sort with the scene), screen shake, flash and floating text. */
(function (G) {
  'use strict';
  const U = G.U, S = G.settings, TAU = U.TAU;
  const FX = { list: [], texts: [], decals: [], shake: 0, flash: 0, flashColor: '255,255,255', world: null, slow: 0 };
  const pool = [];
  const MAX = 900;

  const col = (h, l) => `hsla(${Math.round(h / 10) * 10},100%,${l || 60}%,1)`;
  FX.col = col;
  const lim = () => (S.reduced ? 0.4 : window.TK && window.TK.on ? 0.7 : 1);

  function np(o) {
    const p = pool.pop() || {};
    p.t = 0; p.life = 1; p.x = 0; p.y = 0; p.z = 0; p.vx = 0; p.vy = 0; p.vz = 0; p.drag = 0; p.size = 2; p.grow = 0;
    p.rot = 0; p.vr = 0; p.color = '#fff'; p.lw = 2; p.kind = 'spark'; p.r1 = 0; p.g = 0; p.bounce = 0; p.pts = null; p.add = false; p.rest = false; p.fade = 0.4; p.px = 0; p.py = 0;
    return Object.assign(p, o);
  }
  function put(p) { if (FX.list.length < MAX) FX.list.push(p); else pool.push(p); }

  FX.reset = function () {
    while (FX.list.length) pool.push(FX.list.pop());
    FX.texts.length = 0; FX.decals.length = 0; FX.shake = 0; FX.flash = 0;
  };
  FX.addShake = function (a) { if (S.shake && !S.reduced) FX.shake = Math.min(14, FX.shake + a); };
  FX.doFlash = function (a, c) { if (!S.reduced) { FX.flash = Math.max(FX.flash, a); FX.flashColor = c || '255,255,255'; } };

  FX.sparks = function (x, y, z, n, speed, color, life, size, up) {
    n = Math.ceil(n * lim());
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = speed * (0.3 + Math.random() * 0.8);
      put(np({ kind: 'spark', add: true, x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: (up === undefined ? 0.6 : up) * speed * (0.2 + Math.random() * 0.9), life: (life || 0.55) * (0.6 + Math.random() * 0.7), drag: 1.4, g: 9, bounce: 0.35, color, size: size || 1.7 }));
    }
  };
  FX.glowPop = function (x, y, z, r, color, dur) { put(np({ kind: 'glow', add: true, x, y, z, size: r, grow: 0.9, life: dur || 0.35, color })); };
  FX.ring = function (x, y, z, r0, r1, color, dur, lw) { put(np({ kind: 'ring', add: true, x, y, z, size: r0, r1, life: dur || 0.5, color, lw: lw || 3 })); };
  FX.beam = function (x, y, z, h, color, dur, w) { put(np({ kind: 'beam', add: true, x, y, z, size: h, r1: w || 10, life: dur || 0.6, color })); };
  /* slow drifting motes of light that make the air around the marble feel alive */
  FX.mote = function (x, y, z, color) { put(np({ kind: 'glow', add: true, x, y, z, vx: U.rand(-0.15, 0.15), vy: U.rand(-0.15, 0.15), vz: U.rand(0.1, 0.45), size: U.rand(3, 6), grow: -0.35, life: U.rand(2.2, 4.2), color })); };
  FX.trail = function (x, y, z, color, size, life) { put(np({ kind: 'glow', add: true, x, y, z, size: size || 6, grow: -0.7, life: life || 0.2, color })); };
  FX.smoke = function (x, y, z, n, size, tint) {
    n = Math.ceil(n * lim());
    for (let i = 0; i < n; i++) put(np({ kind: 'smoke', x: x + U.rand(-0.15, 0.15), y: y + U.rand(-0.15, 0.15), z, vx: U.rand(-0.6, 0.6), vy: U.rand(-0.6, 0.6), vz: U.rand(0.4, 1.4), size: (size || 10) * U.rand(0.6, 1.2), grow: 1.5, life: U.rand(0.7, 1.4), drag: 1.5, color: tint || '#2b2f48' }));
  };
  FX.dust = function (x, y, z, n, size, color) {
    n = Math.ceil(n * lim());
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = U.rand(0.4, 1.6); put(np({ kind: 'smoke', x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: U.rand(0.1, 0.7), size: (size || 7) * U.rand(0.7, 1.2), grow: 1.1, life: U.rand(0.4, 0.8), drag: 3, color: color || '#6b7396' })); }
  };
  /* glass shards of the marble: polygons that tumble and bounce */
  FX.shards = function (x, y, z, n, speed, hue, vx, vy) {
    n = Math.ceil(n * (S.reduced ? 0.5 : window.TK && window.TK.on ? 0.8 : 1));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = speed * (0.3 + Math.random() * 0.8), sz = U.rand(6, 14), k = (3 + Math.random() * 2) | 0, pts = [];
      for (let j = 0; j < k; j++) { const ang = (j / k) * TAU + Math.random() * 0.6, r = sz * (j % 2 ? 0.45 : 1); pts.push([Math.cos(ang) * r, Math.sin(ang) * r * 0.8]); }
      put(np({ kind: 'shard', x, y, z, vx: Math.cos(a) * v + (vx || 0) * 0.5, vy: Math.sin(a) * v + (vy || 0) * 0.5, vz: U.rand(1.5, 1 + speed * 0.9), rot: Math.random() * TAU, vr: U.rand(-12, 12), life: U.rand(1.2, 2.4), g: 24, bounce: 0.45, drag: 0.5, pts, color: hue, size: sz }));
    }
  };
  /* pieces of a broken floor tile: u0..u1 / v0..v1 are the piece's span inside the tile */
  FX.chunks = function (cx, cy, z, n, speed) {
    n = Math.ceil(n * (S.reduced ? 0.6 : 1));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = speed * U.rand(0.2, 1), k = 4 + ((Math.random() * 2) | 0), pts = [], sz = U.rand(9, 20);
      for (let j = 0; j < k; j++) { const ang = (j / k) * TAU + Math.random() * 0.7, r = sz * U.rand(0.6, 1.1); pts.push([Math.cos(ang) * r, Math.sin(ang) * r * 0.55]); }
      put(np({ kind: 'chunk', x: cx + U.rand(-0.35, 0.35), y: cy + U.rand(-0.35, 0.35), z, vx: Math.cos(a) * v * 0.5, vy: Math.sin(a) * v * 0.5, vz: U.rand(0.5, 3), rot: Math.random() * TAU, vr: U.rand(-6, 6), life: U.rand(1.2, 2), g: 22, drag: 0.3, pts, size: sz, color: 'chunk', bounce: 0 }));
    }
  };
  FX.text = function (x, y, z, str, color, size) {
    if (FX.texts.length > 24) FX.texts.shift();
    FX.texts.push({ x, y, z, str, color: color || '#fff', size: size || 18, t: 0, life: 1.1 });
  };
  /* impact scar on a tile: radial cracks stay for a few seconds */
  FX.decal = function (x, y, z, size, life) {
    if (FX.decals.length > 40) FX.decals.shift();
    FX.decals.push({ x, y, z, size, t: 0, life: life || 6, rot: Math.random() * TAU, seed: (Math.random() * 1e6) | 0 });
  };

  FX.update = function (dt) {
    const W = FX.world;
    for (let i = FX.list.length - 1; i >= 0; i--) {
      const p = FX.list[i];
      p.t += dt;
      if (p.t >= p.life) { pool.push(p); FX.list[i] = FX.list[FX.list.length - 1]; FX.list.pop(); continue; }
      if (p.rest) continue;
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      p.vz -= p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
      if (p.g && W && (p.kind === 'shard' || p.kind === 'spark' || p.kind === 'chunk')) {
        const gz = W.heightAt(p.x, p.y);
        if (gz > -Infinity && p.z < gz) {
          p.z = gz;
          if (p.kind === 'chunk') { p.pts = null; p.life = Math.min(p.life, p.t + 0.01); }
          else if (p.bounce && Math.abs(p.vz) > 1.2) { p.vz = -p.vz * p.bounce; p.vx *= 0.7; p.vy *= 0.7; p.vr *= 0.6; }
          else { p.vz = 0; p.vx = p.vy = 0; p.vr = 0; if (p.kind === 'shard') p.rest = true; }
        }
        if (p.kind === 'chunk' && p.z < -30) p.life = 0;
      }
    }
    for (let i = FX.texts.length - 1; i >= 0; i--) {
      const t = FX.texts[i];
      t.t += dt; t.z += 1.4 * dt;
      if (t.t >= t.life) FX.texts.splice(i, 1);
    }
    for (let i = FX.decals.length - 1; i >= 0; i--) { const d = FX.decals[i]; d.t += dt; if (d.t >= d.life) FX.decals.splice(i, 1); }
    FX.shake *= Math.max(0, 1 - 9 * dt);
    if (FX.shake < 0.05) FX.shake = 0;
    FX.flash = Math.max(0, FX.flash - dt * 2.2);
  };

  G.fx = FX;
})((window.SGS = window.SGS || {}));
