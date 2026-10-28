/* Mazes: two hand-drawn ones for levels 1 and 2, then seeded symmetric generated ones. Every maze is 21 x 23 tiles, mirrored left to right, with a drone hub in the middle and a wrap-around tunnel on row 11. */
(function (G) {
  'use strict';
  const C = G.C, U = G.U;
  const W = C.COLS, H = C.ROWS;
  const Mz = { W, H, TUNNEL_Y: 11, START: { x: 10, y: 17 }, DOOR: { x: 10, y: 10 }, HUB: { x: 10, y: 11 }, OUT: { x: 10, y: 9 } };

  /* the left half (x = 0..10) of each hand-made maze; '#' wall, '.' open, 'H' hub inside, 'D' hub door */
  const HAND = [
    [ /* A: wide loops */
      '###########',
      '#.....#....',
      '#.#.#.###.#',
      '#.#.....#..',
      '#.###.#.#.#',
      '#...#.....#',
      '#.#.###.###',
      '#.#...#....',
      '#.###.###.#',
      '#.....#....',
      '###.###.##D',
      '........#HH',
      '#.###.#.###',
      '#...#...#..',
      '#.###.#.#.#',
      '#.#.......#',
      '#.#.#####.#',
      '#...#...#..',
      '###.#.#.#.#',
      '#.....#...#',
      '#.#######.#',
      '#..........',
      '###########',
    ],
    [ /* B: stacked rooms */
      '###########',
      '#...#...#..',
      '#.#.#.#.#.#',
      '#.....#....',
      '#.###.#.###',
      '#.#...#.#..',
      '#.#.#.#.#.#',
      '#.......#..',
      '#.#####.#.#',
      '#.....#....',
      '#.#.#.#.##D',
      '........#HH',
      '#.#.#.#.###',
      '#.....#....',
      '#.###.###.#',
      '#.....#.#..',
      '#.#.###.#.#',
      '#.......#..',
      '###.#.###.#',
      '#...#.....#',
      '#.###.###.#',
      '#..........',
      '###########',
    ],
  ];

  function fromHalf(rows) {
    const g = [];
    for (let y = 0; y < H; y++) {
      const half = rows[y], row = [];
      for (let x = 0; x < W; x++) row.push(half[x <= 10 ? x : 20 - x]);
      g.push(row);
    }
    g[11][0] = g[11][W - 1] = '.';
    return g;
  }

  /* ---- generated mazes ---- */
  function generate(seed) {
    const rnd = G.gfx.mulberry(seed), g = [];
    for (let y = 0; y < H; y++) { g.push([]); for (let x = 0; x < W; x++) g[y].push('#'); }
    const cellOk = (cx, cy) => cx >= 1 && cx <= W - 2 && cy >= 1 && cy <= H - 2 && !(cy === 11 && cx >= 9 && cx <= 11);
    const open = (x, y) => { g[y][x] = '.'; g[y][W - 1 - x] = '.'; };
    for (let cy = 1; cy < H; cy += 2) for (let cx = 1; cx <= 9; cx += 2) if (cellOk(cx, cy)) open(cx, cy);
    /* randomized depth-first spanning tree over the left half (plus the centre links) */
    const seen = new Set(), key = (x, y) => x + ',' + y, stack = [[1, 1]];
    seen.add(key(1, 1));
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1], opts = [];
      for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 1 || nx > 9 || !cellOk(nx, ny) || seen.has(key(nx, ny))) continue;
        opts.push([nx, ny, cx + dx / 2, cy + dy / 2]);
      }
      if (!opts.length) { stack.pop(); continue; }
      const [nx, ny, px, py] = opts[Math.floor(rnd() * opts.length)];
      open(px, py); seen.add(key(nx, ny)); stack.push([nx, ny]);
    }
    /* centre links: the right half mirrors the left, so they join through x = 10 */
    for (let cy = 1; cy < H; cy += 2) if (cellOk(9, cy) && (cy === 9 || rnd() < 0.55)) open(10, cy);
    /* the tunnel corridor beside the hub */
    for (let x = 0; x <= 7; x++) open(x, 11);
    /* hub */
    for (let x = 9; x <= 11; x++) g[11][x] = 'H';
    g[10][10] = 'D';
    for (let x = 8; x <= 12; x++) { if (g[12][x] !== 'D') g[12][x] = '#'; if (x !== 10) g[10][x] = '#'; }
    g[11][8] = g[11][12] = '#';
    /* braid: give every dead end a second way out, then punch a few extra loops */
    const isFree = (x, y) => x >= 0 && x < W && y >= 0 && y < H && g[y][x] === '.';
    const deg = (x, y) => (isFree(x + 1, y) ? 1 : 0) + (isFree(x - 1, y) ? 1 : 0) + (isFree(x, y + 1) ? 1 : 0) + (isFree(x, y - 1) ? 1 : 0);
    for (let pass = 0; pass < 2; pass++) {
      for (let cy = 1; cy < H; cy += 2) for (let cx = 1; cx <= 9; cx += 2) {
        if (!cellOk(cx, cy) || deg(cx, cy) !== 1) continue;
        const opts = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ex = cx + dx, ey = cy + dy, nx = cx + dx * 2, ny = cy + dy * 2;
          if (ex < 1 || ex > 10 || ey < 1 || ey > H - 2 || g[ey][ex] !== '#') continue;
          if (!cellOk(nx, ny) && !(nx === 11 && cellOk(9, ny))) continue;
          if (nx > 10) { if (!cellOk(9, ny)) continue; }
          else if (!cellOk(nx, ny)) continue;
          opts.push([ex, ey]);
        }
        if (opts.length) { const [ex, ey] = opts[Math.floor(rnd() * opts.length)]; open(ex, ey); }
      }
    }
    let extra = 5 + Math.floor(rnd() * 4);
    for (let tries = 0; tries < 80 && extra > 0; tries++) {
      const ex = 1 + Math.floor(rnd() * 10), ey = 2 + Math.floor(rnd() * (H - 4));
      if (g[ey][ex] !== '#' || (ex % 2) === (ey % 2)) continue;                 /* only wall tiles between two cells */
      const a = ex % 2 ? [ex, ey - 1, ex, ey + 1] : [ex - 1, ey, ex + 1, ey];
      if (!isFree(a[0], a[1]) || !isFree(a[2], a[3])) continue;
      if (ey >= 9 && ey <= 13) continue;
      open(ex, ey); extra--;
    }
    return g;
  }

  /* ---- analysis ---- */
  function walk(g, x, y) { return x >= 0 && x < W && y >= 0 && y < H && (g[y][x] === '.'); }
  Mz.check = function (g) {
    const seen = new Uint8Array(W * H), q = [[Mz.START.x, Mz.START.y]];
    seen[Mz.START.y * W + Mz.START.x] = 1;
    let free = 0, reached = 0, dead = 0;
    while (q.length) {
      const [x, y] = q.pop(); reached++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let nx = x + dx, ny = y + dy;
        if (nx < 0) nx = W - 1; else if (nx >= W) nx = 0;
        if (!walk(g, nx, ny) || seen[ny * W + nx]) continue;
        seen[ny * W + nx] = 1; q.push([nx, ny]);
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!walk(g, x, y)) continue;
      free++;
      let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (walk(g, x + dx, y + dy)) n++;
      if (n <= 1 && x > 0 && x < W - 1) dead++;
    }
    return { ok: reached === free && walk(g, Mz.START.x, Mz.START.y) && walk(g, Mz.OUT.x, Mz.OUT.y), free, reached, dead };
  };

  /* The playable maze for a level: tile types (0 open, 1 wall, 2 hub, 3 door), dots (0 / 1 dot / 2 power cell) and the theme. */
  Mz.make = function (level) {
    let g;
    if (level >= 1 && level <= HAND.length) g = fromHalf(HAND[level - 1]);
    else {
      let seed = level * 7919 + 13, tries = 0;
      do { g = generate(seed); seed += 101; tries++; } while (!Mz.check(g).ok && tries < 40);
    }
    const t = new Uint8Array(W * H), dots = new Uint8Array(W * H);
    let total = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = g[y][x], i = y * W + x;
      if (c === '#') t[i] = 1; else if (c === 'H') t[i] = 2; else if (c === 'D') t[i] = 3;
      else { t[i] = 0; if (x > 1 && x < W - 2 || y !== Mz.TUNNEL_Y) { dots[i] = 1; total++; } }
    }
    const clear = (x, y) => { const i = y * W + x; if (dots[i]) { dots[i] = 0; total--; } };
    clear(Mz.START.x, Mz.START.y); clear(Mz.OUT.x, Mz.OUT.y);
    for (const [px, py] of [[1, 3], [W - 2, 3], [1, 19], [W - 2, 19]]) { const i = py * W + px; if (t[i] === 0) { if (!dots[i]) total++; dots[i] = 2; } }
    const theme = C.THEMES[(level - 1) % C.THEMES.length];
    return { t, dots, total, theme, level, chk: Mz.check(g) };
  };

  Mz.HAND = HAND; Mz.generate = generate; Mz.fromHalf = fromHalf;
  G.maze = Mz;
})((window.SGS = window.SGS || {}));
