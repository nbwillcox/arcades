/* Lane generation: fixed 13-row classic levels (start, road, median, river, docking bays) and an endless chunk generator. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, TAU = U.TAU;
  const Wd = {};
  G.world = Wd;
  const T = C.TILE, W = C.W, MARGIN = 120;
  Wd.MARGIN = MARGIN;

  /* pattern items along a loop wide enough to cover the screen plus margins */
  function lay(rnd, pick, gapMin, gapMax) {
    const items = [];
    let p = rnd() * 80;
    const need = W + 2 * MARGIN + 160;
    while (p < need) {
      const it = pick();
      it.p = p; it.ph = rnd() * 6;
      items.push(it);
      p += it.len * T + gapMin + rnd() * (gapMax - gapMin);
    }
    return { items, loop: p };
  }
  Wd.lane = function (row, kind, zone, dir, speed, items, loop) {
    return { row, kind, zone, dir, speed, items: items || [], loop: loop || W + 2 * MARGIN, margin: MARGIN, off: 0, blocked: null, serpent: null };
  };
  Wd.itemX = (lane, it) => (((it.p + lane.off) % lane.loop) + lane.loop) % lane.loop - lane.margin;

  const VEHICLES = {
    skimmer: () => ({ kind: 'skimmer', len: 1 }), pod: () => ({ kind: 'pod', len: 1 }), racer: () => ({ kind: 'racer', len: 1 }),
    hauler: () => ({ kind: 'hauler', len: 2 }), freighter: (r) => ({ kind: 'freighter', len: 3 + (r() < 0.3 ? 1 : 0) }),
  };
  function roadLane(row, zone, dir, speed, kinds, rnd, level) {
    const hue0 = rnd() * 360, gapMin = Math.max(95, 150 - level * 5), gapMax = gapMin + 120;
    const { items, loop } = lay(rnd, () => { const it = VEHICLES[U.pick(kinds)](rnd); it.hue = (hue0 + rnd() * 90) % 360; return it; }, gapMin, gapMax);
    return Wd.lane(row, 'road', zone, dir, speed, items, loop);
  }
  function riverLane(row, zone, dir, speed, kind, len, gap, rnd) {
    const hue = [200, 280, 330, 30, 140][zone % 5] + rnd() * 30;
    const { items, loop } = lay(rnd, () => ({ kind, len, hue, dive: kind === 'jelly' }), gap, gap + 55);
    return Wd.lane(row, 'river', zone, dir, speed, items, loop);
  }

  /* ---- classic ---- */
  Wd.classic = function (level) {
    const rnd = G.gfx.mulberry(level * 9973 + 5), zone = Math.floor((level - 1) / 3) % 5, ms = Math.min(2.3, 1 + 0.09 * (level - 1));
    const rows = new Map(), d0 = rnd() < 0.5 ? 1 : -1;
    rows.set(0, Wd.lane(0, 'start', zone, 1, 0));
    const road = [['skimmer', 'pod'], ['racer'], ['hauler', 'skimmer'], ['freighter'], ['pod', 'skimmer', 'racer']], rsp = [62, 105, 72, 55, 88];
    for (let i = 0; i < 5; i++) rows.set(1 + i, roadLane(1 + i, zone, i % 2 ? d0 : -d0, rsp[i] * ms * (0.92 + rnd() * 0.16), road[i], rnd, level));
    const med = Wd.lane(6, 'safe', zone, 1, 0);
    if (level >= 3) med.serpent = { x: rnd() * W, dir: rnd() < 0.5 ? 1 : -1, speed: 70 + level * 4, len: 3 };
    rows.set(6, med);
    const hullLen = level >= 5 ? 3 : 4, riv = [['hull', hullLen, 85], ['rock', 2, 110], ['hull', hullLen - (level >= 8 ? 1 : 0), 95], [level >= 2 ? 'jelly' : 'rock', 2, 105], ['hull', 3, 80]], vsp = [48, 74, 56, 82, 62];
    for (let i = 0; i < 5; i++) rows.set(7 + i, riverLane(7 + i, zone, i % 2 ? d0 : -d0, vsp[i] * ms * (0.92 + rnd() * 0.16), riv[i][0], riv[i][1], riv[i][2] + Math.min(40, level * 3), rnd));
    rows.set(12, Wd.lane(12, 'bay', zone, 1, 0));
    return rows;
  };

  /* ---- endless: rows are generated a few at a time, ahead of the camera ---- */
  Wd.endlessInit = function (g) {
    g.gen = { next: 1, rnd: G.gfx.mulberry((Math.random() * 1e9) | 0), flip: 1, last: 'safe', run: 0 };
    g.rows.set(0, Wd.lane(0, 'start', 0, 1, 0));
    Wd.endlessTo(g, 18);
  };
  Wd.endlessTo = function (g, upto) {
    const gen = g.gen, rnd = gen.rnd;
    while (gen.next <= upto) {
      const r0 = gen.next, level = 1 + Math.floor(r0 / 28), ms = Math.min(2.5, 1 + r0 / 70), zone = Math.floor(r0 / 60) % 5;
      const mkSafe = (row) => {
        const l = Wd.lane(row, 'safe', zone, 1, 0); l.blocked = new Set();
        const nb = row < 4 ? 0 : 1 + Math.floor(rnd() * 3);
        for (let i = 0; i < nb; i++) l.blocked.add(Math.floor(rnd() * 12));
        if (l.blocked.size > 7) l.blocked.clear();
        g.rows.set(row, l); g.maybeSpawnPickup(l, rnd);
      };
      if (gen.last !== 'safe') { mkSafe(r0); gen.next++; gen.last = 'safe'; continue; }
      const n = 2 + Math.floor(rnd() * 3), isRoad = r0 < 4 ? true : rnd() < 0.5;
      const d0 = gen.flip; gen.flip = -gen.flip;
      for (let i = 0; i < n; i++) {
        const row = r0 + i, dir = i % 2 ? d0 : -d0, kinds = [['skimmer', 'pod'], ['racer', 'skimmer'], ['hauler', 'pod'], ['freighter', 'skimmer']][Math.floor(rnd() * 4)];
        if (isRoad) g.rows.set(row, roadLane(row, zone, dir, (55 + rnd() * 55) * ms, kinds, rnd, level));
        else {
          const k = rnd() < 0.55 ? 'hull' : rnd() < 0.5 ? 'rock' : (r0 > 40 ? 'jelly' : 'rock'), len = k === 'hull' ? (r0 > 90 ? 3 : 4) : 2;
          g.rows.set(row, riverLane(row, zone, dir, (45 + rnd() * 40) * ms, k, len, 80 + Math.min(40, r0 / 3), rnd));
        }
        if (!isRoad && rnd() < 0.5) g.maybeSpawnPickup(g.rows.get(row), rnd);
      }
      gen.next += n; gen.last = isRoad ? 'road' : 'river';
    }
  };
})((window.SGS = window.SGS || {}));
