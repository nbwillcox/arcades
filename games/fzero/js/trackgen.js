/* Paints a track into a 2048 x 2048 texture: world ground, rails, road, lane markings and the feature stamps. Physics never reads this; it is only what the Mode-7 view samples. */
(function (G) {
  'use strict';
  const C = G.C, PX = G.px, MAP = C.MAP;
  const TG = {};
  G.trackgen = TG;
  const hex = PX.rgb;
  /* low-res value noise grid, sampled bilinearly (cheap enough for 4M pixels) */
  function noiseGrid(seed, n) {
    const g = new Float32Array((n + 1) * (n + 1)), rnd = PX.rng(seed);
    for (let i = 0; i < g.length; i++) g[i] = rnd();
    for (let i = 0; i <= n; i++) { g[i * (n + 1) + n] = g[i * (n + 1)]; g[n * (n + 1) + i] = g[i]; }
    return (x, y) => {
      const fx = x * n, fy = y * n, ix = Math.floor(fx), iy = Math.floor(fy), ux = fx - ix, uy = fy - iy, sx = ux * ux * (3 - 2 * ux), sy = uy * uy * (3 - 2 * uy), W = n + 1;
      const a = g[iy * W + ix], b = g[iy * W + ix + 1], c = g[(iy + 1) * W + ix], d = g[(iy + 1) * W + ix + 1];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }
  TG.WORLD = [
    { name: 'neon', fog: '#1a0a3a', road: '#2b2d4d', roadB: '#34375a', edge: '#6ad8ff', rail: '#ff3ad0', railB: '#7a1a78', dash: '#8ae8ff', void: '#05051a' },
    { name: 'frost', fog: '#b8d4f4', road: '#4a6aa6', roadB: '#5878b6', edge: '#f4faff', rail: '#2a6aff', railB: '#14308a', dash: '#e8f4ff', void: '#a8c8ee' },
    { name: 'magma', fog: '#4a1a10', road: '#3b2c34', roadB: '#463640', edge: '#ff9a2a', rail: '#ff6a1a', railB: '#8a2a0a', dash: '#ffb040', void: '#120608' },
    { name: 'spore', fog: '#103a28', road: '#3a4a36', roadB: '#44563e', edge: '#9aff6a', rail: '#7aff6a', railB: '#2a7a2a', dash: '#c8ff9a', void: '#071a10' },
    { name: 'station', fog: '#0a1030', road: '#4a5272', roadB: '#545c7c', edge: '#ffd24a', rail: '#ffd24a', railB: '#161a30', dash: '#e8eeff', void: '#03050c' },
  ];
  /* ground per world, written straight into the pixel array */
  function ground(world, u32) {
    const N = noiseGrid(world * 31 + 5, 64), N2 = noiseGrid(world * 77 + 9, 256), rnd = PX.rng(world * 13 + 3);
    const P = (h) => hex(h), mixc = PX.mix;
    for (let y = 0; y < MAP; y++) {
      const ny = y / MAP;
      for (let x = 0; x < MAP; x++) {
        const nx = x / MAP, a = N(nx, ny), b = N2(nx, ny);
        let c;
        if (world === 0) {
          c = P('#0a0b26');
          const gx = x & 31, gy = y & 31, mx = x & 127, my = y & 127;
          if (mx < 2 || my < 2) c = P('#3a1c7a'); else if (gx < 1 || gy < 1) c = P('#161a48');
          if (a > 0.62 && b > 0.5 && (x & 1) === (y & 1)) c = mixc(c, P('#2a2a7a'), 0.5);
        } else if (world === 1) {
          c = a < 0.4 ? P('#86aedc') : a < 0.62 ? P('#a2c4ec') : P('#c4dcf6');
          if (b > 0.72 && ((x + y) & 3) === 0) c = P('#eef6ff'); else if (b < 0.22 && ((x ^ y) & 1) === 0) c = P('#6a94c8');
        } else if (world === 2) {
          c = a < 0.5 ? P('#160a0e') : P('#22111a');
          const r = Math.abs(b - 0.5);
          if (r < 0.018) c = P('#ffb040'); else if (r < 0.045) c = P('#e0541a'); else if (r < 0.08 && (x ^ y) & 1) c = P('#7a2a14');
        } else if (world === 3) {
          c = a < 0.35 ? P('#0b2a1a') : a < 0.6 ? P('#12401f') : P('#1b5a2b');
          if (b > 0.7 && ((x * 7 + y * 3) & 7) === 0) c = P('#e060b0'); else if (b < 0.25 && (x & y & 1)) c = P('#0a2214');
        } else {
          c = ((x >> 6) + (y >> 6)) & 1 ? P('#060a16') : P('#04060f');
          const px = x & 63, py = y & 63;
          if ((x & 255) < 2 || (y & 255) < 2) c = P('#1e3a7a'); else if (px === 0 || py === 0) c = P('#0e1a3a');
          else if (a > 0.7 && (px & 15) < 2 && (py & 15) < 2) c = P('#2a5ac0');
          if (rnd() < 0.0014) c = P(rnd() < 0.5 ? '#ffffff' : '#7a9aff');
        }
        u32[y * MAP + x] = c;
      }
    }
  }
  function stamp(x, tr, f) {
    const p = tr.at(f.s + f.l * 0.5, f.d);
    x.save(); x.translate(p.x, p.y); x.rotate(p.ang);
    const l = f.l, w = f.w;
    if (f.k === 'dash') {
      x.fillStyle = '#2a1608'; x.fillRect(-l / 2, -w / 2, l, w);
      for (let q = 0; q < 3; q++) { const o = -l / 2 + 5 + q * 12; x.fillStyle = q === 2 ? '#ffe27a' : '#ffa22a'; x.beginPath(); x.moveTo(o, -w / 2 + 2); x.lineTo(o + 8, 0); x.lineTo(o, w / 2 - 2); x.lineTo(o + 3, w / 2 - 2); x.lineTo(o + 11, 0); x.lineTo(o + 3, -w / 2 + 2); x.fill(); }
    } else if (f.k === 'jump') {
      for (let q = 0; q < 5; q++) { x.fillStyle = q % 2 ? '#1a2a5a' : '#9ae8ff'; x.fillRect(-l / 2 + q * (l / 5), -w / 2, l / 5 + 0.5, w); }
      x.fillStyle = '#ffd24a'; x.fillRect(-l / 2, -w / 2, l, 2); x.fillRect(-l / 2, w / 2 - 2, l, 2);
    } else if (f.k === 'mine') {
      x.fillStyle = '#10101c'; x.beginPath(); x.arc(0, 0, 7, 0, 7); x.fill(); x.strokeStyle = '#10101c'; x.lineWidth = 2;
      for (let a = 0; a < 8; a++) { x.beginPath(); x.moveTo(Math.cos(a * 0.785) * 6, Math.sin(a * 0.785) * 6); x.lineTo(Math.cos(a * 0.785) * 10, Math.sin(a * 0.785) * 10); x.stroke(); }
      x.fillStyle = '#ff3a3a'; x.beginPath(); x.arc(0, 0, 3.4, 0, 7); x.fill(); x.fillStyle = '#ffd0d0'; x.fillRect(-1, -1, 2, 2);
    } else if (f.k === 'rough') {
      x.fillStyle = '#4a3418'; x.fillRect(-l / 2, -w / 2, l, w); const rnd = PX.rng(Math.floor(f.s));
      for (let q = 0; q < 90; q++) { x.fillStyle = rnd() < 0.5 ? '#2a1c0c' : '#7a5a30'; x.fillRect(-l / 2 + rnd() * l, -w / 2 + rnd() * w, 2, 2); }
    } else if (f.k === 'ice') {
      x.fillStyle = '#d8f0ff'; x.fillRect(-l / 2, -w / 2, l, w); x.fillStyle = '#ffffff'; for (let q = 0; q < 6; q++) x.fillRect(-l / 2 + 8 + q * (l / 6), -w / 2 + 3, 3, w - 6);
      x.fillStyle = '#7ab4f0'; x.fillRect(-l / 2, -w / 2, l, 2); x.fillRect(-l / 2, w / 2 - 2, l, 2);
    } else if (f.k === 'rec') {
      x.fillStyle = '#063a2a'; x.fillRect(-l / 2, -w / 2, l, w);
      for (let q = 0; q < l; q += 18) { x.fillStyle = '#1aff9a'; x.fillRect(-l / 2 + q + 7, -1, 6, 2); x.fillRect(-l / 2 + q + 9, -3, 2, 6); }
      x.fillStyle = '#6affc8'; x.fillRect(-l / 2, -w / 2, l, 1.5); x.fillRect(-l / 2, w / 2 - 1.5, l, 1.5);
    }
    x.restore();
  }
  TG.paint = function (tr) {
    const W = TG.WORLD[tr.world], cv = document.createElement('canvas'); cv.width = cv.height = MAP;
    const x = cv.getContext('2d', { willReadFrequently: true });
    const img = x.createImageData(MAP, MAP);
    ground(tr.world, new Uint32Array(img.data.buffer));
    x.putImageData(img, 0, 0);
    const path = () => { x.beginPath(); for (let s = 0; s < tr.N; s++) s ? x.lineTo(tr.x[s], tr.y[s]) : x.moveTo(tr.x[s], tr.y[s]); x.closePath(); };
    x.lineJoin = 'round'; x.lineCap = 'butt';
    const stroke = (w, col, dash) => { path(); x.setLineDash(dash || []); x.lineWidth = w; x.strokeStyle = col; x.stroke(); };
    stroke(tr.w + 16, W.railB); stroke(tr.w + 16, W.rail, [7, 7]);
    stroke(tr.w + 6, '#0a0c1c'); stroke(tr.w, W.road);
    stroke(tr.w - 14, W.roadB, [46, 46]);
    stroke(tr.w - 6, W.edge); stroke(tr.w - 10, W.road); stroke(tr.w - 14, W.roadB, [46, 46]);
    stroke(3, W.dash, [14, 14]);
    for (const f of tr.feats) stamp(x, tr, f);
    // finish line
    const p0 = tr.at(0, 0); x.save(); x.translate(p0.x, p0.y); x.rotate(p0.ang);
    const cs = 7, n = Math.ceil(tr.w / cs);
    for (let r = 0; r < 2; r++) for (let q = 0; q < n; q++) { x.fillStyle = (q + r) & 1 ? '#f4f4ff' : '#101020'; x.fillRect(-cs + r * cs, -tr.w / 2 + q * cs, cs, cs); }
    x.restore();
    // grit on the road surface
    const out = x.getImageData(0, 0, MAP, MAP), u = new Uint32Array(out.data.buffer), road = hex(W.road), roadB = hex(W.roadB), dk = PX.mix(road, hex('#000000'), 0.22), lt = PX.mix(road, hex('#ffffff'), 0.1);
    for (let i = 0; i < u.length; i++) { const c = u[i]; if (c === road || c === roadB) { const h = (Math.imul(i, 2654435761) >>> 28); if (h === 0) u[i] = dk; else if (h === 1) u[i] = lt; } }
    return { tex: u, world: W };
  };
  /* painting a track is the one multi-second stall (4 million texels): a track that was just raced (a retry, or the attract demo coming round again) is kept, the last two are */
  const paintRaw = TG.paint, kept = [];
  TG.paint = function (tr) {
    let sum = 0; for (let i = 0; i < tr.N; i++) sum = (sum * 31 + Math.round(tr.x[i]) * 7 + Math.round(tr.y[i])) % 1000003;
    const key = tr.world + ':' + tr.N + ':' + tr.w + ':' + tr.feats.length + ':' + sum, hit = kept.find((e) => e.key === key);
    if (hit) return hit.val;
    const val = paintRaw(tr); kept.unshift({ key, val }); if (kept.length > 2) kept.pop();
    return val;
  };
})((window.SGS = window.SGS || {}));
