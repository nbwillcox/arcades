/* Pixel-art sky panoramas (one 360-degree strip per world) shown behind the horizon. */
(function (G) {
  'use strict';
  const PX = G.px, Pix = PX.Pix, rgb = PX.rgb, TAU = Math.PI * 2;
  const SK = {};
  G.sky = SK;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function grad(p, stops, band) {
    band = band || 0.5;
    const cs = stops.map((s) => [s[0], rgb(s[1])]);
    for (let y = 0; y < p.h; y++) {
      const t = y / (p.h - 1); let i = 0; while (i < cs.length - 2 && t > cs[i + 1][0]) i++;
      const a = cs[i], b = cs[i + 1], u = clamp(((t - a[0]) / (b[0] - a[0]) - (1 - band) / 2) / band, 0, 1);
      for (let x = 0; x < p.w; x++) p.d[y * p.w + x] = PX.dither(x, y, u) ? b[1] : a[1];
    }
  }
  function prof(seed, per, octs, w) {
    const out = new Float32Array(w), ns = [];
    for (let o = 0; o < octs; o++) ns.push(PX.noise(seed * 31 + o * 7, per * (1 << o)));
    for (let x = 0; x < w; x++) { let v = 0, a = 0.6, s = 0; for (let o = 0; o < octs; o++) { v += ns[o](x / w * per * (1 << o), 0.5) * a; s += a; a *= 0.5; } out[x] = v / s; }
    return out;
  }
  function ridge(p, ys, top, bot, rim) {
    const T = rgb(top), B = rgb(bot), R = rim ? rgb(rim) : 0;
    for (let x = 0; x < p.w; x++) { const y0 = Math.floor(ys[x]); for (let y = Math.max(0, y0); y < p.h; y++) { const t = (y - y0) / Math.max(1, p.h - y0); p.set(x, y, PX.dither(x, y, clamp(t * 1.6 - 0.2, 0, 1)) ? B : T); } if (R) p.set(x, y0, R); }
  }
  function sphere(p, cx, cy, r, ramp, bands) {
    const m = new Pix(p.w, p.h); m.disc(cx, cy, r, 1); const tmp = new Pix(p.w, p.h), rp = ramp.map(rgb); tmp.shade3d(m, 0, 0, rp, { depth: r * 0.9 });
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const c = tmp.d[y * p.w + x]; if (!c) continue; let k = rp.indexOf(c); if (bands) { const b = Math.sin((y - cy) * bands) + Math.sin((y - cy) * bands * 2.3 + 1); if (b > 0.9 && k < 4) k++; else if (b < -1.4 && k > 0) k--; } p.set(x, y, rp[k]); }
  }
  function stars(p, rnd, n, ymax, cols) { cols = cols.map(rgb); for (let i = 0; i < n; i++) p.set(Math.floor(rnd() * p.w), Math.floor(rnd() * ymax), cols[Math.floor(rnd() * cols.length)]); }
  function buildings(p, rnd, base, hmin, hmax, wmin, wmax, body, win, dens, signs) {
    const m = new Pix(p.w, p.h), bl = []; let x = 0;
    while (x < p.w) { const w = Math.round(wmin + rnd() * (wmax - wmin)), h = Math.round(hmin + rnd() * (hmax - hmin)); bl.push([x, w, h]); m.rect(x, base - h, w, h + 6, 1); if (rnd() < 0.3) m.rect(x + (w >> 1), base - h - 5 - Math.floor(rnd() * 7), 1, 6, 1); x += w + (rnd() < 0.3 ? 1 : 0); }
    p.paint(m, 0, 0, body.map(rgb), 2);
    for (const [bx, w, h] of bl) { for (let y = base - h + 3; y < base - 1; y += 3) for (let q = bx + 1; q < bx + w - 1; q += 2) if (rnd() < dens) p.set(q, y, rgb(win[Math.floor(rnd() * win.length)])); if (signs && rnd() < 0.18) { const c = rgb(['#ff3ad0', '#3affea', '#ffe03a'][Math.floor(rnd() * 3)]); p.rect(bx + 1, base - h + 2, 1, Math.min(h - 6, 6 + Math.floor(rnd() * 12)), c); } }
  }
  const cache = {};
  const WORLDS = [];
  WORLDS[0] = (p, rnd, hz) => {
    grad(p, [[0, '#04041a'], [0.45, '#1a0a42'], [0.8, '#5a1a70'], [1, '#d0409a']]); stars(p, rnd, 90, 50, ['#ffffff', '#ffd8f0', '#bcd0ff']);
    sphere(p, 260, 34, 18, ['#ffe8f8', '#f0a0d8', '#b05aa8', '#6a2a78', '#3a1a58'], 0.7);
    buildings(p, rnd, hz - 2, 18, 56, 5, 11, ['#6a3a98', '#4a2a78', '#30205a', '#201444', '#140c2e'], ['#ffe27a', '#8affff'], 0.1, false);
    buildings(p, rnd, hz + 4, 14, 44, 6, 14, ['#3a2a78', '#241a58', '#161040', '#0e0a2c', '#080620'], ['#ffe27a', '#8affff', '#ff7ad0'], 0.14, true);
  };
  WORLDS[1] = (p, rnd, hz) => {
    const pw = p.w;
    grad(p, [[0, '#0a1c4a'], [0.4, '#2a5aa0'], [0.75, '#8ac4ee'], [1, '#e8f6ff']]);
    for (let b = 0; b < 3; b++) for (let x = 0; x < pw; x++) { const y = 22 + b * 9 + Math.sin(x / pw * 12.566 + b * 1.7) * 9 + Math.sin(x / pw * 37.7 + b) * 3; for (let q = 0; q < 6; q++) if (PX.dither(x, Math.floor(y) + q, 0.75 - q * 0.12)) p.set(x, Math.floor(y) + q, rgb(b === 1 ? '#9affd0' : '#6affea')); }
    stars(p, rnd, 60, 40, ['#ffffff', '#bfe6ff']); sphere(p, 780, 30, 14, ['#fff4ff', '#e8b8f0', '#a878d0', '#5a3a98', '#2a1a58'], 0.9);
    const a = prof(2, 5, 3, pw), b = prof(5, 9, 3, pw), ya = new Float32Array(pw), yb = new Float32Array(pw);
    for (let x = 0; x < pw; x++) { ya[x] = hz - 30 - a[x] * 34; yb[x] = hz - 12 - b[x] * 22; }
    ridge(p, ya, '#dff0ff', '#7aa8dc', '#ffffff'); ridge(p, yb, '#9ac0ea', '#4a78b8', '#e8f6ff');
  };
  WORLDS[2] = (p, rnd, hz) => {
    const pw = p.w, h = p.h;
    grad(p, [[0, '#12040a'], [0.4, '#4a0e10'], [0.75, '#c0401a'], [1, '#ffb040']]);
    sphere(p, 330, 74, 26, ['#fff6d0', '#ffd870', '#ffa030', '#e85a1a', '#a02a10'], 0.5);
    const sm = new Pix(pw, h); for (let i = 0; i < 12; i++) { const x = rnd() * pw, y = 12 + rnd() * 40, r = 8 + rnd() * 14; sm.ell(x, y, r * 1.6, r * 0.5, 1); sm.ell(x + r * 0.4, y - r * 0.2, r, r * 0.5, 1); }
    const tmp = new Pix(pw, h); tmp.paint(sm, 0, 0, ['#8a3a30', '#52201e', '#2e1016', '#1a0a10', '#0c0408'].map(rgb), 3);
    for (let i = 0; i < pw * h; i++) if (tmp.d[i] && PX.dither(i % pw, (i / pw) | 0, 0.8)) p.d[i] = tmp.d[i];
    const a = prof(7, 6, 3, pw), ya = new Float32Array(pw); for (let x = 0; x < pw; x++) ya[x] = hz - 12 - a[x] * 30;
    ridge(p, ya, '#3a1418', '#1a0a10', '#ff7a2a');
    for (const vx of [140, 560, 900]) { const m = new Pix(pw, h); m.poly([[vx - 46, hz], [vx - 8, hz - 40], [vx + 8, hz - 40], [vx + 46, hz]], 1); p.paint(m, 0, 0, ['#5a2a30', '#3a1a24', '#24101a', '#160a12', '#0a0509'].map(rgb), 4); p.rect(vx - 7, hz - 41, 14, 2, rgb('#ff9a2a')); for (let q = 0; q < 14; q++) p.set(vx + (q % 3) - 1, hz - 40 + q, rgb('#ff7a1a')); }
  };
  WORLDS[3] = (p, rnd, hz) => {
    const pw = p.w, h = p.h;
    grad(p, [[0, '#06102a'], [0.45, '#144a5a'], [0.8, '#2a8a7a'], [1, '#a8f0a0']]); stars(p, rnd, 50, 40, ['#ffffff', '#d8ffe8']);
    sphere(p, 200, 30, 13, ['#f0fff6', '#c0e8d6', '#86b8b0', '#506e88', '#2a4062'], 0); sphere(p, 520, 22, 8, ['#ffe0f4', '#f0a0d8', '#b05aa8', '#6a2a78', '#3a1a58'], 0);
    for (let l = 0; l < 2; l++) {
      const m = new Pix(pw, h), cm = new Pix(pw, h);
      for (let i = 0; i < 14; i++) { const x = (i + rnd() * 0.5) * (pw / 14), th = 34 + rnd() * 44 - l * 12, rx = 11 + rnd() * 9; m.rect(x - 1, hz - th, 3, th + 6, 1); cm.ell(x, hz - th, rx, rx * 0.36, 1); }
      p.paint(m, 0, 0, (l ? ['#2a8a7a', '#1a6a6a', '#124a58', '#0c3246', '#08202e'] : ['#4ab0a0', '#2a8a82', '#1a6068', '#0f4252', '#0a2c40']).map(rgb), 2);
      p.paint(cm, 0, 0, (l ? ['#7ad8c0', '#3cc0a8', '#1f8a84', '#145a68', '#0b3248'] : ['#ff9ac0', '#3cc0a8', '#1f8a84', '#145a68', '#0b3248']).map(rgb), 3);
    }
    const a = prof(9, 8, 3, pw), ya = new Float32Array(pw); for (let x = 0; x < pw; x++) ya[x] = hz - 4 - a[x] * 12; ridge(p, ya, '#0e3a48', '#071a26', '#2e9a88');
  };
  WORLDS[4] = (p, rnd, hz) => {
    grad(p, [[0, '#02030a'], [0.5, '#0a1030'], [1, '#2a4a8a']]); stars(p, rnd, 150, 80, ['#ffffff', '#bcd0ff', '#ffe8c0']);
    sphere(p, 400, 46, 30, ['#bfe0ff', '#6aa8f0', '#3a6ad0', '#1e3a98', '#0e1c58'], 0.6);
    for (let k = 0; k < 90; k++) { const x = 330 + k * 1.6, y = 52 + Math.sin(k * 0.035) * 12 + (k - 45) * 0.12; if (Math.hypot(x - 400, y - 46) > 31 || k % 2) p.set(Math.round(x), Math.round(y), rgb('#d8ecff')); }
    buildings(p, rnd, hz - 1, 8, 36, 4, 10, ['#5a78c0', '#38559c', '#223a7c', '#14265a', '#0a1440'], ['#ffb02e', '#8affff'], 0.12, false);
    buildings(p, rnd, hz + 5, 8, 26, 5, 12, ['#34509c', '#1e3a86', '#122660', '#0a1646', '#060c2c'], ['#ffb02e', '#8affff'], 0.1, false);
  };
  /* panorama canvas for a world: TAU * F pixels wide (1 pixel = 1 radian / F) and h tall */
  SK.build = function (world, F, h) {
    const key = world + '|' + h;
    if (cache[key]) return cache[key];
    const pw = Math.round(TAU * F), p = new Pix(pw, h);
    WORLDS[world](p, PX.rng(world * 191 + 7), h);
    return (cache[key] = p.toCanvas(1));
  };
})((window.SGS = window.SGS || {}));
