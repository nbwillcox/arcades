/* A room: ASCII tile map -> typed tile array plus queries. Tile types: 0 air, 1 solid, 2 one-way ledge, 3 slope rising right, 4 slope rising left, 5 shot block, 6 bomb block, 7 missile block, 8 spikes. */
(function (G) {
  'use strict';
  const T = 16;
  const CH = { '.': 0, '#': 1, '=': 2, '/': 3, '\\': 4, 'b': 5, 'B': 6, 'M': 7, '^': 8, 'i': 10, 'L': 11, 'x': 12, 'D': 13, 'W': 14, 'G': 15, 'S': 16, 'O': 17 };
  const R = { T: { AIR: 0, SOLID: 1, LEDGE: 2, SLR: 3, SLL: 4, SHOT: 5, BOMB: 6, MISSILE: 7, SPIKE: 8 } };
  G.room = R;
  R.build = function (def) {
    const rows = def.map, h = rows.length, w = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const room = { id: def.id, def, w, h, pw: w * T, ph: h * T, t: new Uint8Array(w * h), wall: new Uint8Array(w * h), spawns: [], doors: def.doors || [], items: def.items || [], zone: def.zone || 1, name: def.name || '' };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = rows[y][x] || '.';
      if (c in CH) room.t[y * w + x] = CH[c];
      else if (c === 'w') room.wall[y * w + x] = 1;
      else if (c !== ' ') room.spawns.push({ ch: c, x: x * T + 8, y: y * T + T, tx: x, ty: y });
    }
    /* a stray air cell tucked under water and beside more water (an enemy marker or a gap left in the flood fill) is water too, otherwise it shows as a dark pocket in the middle of the water */
    for (let pass = 0; pass < 3; pass++) for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, wt = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && room.t[yy * w + xx] === 14;
      if (!room.t[i] && wt(x, y - 1) && (wt(x - 1, y) || wt(x + 1, y))) { room.t[i] = 14; room.filled = (room.filled || 0) + 1; }
    }
    /* pools: water settles into every open cell it can reach sideways or downward (through one-way ledges too), so it always rests against terrain instead of ending in mid-air */
    { const seen = new Uint8Array(w * h), q = []; room.doorWet = new Set();
      for (let i = 0; i < w * h; i++) if (room.t[i] === 14) { seen[i] = 1; q.push(i); }
      while (q.length) {
        const i = q.pop(), x = i % w, y = (i - x) / w;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx, k = room.t[j]; if (seen[j] || (k !== 0 && k !== 2)) continue;
          seen[j] = 1; if (k === 0) { room.t[j] = 14; room.filled = (room.filled || 0) + 1; if (nx === 0 || nx === w - 1) room.doorWet.add(j); } q.push(j);
        }
      } }
    room.water = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (room.t[y * w + x] === 14) room.water.push({ tx: x, ty: y, top: y === 0 || room.t[(y - 1) * w + x] !== 14 });
    room.anchors = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (room.t[y * w + x] === 15) room.anchors.push({ x: x * T + 8, y: y * T + 8, tx: x, ty: y });
    room.lava = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (room.t[y * w + x] === 11) room.lava.push({ tx: x, ty: y, top: y === 0 || room.t[(y - 1) * w + x] !== 11 });
    /* cells that sit inside a back-wall region (hidden scan blocks, anchors, water, lava, spawn markers) get the same wall tile behind them, so nothing shows through as a gap */
    const cand = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = rows[y][x] || '.'; if (c === 'S' || c === 'G' || c === 'W' || c === 'L' || (!(c in CH) && c !== 'w' && c !== ' ')) cand[y * w + x] = 1; }
    for (let pass = 0; pass < 2; pass++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!cand[i] || room.wall[i]) continue;
      let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && room.wall[yy * w + xx]) n++; }
      if (n >= 5) room.wall[i] = 1;
    }
    /* back wall: any marked 'w' cell, or every air cell when def.wallAll is set */
    if (def.wallAll) for (let i = 0; i < w * h; i++) if (!room.t[i]) room.wall[i] = 1;
    return room;
  };
  /* tile type at tile coords; outside left/right/bottom counts as solid, above the top as air */
  R.at = (room, tx, ty) => (ty < 0 ? 0 : tx < 0 || tx >= room.w || ty >= room.h ? 1 : room.t[ty * room.w + tx]);
  R.isSolid = (k) => k === 1 || k === 5 || k === 6 || k === 7 || k === 9 || k === 10 || k === 12 || k === 13 || k === 17;
  R.solidAt = (room, tx, ty) => { const k = R.at(room, tx, ty); return k === 16 ? !!room.scanOn : R.isSolid(k); };
  R.set = (room, tx, ty, k) => {
    if (tx >= 0 && ty >= 0 && tx < room.w && ty < room.h) {
      const i = ty * room.w + tx, o = room.t[i];
      if (k === 0 && (o === 5 || o === 6 || o === 7 || o === 12 || o === 13 || o === 17)) (room.broken = room.broken || []).push(i);       /* remembered, so a broken wall stays broken when you come back (e.g. from a shrine) */
      room.t[i] = k; room.dirty = true;
    }
  };
  /* y of the walkable surface of a tile at local pixel column lx (0..15), or null */
  R.surface = (k, ty, lx) => (k === 1 || k === 5 || k === 6 || k === 7 || k === 9 || k === 10 || k === 12 || k === 13 || k === 17 || k === 2 ? ty * T : k === 3 ? ty * T + 16 - lx : k === 4 ? ty * T + 1 + lx : null);
})((window.SGS = window.SGS || {}));
