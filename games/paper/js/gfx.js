/* Oblique 3/4 projection into the 480x270 pixel buffer + drawing helpers (boxes, balls, cylinders), the space backdrop and the ground.
   World: x = across the street (houses at -x), z = along it (forward), y = up. */
(function (G) {
  'use strict';
  const C = G.C, px = G.px;
  const g = (G.gfx = { X: 0, Y: 0, camX: 0, camZ: 0, shx: 0, shy: 0, OX: 262, OY: 184 });
  const SC = 1.3, RX = 0.62, RY = 0.28, FX = 0.56, FY = -0.7, HS = 1.15;
  g.SC = SC; g.RX = RX; g.RY = RY; g.FX = FX; g.FY = FY; g.HS = HS;
  /* the camera offset is rounded once, so every vertex snaps to the same pixel grid and nothing shimmers while scrolling */
  let cx0 = 0, cy0 = 0, lcx = NaN, lcz = NaN;
  g.pr = function (x, z, y) {
    if (g.camX !== lcx || g.camZ !== lcz) { lcx = g.camX; lcz = g.camZ; cx0 = Math.round((lcx * RX + lcz * FX) * SC); cy0 = Math.round((lcx * RY + lcz * FY) * SC); }
    g.X = Math.round((x * RX + z * FX) * SC) - cx0 + g.OX + g.shx; g.Y = Math.round((x * RY + z * FY) * SC - (y || 0) * HS) - cy0 + g.OY + g.shy;
  };
  g.key = (x, z) => x * RY + z * FY;
  g.hash = (n) => { n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16; return (n >>> 0) / 4294967296; };
  const tmp = [];
  /* world polygon [x,z,y,...] -> screen */
  g.sp = function (pts) { tmp.length = 0; for (let i = 0; i < pts.length; i += 3) { g.pr(pts[i], pts[i + 1], pts[i + 2]); tmp.push(g.X, g.Y); } return tmp; };
  g.pf = function (pts, c, c2, pat) { px.poly(g.sp(pts), c, c2, pat); };
  g.po = function (pts, c) { px.outline(g.sp(pts), c); };
  g.ln = function (x0, z0, y0, x1, z1, y1, c) { g.pr(x0, z0, y0); const a = g.X, b = g.Y; g.pr(x1, z1, y1); px.line(a, b, g.X, g.Y, c); };
  const dot = (x, z, y, c) => { g.pr(x, z, y); px.pix(g.X, g.Y, c); };
  g.dot = dot;

  /* iso box with 3 visible faces. r = px.ramp(...) */
  g.box = function (x0, z0, y0, w, d, h, r) {
    const x1 = x0 + w, z1 = z0 + d, y1 = y0 + h;
    g.pf([x1, z0, y0, x1, z1, y0, x1, z1, y1, x1, z0, y1], r.c);
    g.pf([x0, z0, y0, x1, z0, y0, x1, z0, y1, x0, z0, y1], r.b);
    g.pf([x0, z0, y1, x1, z0, y1, x1, z1, y1, x0, z1, y1], r.d);
    g.po([x0, z0, y0, x1, z0, y0, x1, z1, y0, x1, z1, y1, x0, z1, y1, x0, z0, y1], r.a);
    g.ln(x1, z0, y0, x1, z0, y1, r.a); g.ln(x0, z0, y1, x1, z0, y1, r.e); g.ln(x1, z0, y1, x1, z1, y1, r.e);
  };
  g.ball = function (x, z, y, r, rp) {
    g.pr(x, z, y); const cx = g.X, cy = g.Y, rr = Math.max(1, Math.round(r * SC));
    px.ell(cx, cy, rr + 1, rr + 1, rp.a); px.ell(cx, cy, rr, rr, rp.c);
    px.ell(cx + rr * 0.25, cy + rr * 0.3, rr * 0.8, rr * 0.75, rp.b, rp.c, 1);
    px.ell(cx - rr * 0.25, cy - rr * 0.28, rr * 0.55, rr * 0.5, rp.d);
    if (rr > 2) px.rect(cx - rr * 0.45, cy - rr * 0.5, Math.max(1, rr * 0.3), Math.max(1, rr * 0.25), rp.e);
  };
  g.cyl = function (x, z, y0, r, h, rp) {
    g.pr(x, z, y0); const bx = g.X, by = g.Y; g.pr(x, z, y0 + h); const ty = g.Y, rx = Math.max(1, Math.round(r * SC)), ry = Math.max(1, Math.round(rx * 0.5));
    px.ell(bx, by, rx + 1, ry + 1, rp.a); px.rect(bx - rx - 1, ty, rx * 2 + 3, by - ty, rp.a); px.rect(bx - rx, ty, rx * 2 + 1, by - ty, rp.c);
    px.rect(bx + rx * 0.2, ty, Math.max(1, rx * 0.8 + 1), by - ty, rp.b); px.rect(bx - rx, ty, Math.max(1, rx * 0.35), by - ty, rp.d);
    px.ell(bx, by, rx, ry, rp.c); px.ell(bx, ty, rx + 1, ry + 1, rp.a); px.ell(bx, ty, rx, ry, rp.d); px.ell(bx - rx * 0.2, ty - 0.5, rx * 0.5, ry * 0.5, rp.e);
  };
  /* soft cast shadow of a box footprint with height h; the sun sits up-left so shadows fall toward the street */
  const hull = (p) => {
    const n = p.length >> 1, idx = []; for (let i = 0; i < n; i++) idx.push(i);
    idx.sort((a, b) => p[a * 2] - p[b * 2] || p[a * 2 + 1] - p[b * 2 + 1]);
    const cr = (o, a, b) => (p[a * 2] - p[o * 2]) * (p[b * 2 + 1] - p[o * 2 + 1]) - (p[a * 2 + 1] - p[o * 2 + 1]) * (p[b * 2] - p[o * 2]);
    const lo = [], up = [];
    for (const i of idx) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], i) <= 0) lo.pop(); lo.push(i); }
    for (let k = idx.length - 1; k >= 0; k--) { const i = idx[k]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], i) <= 0) up.pop(); up.push(i); }
    const out = []; lo.pop(); up.pop(); for (const i of lo.concat(up)) out.push(p[i * 2], p[i * 2 + 1]); return out;
  };
  g.cast = function (x0, z0, x1, z1, h, a) {
    const sx = h * 0.45, sz = -h * 0.32, w = [x0, z0, x1, z0, x1, z1, x0, z1], pts = [];
    for (let i = 0; i < 8; i += 2) { g.pr(w[i], w[i + 1], 0); pts.push(g.X, g.Y); g.pr(w[i] + sx, w[i + 1] + sz, 0); pts.push(g.X, g.Y); }
    px.blendPoly(hull(pts), px.rgb(14, 10, 40), a === undefined ? 0.32 : a);
  };
  g.shadow = function (x, z, r, k) { g.pr(x, z, 0); px.darkEll(g.X, g.Y, Math.max(2, r * SC * 0.95), Math.max(1, r * SC * 0.45), k === undefined ? 0.68 : k); };
  g.ring = function (x, z, y, r, c, pat) { g.pr(x, z, y); px.ring(g.X, g.Y, Math.max(2, r * SC * 0.95), Math.max(1, r * SC * 0.47), c, pat); };
  g.disc = function (x, z, y, r, c, a) { g.pr(x, z, y); px.blendEll(g.X, g.Y, Math.max(1, r * SC * 0.95), Math.max(1, r * SC * 0.47), c, a === undefined ? 0.4 : a); };
  g.text = function (s, x, y, sc, c, align, outline) { px.text(s, x, y - 3 * sc, sc, c, align, outline === undefined ? px.hsl(250, 40, 10) : outline); };

  /* ---------------- backdrop ---------------- */
  let bgBuf = null, stars = [], rocks = [];
  function makeBg() {
    bgBuf = new Uint32Array(px.W * px.H);
    const W = px.W, H = px.H;
    const stops = [[0, [12, 6, 40]], [0.55, [30, 14, 66]], [1, [8, 28, 62]]];
    const blobs = [[70, 50, 120, [255, 70, 190], 0.28], [400, 80, 140, [70, 200, 255], 0.22], [220, 230, 150, [150, 80, 255], 0.28], [450, 240, 100, [255, 150, 60], 0.14], [30, 210, 90, [70, 255, 190], 0.14]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = y / H; let a = stops[0], b = stops[1], k = t / 0.55; if (t > 0.55) { a = stops[1]; b = stops[2]; k = (t - 0.55) / 0.45; }
      let r = a[1][0] + (b[1][0] - a[1][0]) * k, gg = a[1][1] + (b[1][1] - a[1][1]) * k, bl = a[1][2] + (b[1][2] - a[1][2]) * k;
      for (const q of blobs) { const d = Math.hypot(x - q[0], y - q[1]) / q[2]; if (d < 1) { const f = (1 - d) * (1 - d) * q[4] * 1.4; r += (q[3][0] - r) * f; gg += (q[3][1] - gg) * f; bl += (q[3][2] - bl) * f; } }
      const dth = (((x & 1) ^ (y & 1)) ? 2 : -2); bgBuf[y * W + x] = px.rgb(Math.max(0, Math.min(255, (r + dth) | 0)), Math.max(0, Math.min(255, (gg + dth) | 0)), Math.max(0, Math.min(255, (bl + dth) | 0)));
    }
    for (let i = 0; i < 150; i++) stars.push({ x: g.hash(i * 3) * 480, y: g.hash(i * 3 + 1) * 270, d: 0.2 + g.hash(i * 3 + 2) * 0.8, tw: g.hash(i * 7) * 6 });
    for (let i = 0; i < 6; i++) rocks.push({ x: g.hash(i + 900) * 480, y: g.hash(i + 950) * 270, r: 4 + g.hash(i + 990) * 9, d: 0.5 + g.hash(i + 70) * 0.5, s: i });
  }
  g.backdrop = function (time) {
    if (!bgBuf) makeBg();
    px.buf.set(bgBuf);
    const cz = g.camZ;
    const pxx = 70 - (cz * 0.012) % 20, pyy = 52 + (cz * 0.01) % 15;
    const pc = px.ramp(335, 60, 56);
    px.ell(pxx, pyy, 38, 38, pc.a); px.ell(pxx, pyy, 36, 36, pc.d);
    px.ell(pxx + 6, pyy + 6, 32, 32, pc.c, pc.d, 1); px.ell(pxx + 12, pyy + 12, 26, 26, pc.b, pc.c, 1);
    px.ell(pxx - 12, pyy - 12, 12, 10, pc.e, pc.d, 3);
    px.ring(pxx, pyy, 62, 12, px.hsl(35, 70, 76)); px.ring(pxx, pyy, 58, 10, px.hsl(25, 60, 58), 1);
    for (const s of stars) {
      const x = ((s.x - cz * 0.12 * s.d) % 480 + 480) % 480, y = ((s.y + cz * 0.1 * s.d) % 270 + 270) % 270;
      const a = 0.5 + 0.5 * Math.sin(time * (1 + s.d * 2) + s.tw); const l = 55 + 40 * a * s.d;
      px.pix(x, y, px.hsl(220, 30, l)); if (s.d > 0.85 && a > 0.7) { px.pix(x + 1, y, px.hsl(220, 30, 70)); px.pix(x - 1, y, px.hsl(220, 30, 70)); px.pix(x, y + 1, px.hsl(220, 30, 70)); px.pix(x, y - 1, px.hsl(220, 30, 70)); }
    }
    for (const r of rocks) {
      const x = ((r.x - cz * 0.2 * r.d) % 560 + 560) % 560 - 40, y = ((r.y + cz * 0.17 * r.d) % 330 + 330) % 330 - 30; const rr = px.ramp(265, 22, 34);
      px.ell(x, y, r.r + 1, r.r * 0.8 + 1, rr.a); px.ell(x, y, r.r, r.r * 0.8, rr.c); px.ell(x - r.r * 0.2, y - r.r * 0.2, r.r * 0.6, r.r * 0.45, rr.d, rr.c, 1); px.ell(x + r.r * 0.3, y + r.r * 0.3, r.r * 0.5, r.r * 0.4, rr.b, rr.c, 1);
    }
  };

  /* ---------------- ground ---------------- */
  const THEMES = [
    { lawn: [135, 42, 34], walk: [215, 22, 66], road: [250, 25, 24], rock: [270, 25, 26] },
    { lawn: [160, 45, 32], walk: [200, 25, 66], road: [255, 28, 23], rock: [260, 25, 26] },
    { lawn: [100, 40, 33], walk: [50, 22, 66], road: [20, 22, 22], rock: [20, 25, 26] },
    { lawn: [280, 38, 33], walk: [300, 18, 66], road: [270, 28, 22], rock: [290, 25, 26] },
    { lawn: [180, 50, 30], walk: [190, 25, 68], road: [230, 30, 22], rock: [230, 25, 26] },
    { lawn: [20, 45, 32], walk: [30, 22, 66], road: [350, 22, 22], rock: [350, 25, 26] },
    { lawn: [140, 40, 36], walk: [210, 20, 70], road: [235, 25, 26], rock: [240, 25, 28] },
  ];
  g.theme = (i) => THEMES[((i % 7) + 7) % 7];
  const rs = (h, s, l) => px.ramp(h, s, l);

  g.ground = function (R, z0, z1, time) {
    const T = THEMES[R.theme || 0], EL = C.EDGE, ER = C.EDGE_R;
    z0 = Math.floor(z0 / 20) * 20; z1 = Math.ceil(z1 / 20) * 20;
    const rk = rs(T.rock[0], T.rock[1], T.rock[2]), lawn = rs(T.lawn[0], T.lawn[1], T.lawn[2]), lawn2 = rs(T.lawn[0] + 6, T.lawn[1], T.lawn[2] - 4);
    const walk = rs(T.walk[0], T.walk[1], T.walk[2]), road = rs(T.road[0], T.road[1], T.road[2]);
    /* platform underside, visible on the +x edge */
    g.pf([ER, z0, 0, ER, z1, 0, ER, z1, -46, ER, z0, -46], rk.c, rk.b, 1);
    g.po([ER, z0, 0, ER, z1, 0], rk.e);
    for (let z = z0 - (((z0 % 26) + 26) % 26); z < z1; z += 26) {
      const d = 12 + g.hash(z | 0) * 34;
      g.pf([ER, z, -40, ER, z + 26, -40, ER, z + 13, -40 - d], rk.b); g.po([ER, z, -40, ER, z + 13, -40 - d, ER, z + 26, -40], rk.a);
      g.pf([ER, z + 5, -8, ER, z + 11, -8, ER, z + 8, -24], rk.d, rk.c, 3);
    }
    /* lawns + mowing stripes */
    g.pf([-EL, z0, 0, -C.SIDEW, z0, 0, -C.SIDEW, z1, 0, -EL, z1, 0], lawn.c);
    g.pf([C.SIDEW, z0, 0, ER, z0, 0, ER, z1, 0, C.SIDEW, z1, 0], lawn.c);
    for (let z = z0 - (((z0 % 200) + 200) % 200); z < z1; z += 200) {
      const a = Math.max(z, z0), b = Math.min(z + 100, z1); if (b <= a) continue;
      g.pf([-EL, a, 0, -C.SIDEW, a, 0, -C.SIDEW, b, 0, -EL, b, 0], lawn2.c, lawn.c, 1);
      g.pf([C.SIDEW, a, 0, ER, a, 0, ER, b, 0, C.SIDEW, b, 0], lawn2.c, lawn.c, 1);
    }
    /* sidewalks with tile joints */
    g.pf([-C.SIDEW, z0, 0, -C.CURB, z0, 0, -C.CURB, z1, 0, -C.SIDEW, z1, 0], walk.d);
    g.pf([C.CURB, z0, 0, C.SIDEW, z0, 0, C.SIDEW, z1, 0, C.CURB, z1, 0], walk.d);
    for (let z = z0; z <= z1; z += 20) for (const s of [-1, 1]) { g.ln(s * C.CURB, z, 0, s * C.SIDEW, z, 0, walk.b); }
    for (const s of [-1, 1]) { g.ln(s * C.SIDEW, z0, 0, s * C.SIDEW, z1, 0, walk.c); g.ln(s * (C.SIDEW - 1), z0, 0, s * (C.SIDEW - 1), z1, 0, walk.e); }
    /* road + speckle */
    g.pf([-C.CURB, z0, 0, C.CURB, z0, 0, C.CURB, z1, 0, -C.CURB, z1, 0], road.c);
    const rd = px.hsl(T.road[0] + 6, T.road[1], T.road[2] + 5), rd2 = px.hsl(T.road[0] - 6, T.road[1] + 4, T.road[2] - 5);
    for (let z = z0; z < z1; z += 5) for (let x = -C.CURB + 3; x < C.CURB; x += 7) { const h = g.hash((z | 0) * 131 + (x | 0) * 7); if (h < 0.42) dot(x + h * 4, z + h * 3, 0, h < 0.2 ? rd : rd2); }
    /* crossings */
    for (const o of R.deco) {
      if (o.t !== 'crossroad' || o.z1 < z0 || o.z > z1) continue;
      g.pf([-EL, o.z, 0, ER, o.z, 0, ER, o.z1, 0, -EL, o.z1, 0], road.c);
      g.pf([-EL, o.z, 0, ER, o.z, 0, ER, o.z + 3, 0, -EL, o.z + 3, 0], walk.d); g.pf([-EL, o.z1 - 3, 0, ER, o.z1 - 3, 0, ER, o.z1, 0, -EL, o.z1, 0], walk.d);
      for (let k = 0; k < 8; k++) g.pf([-C.CURB + 3 + k * 14, o.z + 5, 0, -C.CURB + 9 + k * 14, o.z + 5, 0, -C.CURB + 9 + k * 14, o.z + 14, 0, -C.CURB + 3 + k * 14, o.z + 14, 0], px.hsl(0, 0, 82));
      g.pr(-C.CURB - 14, o.z + 6, 28); px.text('!', g.X - 3, g.Y - 3, 2, Math.sin(time * 10) > 0 ? px.hsl(5, 90, 62) : px.hsl(45, 95, 62), 'left', px.hsl(250, 40, 10));
    }
    /* lane marks + glowing curbs */
    const yel = px.hsl(48, 90, 62);
    for (let z = z0 - (((z0 % 24) + 24) % 24); z < z1; z += 24) { g.ln(-1, z, 0, -1, z + 12, 0, yel); g.ln(1, z, 0, 1, z + 12, 0, yel); }
    const cy = px.hsl(185, 90, 60);
    for (const s of [-1, 1]) { g.ln(s * C.CURB, z0, 0, s * C.CURB, z1, 0, cy); g.ln(s * (C.CURB - 1), z0, 0, s * (C.CURB - 1), z1, 0, px.hsl(190, 80, 36)); }
    /* curb faces (a little height reads as depth) */
    g.pf([-C.CURB, z0, 0, -C.CURB, z1, 0, -C.CURB, z1, 2, -C.CURB, z0, 2], walk.b); g.ln(-C.CURB, z0, 2, -C.CURB, z1, 2, walk.e);
    /* world-locked grass texture: short blades in two tones */
    const gl = lawn.d, gd = lawn.b;
    for (let z = z0 - (((z0 % 6) + 6) % 6); z < z1; z += 6) {
      for (let k = 0; k < 5; k++) {
        const hs = g.hash((z | 0) * 9 + k), hx = g.hash((z | 0) * 5 + k * 77), s = k < 3 ? -1 : 1;
        const x = s * (C.SIDEW + 2 + hx * (s < 0 ? 240 : 170)), zz = z + hs * 6;
        if (s < 0 && x > -C.WALL - 70 && x < -C.WALL + 2) continue;
        g.pr(x, zz, 0); px.pix(g.X, g.Y, hs < 0.5 ? gl : gd); if (hs < 0.25) px.pix(g.X, g.Y - 1, gl);
      }
    }
  };
})((window.SGS = window.SGS || {}));
