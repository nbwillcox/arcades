/* The 15 circuits (3 cups x 5 worlds): hand-placed control points, a smooth closed spline, equal-spaced samples for physics and AI, auto-placed features. */
(function (G) {
  'use strict';
  const C = G.C, TAU = Math.PI * 2;
  const T = {};
  G.tracks = T;
  T.WORLDS = [{ name: 'NEON CITY' }, { name: 'FROST BELT' }, { name: 'MAGMA RING' }, { name: 'SPORE JUNGLE' }, { name: 'ORBITAL STATION' }];
  T.CUPS = [{ name: 'MESON CUP', w: 84 }, { name: 'QUASAR CUP', w: 76 }, { name: 'PULSAR CUP', w: 68 }];
  const DEF = [
    ['NEON DRIVE', [[760, 400], [1290, 400], [1600, 480], [1740, 760], [1740, 1180], [1620, 1480], [1330, 1640], [1160, 1560], [1000, 1700], [700, 1680], [460, 1480], [360, 1160], [380, 780], [520, 520]]],
    ['FROST RUN', [[900, 330], [1250, 330], [1500, 430], [1600, 650], [1450, 830], [1230, 830], [1160, 1000], [1330, 1130], [1620, 1250], [1700, 1520], [1500, 1740], [1150, 1740], [860, 1620], [640, 1700], [430, 1560], [360, 1250], [430, 930], [660, 760], [560, 520], [700, 380]]],
    ['MAGMA LOOP', [[480, 960], [600, 620], [960, 480], [1320, 560], [1520, 760], [1750, 640], [1850, 940], [1720, 1250], [1420, 1330], [1160, 1180], [900, 1360], [960, 1650], [660, 1740], [420, 1520], [330, 1200]]],
    ['JUNGLE RUSH', [[700, 500], [1000, 390], [1300, 500], [1280, 760], [980, 880], [1080, 1120], [1400, 1080], [1680, 1260], [1580, 1560], [1280, 1720], [960, 1580], [720, 1710], [450, 1520], [520, 1220], [350, 930], [470, 680]]],
    ['STATION ALPHA', [[1020, 360], [1500, 520], [1740, 900], [1620, 1300], [1280, 1560], [1000, 1720], [700, 1560], [420, 1320], [330, 900], [560, 520]]],
    ['NEON SKYLINE', [[640, 420], [1020, 350], [1400, 420], [1700, 640], [1700, 960], [1400, 1020], [1130, 1180], [1400, 1400], [1700, 1500], [1600, 1740], [1200, 1760], [900, 1600], [620, 1700], [380, 1480], [420, 1150], [620, 980], [420, 760]]],
    ['GLACIER PASS', [[360, 1500], [430, 1150], [700, 950], [950, 1100], [1200, 900], [1000, 650], [1150, 430], [1500, 360], [1760, 560], [1700, 860], [1480, 1000], [1650, 1250], [1500, 1560], [1200, 1700], [900, 1550], [650, 1720]]],
    ['EMBER RIFT', [[500, 500], [900, 420], [1250, 520], [1400, 760], [1150, 900], [1350, 1100], [1700, 1000], [1790, 1300], [1600, 1600], [1250, 1650], [1000, 1450], [750, 1650], [450, 1500], [380, 1100], [600, 900], [360, 740]]],
    ['CANOPY DASH', [[1000, 400], [1350, 450], [1650, 700], [1650, 1050], [1400, 1200], [1150, 1050], [900, 1150], [950, 1450], [1250, 1700], [900, 1760], [550, 1600], [400, 1250], [400, 850], [600, 550]]],
    ['STATION BETA', [[560, 500], [1000, 420], [1480, 500], [1700, 800], [1560, 1100], [1180, 1150], [1100, 1450], [1500, 1600], [1250, 1780], [800, 1740], [500, 1560], [380, 1200], [480, 850]]],
    ['NEON OVERDRIVE', [[400, 700], [800, 400], [1150, 520], [1500, 380], [1760, 650], [1650, 950], [1350, 1000], [1200, 1250], [1500, 1450], [1750, 1650], [1400, 1790], [1050, 1650], [750, 1780], [420, 1600], [560, 1300], [330, 1050]]],
    ['BLIZZARD SPIRAL', [[420, 500], [900, 400], [1350, 470], [1700, 520], [1790, 820], [1420, 900], [1000, 820], [650, 960], [640, 1250], [1000, 1300], [1400, 1250], [1760, 1350], [1740, 1650], [1300, 1770], [850, 1680], [500, 1760], [330, 1450], [380, 1000]]],
    ['INFERNO GATE', [[520, 420], [1000, 380], [1450, 420], [1750, 700], [1750, 1000], [1500, 1200], [1100, 1180], [1000, 1450], [1300, 1700], [1000, 1790], [560, 1700], [380, 1300], [380, 800]]],
    ['SPORE RUN', [[600, 380], [1000, 520], [1250, 380], [1620, 520], [1700, 880], [1400, 1000], [1700, 1200], [1650, 1560], [1300, 1500], [1050, 1700], [700, 1600], [450, 1750], [330, 1350], [560, 1150], [360, 900]]],
    ['STATION OMEGA', [[500, 420], [1100, 330], [1600, 420], [1780, 800], [1500, 1000], [1700, 1250], [1500, 1580], [1100, 1500], [950, 1250], [700, 1450], [900, 1750], [500, 1780], [330, 1400], [600, 1100], [380, 820]]],
  ];
  T.list = DEF.map((d, i) => ({ id: i, name: d[0], cup: Math.floor(i / 5), world: i % 5, w: T.CUPS[Math.floor(i / 5)].w, pts: d[1] }));
  T.DEF = DEF;
  { const d = DEF[11][1]; for (const p of d) { p[0] = Math.round(1024 + (p[0] - 1024) * 0.84); p[1] = Math.round(1040 + (p[1] - 1040) * 0.84); } }   // the zigzag was a very long lap

  function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
  }
  const cache = {};
  T.build = function (i) {
    if (cache[i]) return cache[i];
    const def = T.list[i], P = def.pts, n = P.length, dense = [];
    for (let k = 0; k < n; k++) for (let j = 0; j < 40; j++) dense.push(catmull(P[(k + n - 1) % n], P[k], P[(k + 1) % n], P[(k + 2) % n], j / 40));
    const cum = [0];
    for (let k = 1; k <= dense.length; k++) { const a = dense[k - 1], b = dense[k % dense.length]; cum.push(cum[k - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    let total = cum[cum.length - 1], N = Math.round(total / C.STEP), step = total / N, x = new Float32Array(N), y = new Float32Array(N);
    let k = 0;
    for (let s = 0; s < N; s++) { const target = s * step; while (cum[k + 1] < target) k++; const a = dense[k], b = dense[(k + 1) % dense.length], f = (target - cum[k]) / (cum[k + 1] - cum[k]); x[s] = a[0] + (b[0] - a[0]) * f; y[s] = a[1] + (b[1] - a[1]) * f; }
    // relax tight corners: a few moving-average passes, then resample again at equal spacing
    const minRadius = () => {
      let mr = 1e9;
      for (let s = 0; s < N; s++) { const a = (s + N - 4) % N, b = (s + 4) % N, abx = x[s] - x[a], aby = y[s] - y[a], bcx = x[b] - x[s], bcy = y[b] - y[s], cr = Math.abs(abx * bcy - aby * bcx); if (cr > 1e-3) mr = Math.min(mr, (Math.hypot(abx, aby) * Math.hypot(bcx, bcy) * Math.hypot(x[b] - x[a], y[b] - y[a])) / (2 * cr)); }
      return mr;
    };
    for (let pass = 0; pass < 140; pass++) {
      if (pass >= 3 && minRadius() >= def.w * 1.2) break;
      const nx2 = new Float32Array(N), ny2 = new Float32Array(N), R = 7;
      for (let s = 0; s < N; s++) { let ax = 0, ay = 0; for (let q = -R; q <= R; q++) { ax += x[(s + q + N) % N]; ay += y[(s + q + N) % N]; } nx2[s] = ax / (2 * R + 1); ny2[s] = ay / (2 * R + 1); }
      x = nx2; y = ny2;
    }
    {
      const cm = [0]; for (let s = 1; s <= N; s++) cm.push(cm[s - 1] + Math.hypot(x[s % N] - x[s - 1], y[s % N] - y[s - 1]));
      total = cm[N]; N = Math.round(total / C.STEP); step = total / N;
      const x2 = new Float32Array(N), y2 = new Float32Array(N); let q = 0, m = cm.length - 1;
      for (let s = 0; s < N; s++) { const target = s * step; while (cm[q + 1] < target && q < m - 1) q++; const a = q % x.length, b = (q + 1) % x.length, f = (target - cm[q]) / (cm[q + 1] - cm[q]); x2[s] = x[a] + (x[b] - x[a]) * f; y2[s] = y[a] + (y[b] - y[a]) * f; }
      x = x2; y = y2;
    }
    const tx = new Float32Array(N), ty = new Float32Array(N), cv = new Float32Array(N);
    for (let s = 0; s < N; s++) { const a = (s + N - 2) % N, b = (s + 2) % N, dx = x[b] - x[a], dy = y[b] - y[a], l = Math.hypot(dx, dy); tx[s] = dx / l; ty[s] = dy / l; }
    for (let s = 0; s < N; s++) { const b = (s + 1) % N, c1 = tx[s] * ty[b] - ty[s] * tx[b]; cv[s] = Math.asin(Math.max(-1, Math.min(1, c1))) / step; }
    // start/finish goes in the middle of the straightest 260-unit stretch
    const win = Math.round(260 / step), sm = new Float32Array(N);
    for (let s = 0; s < N; s++) { let a = 0; for (let q = 0; q < win; q++) a += Math.abs(cv[(s + q) % N]); sm[s] = a; }
    let best = 0; for (let s = 1; s < N; s++) if (sm[s] < sm[best]) best = s;
    const shift = (best + (win >> 1)) % N, rot = (arr) => { const o = new Float32Array(N); for (let s = 0; s < N; s++) o[s] = arr[(s + shift) % N]; return o; };
    const tr = { def, id: i, name: def.name, cup: def.cup, world: def.world, w: def.w, half: def.w / 2, N, step, L: N * step, x: rot(x), y: rot(y), tx: rot(tx), ty: rot(ty), cv: rot(cv), laps: C.LAPS, feats: [] };
    tr.nx = new Float32Array(N); tr.ny = new Float32Array(N);
    for (let s = 0; s < N; s++) { tr.nx[s] = -tr.ty[s]; tr.ny[s] = tr.tx[s]; }
    tr.at = function (s, d) {
      s = ((s % tr.L) + tr.L) % tr.L;
      const f = s / tr.step, a = Math.floor(f) % N, b = (a + 1) % N, u = f - Math.floor(f);
      const cx = tr.x[a] + (tr.x[b] - tr.x[a]) * u, cy = tr.y[a] + (tr.y[b] - tr.y[a]) * u, ax = tr.tx[a] + (tr.tx[b] - tr.tx[a]) * u, ay = tr.ty[a] + (tr.ty[b] - tr.ty[a]) * u, l = Math.hypot(ax, ay) || 1;
      return { x: cx - (ay / l) * d, y: cy + (ax / l) * d, ang: Math.atan2(ay, ax) };
    };
    /* nearest point on the centre line: search a window around hint (a sample index) or the whole loop when hint < 0 */
    tr.nearest = function (px, py, hint) {
      let lo = 0, hi = N - 1;
      if (hint >= 0) { lo = hint - 24; hi = hint + 48; }
      let bi = 0, bd = 1e18;
      for (let q = lo; q <= hi; q++) { const s = ((q % N) + N) % N, dx = px - tr.x[s], dy = py - tr.y[s], d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; bi = s; } }
      let ts = bi;
      for (const i0 of [(bi + N - 1) % N, bi]) {
        const i1 = (i0 + 1) % N, sx = tr.x[i1] - tr.x[i0], sy = tr.y[i1] - tr.y[i0], l2 = sx * sx + sy * sy, f = Math.max(0, Math.min(1, ((px - tr.x[i0]) * sx + (py - tr.y[i0]) * sy) / l2));
        const qx = tr.x[i0] + sx * f, qy = tr.y[i0] + sy * f, d2 = (px - qx) * (px - qx) + (py - qy) * (py - qy);
        if (d2 <= bd + 1e-6) { bd = d2; ts = i0 + f; }
      }
      ts = ((ts % N) + N) % N;
      const cs = Math.floor(ts) % N, cn = (cs + 1) % N, fu = ts - Math.floor(ts);
      const cx = tr.x[cs] + (tr.x[cn] - tr.x[cs]) * fu, cy = tr.y[cs] + (tr.y[cn] - tr.y[cs]) * fu, nxv = tr.nx[cs] + (tr.nx[cn] - tr.nx[cs]) * fu, nyv = tr.ny[cs] + (tr.ny[cn] - tr.ny[cs]) * fu;
      return { i: cs, s: ts * tr.step, d: (px - cx) * nxv + (py - cy) * nyv };
    };
    tr.curv = (s) => tr.cv[(Math.floor(s / tr.step) % N + N) % N];
    T.placeFeatures(tr);
    return (cache[i] = tr);
  };

  /* dash pads, ramps, mines, rough patches, ice and a recharge strip, seeded per track */
  T.placeFeatures = function (tr) {
    const rnd = G.px.rng(tr.id * 7919 + 11), L = tr.L, f = tr.feats, cup = tr.cup, half = tr.half;
    const straight = (s, len) => { let a = 0, n = 0; for (let q = s - 24; q <= s + len + 24; q += tr.step) { a += Math.abs(tr.curv(q)); n++; } return a / n < 0.0026; };
    const free = (s, gap) => !f.some((o) => Math.abs(((o.s - s + L * 1.5) % L) - L * 0.5) < gap);
    const place = (k, n, p, gap, needStraight, lane) => {
      let tries = 0, made = 0;
      while (made < n && tries++ < 600) {
        const s = L * (0.05 + rnd() * 0.88);
        if (needStraight && !straight(s, p.l)) continue;
        if (!free(s, gap)) continue;
        f.push(Object.assign({ k, s, d: lane === undefined ? (rnd() * 2 - 1) * half * 0.55 : lane }, p)); made++;
      }
    };
    place('dash', [5, 6, 7][cup], { w: 20, l: 44 }, 110, true);
    place('jump', [1, 2, 2][cup], { w: Math.round(tr.w * 0.46), l: 30 }, 260, true);
    place('mine', [2, 4, 6][cup], { w: 14, l: 14 }, 140, false);
    place('rough', [2, 3, 4][cup], { w: 34, l: 80 }, 120, false);
    if (tr.world === 1) place('ice', [3, 4, 5][cup], { w: 56, l: 120 }, 150, false);
    // one recharge strip along an edge shortly before the finish line
    let rs = L * 0.9, guard = 0;
    while (!straight(rs, 150) && guard++ < 40) rs -= tr.step * 3;
    f.push({ k: 'rec', s: rs, d: (rnd() < 0.5 ? -1 : 1) * (half - 13), w: 16, l: 150 });
    f.sort((a, b) => a.s - b.s);
  };
  /* starting grid slot k (0 = pole): staggered pairs behind the line */
  T.slot = function (tr, k) { return { s: -(k >> 1) * 34 - 16 - (k & 1) * 15, d: ((k & 1) ? 1 : -1) * tr.w * 0.2 }; };
})((window.SGS = window.SGS || {}));
