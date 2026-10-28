/* World art: dithered skies, layered parallax silhouettes, ground tiles, ledges and cliff caps, drawn per world from palettes (art pixels, 2px each). */
(function (G) {
  'use strict';
  const PX = G.px, GFX = G.gfx, C = G.C, K = PX.K, Pix = PX.Pix, rgb = PX.rgb;
  const A = (GFX.art = GFX.art || {});
  const NW = 512, NH = C.H / K;           // parallax tile in art pixels (1024 x 540 logical)
  const Wd = (A.world = { NW, NH });
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* vertical gradient with ordered-dither band edges. stops = [[t, '#hex'], ...] */
  Wd.grad = function (p, y0, y1, stops, band) {
    band = band === undefined ? 0.5 : band;
    const cs = stops.map((s) => [s[0], rgb(s[1])]);
    for (let y = y0; y < y1; y++) {
      const t = (y - y0) / Math.max(1, y1 - y0 - 1);
      let i = 0; while (i < cs.length - 2 && t > cs[i + 1][0]) i++;
      const a = cs[i], b = cs[i + 1], u = clamp(((t - a[0]) / (b[0] - a[0]) - (1 - band) / 2) / band, 0, 1);
      for (let x = 0; x < p.w; x++) p.d[y * p.w + x] = PX.dither(x, y, u) ? b[1] : a[1];
    }
  };
  Wd.stars = function (p, rnd, n, ymax, cols) {
    cols = cols.map(rgb);
    for (let i = 0; i < n; i++) {
      const x = Math.floor(rnd() * p.w), y = Math.floor(rnd() * ymax), c = cols[Math.floor(rnd() * cols.length)];
      p.set(x, y, c);
      if (rnd() < 0.12) { p.set(x - 1, y, PX.mix(c, rgb('#202040'), 0.5)); p.set(x + 1, y, PX.mix(c, rgb('#202040'), 0.5)); p.set(x, y - 1, PX.mix(c, rgb('#202040'), 0.5)); p.set(x, y + 1, PX.mix(c, rgb('#202040'), 0.5)); }
    }
  };
  /* periodic height profile: returns Float array of NW values in 0..1 */
  Wd.prof = function (seed, per, octs) {
    const out = new Float32Array(NW), ns = [];
    for (let o = 0; o < octs; o++) ns.push(PX.noise(seed * 31 + o * 7, per * (1 << o)));
    for (let x = 0; x < NW; x++) { let v = 0, a = 0.6, s = 0; for (let o = 0; o < octs; o++) { v += ns[o](x / NW * per * (1 << o), 0.5) * a; s += a; a *= 0.5; } out[x] = v / s; }
    return out;
  };
  /* filled silhouette under a height line (ys per column). top/bot colours dither; rim lights the top edge */
  Wd.ridge = function (p, ys, bottom, top, bot, rim, rim2, band) {
    const T = rgb(top), B = rgb(bot), R = rim ? rgb(rim) : 0, R2 = rim2 ? rgb(rim2) : 0;
    for (let x = 0; x < NW; x++) {
      const y0 = Math.floor(ys[x]);
      for (let y = Math.max(0, y0); y < bottom; y++) { const t = (y - y0) / Math.max(1, bottom - y0), u = clamp(((t) - (1 - (band || 0.6)) / 2) / (band || 0.6), 0, 1); p.set(x, y, PX.dither(x, y, u) ? B : T); }
      if (R) { p.set(x, y0, R); const l = ys[(x + NW - 1) % NW]; if (R2 && l > ys[x] + 0.5) p.set(x, y0 + 1, R2); }
    }
  };
  /* a lit sphere with a banded surface: ramp = [hi, lt, base, sh, dp] hex strings */
  Wd.sphere = function (p, cx, cy, r, ramp, bands, seed) {
    const m = new Pix(p.w, p.h), rp = ramp.map(rgb), tmp = new Pix(p.w, p.h);
    m.disc(cx, cy, r, 1); tmp.paint(m, 0, 0, rp, Math.max(3, Math.round(r / 2.2)));
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const c = tmp.d[y * p.w + x]; if (!c) continue;
      let k = rp.indexOf(c);
      if (bands) { const b = Math.sin((y - cy) * bands + PX.hash(Math.floor(x / 9), 0, seed || 1) * 2) + Math.sin((y - cy) * bands * 2.3); if (b > 0.9 && k < 4) k++; else if (b < -1.4 && k > 0) k--; }
      p.set(x, y, rp[k]);
    }
  };
  Wd.craters = function (p, cx, cy, r, rnd, n, dk, lt) {
    for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = rnd() * r * 0.7, x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d), s = 1 + Math.floor(rnd() * r / 5); if (p.get(x, y)) { p.rect(x, y, s + 1, s, rgb(dk)); p.rect(x, y, s, 1, rgb(lt)); } }
  };
  /* a ring around a planet: back half before the planet, front half after */
  Wd.ring = function (p, cx, cy, rx, ry, tilt, w, cols, front, planetMask) {
    const ct = Math.cos(tilt), st = Math.sin(tilt), cs = cols.map(rgb);
    for (let y = cy - rx - 2; y <= cy + rx + 2; y++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = (dx * ct + dy * st) / rx, v = (-dx * st + dy * ct) / ry, d = Math.hypot(u, v);
      if (d > 1 - w && d < 1 && (v >= 0) === front) p.set(x, y, cs[Math.floor((d - (1 - w)) / w * cs.length) % cs.length]);
    }
  };

  /* ---------- tileable ground, ledges, cliff caps ---------- */
  A.worldPal = [
    { name: 'jungle', grass: ['#c8ff9a', '#6fe07a', '#37b45a', '#1f7a46'], earth: ['#6a4c62', '#4e3650', '#37243c', '#20122a'], stone: '#7c6486', glow: '#7affd8', glow2: '#ff7ad0' },
    { name: 'ice', grass: ['#ffffff', '#d8f4ff', '#9ad8f8', '#5ea0e0'], earth: ['#5a8ed0', '#3a62a8', '#264380', '#162654'], stone: '#8cc0f0', glow: '#a8f4ff', glow2: '#ffffff' },
    { name: 'magma', grass: ['#ffb060', '#e0602a', '#7a2a1a', '#3a1414'], earth: ['#4a3038', '#33202a', '#22141e', '#12080e'], stone: '#5a3c46', glow: '#ff9a2a', glow2: '#ffe27a' },
    { name: 'hive', grass: ['#ff9ac8', '#d8508e', '#8e2a68', '#521040'], earth: ['#6e2a58', '#501a46', '#34102e', '#1e0820'], stone: '#a0507e', glow: '#ff7ad0', glow2: '#ffd0ee' },
    { name: 'steel', grass: ['#e0e8ff', '#a8b8e0', '#7080b0', '#46548a'], earth: ['#4a5a86', '#36446e', '#26325a', '#161e3c'], stone: '#6a7aa8', glow: '#ffb02e', glow2: '#7affff' },
  ];
  const GW = 64, GH = 53, TOP = 3;           // ground tile: 64 art px wide, 3 rows of overhang + 50 body
  const E = (t) => A.worldPal[t];
  function stone(p, cx, cy, rx, ry, base) {
    const m = new Pix(p.w, p.h), rp = PX.ramp(0, 0, 50).map(() => 0), c = rgb(base);
    const ramp = [PX.mix(c, rgb('#ffffff'), 0.45), PX.mix(c, rgb('#ffffff'), 0.2), c, PX.mix(c, rgb('#0c0618'), 0.35), PX.mix(c, rgb('#0c0618'), 0.6)];
    for (const ox of [-GW, 0, GW]) m.ell(cx + ox, cy, rx, ry, 1);
    p.paint(m, 0, 0, ramp, 2);
  }
  /* seamless ground tile (period GW) for a world */
  function groundPix(t) {
    const P = E(t), rnd = PX.rng(t * 977 + 5), p = new Pix(GW, GH), ea = P.earth.map(rgb), gr = P.grass.map(rgb), nz = PX.noise(t * 13 + 3, 8);
    for (let y = TOP; y < GH; y++) for (let x = 0; x < GW; x++) {
      const d = (y - TOP) / (GH - TOP), wob = (nz(x / GW * 8, y * 0.3) - 0.5) * 0.12, u = d + wob;
      const i = u < 0.1 ? 0 : u < 0.42 ? 1 : u < 0.72 ? 2 : 3, k = [0.1, 0.42, 0.72, 1.0];
      let c = ea[i]; const f = (u - (i ? k[i - 1] : 0)) / (k[i] - (i ? k[i - 1] : 0));
      if (i < 3 && f > 0.8 && PX.dither(x, y, (f - 0.8) / 0.2)) c = ea[i + 1];
      p.set(x, y, c);
    }
    for (let i = 0; i < 90; i++) { const x = Math.floor(rnd() * GW), y = TOP + 6 + Math.floor(rnd() * (GH - TOP - 8)); p.set(x, y, rnd() < 0.5 ? ea[0] : ea[3]); }
    for (let i = 0; i < (t === 4 ? 0 : 6); i++) stone(p, rnd() * GW, TOP + 8 + rnd() * 34, 2 + rnd() * 3, 1.6 + rnd() * 1.8, P.stone);
    const crack = (c1, c2, n, len, step) => { for (let i = 0; i < n; i++) { let x = Math.floor(rnd() * GW), y = TOP + 6 + Math.floor(rnd() * 10); for (let q = 0; q < len; q++) { x += Math.floor(rnd() * 3) - 1; y += step; p.set((x + GW) % GW, y, c1); if (c2 && q % 2 === 0) p.set((x + GW + 1) % GW, y, c2); } } };
    if (t === 1) crack(rgb('#d8f4ff'), 0, 5, 14, 1);
    else if (t === 2) { crack(rgb('#ff8a2a'), rgb('#ffd060'), 5, 22, 1); crack(rgb('#c0401a'), 0, 4, 12, 1); }
    else if (t === 3) { crack(rgb('#e0508c'), rgb('#ff9ac8'), 6, 22, 1); }
    else if (t === 4) {
      for (const sy of [TOP + 15, TOP + 31]) { for (let x = 0; x < GW; x++) { p.set(x, sy, ea[3]); p.set(x, sy + 1, PX.mix(ea[0], ea[1], 0.4)); } }
      for (const sx of [0, 32]) for (let y = TOP + 6; y < GH; y++) { p.set(sx, y, ea[3]); p.set(sx + 1, y, PX.mix(ea[0], ea[1], 0.4)); }
      for (const sx of [3, 29, 35, 61]) for (const sy of [TOP + 9, TOP + 19, TOP + 25, TOP + 35, TOP + 41]) { p.set(sx, sy, ea[0]); p.set(sx + 1, sy, ea[0]); p.set(sx, sy + 1, ea[3]); p.set(sx + 1, sy + 1, ea[3]); }
      for (let x = 0; x < GW; x++) for (let y = TOP + 5; y <= TOP + 7; y++) p.set(x, y, ((x + y) >> 2) % 2 ? rgb('#ffb02e') : rgb('#161a30'));
      p.set(14, TOP + 22, rgb('#ff7a1a')); p.set(15, TOP + 22, rgb('#ffd060')); p.set(46, TOP + 38, rgb('#7affff'));
    }
    // surface growth
    const ys = [];
    for (let x = 0; x < GW; x++) ys[x] = TOP + 1 + (t === 4 ? 0 : Math.round(nz(x / GW * 8, 9.5) * 1.6));
    for (let x = 0; x < GW; x++) {
      const y0 = ys[x];
      for (let y = TOP - 1; y < y0; y++) p.set(x, y, 0);
      p.set(x, y0 - 0, gr[0]); p.set(x, y0 + 1, gr[1]); p.set(x, y0 + 2, gr[1]); p.set(x, y0 + 3, gr[2]);
      if (t === 4) { p.set(x, y0 + 4, gr[3]); continue; }
      const dr = rnd() < 0.3 ? 2 + Math.floor(rnd() * 3) : 0;
      for (let q = 0; q < dr; q++) p.set(x, y0 + 4 + q, q < dr - 1 ? gr[2] : gr[3]);
      p.set(x, y0 + 4 + dr, gr[3]);
    }
    if (t !== 4) for (let i = 0; i < 18; i++) { const x = Math.floor(rnd() * GW), h = 1 + Math.floor(rnd() * 2); for (let q = 1; q <= h; q++) { p.set(x, ys[x] - q, q === h ? gr[0] : gr[1]); } }
    return p;
  }
  const gcache = {};
  A.ground = function (t) {
    if (gcache[t]) return gcache[t];
    const p = groundPix(t), c = p.toCanvas(K);
    return (gcache[t] = { c, w: GW * K, h: GH * K, top: TOP * K });
  };
  /* cliff cap: a jagged, shaded rock face that closes the end of a solid platform (left end; mirror for the right) */
  const CW = 8;
  A.cap = function (t) {
    const key = 'cap' + t;
    if (gcache[key]) return gcache[key];
    const P = E(t), rnd = PX.rng(t * 331 + 9), p = new Pix(CW, GH), ea = P.earth.map(rgb), gr = P.grass.map(rgb), src = groundPix(t);
    let e = 2;
    for (let y = TOP; y < GH; y++) {
      e = clamp(e + Math.floor(rnd() * 3) - 1, 1, 4);
      for (let x = 0; x < CW; x++) {
        if (x < e) continue;
        let c = src.get(x + 8, y);
        const dx = x - e;
        if (dx === 0) c = PX.mix(ea[3], rgb('#05030a'), 0.4); else if (dx === 1) c = ea[2]; else if (dx === 2 && PX.dither(x, y, 0.5)) c = ea[2];
        p.set(x, y, c);
      }
    }
    for (let y = 0; y < TOP + 6; y++) for (let x = 0; x < CW; x++) { const c = src.get(x + 8, y); if (c && y < TOP + 6) p.set(Math.max(x - 1, 0) * 1 + 0, y, c); }
    for (let x = 0; x < CW; x++) { const c = src.get(x + 8, TOP); if (c) {} }
    const s = { c: p.toCanvas(K), w: CW * K, h: GH * K, top: TOP * K };
    return (gcache[key] = s);
  };
  /* ---------- ledges: one-way platforms (left cap, tiling middle, right cap) ---------- */
  const LH = 15;
  function ledgePix(t, w, caps) {
    const P = E(t), rnd = PX.rng(t * 41 + w), p = new Pix(w, LH), gr = P.grass.map(rgb), ea = P.earth.map(rgb), nz = PX.noise(t * 5 + 1, w);
    for (let x = 0; x < w; x++) {
      let top = 0, bot = 6 + Math.round(nz(x, 3.3) * 2);
      if (caps === 1) { if (x < 3) { top = 3 - x; bot -= 3 - x; } } else if (caps === 2) { if (x > w - 4) { top = x - (w - 4); bot -= x - (w - 4); } }
      for (let y = top; y <= bot; y++) {
        let c = y === top ? gr[0] : y === top + 1 ? gr[1] : y === top + 2 ? gr[2] : y < bot - 1 ? (y < top + 5 ? ea[1] : ea[2]) : ea[3];
        if (y > top + 2 && y < bot - 1 && PX.dither(x, y, 0.1)) c = ea[0];
        p.set(x, y, c);
      }
      p.set(x, top + 3, gr[3]);
    }
    return p;
  }
  function ledgeDecor(t, p, w, caps) {
    const P = E(t), rnd = PX.rng(t * 53 + w + caps), gr = P.grass.map(rgb), ea = P.earth.map(rgb), gl = rgb(P.glow), gl2 = rgb(P.glow2);
    const n = Math.max(2, Math.floor(w / 9));
    for (let i = 0; i < n; i++) {
      const x = caps === 1 ? 3 + Math.floor(rnd() * (w - 4)) : caps === 2 ? Math.floor(rnd() * (w - 4)) : Math.floor(rnd() * w), len = 3 + Math.floor(rnd() * 7);
      let y0 = 6; while (y0 < LH && !p.get(x, y0)) y0++; if (y0 >= LH) y0 = 6;
      if (t === 0) { for (let q = 0; q < len; q++) { p.set(x, y0 + q, q % 3 === 2 ? gr[1] : gr[3]); } p.set(x + 1, y0 + len - 1, gr[1]); p.set(x - 1, y0 + len - 2, gr[2]); }
      else if (t === 1) { for (let q = 0; q < len; q++) { const hw = q < len / 2 ? 1 : 0; p.set(x, y0 + q, q < len - 1 ? gr[1] : gr[0]); if (hw) p.set(x + 1, y0 + q, gr[2]); } p.set(x, y0 + len, gr[0]); }
      else if (t === 2) { for (let q = 0; q < len - 2; q++) p.set(x, y0 + q, q === 0 ? gl : q % 2 ? gr[1] : gr[2]); p.set(x, y0 + len - 2, gl2); }
      else if (t === 3) { for (let q = 0; q < len; q++) { p.set(x + (q > 3 ? 1 : 0), y0 + q, q % 2 ? gr[2] : gr[1]); } p.set(x + 1, y0 + len, gl); }
      else { for (let q = 0; q < Math.min(len, 5); q++) { p.set(x, y0 + q, ea[2]); p.set(x + 1, y0 + q, ea[3]); } p.set(x, y0 + Math.min(len, 5), gl); }
    }
    if (t === 4) for (let x = 2; x < w - 1; x += 8) { p.set(x, 1, ea[0]); p.set(x + 1, 1, ea[0]); }
  }
  A.ledge = function (t) {
    const key = 'ledge' + t;
    if (gcache[key]) return gcache[key];
    const mk = (w, caps) => { const p = ledgePix(t, w, caps); ledgeDecor(t, p, w, caps); return { c: p.toCanvas(K), w: w * K, h: LH * K }; };
    return (gcache[key] = { mid: mk(32, 0), left: mk(8, 1), right: mk(8, 2) });
  };
  /* ---------- parallax layers ---------- */
  const gens = (A.layerGens = []);
  function wrapDraw(fn) { for (const ox of [-NW, 0, NW]) fn(ox); }
  function mushroom(p, x, baseY, h, rx, ramp, trunk, glowCols, rnd) {
    wrapDraw((ox) => {
      const cx = x + ox, m = new Pix(p.w, p.h), tm = new Pix(p.w, p.h);
      tm.rect(cx - 1, baseY - h, 3, h + 2, 1); p.paint(tm, 0, 0, trunk, 2);
      m.ell(cx, baseY - h, rx, rx * 0.34, 1); m.ell(cx, baseY - h + 1, rx * 0.8, rx * 0.3, 1); p.paint(m, 0, 0, ramp, 3);
      for (let q = -rx * 0.8; q < rx * 0.8; q += 2 + Math.floor(rnd() * 3)) { const hl = 1 + Math.floor(rnd() * 3); for (let y = 0; y < hl; y++) p.set(Math.round(cx + q), baseY - h + Math.round(rx * 0.3) + 1 + y, ramp[4]); if (rnd() < 0.5) p.set(Math.round(cx + q), baseY - h + Math.round(rx * 0.3) + 2 + hl, glowCols[Math.floor(rnd() * glowCols.length)]); }
    });
  }
  gens[0] = [
    function (p, rnd) {
      Wd.grad(p, 0, NH, [[0, '#0d1033'], [0.28, '#1c1a52'], [0.5, '#3d2670'], [0.66, '#8a3a86'], [0.8, '#e0668a'], [1, '#ffb08a']]);
      Wd.stars(p, rnd, 90, 105, ['#ffffff', '#cfd8ff', '#ffd8f0']);
      const cx = 336, cy = 64;
      Wd.ring(p, cx, cy, 60, 15, -0.32, 0.2, ['#8a4aa0', '#e07ab8', '#f8b0d8', '#c060a8'], false);
      Wd.sphere(p, cx, cy, 30, ['#ffe0f0', '#f6b0d8', '#c8649e', '#742c7e', '#3a1a58'], 0.5, 3);
      Wd.ring(p, cx, cy, 60, 15, -0.32, 0.2, ['#8a4aa0', '#e07ab8', '#f8b0d8', '#c060a8'], true);
      Wd.sphere(p, 118, 44, 8, ['#f0fbf6', '#c0dcd6', '#86aab0', '#506e88', '#2a4062'], 0, 1); Wd.craters(p, 118, 44, 8, rnd, 4, '#4a6a84', '#d8ece8');
      const a = Wd.prof(2, 4, 3), b = Wd.prof(5, 7, 3), ya = new Float32Array(NW), yb = new Float32Array(NW);
      for (let x = 0; x < NW; x++) { ya[x] = 176 - a[x] * 56; yb[x] = 202 - b[x] * 40; }
      Wd.ridge(p, ya, NH, '#3c2c80', '#c8508a', '#8a6ad0', '#6a4ab0', 0.7);
      Wd.ridge(p, yb, NH, '#2c2468', '#7a3482', '#6a4cb0', '#4a3a98', 0.6);
    },
    function (p, rnd) {
      const h = Wd.prof(9, 5, 3), ys = new Float32Array(NW); for (let x = 0; x < NW; x++) ys[x] = 190 - h[x] * 26;
      const glow = ['#7affd8', '#ff8ad8', '#9affb0'].map(rgb), bush = ['#2aa890', '#1a7e78', '#115866', '#0b3a50', '#072436'].map(rgb);
      const canopy = ['#ff9ac0', '#3cc0a8', '#1f8a84', '#145a68', '#0b3248'].map(rgb), trunk = ['#3ab0a0', '#26887e', '#176068', '#0f4252', '#0a2c40'].map(rgb);
      Wd.ridge(p, ys, NH, '#175060', '#0a2a38', '#2e9a88', '#1f7a74', 0.7);
      // trunks (curved, tapering)
      const tm = new Pix(NW, NH), cm = new Pix(NW, NH), bm = new Pix(NW, NH), trees = [];
      for (let i = 0; i < 8; i++) trees.push({ x: (i + 0.2 + rnd() * 0.6) * (NW / 8), h: 40 + rnd() * 44, rx: 15 + rnd() * 10, bend: (rnd() - 0.5) * 14 });
      for (const t of trees) for (const ox of [-NW, 0, NW]) {
        const base = ys[(Math.round(t.x) % NW + NW) % NW] + 4;
        for (let q = 0; q <= t.h; q++) { const u = q / t.h, w = Math.round(5 - u * 2.4), bx = t.x + ox + Math.sin(u * 2.2) * t.bend; tm.rect(bx - w / 2, base - q, w, 1, 1); }
        const tx = t.x + ox + Math.sin(2.2) * t.bend, ty = base - t.h;
        cm.ell(tx, ty, t.rx, t.rx * 0.36, 1); cm.ell(tx, ty + 2, t.rx * 0.78, t.rx * 0.3, 1); cm.ell(tx - t.rx * 0.5, ty - 2, t.rx * 0.4, t.rx * 0.22, 1);
        t.tx = tx; t.ty = ty;
      }
      p.paint(tm, 0, 0, trunk, 2);
      for (let i = 0; i < 70; i++) { const x = Math.floor(rnd() * NW), r = 5 + rnd() * 8; for (const ox of [-NW, 0, NW]) bm.ell(x + ox, ys[x] + 2 - rnd() * 5, r, r * 0.8, 1); }
      p.paint(bm, 0, 0, bush, 3); p.paint(cm, 0, 0, canopy, 3);
      for (const t of trees) for (const ox of [-NW, 0, NW]) for (let q = -t.rx * 0.8; q < t.rx * 0.8; q += 3 + Math.floor(rnd() * 3)) {
        const hl = 3 + Math.floor(rnd() * 12), x = Math.round(t.tx + (q) + (ox ? 0 : 0) - (t.tx - t.x - 0)), yy = Math.round(t.ty + t.rx * 0.28);
        for (let y = 0; y < hl; y++) p.set(Math.round(t.tx + q) - 0 + (ox ? ox - ox : 0), yy + y, y > hl - 3 ? canopy[3] : canopy[4]);
        if (rnd() < 0.55) p.set(Math.round(t.tx + q), yy + hl + 1, glow[Math.floor(rnd() * 3)]);
      }
      for (let i = 0; i < 46; i++) { const x = Math.floor(rnd() * NW), y = 110 + Math.floor(rnd() * 90); if (!p.get(x, y)) p.set(x, y, glow[Math.floor(rnd() * 3)]); }
    },
    function (p, rnd) {
      const dk = rgb('#06201c'), rim = [rgb('#1f7a50'), rgb('#3fd07a')], glow = ['#7affd8', '#ff8ad8'].map(rgb);
      for (let i = 0; i < 26; i++) {
        const x = (i + rnd() * 0.8) * (NW / 26), blades = 4 + Math.floor(rnd() * 5);
        for (let b = 0; b < blades; b++) {
          const lean = (rnd() - 0.5) * 2.4, len = 14 + Math.floor(rnd() * 26), w0 = 2 + Math.floor(rnd() * 2);
          for (let q = 0; q < len; q++) {
            const u = q / len, bx = Math.round(x + lean * q * 0.55 + Math.sin(u * 3) * lean * 2), by = 224 - q, w = Math.max(1, Math.round(w0 * (1 - u)));
            for (let k = 0; k < w; k++) for (const ox of [-NW, 0, NW]) p.set(bx + k + ox, by, k === 0 ? rim[q > len * 0.6 ? 1 : 0] : dk);
          }
        }
      }
      for (let i = 0; i < 30; i++) { const x = Math.floor(rnd() * NW), y = 190 + Math.floor(rnd() * 34); if (!p.get(x, y)) p.set(x, y, glow[Math.floor(rnd() * 2)]); }
      p.rect(0, 223, NW, 47, dk);
    },
  ];
  const lcache = {};
  A.layer = function (theme, idx) {
    const key = theme + '|' + idx;
    if (lcache[key]) return lcache[key];
    const g = gens[theme] && gens[theme][idx];
    const p = new Pix(NW, NH);
    if (g) g(p, PX.rng(theme * 101 + idx * 17 + 3));
    else if (idx === 0) Wd.grad(p, 0, NH, [[0, '#0a0d24'], [1, '#2a2a60']]);
    return (lcache[key] = p.toCanvas(K));
  };
})((window.SGS = window.SGS || {}));
