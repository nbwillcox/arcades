/* Level generation: rock grid with hidden minerals, buried crates, hazard seams, boulders and alien chambers. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C;
  const L = {};
  G.level = L;
  const COLS = C.COLS, ROWS = C.ROWS;
  const KIND = { NONE: 0, ORE: 1, CRATE: 2, LAVA: 3, GAS: 4 };
  L.KIND = KIND;
  L.idx = (c, r) => r * COLS + c;
  L.layerOf = (r) => (r >= C.LAYERS[3] ? 3 : r >= C.LAYERS[2] ? 2 : r >= C.LAYERS[1] ? 1 : 0);
  L.isBoss = (n) => n % C.BOSS_EVERY === 0;

  L.build = function (g, n) {
    const rnd = Math.random, ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)), boss = L.isBoss(n);
    g.dirt = new Uint8Array(COLS * ROWS).fill(1); g.kind = new Uint8Array(COLS * ROWS); g.data = new Array(COLS * ROWS).fill(null);
    g.rocks = []; g.carves = []; g.spawns = []; g.crates = [];
    for (let c = 0; c < COLS; c++) g.dirt[L.idx(c, 0)] = 0;
    const carve = (c, r, w, h) => { for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) g.dirt[L.idx(x, y)] = 0; g.carves.push({ c, r, w, h }); };
    carve(C.START_C, 1, 1, 2);
    const reserved = (c, r) => r <= 3 && c >= C.START_C - 2 && c <= C.START_C + 2;
    const free = (c, r) => c >= 1 && c < COLS - 1 && r >= 3 && r < ROWS - 1 && g.dirt[L.idx(c, r)] === 1 && g.kind[L.idx(c, r)] === 0 && !reserved(c, r) && !g.rocks.some((k) => k.c === c && k.r === r);
    const pick = (r0, r1) => { for (let i = 0; i < 80; i++) { const c = ri(1, COLS - 2), r = ri(r0, r1); if (free(c, r)) return [c, r]; } return null; };

    // alien chambers
    const total = Math.min(9, 3 + Math.floor(n / 2));
    const drakes = n >= 2 ? Math.min(4, Math.floor(n / 2)) : 0, burrs = n >= 4 ? Math.min(3, Math.floor((n - 2) / 3)) : 0, spits = n >= 6 ? Math.min(3, Math.floor((n - 4) / 3)) : 0;
    const types = [];
    for (let i = 0; i < drakes; i++) types.push('drake'); for (let i = 0; i < burrs; i++) types.push('burrower'); for (let i = 0; i < spits; i++) types.push('spitter');
    while (types.length < total) types.push('blob');
    types.length = total;
    if (boss) {
      carve(4, 14, 10, 5);
      g.boss = { c: 9, r: 16 };
      for (let i = 0; i < 2; i++) { const p = pick(5, 12); if (p) { carve(p[0], p[1], 2, 1); g.spawns.push({ type: 'blob', c: p[0], r: p[1] }); } }
    } else {
      g.boss = null;
      types.forEach((t, i) => {
        const band = Math.floor(i * 4 / types.length), r0 = [4, 8, 12, 16][band % 4];
        for (let k = 0; k < 60; k++) {
          const c = ri(1, COLS - 3), r = ri(r0, Math.min(ROWS - 2, r0 + 4));
          if (!reserved(c, r) && [0, 1].every((d) => free(c + d, r))) { carve(c, r, 2, 1); g.spawns.push({ type: t, c, r }); break; }
        }
      });
    }
    // boulders (need solid dirt beneath them)
    const nr = Math.min(10, 3 + Math.floor(n / 2));
    if (boss) for (const c of [5, 9, 12]) g.rocks.push({ c, r: 12, x: 0, y: 0, state: 'idle', t: 0, vy: 0 });
    for (let i = 0; i < nr; i++) { const p = pick(3, 19); if (p && g.dirt[L.idx(p[0], p[1] + 1)] === 1) g.rocks.push({ c: p[0], r: p[1], x: 0, y: 0, state: 'idle', t: 0, vy: 0 }); }
    // minerals: the deeper the rarer; one super-rare Quasarite per level
    g.quota = boss ? 0 : Math.min(5, 2 + Math.floor((n - 1) / 3)); g.minerals = 0; g.mineralsTotal = 0;
    const count = boss ? 3 : g.quota + 3;
    for (let i = 0; i < count; i++) {
      const lay = i === 0 && !boss ? 3 : [0, 0, 1, 1, 2, 2, 3][ri(0, 6)], rows = [[1, 5], [6, 10], [11, 15], [16, 20]][lay];
      const p = pick(Math.max(3, rows[0]), rows[1]);
      if (!p) continue;
      let tier = lay; if (tier === 3 && g.data.some((d) => d && d.tier === 3)) tier = 2;
      g.kind[L.idx(p[0], p[1])] = KIND.ORE; g.data[L.idx(p[0], p[1])] = { tier, ph: rnd() * 6 };
      g.mineralsTotal += tier === 3 ? 2 : 1;
    }
    g.quota = Math.min(g.quota, g.mineralsTotal);
    // buried crates
    const kinds = ['drill', 'hose', 'shield', 'scan'];
    for (let i = 0; i < (n >= 4 ? 3 : 2); i++) { const p = pick(4, 20); if (p) { g.kind[L.idx(p[0], p[1])] = KIND.CRATE; g.data[L.idx(p[0], p[1])] = { power: U.pick(kinds) }; } }
    // hazards: lava seams and gas pockets
    const seams = n >= 2 ? Math.min(7, 1 + Math.floor(n / 2)) : 0;
    for (let i = 0; i < seams; i++) {
      const p = pick(5, 19); if (!p) continue;
      const horiz = rnd() < 0.5, len = ri(2, 3);
      for (let k = 0; k < len; k++) { const c = p[0] + (horiz ? k : 0), r = p[1] + (horiz ? 0 : k); if (free(c, r)) g.kind[L.idx(c, r)] = KIND.LAVA; }
    }
    const gas = n >= 3 ? Math.min(6, 1 + Math.floor(n / 3)) : 0;
    for (let i = 0; i < gas; i++) { const p = pick(5, 20); if (p) g.kind[L.idx(p[0], p[1])] = KIND.GAS; }
    g.alienTotal = g.spawns.length;
  };
})((window.SGS = window.SGS || {}));
