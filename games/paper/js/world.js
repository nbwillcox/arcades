/* Route builder: houses, lawn decorations, hazards and pickups for a day; the stunt course; the boss street. Pure data, seeded. */
(function (G) {
  'use strict';
  const C = G.C;
  const W = {};
  function rngOf(seed) { let a = seed >>> 0; const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.int = (a2, b) => Math.floor(a2 + f() * (b - a2 + 1)); f.pick = (arr) => arr[Math.floor(f() * arr.length)]; return f; }
  W.rngOf = rngOf;

  const SUB_WALLS = [[22, 85, 62], [200, 75, 62], [48, 90, 62], [330, 70, 68], [160, 60, 56], [275, 65, 70], [10, 80, 66]];
  const NS_WALLS = [[250, 22, 40], [200, 18, 38], [280, 20, 42], [160, 16, 36]];
  const ROOFS = [[350, 55, 42], [215, 45, 38], [30, 60, 40], [270, 45, 40], [175, 50, 34]];
  const CAR_HUES = [0, 20, 45, 120, 180, 210, 270, 320];

  function mkHouse(rng, side, z0, sub, id) {
    const wall = rng.pick(sub ? SUB_WALLS : NS_WALLS), zc = z0 + 35;
    const h = { id, side, z0, z1: z0 + 70, zc, sub, style: rng.int(0, 2), wall, roof: rng.pick(ROOFS), trim: sub ? [48, 30, 90] : [260, 10, 55], doorHue: rng.int(0, 360),
      windows: [], door: { z: zc, w: 13, hit: 0 }, mailbox: { x: side * 92, z: z0 + rng.int(10, 40), hit: 0, flag: false },
      delivered: false, cancelled: false, mailHit: false, porchHit: false, face: 0, faceT: 0, mood: 0, happy: 0, wob: 0 };
    const nw = h.style === 1 ? 3 : 2;
    h.windows.push({ z: z0 + 13, y0: 17, y1: 35, w: 14, broken: 0 });
    h.windows.push({ z: z0 + 57, y0: 17, y1: 35, w: 14, broken: 0 });
    if (nw === 3) h.windows.push({ z: zc, y0: 44, y1: 56, w: 14, broken: 0, high: true });
    return h;
  }

  W.diffOf = (day, week) => (week - 1) * 1.0 + (day - 1) * 0.14;

  W.route = function (day, week, subs, opts) {
    opts = opts || {};
    const rng = rngOf(week * 1009 + day * 97 + 13), d = W.diffOf(day, week);
    const dm = { cozy: 0.7, normal: 1, hard: 1.35 }[opts.diff || 'normal'] || 1;
    const lotsPer = 11 + day * 2 + Math.min(6, (week - 1) * 2);
    const R = { kind: 'route', day, week, d, dm, lots: [], houses: [], deco: [], pickups: [], dogs: [], movers: [], start: 0, ufos: [], theme: (day - 1 + (week - 1) * 2) % 7 };
    const crossAt = new Set();
    if (day >= 2) { crossAt.add(Math.floor(lotsPer * 0.4)); if (day >= 4) crossAt.add(Math.floor(lotsPer * 0.75)); }
    const z0 = 60; let hid = 0;
    const total = [];
    for (let i = 0; i < lotsPer; i++) {
      const z = z0 + i * C.LOT, cross = crossAt.has(i);
      R.lots.push({ i, z0: z, z1: z + C.LOT, cross });
      if (!cross) total.push({ side: -1, z: z + 12, i });
    }
    const nSub = Math.min(total.length - 2, Math.max(4, subs));
    const idx = total.map((_, k) => k);
    for (let k = idx.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); const tmp = idx[k]; idx[k] = idx[j]; idx[j] = tmp; }
    const subSet = new Set(idx.slice(0, nSub));
    total.forEach((t, k) => { const h = mkHouse(rng, t.side, t.z, subSet.has(k), hid++); h.lot = t.i; R.houses.push(h); });
    R.houses.sort((a, b) => a.z0 - b.z0);
    R.subCount = R.houses.filter((h) => h.sub).length;
    R.end = z0 + lotsPer * C.LOT + 30;

    const add = (o) => { R.deco.push(o); return o; };
    let bundleGap = 0;
    for (const lot of R.lots) {
      if (lot.cross) { add({ t: 'crossroad', z: lot.z0, z1: lot.z1, x: 0 }); continue; }
      for (const side of [-1, 1]) {
        const rz = (a, b) => lot.z0 + a + rng() * (b - a);
        const HS = side < 0;
        if (rng() < (HS ? 0.3 : 0.35)) add({ t: 'tree', x: side * (HS ? 104 + rng() * 22 : 100 + rng() * 26), z: rz(70, 94), r: 7, kind: rng.int(0, 2), solid: true });
        if (HS && rng() < 0.25 * dm) add({ t: 'gnome', x: side * (100 + rng() * 30), z: rz(2, 14), r: 5, hp: 1 });
        if (rng() < 0.1 * dm) add({ t: 'trash', x: side * (68 + rng() * 10), z: rz(0, 98), r: 6, solid: true });
        if (HS && rng() < 0.15) add({ t: 'parked', x: side * 126, z: lot.z0 + 74, r: 12, hue: rng.pick(CAR_HUES), solid: true, hit: 0 });
      }
      if (rng() < 0.2 * dm) add({ t: 'cone', x: (rng() < 0.5 ? -1 : 1) * (8 + rng() * 40), z: lot.z0 + 20 + rng() * 60, r: 4, solid: true });
      if (d >= 0.2 && rng() < 0.12 * dm) add({ t: 'pothole', x: (rng() < 0.5 ? -1 : 1) * (6 + rng() * 40), z: lot.z0 + 10 + rng() * 80, r: 9 });
      if (d >= 0.3 && rng() < 0.12 * dm) { const s = rng() < 0.5 ? -1 : 1; R.movers.push({ t: 'skater', x: s * 74, z: lot.z0 + 40 + rng() * 40, vz: (rng() < 0.5 ? -1 : 1) * (24 + rng() * 10), r: 6, hue: rng.int(0, 360), lo: lot.z0 + 4, hi: lot.z0 + 96, hp: 1, anim: 0 }); }
      bundleGap++;
      if (bundleGap >= 3 && rng() < 0.7) { bundleGap = 0; R.pickups.push({ t: 'bundle', x: (rng() < 0.5 ? -1 : 1) * (rng() < 0.5 ? 70 + rng() * 10 : 10 + rng() * 40), z: lot.z0 + 20 + rng() * 60, n: 8 }); }
      if (lot.i > 1 && lot.i % 4 === 2 && rng() < 0.85) R.pickups.push({ t: 'pu', k: rng.pick(['speed', 'omni', 'shield', 'inf']), x: (rng() - 0.5) * 100, z: lot.z0 + 15 + rng() * 70 });
      if (lot.i === Math.floor(lotsPer * 0.55)) R.pickups.push({ t: 'up', x: (rng() - 0.5) * 60, z: lot.z0 + 40 });
    }
    const rl = R.lots[Math.max(1, Math.floor(lotsPer * 0.3))];
    if (!rl.cross) add({ t: 'ramp', x: (rng() - 0.5) * 70, z: rl.z0 + 30, r: 14, used: false });
    if (day >= 4 || week > 1) { const n = 1 + Math.floor(d / 2); for (let k = 0; k < Math.min(2, n); k++) { const l = R.lots[3 + Math.floor(rng() * (lotsPer - 5))]; R.ufos.push({ t: 'ufo', x: (rng() - 0.5) * 60, z: l.z0 + 50, y: 52, r: 16, hp: 1, ph: rng() * 6, beam: 0, pull: 0 }); } }
    R.papers = Math.max(10, 16 - Math.floor(d));
    R.deco.sort((a, b) => a.z - b.z);
    return R;
  };

  /* training course: targets, ramps, hoops, cones, bars */
  W.course = function (day, week) {
    const rng = rngOf(week * 7919 + day * 31 + 5), R = { kind: 'course', day, week, d: W.diffOf(day, week), lots: [], houses: [], deco: [], pickups: [], dogs: [], movers: [], ufos: [], start: 0, theme: 6, end: 0, targets: 0, hoops: 0 };
    let z = 80;
    const add = (o) => { R.deco.push(o); return o; };
    const n = 11 + Math.min(4, day);
    for (let k = 0; k < n; k++) {
      const m = k % 4, s = rng() < 0.5 ? -1 : 1;
      if (m === 0) { const x = (rng() - 0.5) * 70; add({ t: 'ramp', x, z, r: 14, used: false, course: true }); add({ t: 'hoop', x, z: z + 52, y: 34, r: 15, hit: 0 }); R.hoops++; z += 90; }
      else if (m === 1) { add({ t: 'target', side: s, x: s * 120, z, r: 17, hit: 0 }); add({ t: 'target', side: -s, x: -s * 120, z: z + 44, r: 17, hit: 0 }); R.targets += 2; z += 90; }
      else if (m === 2) { for (let q = 0; q < 3; q++) add({ t: 'cone', x: (rng() - 0.5) * 100, z: z + q * 22, r: 4, solid: true }); add({ t: 'target', side: s, x: s * 110, z: z + 40, r: 17, hit: 0 }); R.targets++; z += 90; }
      else { add({ t: 'bar', x: 0, z, r: 60, h: 10 }); add({ t: 'target', side: s, x: s * 125, z: z + 20, r: 17, hit: 0 }); add({ t: 'target', side: -s, x: -s * 125, z: z + 55, r: 17, hit: 0 }); R.targets += 2; z += 100; }
    }
    add({ t: 'finish', x: 0, z: z + 40 });
    R.end = z + 40; R.papers = 99;
    R.pickups.push({ t: 'pu', k: 'omni', x: 0, z: 200 });
    R.deco.sort((a, b) => a.z - b.z);
    return R;
  };

  W.arena = function (day, week) {
    return { kind: 'boss', day, week, d: W.diffOf(day, week), lots: [], houses: [], deco: [], pickups: [], dogs: [], movers: [], ufos: [], start: 0, theme: 6, end: 1e9, papers: 99, boss: ['rex', 'gorp', 'mower'][(week - 1) % 3] };
  };
  G.world = W;
})((window.SGS = window.SGS || {}));
