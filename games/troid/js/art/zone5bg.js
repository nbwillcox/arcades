/* Zone 5 parallax: a throbbing organic cavern. Far: magenta gradient, rib arches, veins and glowing sacs; mid: hanging tendrils, spore stalks and bone-like pillars; 480x270, tiles horizontally. */
(function (G) {
  'use strict';
  const R = G.pal.ramps, F = R.hivefog, C = R.chitin, B = R.biogreen, L = R.hivelight;
  const mk = () => { const c = document.createElement('canvas'); c.width = 480; c.height = 270; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
  const rect = (x, col, px, py, w, h) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const rng = G.px.rng;
  const dither = (x, y0, y1, a, b) => { for (let y = y0; y < y1; y++) for (let px = 0; px < 480; px++) { x.fillStyle = (px + y) % 2 ? a : b; x.fillRect(px, y, 1, 1); } };
  function disc(x, cx, cy, r, col) { x.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + 0.5)); x.fillRect(cx - w, cy + y, 2 * w + 1, 1); } }
  function far() {
    const [c, x] = mk(), r = rng(13);
    for (const b of [[0, 50, F[0]], [50, 100, F[1]], [100, 150, F[2]], [150, 200, F[3]], [200, 270, F[4]]]) rect(x, b[2], 0, b[0], 480, b[1] - b[0]);
    dither(x, 46, 54, F[0], F[1]); dither(x, 96, 104, F[1], F[2]); dither(x, 146, 154, F[2], F[3]); dither(x, 196, 204, F[3], F[4]);
    for (let k = 0; k < 6; k++) {                                   // rib arches
      const cx = 40 + k * 80, w = 56;
      for (let y = 0; y < 200; y++) { const t = y / 200, off = Math.round(w * (1 - Math.cos(t * Math.PI / 2))); rect(x, C[2], cx - w + off, y, 4, 1); rect(x, C[2], cx + w - off - 4, y, 4, 1); rect(x, C[3], cx - w + off, y, 1, 1); rect(x, C[3], cx + w - off - 4, y, 1, 1); }
    }
    for (let i = 0; i < 24; i++) { const sx = Math.floor(r() * 480), sy = 120 + Math.floor(r() * 80), rr = 3 + Math.floor(r() * 5); disc(x, sx, sy, rr, F[5]); disc(x, sx - 1, sy - 1, Math.max(1, rr - 2), L[1]); rect(x, L[0], sx - 1, sy - 2, 1, 1); }   // glowing sacs
    for (let i = 0; i < 80; i++) { x.fillStyle = r() < 0.4 ? B[3] : L[1]; x.globalAlpha = 0.5 + r() * 0.4; x.fillRect(Math.floor(r() * 480), Math.floor(r() * 230), 1, 1); } x.globalAlpha = 1;
    rect(x, F[4], 0, 212, 480, 58);
    return c;
  }
  function mid() {
    const [c, x] = mk(), r = rng(29);
    for (let px = 0; px < 480; px += 28) {                          // hanging tendrils
      const len = 40 + Math.floor(r() * 90);
      for (let y = 0; y < len; y++) { const sw = Math.round(Math.sin(y * 0.09 + px) * 3); rect(x, y < len - 6 ? C[1] : C[3], px + sw, y, 4 - Math.floor(y / (len / 3)), 1); }
      disc(x, px + Math.round(Math.sin(len * 0.09 + px) * 3) + 1, len, 3, B[3]); rect(x, B[5], px + Math.round(Math.sin(len * 0.09 + px) * 3), len - 2, 1, 1);
    }
    for (const [sx, sh] of [[50, 90], [170, 120], [300, 100], [420, 130]]) { rect(x, C[1], sx, 232 - sh, 12, sh); rect(x, C[3], sx, 232 - sh, 2, sh); rect(x, C[0], sx + 9, 232 - sh, 3, sh); disc(x, sx + 6, 232 - sh, 8, C[2]); disc(x, sx + 4, 232 - sh - 2, 3, C[4]); }
    rect(x, C[0], 0, 230, 480, 40);
    for (let px = 0; px < 480; px += 4) { const h = 3 + Math.floor(r() * 8); for (let k = 0; k < h; k++) rect(x, k > h - 3 ? B[4] : B[1], px, 230 - k, 2, 1); if (px % 16 === 0) disc(x, px + 1, 230 - h - 2, 2, L[1]); }
    return c;
  }
  G.art.buildZone5Bg = function () { return { far: far(), mid: mid() }; };
})((window.SGS = window.SGS || {}));
