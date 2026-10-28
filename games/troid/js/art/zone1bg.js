/* Zone 1 parallax layers, composed from hand-placed silhouette lists (broken towers, arches, trees) and a banded dusk sky; every layer is 480x270 and tiles horizontally. */
(function (G) {
  'use strict';
  const R = G.pal.ramps, F = R.fog, D = R.dusk, M = R.moss, S = R.stone;
  const mk = () => { const c = document.createElement('canvas'); c.width = 480; c.height = 270; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
  const rect = (x, col, px, py, w, h) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const disc = (x, cx, cy, r, col) => { x.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + 0.5)); x.fillRect(cx - w, cy + y, 2 * w + 1, 1); } };
  const wrap = (px, fn) => { fn(px); if (px < 90) fn(px + 480); if (px > 390) fn(px - 480); };
  const dither = (x, y0, y1, a, b) => { for (let y = y0; y < y1; y++) for (let px = 0; px < 480; px++) { x.fillStyle = (px + y) % 2 ? a : b; x.fillRect(px, y, 1, 1); } };
  /* column-profile silhouette: heights[i] for every `step` px from x0, drawn as one fill, rim-lit on the left slope */
  const ridge = (x, x0, step, hs, base, col, rim) => { for (let i = 0; i < hs.length; i++) { const px = x0 + i * step; rect(x, col, px, base - hs[i], step, hs[i]); if (rim && (i === 0 || hs[i] > hs[i - 1])) rect(x, rim, px, base - hs[i], 1, Math.min(hs[i], 6)); } };

  function far() {
    const [c, x] = mk();
    for (const b of [[0, 46, F[0]], [46, 84, F[1]], [84, 118, F[2]], [118, 146, F[3]], [146, 270, F[4]]]) rect(x, b[2], 0, b[0], 480, b[1] - b[0]);
    dither(x, 42, 50, F[0], F[1]); dither(x, 80, 88, F[1], F[2]); dither(x, 114, 122, F[2], F[3]); dither(x, 142, 150, F[3], F[4]);
    dither(x, 156, 168, F[4], D[2]); rect(x, D[2], 0, 168, 480, 4); rect(x, D[1], 0, 172, 480, 4); rect(x, D[0], 0, 176, 480, 94);
    disc(x, 318, 138, 30, F[4]); disc(x, 318, 138, 24, D[2]); disc(x, 318, 138, 19, D[1]); disc(x, 318, 138, 14, D[0]);
    /* far mountain ridge in sky-blue haze */
    ridge(x, 0, 6, [18, 22, 27, 25, 31, 36, 33, 30, 38, 44, 41, 37, 33, 36, 42, 48, 45, 40, 34, 30, 28, 33, 39, 43, 40, 35, 31, 34, 40, 46, 50, 47, 41, 36, 32, 27, 24, 29, 35, 38, 34, 29, 25, 22, 26, 31, 34, 30, 26, 22, 20, 24, 28, 31, 27, 23, 21, 25, 29, 32, 28, 24, 21, 19, 22, 26, 30, 27, 23, 20, 18, 21, 25, 29, 26, 22, 19, 17, 20, 24], 176, F[3], D[1]);
    /* broken ancient towers: tapering stepped shafts, snapped tops, a few glowing slits, ivy near the base */
    const towers = [[22, 16, 74, 0], [58, 10, 44, 1], [96, 20, 98, 2], [128, 9, 36, 0], [168, 13, 60, 1], [222, 22, 86, 2], [262, 9, 42, 0], [392, 18, 70, 1], [424, 11, 104, 2], [452, 13, 54, 0]];
    for (const [tx, tw, th, k] of towers) wrap(tx, (px) => {
      const top = 178 - th;
      rect(x, F[2], px, top, tw, th); rect(x, F[1], px + tw - 3, top, 3, th); rect(x, D[1], px, top, 1, th);
      rect(x, F[2], px - 2, 178 - 8, tw + 4, 8); rect(x, D[1], px - 2, 170, 1, 8);
      if (k === 0) { rect(x, F[3], px + 1, top - 5, tw - 4, 5); rect(x, F[3], px + 4, top - 8, 4, 3); }
      if (k === 1) { for (let s = 0; s < 6; s++) rect(x, F[3], px + s * 2, top - 1 - s, tw - s * 2 - 2, 1); }
      if (k === 2) { rect(x, F[2], px + 3, top - 7, tw - 8, 7); rect(x, F[3], px + 5, top - 12, 3, 5); rect(x, F[0], px + 6, top + 14, 2, 8); rect(x, D[0], px + 6, top + 16, 2, 4); rect(x, F[0], px + tw - 8, top + 36, 2, 6); }
      rect(x, M[1], px, 166, tw, 4); rect(x, M[2], px + 2, 164, 2, 3); rect(x, M[1], px + tw - 5, 162, 2, 5);
    });
    rect(x, F[2], 0, 178, 480, 92); dither(x, 174, 182, F[2], D[0]);
    rect(x, F[1], 0, 200, 480, 70); dither(x, 194, 202, F[2], F[1]);
    return c;
  }

  /* clustered canopy: each tree is a hand-set list of (dx, dy, r) leaf masses; darkest underlay, mid body, lit tops on the upper left */
  const CANOPY = [
    [[0, 0, 22], [-20, 10, 15], [19, 11, 14], [-6, -17, 13], [12, -12, 11], [-27, -2, 9], [28, 2, 9]],
    [[0, 0, 26], [-24, 12, 16], [24, 14, 15], [-10, -20, 14], [14, -16, 12], [-32, 0, 10]],
    [[0, 0, 19], [-17, 9, 13], [17, 9, 12], [2, -15, 11], [-26, 2, 8]],
  ];
  function canopy(x, cx, cy, set) {
    for (const [dx, dy, r] of set) disc(x, cx + dx, cy + dy, r, M[0]);
    for (const [dx, dy, r] of set) disc(x, cx + dx - 1, cy + dy - 1, r - 3, M[1]);
    for (const [dx, dy, r] of set) if (r > 9) { disc(x, cx + dx - 3, cy + dy - 4, Math.floor(r * 0.55), M[2]); }
    for (const [dx, dy, r] of set) if (r > 11) { rect(x, M[3], cx + dx - 7, cy + dy - r + 3, 5, 2); rect(x, M[3], cx + dx - 3, cy + dy - r + 1, 3, 1); rect(x, M[4], cx + dx - 6, cy + dy - r + 3, 2, 1); }
    /* ragged underside + hanging strands */
    for (const [dx, dy, r] of set) if (dy > 5) for (let k = -r + 4; k < r - 2; k += 5) { rect(x, M[0], cx + dx + k, cy + dy + r - 1, 2, 3 + ((k + r) % 4)); }
  }

  function mid() {
    const [c, x] = mk();
    /* ruined arches: pillars with a broken lintel, rim-lit stone and moss on the cap */
    for (const [ax, aw, ah] of [[26, 74, 64], [196, 96, 84], [360, 70, 56]]) wrap(ax, (px) => {
      const base = 226, top = base - ah;
      rect(x, S[1], px, top, 11, ah); rect(x, S[1], px + aw - 11, top, 11, ah); rect(x, S[2], px, top, 2, ah); rect(x, S[2], px + aw - 11, top, 2, ah); rect(x, S[0], px + 9, top, 2, ah); rect(x, S[0], px + aw - 2, top, 2, ah);
      rect(x, S[1], px - 4, top - 7, aw + 8, 9); rect(x, S[2], px - 4, top - 7, aw + 8, 2); rect(x, S[0], px - 4, top + 1, aw + 8, 1);
      rect(x, S[1], px + 11, top + 9, aw - 22, 4);
      for (let k = 0; k < aw - 24; k += 7) rect(x, S[1], px + 12 + k, top + 13, 4, 2 + ((k / 7) % 3));
      rect(x, S[1], px - 6, base - 6, 15, 6); rect(x, S[1], px + aw - 9, base - 6, 15, 6);
      rect(x, M[1], px - 2, top - 10, 9, 3); rect(x, M[2], px, top - 12, 4, 3); rect(x, M[1], px + aw - 12, top - 10, 7, 3);
      rect(x, M[1], px + 3, top + 18, 2, 14); rect(x, M[2], px + 3, top + 18, 1, 8); rect(x, M[1], px + aw - 9, top + 10, 2, 22);
    });
    /* great trees: root-flared trunk, a limb, clustered canopy */
    [[104, 15, 112, 0], [288, 19, 128, 1], [446, 12, 98, 2]].forEach(([tx, tw, th, ci]) => wrap(tx, (px) => {
      const base = 226, cx = px + (tw >> 1), cy = base - th;
      rect(x, S[0], px, base - th, tw, th); rect(x, S[1], px, base - th, 3, th); rect(x, S[1], px + 1, base - th + 6, 1, th - 12);
      for (let k = 0; k < 8; k++) { rect(x, S[0], px - k, base - 8 + k, 1, 1); rect(x, S[0], px + tw + k - 1, base - 8 + k, 1, 1); }
      rect(x, S[0], px - 8, base - 3, tw + 16, 3);
      for (let k = 0; k < 14; k++) rect(x, S[0], cx + k, cy + 24 - (k >> 1), 2, 3);
      canopy(x, cx, cy, CANOPY[ci]);
    }));
    /* mossy ground ridge with grass blades */
    const hs = []; for (let i = 0; i < 96; i++) hs.push(46 + ((i * 7) % 5) + (i % 9 === 0 ? 2 : 0) - ((i % 17) === 3 ? 3 : 0));
    ridge(x, 0, 5, hs, 270, S[0], null);
    for (let px = 0; px < 480; px += 5) { const i = px / 5, top = 270 - hs[i]; rect(x, M[0], px, top - 1, 5, 2); if (i % 3 === 0) rect(x, M[1], px + 1, top - 3, 1, 3); if (i % 5 === 1) rect(x, M[1], px + 3, top - 4, 1, 4); if (i % 7 === 2) rect(x, M[2], px + 2, top - 3, 1, 2); }
    return c;
  }

  G.art.buildZone1Bg = function () { return { far: far(), mid: mid() }; };
})((window.SGS = window.SGS || {}));
