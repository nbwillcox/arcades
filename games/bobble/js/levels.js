/* The 10 worlds and the room generator: seeded platform layouts that scale to any room width, low-gravity pockets, enemy rosters. */
(function (G) {
  'use strict';
  const C = G.C, PX = G.px, TILE = C.TILE;
  const L = {};
  G.levels = L;
  /* hue = world palette, music = chiptune theme (0-4), foes = weights over the 7 alien types, lowg = chance of low-gravity pockets */
  L.WORLDS = [
    { name: 'ASTEROID MINE', hue: 28, music: 0, boss: 'ROCK CRAWLER', foes: [5, 0, 1, 0, 0, 0, 0], lowg: 0, sat: 45 },
    { name: 'SPACE STATION', hue: 212, music: 0, boss: 'WARDEN DRONE', foes: [4, 3, 2, 0, 0, 0, 0], lowg: 0.1, sat: 40 },
    { name: 'ICE MOON', hue: 190, music: 1, boss: 'FROST GOLEM', foes: [3, 2, 1, 3, 0, 1, 0], lowg: 0.25, sat: 55 },
    { name: 'LAVA PLANET', hue: 8, music: 1, boss: 'MAGMA WORM', foes: [3, 2, 2, 3, 2, 0, 0], lowg: 0.1, sat: 60 },
    { name: 'ALIEN JUNGLE', hue: 118, music: 2, boss: 'SPORE QUEEN', foes: [2, 2, 2, 2, 2, 3, 0], lowg: 0.2, sat: 50 },
    { name: 'CRYSTAL CAVERNS', hue: 285, music: 2, boss: 'CRYSTAL SPIDER', foes: [2, 2, 2, 2, 3, 2, 2], lowg: 0.3, sat: 55 },
    { name: 'CYBER CITY', hue: 322, music: 3, boss: 'MAINFRAME CORE', foes: [1, 4, 3, 2, 2, 1, 3], lowg: 0.15, sat: 65 },
    { name: 'DERELICT SHIP', hue: 165, music: 3, boss: 'GHOST CRUISER', foes: [2, 3, 2, 3, 3, 3, 2], lowg: 0.35, sat: 45 },
    { name: 'NEBULA GARDEN', hue: 262, music: 4, boss: 'NEBULA JELLY', foes: [1, 3, 3, 3, 3, 3, 3], lowg: 0.5, sat: 55 },
    { name: 'BLACK HOLE CORE', hue: 300, music: 4, boss: 'THE SINGULARITY', foes: [2, 3, 3, 3, 3, 3, 4], lowg: 0.6, sat: 40 },
  ];
  L.TOTAL = 100;
  L.worldOf = (level) => Math.min(9, Math.floor((level - 1) / 10));
  L.isBoss = (level) => level % 10 === 0;
  const ROWS = C.ROWS, PLAT = [24, 20, 16, 12, 8];

  /* build the room: returns { cols, rows, tiles, spawn, spots, lowg, hole } */
  L.make = function (level, cols) {
    const world = L.worldOf(level), W = L.WORLDS[world], rnd = PX.rng(level * 7919 + 13), boss = L.isBoss(level);
    const t = new Uint8Array(cols * ROWS), n = cols - 4, put = (x, y, v) => { if (x >= 0 && x < cols && y >= 0 && y < ROWS) t[y * cols + x] = v; };
    for (let y = 0; y < ROWS; y++) for (const x of [0, 1, cols - 2, cols - 1]) put(x, y, 1);
    for (let x = 0; x < cols; x++) for (let y = 0; y < 2; y++) put(x, y, 1);
    // floor with an optional wrap hole in the middle
    const hole = boss ? 0 : rnd() < 0.62 ? 4 + Math.floor(rnd() * 3) : 0, hx = Math.round(2 + (n - hole) / 2);
    for (let x = 2; x < cols - 2; x++) if (!(hole && x >= hx && x < hx + hole)) { put(x, 28, 2); put(x, 29, 1); }
    for (let x = 2; x < cols - 2; x++) put(x, 29, 1);
    const spans = [[[0, n]]];      // floor counts as one full span for connectivity
    const rowsUsed = [];
    const dens = Math.min(1, 0.45 + world * 0.06 + (level % 10) * 0.02);
    const nRows = boss ? 3 : 5;
    for (let ri = 0; ri < nRows; ri++) {
      const y = boss ? [24, 20, 16][ri] : PLAT[ri], segs = [], half = Math.floor(n / 2), sym = rnd() < 0.78;
      const below = spans[spans.length - 1], target = boss ? 2 : 1 + (rnd() < dens ? 1 : 0) + (n > 44 && rnd() < dens ? 1 : 0);
      for (let s = 0; s < target; s++) {
        const len = Math.max(4, Math.round((4 + rnd() * (7 + world * 0.4)) * (n > 40 ? 1.35 : 1)));
        let x0 = Math.floor(rnd() * Math.max(1, half - len + 3));
        // connect to the row below: pull towards the nearest lower span if the gap is wider than the jump
        let best = null, bd = 1e9; for (const b of below) { const d = x0 > b[1] ? x0 - b[1] : b[0] > x0 + len ? b[0] - (x0 + len) : 0; if (d < bd) { bd = d; best = b; } }
        if (best && bd > 3) x0 += (x0 > best[1] ? -1 : 1) * (bd - 3);
        x0 = Math.max(0, Math.min(half + 2, x0)); const x1 = Math.min(n, x0 + len);
        segs.push([x0, x1]);
        if (sym) segs.push([n - x1, n - x0]);
      }
      // merge overlaps
      segs.sort((a, b) => a[0] - b[0]); const m = [];
      for (const s of segs) { const last = m[m.length - 1]; if (last && s[0] <= last[1] + 1) last[1] = Math.max(last[1], s[1]); else m.push([s[0], s[1]]); }
      // every span must sit within a short hop of the row below (mirrored copies can drift away from an asymmetric lower row)
      for (const sp of m) {
        let bd = 1e9; for (const b of below) { const d = sp[0] > b[1] ? sp[0] - b[1] : b[0] > sp[1] ? b[0] - sp[1] : 0; if (d < bd) { bd = d; var best = b; } }
        if (bd > 3 && bd < 1e9) { if (sp[0] > best[1]) sp[0] -= bd - 3; else sp[1] += bd - 3; }
      }
      m.sort((p, q) => p[0] - q[0]); for (let i = m.length - 1; i > 0; i--) if (m[i][0] <= m[i - 1][1] + 1) { m[i - 1][1] = Math.max(m[i - 1][1], m[i][1]); m.splice(i, 1); }
      for (const s of m) for (let x = s[0]; x < s[1]; x++) put(2 + x, y, 2);
      spans.push(m); rowsUsed.push(y);
    }
    // solid pillars in later worlds
    if (!boss && world >= 4 && rnd() < 0.5) { const px = 2 + Math.floor(n * (0.3 + rnd() * 0.4)); for (let y = 12; y < 24; y++) put(px, y, 2); }
    // low-gravity pockets
    const lowg = []; if (!boss && rnd() < W.lowg) { const w = 10 + Math.floor(rnd() * 8), x0 = 2 + Math.floor(rnd() * Math.max(1, n - w)); lowg.push({ x0: x0 * TILE, y0: 5 * TILE, x1: (x0 + w) * TILE, y1: 26 * TILE }); }
    // standing spots: platform tiles with headroom, away from the player's start
    const spots = [];
    for (let y = 3; y < 28; y++) for (let x = 3; x < cols - 3; x++) if (t[y * cols + x] === 2 && t[(y - 1) * cols + x] === 0 && t[(y - 2) * cols + x] === 0 && x > 12) spots.push([x * TILE + 4, y * TILE]);
    return { cols, rows: ROWS, tiles: t, spawn: [4 * TILE, 28 * TILE], spots, lowg, hole, world, level, boss, hx };
  };

  /* roster for a level: [{type, x, y}]. Enemy count grows with the level and the room width. */
  L.foes = function (level, room, rnd) {
    const W = L.WORLDS[room.world], pool = [], pos = level - room.world * 10;
    W.foes.forEach((w, i) => { for (let k = 0; k < w; k++) pool.push(i); });
    const cnt = Math.round((3 + pos * 0.55 + room.world * 0.5) * (0.75 + room.cols / 64)), out = [], spots = room.spots.slice();
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    for (let i = 0; i < Math.min(cnt, spots.length, 16); i++) { const sp = spots[i]; out.push({ type: pool[Math.floor(rnd() * pool.length)], x: sp[0], y: sp[1] }); }
    return out;
  };
})((window.SGS = window.SGS || {}));
