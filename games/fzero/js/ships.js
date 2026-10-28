/* Machine sprites (rear view, 3 bank frames x 2 engine-flicker frames), colour variants for the rivals, explosion frames. */
(function (G) {
  'use strict';
  const PX = G.px, Pix = PX.Pix, rgb = PX.rgb;
  const SH = {};
  G.ships = SH;
  SH.TYPES = [
    { name: 'VOLT-7', blurb: 'Balanced all-rounder', hue: 212, vmax: 190, acc: 125, turn: 1.55, grip: 3.2, body: 1.0, stats: [3, 3, 3, 3] },
    { name: 'MANTIS', blurb: 'Fastest, slippery in corners', hue: 128, vmax: 205, acc: 112, turn: 1.4, grip: 2.2, body: 0.8, stats: [5, 2, 2, 3] },
    { name: 'RHINO', blurb: 'Armoured and quick off the line', hue: 22, vmax: 180, acc: 150, turn: 1.45, grip: 3.4, body: 1.45, stats: [2, 3, 5, 4] },
    { name: 'WISP', blurb: 'Nimble, grips like glue', hue: 318, vmax: 185, acc: 132, turn: 1.8, grip: 4.6, body: 0.85, stats: [3, 5, 2, 3] },
  ];
  const W = 48, H = 30;
  const mask = (fn) => { const m = new Pix(W, H); fn(m); return m; };
  const pmk = (p, ramp, cap, fn) => p.paint(mask(fn), 0, 0, ramp, cap);
  const mirrorPoly = (m, pts) => { m.poly(pts, 1); m.poly(pts.map((q) => [47 - q[0], q[1]]), 1); };
  function engine(p, cx, cy, r, flick, glow) {
    p.disc(cx, cy, r + 1, rgb('#10122a')); p.disc(cx, cy, r, rgb('#2a2f5a'));
    p.disc(cx, cy, r - 1, glow[flick ? 1 : 2]); p.disc(cx, cy, Math.max(1, r - 2.2), glow[0]);
  }
  function draw(type, hue, flick) {
    const p = new Pix(W, H), R = PX.ramp(hue, 70, 48), D = PX.ramp(hue + 18, 55, 32), V = PX.ramp(190, 80, 46);
    const glow = [rgb('#ffffff'), rgb('#9ae8ff'), rgb('#4aa8ff')];
    const trim = PX.ramp((hue + 160) % 360, 85, 55);
    if (type === 0) {
      pmk(p, D, 2, (m) => mirrorPoly(m, [[14, 15], [2, 22], [3, 26], [16, 24]]));
      pmk(p, R, 3, (m) => m.poly([[16, 9], [32, 9], [35, 24], [13, 24]], 1));
      pmk(p, trim, 2, (m) => { m.poly([[22, 2], [26, 2], [27, 10], [21, 10]], 1); mirrorPoly(m, [[1, 20], [4, 20], [4, 26], [2, 26]]); });
      p.shade3d(mask((m) => m.ell(24, 11, 5.5, 4, 1)), 0, 0, V, { depth: 3 });
      engine(p, 18, 23, 3.4, flick, glow); engine(p, 30, 23, 3.4, flick, glow);
      p.rect(20, 17, 8, 2, D[4]);
    } else if (type === 1) {
      pmk(p, D, 2, (m) => mirrorPoly(m, [[17, 13], [0, 24], [2, 27], [17, 23]]));
      pmk(p, R, 3, (m) => m.poly([[19, 7], [29, 7], [32, 24], [16, 24]], 1));
      pmk(p, trim, 2, (m) => { mirrorPoly(m, [[10, 14], [12, 14], [12, 22], [9, 22]]); m.poly([[23, 1], [25, 1], [26, 8], [22, 8]], 1); });
      p.shade3d(mask((m) => m.ell(24, 10, 4, 4.5, 1)), 0, 0, V, { depth: 3 });
      engine(p, 24, 22, 4.6, flick, glow); engine(p, 11, 25, 1.8, flick, glow); engine(p, 36, 25, 1.8, flick, glow);
    } else if (type === 2) {
      pmk(p, D, 3, (m) => mirrorPoly(m, [[3, 12], [11, 11], [12, 25], [3, 26]]));
      pmk(p, R, 3, (m) => m.poly([[12, 8], [36, 8], [40, 24], [8, 24]], 1));
      pmk(p, trim, 2, (m) => { m.rect(21, 3, 6, 6, 1); mirrorPoly(m, [[4, 14], [9, 14], [9, 17], [4, 17]]); });
      p.shade3d(mask((m) => m.ell(24, 11, 6, 3.4, 1)), 0, 0, V, { depth: 3 });
      engine(p, 14, 23, 3.2, flick, glow); engine(p, 24, 23, 3.6, flick, glow); engine(p, 34, 23, 3.2, flick, glow);
      for (let x = 16; x < 33; x += 4) p.rect(x, 14, 2, 3, D[4]);
    } else {
      pmk(p, D, 2, (m) => { mirrorPoly(m, [[9, 10], [2, 6], [4, 15], [11, 17]]); });
      p.shade3d(mask((m) => m.ell(24, 17, 12, 8, 1)), 0, 0, R, { depth: 7 });
      pmk(p, trim, 2, (m) => m.poly([[23, 4], [25, 4], [26, 10], [22, 10]], 1));
      p.shade3d(mask((m) => m.ell(24, 12, 5, 3.4, 1)), 0, 0, V, { depth: 3 });
      engine(p, 24, 22, 4.2, flick, glow); p.rect(15, 24, 18, 1, glow[2]);
    }
    return p;
  }
  /* lean the sprite: shear rows (k > 0 lowers the right side) */
  function bank(p, k) {
    if (!k) return p;
    const o = new Pix(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = p.get(x, y); if (c) o.set(x, y + Math.round((x - 24) * k), c); }
    return o;
  }
  const cache = {};
  /* set[bank (0 left, 1 straight, 2 right)][flick] = sprite canvas */
  SH.set = function (type, hue) {
    const key = type + '|' + hue;
    if (cache[key]) return cache[key];
    const out = [];
    for (let b = 0; b < 3; b++) { out[b] = []; for (let f = 0; f < 2; f++) out[b][f] = PX.sprite(bank(draw(type, hue, f), (b - 1) * -0.14), 24, 28).c; }
    return (cache[key] = out);
  };
  SH.shadow = (() => { const p = new Pix(40, 10); p.ell(20, 5, 18, 4, rgb('#000000')); const c = p.toCanvas(1), x = c.getContext('2d'); x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, 0, 40, 10); return c; })();
  /* explosion frames (fireball) */
  SH.boom = (() => {
    const frames = [], nz = PX.noise(9), size = 64, c = 32, cols = ['#fff8dc', '#ffe066', '#ffa22a', '#ee5a1c', '#a02a18', '#4a2a30'].map(rgb), rad = [0.4, 0.7, 0.95, 1, 0.96, 0.88, 0.76, 0.6];
    for (let f = 0; f < 8; f++) {
      const p = new Pix(size, size), r = 28 * rad[f], t = f / 7;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / r, v = d + (nz(x * 0.25 + f * 3.1, y * 0.25 + f * 1.7) - 0.5) * 0.7;
        if (v > 1.02 || (f >= 5 && !PX.dither(x, y, 1 - (f - 4) / 4.2))) continue;
        const s = v + t * 0.85; p.set(x, y, cols[s < 0.22 ? 0 : s < 0.45 ? 1 : s < 0.68 ? 2 : s < 0.88 ? 3 : s < 1.05 ? 4 : 5]);
      }
      frames.push(p.toCanvas(1));
    }
    return frames;
  })();
})((window.SGS = window.SGS || {}));
