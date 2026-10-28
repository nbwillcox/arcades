/* Zone 4 parallax: deep-sea gradient with light shafts and drifting plankton, distant reactor domes, then a mid layer of pipes, grates and anemone silhouettes; 480x270, tiles horizontally. */
(function (G) {
  'use strict';
  const R = G.pal.ramps, F = R.deepsea, C = R.coolant, S = R.reactor, L = R.biolight;
  const mk = () => { const c = document.createElement('canvas'); c.width = 480; c.height = 270; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
  const rect = (x, col, px, py, w, h) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const rng = G.px.rng;
  const dither = (x, y0, y1, a, b) => { for (let y = y0; y < y1; y++) for (let px = 0; px < 480; px++) { x.fillStyle = (px + y) % 2 ? a : b; x.fillRect(px, y, 1, 1); } };
  function far() {
    const [c, x] = mk(), r = rng(5);
    for (const b of [[0, 55, F[0]], [55, 105, F[1]], [105, 155, F[2]], [155, 205, F[3]], [205, 270, F[4]]]) rect(x, b[2], 0, b[0], 480, b[1] - b[0]);
    dither(x, 51, 59, F[0], F[1]); dither(x, 101, 109, F[1], F[2]); dither(x, 151, 159, F[2], F[3]); dither(x, 201, 209, F[3], F[4]);
    for (let k = 0; k < 6; k++) { const sx = 30 + k * 82, w = 26 + (k % 3) * 8; for (let y = 0; y < 200; y++) { x.globalAlpha = 0.1 * (1 - y / 220); x.fillStyle = L[0]; x.fillRect(sx + y * 0.25 - (k % 2) * y * 0.5, y, w - y * 0.06, 1); } } x.globalAlpha = 1;
    for (let i = 0; i < 90; i++) { x.fillStyle = r() < 0.25 ? L[0] : L[1]; x.globalAlpha = 0.5 + r() * 0.4; x.fillRect(Math.floor(r() * 480), Math.floor(r() * 250), 1, 1); } x.globalAlpha = 1;
    for (const [dx, dw, dh] of [[70, 90, 66], [260, 120, 84], [420, 70, 50]]) {
      for (let i = -dw / 2; i <= dw / 2; i++) { const t = Math.sqrt(1 - Math.pow(i / (dw / 2), 2)), top = Math.round(dh * t); rect(x, i < 0 ? S[3] : S[2], (dx + i + 480) % 480, 205 - top, 1, top); if (i < 0) rect(x, S[4], (dx + i + 480) % 480, 205 - top, 1, 1); }
      for (let k = -2; k <= 2; k++) rect(x, C[3], dx + k * 14, 205 - Math.round(dh * 0.55), 3, 2);
      rect(x, S[1], dx - dw / 2, 205, dw, 8);
    }
    rect(x, F[4], 0, 212, 480, 58);
    return c;
  }
  function mid() {
    const [c, x] = mk(), r = rng(17);
    for (const [px, h] of [[30, 150], [150, 120], [270, 160], [390, 130]]) {
      rect(x, S[1], px, 232 - h, 14, h); rect(x, S[3], px, 232 - h, 3, h); rect(x, S[0], px + 11, 232 - h, 3, h);
      for (let y = 232 - h + 8; y < 226; y += 18) { rect(x, S[2], px - 2, y, 18, 4); rect(x, S[4], px - 2, y, 18, 1); rect(x, C[3], px + 5, y + 1, 4, 2); }
    }
    for (const [gy, gx, gw] of [[120, 20, 150], [170, 220, 180], [96, 330, 140]]) { rect(x, S[2], gx, gy, gw, 5); rect(x, S[4], gx, gy, gw, 1); for (let i = 0; i < gw; i += 10) rect(x, S[1], gx + i, gy + 5, 3, 6); }
    rect(x, S[0], 0, 230, 480, 40);
    for (let px = 0; px < 480; px += 5) { const h = 4 + Math.floor(r() * 9); for (let k = 0; k < h; k++) { const sw = Math.round(Math.sin(k * 0.6 + px * 0.1) * 1.4); rect(x, k < h - 2 ? C[1] : C[3], px + sw, 230 - k, 2, 1); } }
    return c;
  }
  G.art.buildZone4Bg = function () { return { far: far(), mid: mid() }; };
})((window.SGS = window.SGS || {}));
