/* The four stage layouts, in arcade units (224 x 256, y grows downward). A girder is a line segment you can stand on from above. */
(function (G) {
  'use strict';
  const Stages = {};

  function girder(x1, y1, x2, y2, o) {
    const g = Object.assign({ x1, y1, x2, y2, kind: 'girder', v: 0, lift: false }, o || {});
    g.at = (x) => (g.lift ? g.y : g.y1 + (g.y2 - g.y1) * ((x - g.x1) / ((g.x2 - g.x1) || 1)));
    return g;
  }
  const ladder = (x, top, bot) => ({ x, gt: top, gb: bot, yt: top.at(x), yb: bot.at(x) });
  const hammer = (g, x) => ({ g, x, y: g.at(x), taken: false });
  const item = (g, x, type) => ({ g, x, y: g.at(x), type, taken: false });

  Stages.make = function (idx) {
    const st = { idx, girders: [], ladders: [], hammers: [], items: [], rivets: [], drum: null, dk: null, princess: null, pg: null, start: null, belts: [], lifts: [] };
    const add = (g) => { st.girders.push(g); return g; };
    if (idx === 0) {
      /* the girders: barrels roll down a zigzag of sloping girders, ending at the oil drum */
      const g0 = add(girder(0, 247, 224, 241)), g1 = add(girder(0, 206, 208, 214)), g2 = add(girder(16, 180, 224, 172)), g3 = add(girder(0, 138, 208, 146)), g4 = add(girder(16, 112, 224, 104)), g5 = add(girder(0, 70, 208, 76));
      const p = add(girder(96, 40, 144, 40)); st.pg = p;
      [[60, g1, g0], [184, g1, g0], [36, g2, g1], [150, g2, g1], [70, g3, g2], [190, g3, g2], [40, g4, g3], [140, g4, g3], [70, g5, g4], [186, g5, g4], [120, p, g5]].forEach((l) => st.ladders.push(ladder(l[0], l[1], l[2])));
      st.g0 = g0; st.top = g5;
      st.drum = { x: 15, g: g0 };
      st.dk = { x: 30, g: g5, mode: 'barrels' };
      st.princess = { x: 120, g: p };
      st.start = { g: g0, x: 52 };
      st.hammers.push(hammer(g4, 196), hammer(g2, 44));
      st.items.push(item(g1, 120, 'hat'), item(g3, 60, 'purse'), item(g0, 140, 'parasol'));
    } else if (idx === 1) {
      /* the conveyors: flat girders that move you, and pies on the belts */
      const c0 = add(girder(0, 244, 224, 244)), c1 = add(girder(16, 206, 208, 206, { kind: 'belt', v: 20 })), c2 = add(girder(0, 168, 192, 168, { kind: 'belt', v: -20 })), c3 = add(girder(32, 130, 208, 130, { kind: 'belt', v: 20 })), c4 = add(girder(0, 92, 224, 92));
      const p = add(girder(96, 60, 144, 60)); st.pg = p;
      [[40, c1, c0], [176, c1, c0], [64, c2, c1], [150, c2, c1], [44, c3, c2], [170, c3, c2], [70, c4, c3], [196, c4, c3], [120, p, c4]].forEach((l) => st.ladders.push(ladder(l[0], l[1], l[2])));
      st.belts = [c1, c2, c3]; st.g0 = c0; st.top = c4;
      st.dk = { x: 30, g: c4, mode: 'pies' };
      st.princess = { x: 120, g: p };
      st.start = { g: c0, x: 30 };
      st.hammers.push(hammer(c2, 168), hammer(c1, 30));
      st.items.push(item(c1, 120, 'parasol'), item(c2, 60, 'hat'), item(c3, 120, 'purse'));
      st.fires = [{ g: c0, x: 150 }, { g: c0, x: 190 }];
    } else if (idx === 2) {
      /* the lifts: two shafts of rising platforms, a mid island, a right ledge and a top girder under fire from springs */
      const s = add(girder(0, 244, 58, 244)), m = add(girder(88, 170, 136, 170)), n = add(girder(168, 110, 224, 110)), tg = add(girder(0, 70, 224, 70));
      const p = add(girder(96, 40, 144, 40)); st.pg = p;
      st.ladders.push(ladder(196, tg, n), ladder(120, p, tg));
      /* lifts: x range, travel range, spacing */
      const shaft = (x1, top, bottom, n2, v) => { const span = bottom - top, gap = span / n2; for (let i = 0; i < n2; i++) { const g = add(girder(x1, bottom - i * gap, x1 + 16, bottom - i * gap, { kind: 'lift', lift: true, y: bottom - i * gap, v, top, bottom })); st.lifts.push(g); } };
      shaft(66, 138, 250, 2, -26);
      shaft(144, 92, 248, 3, -26);
      st.top = tg;
      st.dk = { x: 30, g: tg, mode: 'springs' };
      st.princess = { x: 120, g: p };
      st.start = { g: s, x: 20 };
      st.hammers.push(hammer(tg, 160));
      st.items.push(item(m, 112, 'purse'), item(n, 200, 'hat'), item(tg, 70, 'parasol'));
      st.fires = [];
    } else {
      /* the rivets: pull all eight to bring the whole thing down */
      const r0 = add(girder(0, 244, 224, 244)), r1 = add(girder(8, 196, 216, 196)), r2 = add(girder(8, 148, 216, 148)), r3 = add(girder(8, 100, 216, 100)), t = add(girder(72, 60, 152, 60)); st.pg = t;
      [[64, r1, r0], [160, r1, r0], [64, r2, r1], [160, r2, r1], [64, r3, r2], [160, r3, r2], [88, t, r3], [136, t, r3]].forEach((l) => st.ladders.push(ladder(l[0], l[1], l[2])));
      for (const g of [r0, r1, r2, r3]) { st.rivets.push({ g, x: 24, taken: false }, { g, x: 200, taken: false }); }
      st.top = t;
      st.dk = { x: 112, g: t, mode: 'still' };
      st.princess = { x: 82, g: t };
      st.start = { g: r0, x: 112 };
      st.hammers.push(hammer(r1, 190), hammer(r3, 30));
      st.items.push(item(r1, 110, 'hat'), item(r2, 110, 'purse'), item(r3, 110, 'parasol'));
      st.fires = [{ g: r0, x: 40, hunt: true }, { g: r0, x: 190, hunt: true }, { g: r2, x: 60, hunt: true }, { g: r2, x: 170, hunt: true }];
    }
    return st;
  };

  G.stages = Stages;
})((window.SGS = window.SGS || {}));
