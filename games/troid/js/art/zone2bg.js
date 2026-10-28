/* Zone 2 parallax: aurora night sky with stars, far ice peaks, near jagged ridges and frozen spires; 480x270 layers that tile horizontally. */
(function (G) {
  'use strict';
  const R = G.pal.ramps, F = R.aurora, L = R.auroralight, S = R.icestone, N = R.snow;
  const mk = () => { const c = document.createElement('canvas'); c.width = 480; c.height = 270; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
  const rect = (x, col, px, py, w, h) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const rng = G.px.rng;
  const dither = (x, y0, y1, a, b) => { for (let y = y0; y < y1; y++) for (let px = 0; px < 480; px++) { x.fillStyle = (px + y) % 2 ? a : b; x.fillRect(px, y, 1, 1); } };
  /* jagged mountain: triangle peaks defined by [x, halfWidth, height]; lit left slope, shadowed right slope, snow cap */
  function peak(x, px, base, hw, h, body, lit, shade, snow) {
    for (let i = -hw; i <= hw; i++) {
      const t = 1 - Math.abs(i) / hw, top = Math.round(h * t * (0.9 + 0.1 * Math.sin(i * 0.7))), cx = px + i;
      for (let y = 0; y < top; y++) { const yy = base - top + y; x.fillStyle = i < 0 ? (y < top * 0.35 && snow ? snow : lit) : (y < top * 0.3 && snow ? shade : body); x.fillRect((cx + 480) % 480, yy, 1, 1); }
      x.fillStyle = i < 0 ? lit : shade; x.fillRect((cx + 480) % 480, base - top, 1, 1);
    }
  }
  function far() {
    const [c, x] = mk(), r = rng(77);
    for (const b of [[0, 40, F[0]], [40, 90, F[1]], [90, 140, F[2]], [140, 190, F[3]], [190, 270, F[4]]]) rect(x, b[2], 0, b[0], 480, b[1] - b[0]);
    dither(x, 36, 44, F[0], F[1]); dither(x, 86, 94, F[1], F[2]); dither(x, 136, 144, F[2], F[3]); dither(x, 186, 194, F[3], F[4]);
    for (let i = 0; i < 90; i++) { const sx = Math.floor(r() * 480), sy = Math.floor(r() * 120); x.fillStyle = r() < 0.2 ? '#ffffff' : '#9ccae6'; x.fillRect(sx, sy, 1, 1); }
    /* aurora ribbons: stepped sine bands of light green over violet, dithered at the edges */
    for (let px = 0; px < 480; px++) {
      const y1 = 40 + Math.round(18 * Math.sin(px * 0.021) + 8 * Math.sin(px * 0.057 + 1)), th = 14 + Math.round(6 * Math.sin(px * 0.033));
      for (let k = 0; k < th; k++) { const yy = y1 + k; x.fillStyle = k < 3 ? L[2] : k < th - 4 ? L[1] : L[0]; if (k < 2 || k > th - 3) { if ((px + yy) % 2) continue; } x.fillRect(px, yy, 1, 1); }
      const y2 = 66 + Math.round(10 * Math.sin(px * 0.017 + 2)); for (let k = 0; k < 8; k++) { if ((px + k) % 2) continue; x.fillStyle = k < 3 ? L[2] : L[1]; x.fillRect(px, y2 + k, 1, 1); }
    }
    for (const [px, hw, h] of [[40, 70, 70], [150, 90, 96], [270, 80, 82], [380, 100, 104], [470, 60, 60]]) peak(x, px, 200, hw, h, F[3], S[3], F[2], N[4]);
    rect(x, F[4], 0, 200, 480, 70); dither(x, 196, 204, F[3], F[4]);
    return c;
  }
  function mid() {
    const [c, x] = mk(), r = rng(31);
    for (const [px, hw, h] of [[20, 50, 56], [100, 60, 70], [200, 44, 52], [300, 64, 76], [410, 54, 60]]) peak(x, px, 238, hw, h, S[1], S[3], S[0], N[3]);
    for (const [sx, sh] of [[60, 92], [170, 74], [260, 100], [350, 84], [450, 70]]) {   // frozen spires
      rect(x, S[1], sx, 238 - sh, 9, sh); rect(x, S[3], sx, 238 - sh, 2, sh); rect(x, S[0], sx + 7, 238 - sh, 2, sh);
      for (let k = 0; k < 6; k++) rect(x, k % 2 ? N[5] : N[4], sx + 2 + k, 238 - sh - k, 5 - k > 0 ? 5 - k : 1, 1);
      rect(x, N[3], sx - 2, 238 - 6, 13, 6);
    }
    rect(x, S[0], 0, 236, 480, 34);
    for (let px = 0; px < 480; px += 4) { const h = 2 + Math.floor(r() * 4); rect(x, N[3], px, 236 - h, 3, h); rect(x, N[5], px, 236 - h, 1, 1); }
    return c;
  }
  G.art.buildZone2Bg = function () { return { far: far(), mid: mid() }; };
})((window.SGS = window.SGS || {}));
