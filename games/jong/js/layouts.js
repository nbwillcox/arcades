/* Board layouts. Tiles sit on a half-tile grid (x, y in half-tile units, a tile covers 2 x 2) and stack in layers (z). Most shapes are a flat silhouette that gets eroded layer by layer. */
(function (G) {
  'use strict';
  const grid = (w, h, f) => { const g = []; for (let r = 0; r < h; r++) { const row = []; for (let c = 0; c < w; c++) row.push(!!f(c, r)); g.push(row); } return g; };
  const asc = (rows) => grid(rows[0].length, rows.length, (c, r) => rows[r][c] === '#');
  const at = (g, c, r) => !!(g[r] && g[r][c]);
  const ell = (c, r, cx, cy, a, b) => ((c - cx) / a) * ((c - cx) / a) + ((r - cy) / b) * ((r - cy) / b) <= 1;
  const erode = (g, half) => {
    const h = g.length, w = g[0].length;
    return half ? grid(w - 1, h - 1, (c, r) => at(g, c, r) && at(g, c + 1, r) && at(g, c, r + 1) && at(g, c + 1, r + 1))
      : grid(w, h, (c, r) => at(g, c, r) && at(g, c - 1, r) && at(g, c + 1, r) && at(g, c, r - 1) && at(g, c, r + 1));
  };
  function stack(base, nz, half) {
    const tiles = []; let g = base;
    for (let z = 0; z < nz; z++) {
      let any = false;
      for (let r = 0; r < g.length; r++) for (let c = 0; c < g[r].length; c++) if (g[r][c]) { tiles.push([2 * c + (half ? z : 0), 2 * r + (half ? z : 0), z]); any = true; }
      if (!any) break; g = erode(g, half);
    }
    return tiles;
  }
  function layers(defs) {
    const tiles = [];
    defs.forEach((d, z) => { for (let r = 0; r < d.rows.length; r++) for (let c = 0; c < d.rows[r].length; c++) if (d.rows[r][c] === '#') tiles.push([2 * c + (d.dx || 0), 2 * r + (d.dy || 0), z]); });
    return tiles;
  }
  /* drop the highest, outermost tiles until the count is even and within the cap */
  function finish(tiles, cap) {
    let cx = 0, cy = 0; for (const t of tiles) { cx += t[0]; cy += t[1]; } cx /= tiles.length; cy /= tiles.length;
    while (tiles.length > cap || tiles.length % 2) {
      let bi = 0, bs = -1;
      tiles.forEach((t, i) => { const s = t[2] * 1000 + Math.hypot(t[0] - cx, t[1] - cy); if (s > bs) { bs = s; bi = i; } });
      tiles.splice(bi, 1);
    }
    return tiles;
  }
  const turtle = () => {
    const t = [], row = (z, y, x0, x1) => { for (let x = x0; x <= x1; x += 2) t.push([x, y, z]); };
    row(0, 0, 2, 24); row(0, 2, 6, 20); row(0, 4, 4, 22); row(0, 6, 2, 24); row(0, 8, 2, 24); row(0, 10, 4, 22); row(0, 12, 6, 20); row(0, 14, 2, 24);
    t.push([0, 7, 0], [26, 7, 0], [28, 7, 0]);
    for (let y = 2; y <= 12; y += 2) row(1, y, 8, 18);
    for (let y = 4; y <= 10; y += 2) row(2, y, 10, 16);
    for (let y = 6; y <= 8; y += 2) row(3, y, 12, 14);
    t.push([13, 7, 4]);
    return t;
  };
  const defs = [
    { id: 'turtle', name: 'Classic Turtle', hue: 0, tiles: turtle() },
    { id: 'ziggurat', name: 'Ziggurat', hue: 3, tiles: stack(grid(13, 6, () => true), 4, false) },
    { id: 'diamond', name: 'Crystal Diamond', hue: 1, tiles: stack(grid(15, 9, (c, r) => Math.abs(c - 7) / 7.3 + Math.abs(r - 4) / 4.3 <= 1), 5, true) },
    { id: 'saturn', name: 'Ringed Planet', hue: 2, tiles: layers([
      { rows: ['.....#####.....', '....#######....', '...#########...', '###############', '###############', '...#########...', '....#######....', '.....#####.....'] },
      { rows: ['...............', '...............', '...............', '..###########..', '..###########..'] },
      { rows: ['...............', '...............', '...............', '.....#####.....', '.....#####.....'] }]) },
    { id: 'invader', name: 'Pixel Invader', hue: 4, tiles: stack(asc(['..#.......#..', '...#.....#...', '..#########..', '.###.###.###.', '#############', '#.#########.#', '#.#.......#.#', '...##...##...']), 2, false) },
    { id: 'galaxy', name: 'Galaxy Core', hue: 5, tiles: stack(grid(12, 9, (c, r) => ell(c, r, 5.5, 4, 5.9, 4.4)), 4, true) },
    { id: 'comet', name: 'Comet Tail', hue: 1, tiles: stack(grid(17, 9, (c, r) => (c - 12) * (c - 12) + (r - 4) * (r - 4) <= 9.5 || (c < 12 && Math.abs(r - 4) <= 0.4 + (12 - c) * 0.3)), 3, false) },
    { id: 'ring', name: 'Ring Station', hue: 3, tiles: stack(grid(15, 9, (c, r) => (ell(c, r, 7, 4, 7.4, 4.4) && !ell(c, r, 7, 4, 3.8, 1.9)) || (Math.abs(c - 7) <= 1 && r === 4)), 3, false) },
    { id: 'towers', name: 'Twin Towers', hue: 2, tiles: stack(grid(15, 9, (c, r) => c <= 3 || c >= 11 || (r >= 3 && r <= 5)), 3, false) },
    { id: 'hourglass', name: 'Hourglass Nebula', hue: 4, tiles: stack(grid(17, 9, (c, r) => Math.abs(c - 8) <= 1.2 + Math.abs(r - 4) * 1.9), 3, false) },
    { id: 'cross', name: 'Nova Cross', hue: 5, tiles: stack(grid(15, 11, (c, r) => (r >= 4 && r <= 6) || (c >= 6 && c <= 8)), 4, true) },
    { id: 'fighter', name: 'Starfighter', hue: 0, tiles: stack(grid(17, 9, (c, r) => Math.abs(r - 4) <= (16 - c) * 0.3 + 0.2), 3, false) },
  ];
  const LS = defs.map((d) => {
    const tiles = finish(d.tiles.slice(), 144);
    let mx = 0, my = 0, mz = 0; for (const t of tiles) { mx = Math.max(mx, t[0] + 2); my = Math.max(my, t[1] + 2); mz = Math.max(mz, t[2]); }
    return { id: d.id, name: d.name, hue: d.hue, tiles, n: tiles.length, w: mx, h: my, zmax: mz };
  });
  G.layouts = LS;
  G.layoutById = (id) => LS.find((l) => l.id === id) || LS[0];
  if (typeof module !== 'undefined') module.exports = LS;
})((typeof window !== 'undefined' ? (window.SGS = window.SGS || {}) : (global.SGS = global.SGS || {})));
