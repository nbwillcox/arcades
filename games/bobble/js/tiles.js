/* Per-world tile sets (platforms, walls) and the starry backdrops, plus a function that bakes a whole room into one canvas. */
(function (G) {
  'use strict';
  const PX = G.px, Pix = PX.Pix, rgb = PX.rgb, TILE = G.C.TILE;
  const T = {};
  G.tiles = T;
  const hex = (h) => rgb(h);
  /* a platform/wall tile: kind 'p' platform piece (end 0 mid, -1 left, 1 right, 2 single), 'w' wall */
  function tile(world, kind, end, v) {
    const W = G.levels.WORLDS[world], R = PX.ramp(W.hue, W.sat, 40), D = R.map((c) => PX.mix(c, rgb('#0a0818'), 0.4)), p = new Pix(8, 8), rnd = PX.rng(world * 97 + v * 13 + (kind === 'w' ? 5 : 0));
    if (kind === 'w') {
      p.rect(0, 0, 8, 8, D[2]); for (let i = 0; i < 9; i++) p.set(Math.floor(rnd() * 8), Math.floor(rnd() * 8), rnd() < 0.5 ? D[3] : D[1]);
      p.rect(0, 0, 8, 1, D[1]); p.rect(0, 7, 8, 1, D[4]); p.rect(0, 0, 1, 8, D[1]); p.rect(7, 0, 1, 8, D[4]);
    } else {
      p.rect(0, 0, 8, 8, R[2]); p.rect(0, 0, 8, 1, R[0]); p.rect(0, 1, 8, 1, R[1]); p.rect(0, 6, 8, 1, R[3]); p.rect(0, 7, 8, 1, R[4]);
      for (let i = 0; i < 5; i++) p.set(Math.floor(rnd() * 8), 2 + Math.floor(rnd() * 4), rnd() < 0.5 ? R[3] : R[1]);
      if (end <= -1 || end === 2) { p.rect(0, 0, 1, 8, R[1]); p.set(0, 0, 0); p.set(0, 7, 0); p.set(1, 7, R[4]); }
      if (end >= 1) { p.rect(7, 0, 1, 8, R[3]); p.set(7, 0, 0); p.set(7, 7, 0); }
      const gl = hex(W.hue > 340 || W.hue < 30 ? '#ff9a2a' : '#9ae8ff');
      switch (world) {
        case 0: p.set(2 + v, 3, hex('#ffb040')); p.set(5, 4, hex('#ffd880')); break;                 // ore flecks
        case 1: p.set(1, 2, R[4]); p.set(6, 2, R[4]); p.set(1, 5, R[0]); p.set(6, 5, R[0]); p.rect(0, 7, 8, 1, ((v + 0) & 1) ? hex('#ffd24a') : D[4]); break;   // rivets, hazard hint
        case 2: p.rect(0, 0, 8, 1, hex('#ffffff')); p.rect(0, 1, 8, 1, hex('#d8f4ff')); p.set(2, 7, hex('#bfeaff')); break;          // frost
        case 3: p.set(2, 3, gl); p.set(3, 4, gl); p.set(4, 4, hex('#ffd060')); p.set(5, 5, gl); p.rect(0, 0, 8, 1, hex('#ff7a2a')); break;                   // lava cracks
        case 4: p.rect(0, 0, 8, 2, hex('#5ad06a')); p.rect(0, 0, 8, 1, hex('#a8ff8a')); p.set(2, 2, hex('#2a8a3a')); p.set(5, 3, hex('#2a8a3a')); break;       // moss
        case 5: p.set(3, 3, R[0]); p.set(4, 4, R[0]); p.set(2, 4, R[1]); p.rect(0, 0, 8, 1, hex('#f0d8ff')); break;                                          // facets
        case 6: p.rect(0, 4, 8, 1, hex('#ff3ad0')); p.set(3, 4, hex('#3affea')); p.set(4, 4, hex('#3affea')); p.rect(0, 0, 8, 1, hex('#3affea')); break;      // neon
        case 7: p.set(2, 3, hex('#c0562a')); p.set(3, 4, hex('#c0562a')); p.set(6, 5, hex('#8a3a1a')); p.set(5, 2, hex('#e08a3a')); break;                   // rust
        case 8: p.set(2, 3, hex('#ff9ad8')); p.set(5, 5, hex('#9affea')); p.set(6, 3, hex('#ffe27a')); break;                                               // spores
        default: p.rect(0, 0, 8, 1, hex('#ffffff')); p.set(3, 4, hex('#c88aff')); p.set(4, 4, hex('#c88aff')); p.set(5, 3, hex('#ffffff')); break;           // event horizon
      }
    }
    return p.toCanvas(1);
  }
  const cache = {};
  T.set = function (world) {
    if (cache[world]) return cache[world];
    const S = { p: [[], [], [], []], w: [] };
    for (let v = 0; v < 3; v++) { for (const [i, e] of [[0, 0], [1, -1], [2, 1], [3, 2]]) S.p[i][v] = tile(world, 'p', e, v); S.w[v] = tile(world, 'w', 0, v); }
    return (cache[world] = S);
  };
  /* backdrop: dark dithered gradient, stars, one large body; width w so wide rooms are covered */
  const bgCache = {};
  T.backdrop = function (world, w) {
    const key = world + '|' + w;
    if (bgCache[key]) return bgCache[key];
    const W = G.levels.WORLDS[world], p = new Pix(w, 240), rnd = PX.rng(world * 313 + 5), top = PX.hsl(W.hue + 20, 45, 6), bot = PX.hsl(W.hue, 50, 13);
    for (let y = 0; y < 240; y++) for (let x = 0; x < w; x++) p.d[y * w + x] = PX.dither(x, y, y / 239) ? bot : top;
    for (let i = 0; i < Math.round(w * 0.18); i++) p.set(Math.floor(rnd() * w), Math.floor(rnd() * 200), rgb(rnd() < 0.5 ? '#c8d4ff' : '#7f90c8'));
    const cx = Math.round(w * (0.25 + rnd() * 0.5)), cy = 70 + Math.floor(rnd() * 60), r = 22 + Math.floor(rnd() * 14), ramp = PX.ramp(W.hue + 30, W.sat, 30).map((c) => PX.mix(c, hex('#0a0818'), 0.45));
    const m = new Pix(w, 240); m.disc(cx, cy, r, 1); const tmp = new Pix(w, 240); tmp.shade3d(m, 0, 0, ramp, { depth: r * 0.8 });
    for (let i = 0; i < w * 240; i++) if (tmp.d[i]) p.d[i] = tmp.d[i];
    for (let k = 0; k < 8; k++) { const sx = Math.floor(rnd() * w), sh = 20 + Math.floor(rnd() * 40); for (let y = 0; y < sh; y++) p.set(sx + (y >> 2), 239 - y, PX.hsl(W.hue, 40, 10 + (y > sh - 3 ? 6 : 0))); }
    return (bgCache[key] = p.toCanvas(1));
  };
  /* bake the room (backdrop + all tiles) into a canvas of width IW */
  T.bake = function (room, iw) {
    const c = document.createElement('canvas'); c.width = iw; c.height = 240; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const S = T.set(room.world), ox = Math.floor((iw - room.cols * TILE) / 2), cols = room.cols, tl = (tx, ty) => (tx < 0 || tx >= cols || ty < 0 || ty >= room.rows ? 1 : room.tiles[ty * cols + tx]);
    x.drawImage(T.backdrop(room.world, iw), 0, 0);
    for (let ty = 0; ty < room.rows; ty++) for (let tx = 0; tx < cols; tx++) {
      const t = room.tiles[ty * cols + tx]; if (!t) continue;
      const v = (tx * 7 + ty * 3) % 3;
      if (t === 1) x.drawImage(S.w[v], ox + tx * TILE, ty * TILE);
      else { const l = tl(tx - 1, ty) === 2, r = tl(tx + 1, ty) === 2; x.drawImage(S.p[l && r ? 0 : l ? 2 : r ? 1 : 3][v], ox + tx * TILE, ty * TILE); }
    }
    c.ox = ox;
    return c;
  };
})((window.SGS = window.SGS || {}));
