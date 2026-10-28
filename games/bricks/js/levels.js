/* Endless procedural levels: mirrored geometric layouts alternate with pixel-art stamps; armor, explosives and gold scale with the level number. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C;
  const L = {};
  G.levels = L;
  const COLS = C.COLS, ROWS = C.ROWS, MID = (COLS - 1) / 2;

  const STAMPS = {
    INVADER: ['..#.....#..', '...#...#...', '..#######..', '.##.###.##.', '###########', '#.#######.#', '#.#.....#.#', '...##.##...'],
    SKULL: ['..#######..', '.#########.', '###.###.###', '###.###.###', '.#########.', '..#######..', '..#.#.#.#..', '..#######..'],
    HEART: ['.###...###.', '#####.#####', '###########', '###########', '.#########.', '..#######..', '...#####...', '....###....'],
    ROCKET: ['.....#.....', '....###....', '...#####...', '...#####...', '...#####...', '..#######..', '.#########.', '.#...#...#.'],
    STAR: ['.....#.....', '.....#.....', '....###....', '###########', '.#########.', '..#######..', '.####.####.', '.##.....##.'],
    CROWN: ['#...#.#...#', '##..###..##', '###########', '###########', '.#########.', '..#######..'],
    ROBOT: ['.#########.', '###########', '##.#####.##', '##.#####.##', '###########', '###.###.###', '.#########.', '..#.#.#.#..'],
  };
  const SHAPES = {
    ROWS: (r, c, nr) => r < nr && !(r % 3 === 2 && (c === 3 || c === 7 || c === 11)),
    CHECKER: (r, c, nr) => r < nr && (r + c) % 2 === 0,
    DIAMOND: (r, c, nr) => { const cy = Math.floor((nr - 1) / 2); return Math.abs(c - MID) + Math.abs(r - cy) * 1.6 <= Math.min(8, nr + 1.5); },
    PYRAMID: (r, c, nr) => r < Math.min(nr, 8) && c >= r && c <= COLS - 1 - r,
    HOURGLASS: (r, c, nr) => r < nr && (c >= r && c <= COLS - 1 - r ? r < nr / 2 : c >= nr - 1 - r && c <= COLS - nr + r),
    COLUMNS: (r, c, nr) => r < nr && c % 3 !== 1,
    FRAME: (r, c, nr) => r < nr && (r === 0 || r === nr - 1 || c === 0 || c === COLS - 1 || (r >= 2 && r <= nr - 3 && c >= 3 && c <= COLS - 4 && (r === 2 || r === nr - 3 || c === 3 || c === COLS - 4))),
    WAVES: (r, c, nr) => Math.abs(r - (3 + 1.8 * Math.sin(c * 0.8))) < Math.min(2.2, nr / 3),
    ARCH: (r, c, nr) => r < nr && (c <= 1 || c >= COLS - 2 || r <= 1 + Math.round(2 * Math.cos((c - MID) / MID * 1.4))),
    ZIGZAG: (r, c, nr) => r < nr && (c + r * 2) % 6 < 3,
  };
  const SHAPE_KEYS = Object.keys(SHAPES), STAMP_KEYS = Object.keys(STAMPS);

  L.worldOf = (n) => Math.floor((n - 1) / C.BOSS_EVERY) % 5;
  L.isBoss = (n) => n % C.BOSS_EVERY === 0;

  L.generate = function (n) {
    const rnd = G.gfx.mulberry(n * 7919 + 17), hue0 = G.gfx.art.WORLDS[L.worldOf(n)].h;
    const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    const mk = (type, hp, r, c) => ({ type, hp, hue: (hue0 + r * 22 + c * 4) % 360 });
    const boss = L.isBoss(n);
    let name;
    if (boss) {
      name = 'BOSS';
      for (let c = 0; c < COLS; c++) {
        if (c === 3 || c === 7 || c === 11) continue;
        grid[6][c] = c === 0 || c === COLS - 1 ? mk('gold', 1, 6, c) : mk('armored', 2, 6, c);
        grid[7][c] = mk('normal', 1, 7, c);
      }
    } else {
      const nr = Math.min(ROWS - 1, 5 + Math.min(3, Math.floor(n / 4)));
      const useStamp = n > 1 && (n % 3 === 0 || (n % 3 === 2 && rnd() < 0.4));
      let fill;
      if (useStamp) {
        name = STAMP_KEYS[Math.floor(rnd() * STAMP_KEYS.length)];
        const st = STAMPS[name], off = Math.floor((COLS - st[0].length) / 2);
        fill = (r, c) => r < st.length && st[r][c - off] === '#';
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (fill(r, c)) grid[r][c] = mk('normal', 1, r, c);
      } else {
        name = SHAPE_KEYS[(n * 3 + Math.floor(rnd() * 3)) % SHAPE_KEYS.length];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (SHAPES[name](r, c, nr)) grid[r][c] = mk('normal', 1, r, c);
      }
      // armor and explosives, decided on the left half and mirrored
      const pa = Math.min(0.5, 0.03 + 0.03 * n), pe = Math.min(0.085, 0.012 + 0.004 * n);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= MID; c++) {
          if (!grid[r][c]) continue;
          const roll = rnd(), top = r < 3 ? 0.12 : 0;
          let b = null;
          if (roll < pe) b = mk('explosive', 1, r, c);
          else if (roll < pe + pa + top * Math.min(1, n / 6)) b = mk('armored', n >= 6 && rnd() < 0.35 + top ? 3 : 2, r, c);
          if (b) { grid[r][c] = b; grid[r][COLS - 1 - c] = Object.assign({}, b); }
        }
      }
      // gold obstacles next to the pattern, in mirrored pairs
      if (n >= 3) {
        let want = Math.min(6, 1 + Math.floor((n - 3) / 3)), tries = 0;
        while (want > 0 && tries++ < 80) {
          const r = 1 + Math.floor(rnd() * (nr + 1)), c = Math.floor(rnd() * 7);
          if (r >= ROWS - 1 || grid[r][c]) continue;
          const near = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].some(([rr, cc]) => rr >= 0 && cc >= 0 && grid[rr] && grid[rr][cc] && grid[rr][cc].type !== 'gold');
          if (!near) continue;
          grid[r][c] = mk('gold', 1, r, c); grid[r][COLS - 1 - c] = mk('gold', 1, r, COLS - 1 - c); want--;
        }
      }
    }
    const bricks = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const g = grid[r][c]; if (g) bricks.push({ c, r, type: g.type, hp: g.hp, maxhp: g.hp, hue: g.hue }); }
    return { name, bricks, boss };
  };
})((window.SGS = window.SGS || {}));
