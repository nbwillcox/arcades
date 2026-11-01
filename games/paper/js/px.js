/* Software pixel renderer: a 480x270 framebuffer with no anti-aliasing (polygons, ellipses, lines, dither patterns, a 5x7 bitmap font). The canvas shows it scaled up with nearest-neighbour. */
(function (G) {
  'use strict';
  const px = { W: 480, H: 270 };
  const W = px.W, H = px.H;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'), img = cx.createImageData(W, H), buf = new Uint32Array(img.data.buffer);
  px.cv = cv; px.buf = buf;
  px.flush = () => cx.putImageData(img, 0, 0);

  /* ---- colour ---- */
  const cache = new Map();
  const pack = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  px.rgb = pack;
  px.hsl = function (h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)); l = Math.max(0, Math.min(100, l));
    const k = ((h | 0) * 10000 + (s | 0) * 100 + (l | 0)) | 0; let v = cache.get(k); if (v !== undefined) return v;
    const S = s / 100, L = l / 100, a = S * Math.min(L, 1 - L), f = (n) => { const kk = (n + h / 30) % 12; return L - a * Math.max(-1, Math.min(kk - 3, 9 - kk, 1)); };
    v = pack(Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)); cache.set(k, v); return v;
  };
  px.mix = function (a, b, t) { const ar = a & 255, ag = (a >> 8) & 255, ab = (a >> 16) & 255, br = b & 255, bg = (b >> 8) & 255, bb = (b >> 16) & 255; return pack((ar + (br - ar) * t) | 0, (ag + (bg - ag) * t) | 0, (ab + (bb - ab) * t) | 0); };
  const rc = new Map();
  /* five-tone ramp with hue shift: a = outline, b = shadow, c = base, d = light, e = highlight */
  px.ramp = function (h, s, l) {
    const k = ((h | 0) + 360) * 100000 + (s | 0) * 1000 + (l | 0); let r = rc.get(k); if (r) return r;
    r = { a: px.hsl(h - 16, s + 10, l * 0.34), b: px.hsl(h - 9, s + 4, l * 0.64), c: px.hsl(h, s, l), d: px.hsl(h + 7, s - 4, l + 13), e: px.hsl(h + 14, s - 16, l + 28) };
    rc.set(k, r); return r;
  };
  px.clear = (c) => buf.fill(c);
  px.pix = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && x < W && y >= 0 && y < H) buf[y * W + x] = c; };
  px.get = (x, y) => buf[y * W + x];
  px.rect = function (x, y, w, h, c) { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h); for (let j = Math.max(0, y); j < y1; j++) for (let i = Math.max(0, x); i < x1; i++) buf[j * W + i] = c; };

  /* ---- polygon fill (flat points [x,y,x,y...], pixel centres, optional dither) ---- */
  const xs = new Float64Array(64);
  const PAT = [null, (x, y) => ((x + y) & 1) === 0, (x, y) => (y & 1) === 0, (x, y) => ((x & 1) === 0 && (y & 1) === 0), (x, y) => !((x & 1) === 0 && (y & 1) === 0), (x, y) => (x & 1) === 0];
  px.poly = function (p, c, c2, pat) {
    const n = p.length >> 1; let y0 = 1e9, y1 = -1e9;
    for (let i = 1; i < p.length; i += 2) { if (p[i] < y0) y0 = p[i]; if (p[i] > y1) y1 = p[i]; }
    const ya = Math.max(0, Math.ceil(y0 - 0.5)), yb = Math.min(H - 1, Math.floor(y1 - 0.5)), pf = pat ? PAT[pat] : null;
    for (let y = ya; y <= yb; y++) {
      const yc = y + 0.5; let m = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, ax = p[i * 2], ay = p[i * 2 + 1], bx = p[j * 2], by = p[j * 2 + 1];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) { const x = ax + (yc - ay) * (bx - ax) / (by - ay); let k = m++; while (k > 0 && xs[k - 1] > x) { xs[k] = xs[k - 1]; k--; } xs[k] = x; }
      }
      for (let k = 0; k + 1 < m; k += 2) {
        const xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(W - 1, Math.ceil(xs[k + 1] - 0.5) - 1), row = y * W;
        if (!pf) for (let x = xa; x <= xb; x++) buf[row + x] = c; else for (let x = xa; x <= xb; x++) buf[row + x] = pf(x, y) ? c2 : c;
      }
    }
  };
  px.line = function (x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy, guard = 0;
    for (;;) { if (x0 >= 0 && x0 < W && y0 >= 0 && y0 < H) buf[y0 * W + x0] = c; if ((x0 === x1 && y0 === y1) || guard++ > 900) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  };
  px.outline = function (p, c) { const n = p.length >> 1; for (let i = 0; i < n; i++) { const j = (i + 1) % n; px.line(p[i * 2], p[i * 2 + 1], p[j * 2], p[j * 2 + 1], c); } };
  px.ell = function (cxx, cyy, rx, ry, c, c2, pat) {
    const y0 = Math.max(0, Math.ceil(cyy - ry - 0.5)), y1 = Math.min(H - 1, Math.floor(cyy + ry - 0.5)), pf = pat ? PAT[pat] : null;
    for (let y = y0; y <= y1; y++) {
      const t = (y + 0.5 - cyy) / ry; if (t * t > 1) continue; const d = rx * Math.sqrt(1 - t * t);
      const xa = Math.max(0, Math.ceil(cxx - d - 0.5)), xb = Math.min(W - 1, Math.ceil(cxx + d - 0.5) - 1), row = y * W;
      if (!pf) for (let x = xa; x <= xb; x++) buf[row + x] = c; else for (let x = xa; x <= xb; x++) buf[row + x] = pf(x, y) ? c2 : c;
    }
  };
  /* outlined ellipse: outline colour o, fill c */
  px.ellO = function (cxx, cyy, rx, ry, c, o) { px.ell(cxx, cyy, rx + 1, ry + 1, o); px.ell(cxx, cyy, rx, ry, c); };
  px.ring = function (cxx, cyy, rx, ry, c, pat) {
    const y0 = Math.max(0, Math.ceil(cyy - ry - 0.5)), y1 = Math.min(H - 1, Math.floor(cyy + ry - 0.5)), pf = pat ? PAT[pat] : null;
    for (let y = y0; y <= y1; y++) {
      const t = (y + 0.5 - cyy) / ry; if (t * t > 1) continue; const d = rx * Math.sqrt(1 - t * t);
      const ti = (y + 0.5 - cyy) / Math.max(0.5, ry - 1), di = ti * ti < 1 ? (rx - 1) * Math.sqrt(1 - ti * ti) : -1;
      const xa = Math.ceil(cxx - d - 0.5), xb = Math.ceil(cxx + d - 0.5) - 1, row = y * W;
      for (let x = Math.max(0, xa); x <= Math.min(W - 1, xb); x++) { if (di > 0 && Math.abs(x + 0.5 - cxx) < di) continue; if (!pf || pf(x, y)) buf[row + x] = c; }
    }
  };


  /* ---- blending helpers (shadows, glows, beams) ---- */
  const darkPix = (i, k) => { const c = buf[i]; buf[i] = (4278190080 | (((((c >> 16) & 255) * k) | 0) << 16) | (((((c >> 8) & 255) * k) | 0) << 8) | (((c & 255) * k) | 0)) >>> 0; };
  px.darkEll = function (cxx, cyy, rx, ry, k, pat) {
    const y0 = Math.max(0, Math.ceil(cyy - ry - 0.5)), y1 = Math.min(H - 1, Math.floor(cyy + ry - 0.5)), pf = pat ? PAT[pat] : null;
    for (let y = y0; y <= y1; y++) { const t = (y + 0.5 - cyy) / ry; if (t * t > 1) continue; const d = rx * Math.sqrt(1 - t * t); for (let x = Math.max(0, Math.ceil(cxx - d - 0.5)); x <= Math.min(W - 1, Math.ceil(cxx + d - 0.5) - 1); x++) if (!pf || pf(x, y)) darkPix(y * W + x, k); }
  };
  px.blendEll = function (cxx, cyy, rx, ry, c, a) {
    const y0 = Math.max(0, Math.ceil(cyy - ry - 0.5)), y1 = Math.min(H - 1, Math.floor(cyy + ry - 0.5));
    for (let y = y0; y <= y1; y++) { const t = (y + 0.5 - cyy) / ry; if (t * t > 1) continue; const d = rx * Math.sqrt(1 - t * t); for (let x = Math.max(0, Math.ceil(cxx - d - 0.5)); x <= Math.min(W - 1, Math.ceil(cxx + d - 0.5) - 1); x++) buf[y * W + x] = px.mix(buf[y * W + x], c, a); }
  };
  px.blendPoly = function (p, c, a, pat) {
    const n = p.length >> 1; let y0 = 1e9, y1 = -1e9; for (let i = 1; i < p.length; i += 2) { if (p[i] < y0) y0 = p[i]; if (p[i] > y1) y1 = p[i]; }
    const ya = Math.max(0, Math.ceil(y0 - 0.5)), yb = Math.min(H - 1, Math.floor(y1 - 0.5)), pf = pat ? PAT[pat] : null;
    for (let y = ya; y <= yb; y++) {
      const yc = y + 0.5; let m = 0;
      for (let i = 0; i < n; i++) { const j = (i + 1) % n, ax = p[i * 2], ay = p[i * 2 + 1], bx = p[j * 2], by = p[j * 2 + 1]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) { const x = ax + (yc - ay) * (bx - ax) / (by - ay); let k = m++; while (k > 0 && xs[k - 1] > x) { xs[k] = xs[k - 1]; k--; } xs[k] = x; } }
      for (let k = 0; k + 1 < m; k += 2) for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(W - 1, Math.ceil(xs[k + 1] - 0.5) - 1); x++) if (!pf || pf(x, y)) buf[y * W + x] = px.mix(buf[y * W + x], c, a);
    }
  };

  px.dim = function (k, target) {
    const t = target || 0, o = (1 - k) * t, n = buf.length;
    for (let i = 0; i < n; i++) { const c = buf[i]; buf[i] = (4278190080 | ((((c >> 16) & 255) * k + o) << 16) | ((((c >> 8) & 255) * k + o) << 8) | (((c & 255) * k + o) | 0)) >>> 0; }
  };
  /* vignette: darkens the corners so the eye goes to the middle of the screen (where the rider is) */
  let vig = null;
  px.vignette = function (cx0, cy0, strength) {
    if (!vig || vig.cx !== cx0) { vig = new Float32Array(W * H); vig.cx = cx0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = (x - cx0) / (W * 0.62), dy = (y - cy0) / (H * 0.62), d = Math.max(0, Math.sqrt(dx * dx + dy * dy) - 0.45); vig[y * W + x] = Math.max(0, 1 - d * d * strength); } }
    for (let i = 0; i < buf.length; i++) { const k = vig[i]; if (k > 0.995) continue; const c = buf[i]; buf[i] = (4278190080 | ((((c >> 16) & 255) * k) << 16) | ((((c >> 8) & 255) * k) << 8) | (((c & 255) * k) | 0)) >>> 0; }
  };
  /* ---- bitmap font 5x7 ---- */
  const F = {
    A: '01110,10001,10001,11111,10001,10001,10001', B: '11110,10001,10001,11110,10001,10001,11110', C: '01110,10001,10000,10000,10000,10001,01110', D: '11110,10001,10001,10001,10001,10001,11110',
    E: '11111,10000,10000,11110,10000,10000,11111', F: '11111,10000,10000,11110,10000,10000,10000', G: '01110,10001,10000,10111,10001,10001,01111', H: '10001,10001,10001,11111,10001,10001,10001',
    I: '01110,00100,00100,00100,00100,00100,01110', J: '00111,00010,00010,00010,00010,10010,01100', K: '10001,10010,10100,11000,10100,10010,10001', L: '10000,10000,10000,10000,10000,10000,11111',
    M: '10001,11011,10101,10101,10001,10001,10001', N: '10001,11001,10101,10011,10001,10001,10001', O: '01110,10001,10001,10001,10001,10001,01110', P: '11110,10001,10001,11110,10000,10000,10000',
    Q: '01110,10001,10001,10001,10101,10010,01101', R: '11110,10001,10001,11110,10100,10010,10001', S: '01111,10000,10000,01110,00001,00001,11110', T: '11111,00100,00100,00100,00100,00100,00100',
    U: '10001,10001,10001,10001,10001,10001,01110', V: '10001,10001,10001,10001,10001,01010,00100', W: '10001,10001,10001,10101,10101,11011,10001', X: '10001,10001,01010,00100,01010,10001,10001',
    Y: '10001,10001,01010,00100,00100,00100,00100', Z: '11111,00001,00010,00100,01000,10000,11111',
    0: '01110,10001,10011,10101,11001,10001,01110', 1: '00100,01100,00100,00100,00100,00100,01110', 2: '01110,10001,00001,00010,00100,01000,11111', 3: '11110,00001,00001,01110,00001,00001,11110',
    4: '00010,00110,01010,10010,11111,00010,00010', 5: '11111,10000,11110,00001,00001,10001,01110', 6: '00110,01000,10000,11110,10001,10001,01110', 7: '11111,00001,00010,00100,01000,01000,01000',
    8: '01110,10001,10001,01110,10001,10001,01110', 9: '01110,10001,10001,01111,00001,00010,01100',
    '!': '00100,00100,00100,00100,00100,00000,00100', '?': '01110,10001,00001,00110,00100,00000,00100', '+': '00000,00100,00100,11111,00100,00100,00000', '-': '00000,00000,00000,11111,00000,00000,00000',
    '.': '00000,00000,00000,00000,00000,01100,01100', ',': '00000,00000,00000,00000,01100,00100,01000', ':': '00000,01100,01100,00000,01100,01100,00000', "'": '00100,00100,01000,00000,00000,00000,00000',
    '/': '00001,00010,00010,00100,01000,01000,10000', '(': '00010,00100,01000,01000,01000,00100,00010', ')': '01000,00100,00010,00010,00010,00100,01000', '%': '11001,11010,00010,00100,01000,01011,10011',
    '*': '00100,10101,01110,11111,01110,10101,00100', '#': '01010,01010,11111,01010,11111,01010,01010', '=': '00000,00000,11111,00000,11111,00000,00000', '<': '00010,00100,01000,10000,01000,00100,00010', '>': '01000,00100,00010,00001,00010,00100,01000',
    '"': '01010,01010,00000,00000,00000,00000,00000', '^': '00000,00001,00011,10110,01100,00100,00000', '~': '00000,10001,01010,00100,01010,10001,00000', '@': '00000,01010,10101,10101,01010,00000,00000', '&': '01100,10010,10100,01000,10101,10010,01101', '★': '00100,00100,11111,01110,01110,10001,10001',
  };
  const G5 = {};
  for (const k in F) G5[k] = F[k].split(',').map((r) => parseInt(r, 2));
  px.textW = (s, sc) => s.length * 6 * (sc || 1) - (sc || 1);
  px.text = function (s, x, y, sc, c, align, outline) {
    sc = sc || 1; s = String(s).toUpperCase(); const w = px.textW(s, sc);
    x = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x); y = Math.round(y);
    const draw = (ox, oy, col) => {
      for (let i = 0; i < s.length; i++) { const g = G5[s[i]]; if (!g) continue; const gx = x + ox + i * 6 * sc; for (let r = 0; r < 7; r++) { const bits = g[r]; if (!bits) continue; for (let b = 0; b < 5; b++) if (bits & (16 >> b)) px.rect(gx + b * sc, y + oy + r * sc, sc, sc, col); } }
    };
    if (outline) { for (const o of [[-sc, 0], [sc, 0], [0, -sc], [0, sc], [-sc, -sc], [sc, sc], [-sc, sc], [sc, -sc]]) draw(o[0], o[1], outline); }
    draw(0, 0, c);
  };
  /* image (pixelated) blit with optional alpha key */
  px.blit = function (im, dx, dy, dw, dh) { cx.imageSmoothingEnabled = false; px.flush(); cx.drawImage(im, dx, dy, dw, dh); const d = cx.getImageData(0, 0, W, H); buf.set(new Uint32Array(d.data.buffer)); };
  G.px = px;
})((window.SGS = window.SGS || {}));
