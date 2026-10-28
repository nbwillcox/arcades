/* Zone 3 parallax: furnace sky with ash, volcano silhouettes streaked with lava, and a mid layer of smokestacks, girders and chains over a glowing lava river; 480x270, tiles horizontally. */
(function (G) {
  'use strict';
  const R = G.pal.ramps, F = R.furnace, E = R.ember, B = R.basalt, S = R.smoke;
  const mk = () => { const c = document.createElement('canvas'); c.width = 480; c.height = 270; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
  const rect = (x, col, px, py, w, h) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const rng = G.px.rng;
  const dither = (x, y0, y1, a, b) => { for (let y = y0; y < y1; y++) for (let px = 0; px < 480; px++) { x.fillStyle = (px + y) % 2 ? a : b; x.fillRect(px, y, 1, 1); } };
  function volcano(x, cx, base, hw, h, seed) {
    const r = rng(seed);
    for (let i = -hw; i <= hw; i++) {
      const t = 1 - Math.abs(i) / hw, top = Math.round(h * Math.pow(t, 0.8) * (0.94 + 0.06 * Math.sin(i * 0.9))), px = (cx + i + 480) % 480;
      rect(x, i < 0 ? B[2] : B[1], px, base - top, 1, top); if (i < 0) rect(x, B[3], px, base - top, 1, 1);
    }
    for (let k = 0; k < 7; k++) {   // lava streaks running down the flanks
      const side = r() < 0.5 ? -1 : 1, off = Math.round((0.15 + r() * 0.55) * hw) * side, len = 8 + Math.floor(r() * 26);
      const ty = base - Math.round(h * Math.pow(1 - Math.abs(off) / hw, 0.8));
      for (let y = 0; y < len; y++) { const px = (cx + off + Math.round(Math.sin(y * 0.5 + k) * 1.5) + 480) % 480; rect(x, y < 3 ? E[5] : y < len - 6 ? E[4] : E[3], px, ty + y, 1, 1); if (y % 3 === 0) rect(x, E[2], px + 1, ty + y, 1, 1); }
    }
    rect(x, E[4], (cx + 480 - 3) % 480, base - h, 6, 2); rect(x, E[5], (cx + 480 - 1) % 480, base - h - 1, 3, 1);
  }
  function far() {
    const [c, x] = mk(), r = rng(9);
    for (const b of [[0, 50, F[0]], [50, 100, F[1]], [100, 150, F[2]], [150, 200, F[3]], [200, 270, F[4]]]) rect(x, b[2], 0, b[0], 480, b[1] - b[0]);
    dither(x, 46, 54, F[0], F[1]); dither(x, 96, 104, F[1], F[2]); dither(x, 146, 154, F[2], F[3]); dither(x, 196, 204, F[3], F[4]);
    for (let i = 0; i < 70; i++) { x.fillStyle = r() < 0.3 ? S[1] : S[2]; x.fillRect(Math.floor(r() * 480), Math.floor(r() * 220), 1, 1); }   // drifting embers
    for (let k = 0; k < 5; k++) { const cx = 40 + k * 100, sx = 6 + k * 3; for (let y = 0; y < 90; y++) { const w = 10 + Math.floor(y * 0.35 + 4 * Math.sin(y * 0.15 + k)); x.fillStyle = y < 30 ? F[2] : F[1]; x.globalAlpha = 0.45; x.fillRect(cx - w / 2 + y * 0.2, 130 - y * 1.1, w, 2); } x.globalAlpha = 1; }  // smoke plumes
    volcano(x, 90, 214, 110, 112, 3); volcano(x, 290, 214, 130, 130, 5); volcano(x, 440, 214, 90, 84, 8);
    rect(x, F[4], 0, 214, 480, 56);
    for (let px = 0; px < 480; px++) { const y = 214 + Math.round(2 * Math.sin(px * 0.2)); rect(x, E[3], px, y, 1, 3); if (px % 5 < 2) rect(x, E[4], px, y, 1, 1); }
    rect(x, E[1], 0, 222, 480, 48); dither(x, 218, 226, E[2], E[1]);
    return c;
  }
  function mid() {
    const [c, x] = mk(), r = rng(21);
    for (const [sx, sh, sw] of [[40, 120, 16], [180, 96, 14], [320, 132, 18], [430, 104, 14]]) {   // smokestacks
      rect(x, B[1], sx, 232 - sh, sw, sh); rect(x, B[3], sx, 232 - sh, 3, sh); rect(x, B[0], sx + sw - 3, 232 - sh, 3, sh);
      rect(x, B[2], sx - 2, 232 - sh - 4, sw + 4, 5); rect(x, B[4], sx - 2, 232 - sh - 4, sw + 4, 1);
      for (let y = 232 - sh + 10; y < 224; y += 14) { rect(x, B[0], sx, y, sw, 2); rect(x, E[3], sx + 4, y + 4, 3, 2); }
      for (let k = 0; k < 4; k++) rect(x, F[3], sx + 2 + k * 2, 232 - sh - 14 - k * 6, 8, 4);
    }
    for (const [gx, gw, gy] of [[60, 120, 150], [200, 130, 170], [340, 110, 140]]) {                 // girder bridges + hanging chains
      rect(x, B[2], gx, gy, gw, 5); rect(x, B[4], gx, gy, gw, 1); for (let i = 0; i < gw; i += 8) { rect(x, B[1], gx + i, gy + 5, 2, 8 + (i % 16 ? 0 : 4)); }
      for (let i = 10; i < gw; i += 30) for (let k = 0; k < 26; k++) rect(x, k % 3 ? B[3] : B[1], gx + i, gy + 5 + k * 2, 2, 1);
    }
    rect(x, B[0], 0, 230, 480, 40);
    for (let px = 0; px < 480; px += 6) { const h = 2 + Math.floor(r() * 5); rect(x, B[2], px, 230 - h, 5, h); rect(x, B[3], px, 230 - h, 5, 1); }
    for (let px = 0; px < 480; px += 3) { rect(x, E[2], px, 242 + Math.round(Math.sin(px * 0.3)), 2, 1); if (px % 12 === 0) rect(x, E[4], px, 244, 2, 1); }
    return c;
  }
  G.art.buildZone3Bg = function () { return { far: far(), mid: mid() }; };
})((window.SGS = window.SGS || {}));
