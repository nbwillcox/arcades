// STICK DOOSH - backdrops.js (owner: levels)
// SGS.Backdrops[themeId](ctx, cam, t, W, H)   far parallax scenery (sky + 3 layers + a few animated bits).
//   ctx is in SCREEN space (already scaled to logical W x H); cam = {x,y,w,h}. Everything big is cached on offscreen
//   canvases (built lazily, rebuilt only when theme / W / H / pixel scale changes); per frame we only blit.
// SGS.Backdrops.deco(ctx, level, cam, t)   draws level.deco[] (signs, trees, windmills...) in WORLD space
//   (call after ctx.translate(-cam.x,-cam.y), before terrain). Culled to the camera, small shapes only.
// SGS.Backdrops.ambient(themeId) -> particle spec for the core: {type,count,vx:[lo,hi],vy:[lo,hi],size:[lo,hi],colors:[...],
//   wobble,front,life,rise,twinkle,square} (type = Themes[id].ambient).
// SGS.Backdrops.dispose() frees the cached canvases.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const B = S.Backdrops = S.Backdrops || {};
  const INK = '#141018', TW = 1024, TAU = Math.PI * 2;

  // ------------------------------------------------------------------ helpers
  function mkRng(seed) {
    let a = seed >>> 0;
    const n = function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return { n: n, r: function (lo, hi) { return lo + (hi - lo) * n(); }, i: function (lo, hi) { return lo + Math.floor(n() * (hi - lo + 1)); }, c: function (p) { return n() < p; } };
  }
  function hstr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mk(w, h, sc) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * sc)); c.height = Math.max(1, Math.ceil(h * sc));
    const g = c.getContext('2d'); g.scale(sc, sc);
    return { c: c, g: g, w: w, h: h };
  }
  function path(g, p) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
  function poly(g, p, fill, lw) { path(g, p); g.fillStyle = fill; g.fill(); g.lineWidth = lw || 3; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); }
  function ell(g, x, y, rx, ry, fill, lw) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fillStyle = fill; g.fill(); if (lw !== 0) { g.lineWidth = lw || 3; g.strokeStyle = INK; g.stroke(); } }
  function rect(g, x, y, w, h, fill, lw) { g.fillStyle = fill; g.fillRect(x, y, w, h); if (lw !== 0) { g.lineWidth = lw || 3; g.strokeStyle = INK; g.lineJoin = 'round'; g.strokeRect(x, y, w, h); } }
  function line(g, x0, y0, x1, y1, col, lw) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.stroke(); }
  function dots(g, x0, y0, x1, y1, col, r, gap) {
    g.fillStyle = col; g.beginPath(); let row = 0;
    for (let y = y0; y < y1; y += gap * 0.866, row++) for (let x = x0 + ((row & 1) ? gap / 2 : 0); x < x1; x += gap) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
    g.fill();
  }
  function dotsPoly(g, p, col, r, gap) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); }
    g.save(); path(g, p); g.clip(); dots(g, x0, y0, x1, y1, col, r, gap); g.restore();
  }
  function each3(x, fn) { fn(x - TW); fn(x); fn(x + TW); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function grad(g, w, h, stops) { const gr = g.createLinearGradient(0, 0, 0, h); for (let i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], stops[i + 1]); g.fillStyle = gr; g.fillRect(0, 0, w, h); }

  // jagged periodic ridge. o: {rng,n,base,amp,fill,cap,shade,lw}
  function ridge(g, lh, o) {
    const r = o.rng, n = o.n, base = o.base, amp = o.amp, lw = o.lw || 3;
    const pk = [], val = [], sh = [];
    for (let i = 0; i < n; i++) { pk.push({ x: (i + 0.5) * TW / n + r.r(-0.2, 0.2) * TW / n, h: amp * r.r(0.55, 1) }); val.push(amp * r.r(0.02, 0.14)); sh.push([r.r(0.1, 0.3), r.r(0.1, 0.3), r.r(-0.08, 0.08), r.r(-0.08, 0.08)]); }
    val.push(val[0]);
    for (const off of [-TW, 0, TW]) {
      const top = [off, base - val[0]];
      for (let i = 0; i < n; i++) {
        const vx = i * TW / n + off, nx = (i + 1) * TW / n + off, px = pk[i].x + off, py = base - pk[i].h;
        if (i > 0) top.push(vx, base - val[i]);
        top.push(lerp(vx, px, 0.5) + sh[i][2] * TW / n, lerp(base - val[i], py, 0.5) + sh[i][0] * amp * 0.2);
        top.push(px, py);
        top.push(lerp(px, nx, 0.5) + sh[i][3] * TW / n, lerp(py, base - val[i + 1], 0.5) - sh[i][1] * amp * 0.15);
      }
      top.push(off + TW, base - val[n]);
      const full = top.concat([off + TW + 4, lh + 4, off - 4, lh + 4]);
      path(g, full); g.fillStyle = o.fill; g.fill();
      for (let i = 0; i < n; i++) {
        const px = pk[i].x + off, py = base - pk[i].h, nx = (i + 1) * TW / n + off;
        if (o.shade) dotsPoly(g, [px, py, nx, base - val[i + 1], px, base + 2], o.shade, 1.6, 6);
        if (o.cap) {
          const vx = i * TW / n + off, vy = base - val[i], c = o.capH || 0.3;
          const lx = lerp(px, vx, c), ly = lerp(py, vy, c), rx = lerp(px, nx, c), ry = lerp(py, base - val[i + 1], c);
          poly(g, [lx, ly, lerp(lx, px, 0.4), ly + 9, px - 2, ly + 2, px + 5, (ly + ry) / 2 + 12, lerp(rx, px, 0.4), ry + 8, rx, ry, px, py], o.cap, 2);
        }
      }
      g.beginPath(); g.moveTo(top[0], top[1]); for (let i = 2; i < top.length; i += 2) g.lineTo(top[i], top[i + 1]);
      g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
    }
  }
  // smooth periodic hills. o: {base, k:[[amp,freqInt,phase]...], fill, lw, shade}
  function hill(g, lh, o) {
    g.beginPath(); g.moveTo(-4, lh + 4);
    const ys = [];
    for (let x = -4; x <= TW + 4; x += 8) {
      let y = o.base; for (let i = 0; i < o.k.length; i++) y -= o.k[i][0] * (0.5 + 0.5 * Math.sin(TAU * o.k[i][1] * x / TW + o.k[i][2]));
      ys.push(x, y); g.lineTo(x, y);
    }
    g.lineTo(TW + 4, lh + 4); g.closePath(); g.fillStyle = o.fill; g.fill();
    if (o.shade) { g.save(); g.clip(); dots(g, 0, o.base - 120, TW, lh, o.shade, 1.5, 7); g.restore(); }
    g.beginPath(); g.moveTo(ys[0], ys[1]); for (let i = 2; i < ys.length; i += 2) g.lineTo(ys[i], ys[i + 1]);
    g.lineWidth = o.lw || 3; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
    return function (x) { let y = o.base; for (let i = 0; i < o.k.length; i++) y -= o.k[i][0] * (0.5 + 0.5 * Math.sin(TAU * o.k[i][1] * x / TW + o.k[i][2])); return y; };
  }
  // ben-day dot band in the sky (y0..y1), dots grow toward y1
  function bandDots(g, W, y0, y1, col) {
    g.fillStyle = col; g.beginPath(); let row = 0;
    for (let y = y0; y < y1; y += 7, row++) { const rr = 0.8 + 2.2 * (y - y0) / (y1 - y0); for (let x = (row & 1) ? 5 : 0; x < W; x += 10) { g.moveTo(x + rr, y); g.arc(x, y, rr, 0, TAU); } }
    g.fill();
  }
  function cloudSpr(sc, w, fill, shade) {
    const h = w * 0.5, s = mk(w + 12, h + 12, sc), g = s.g;
    const cs = [[0.2, 0.62, 0.17], [0.38, 0.45, 0.22], [0.58, 0.5, 0.2], [0.78, 0.64, 0.16], [0.5, 0.7, 0.2]];
    g.translate(6, 6);
    g.fillStyle = INK; for (const c of cs) { g.beginPath(); g.arc(c[0] * w, c[1] * h * 1.3, c[2] * w + 3, 0, TAU); g.fill(); }
    g.fillStyle = fill; for (const c of cs) { g.beginPath(); g.arc(c[0] * w, c[1] * h * 1.3, c[2] * w, 0, TAU); g.fill(); }
    g.save(); g.beginPath(); for (const c of cs) { g.moveTo(c[0] * w + c[2] * w, c[1] * h * 1.3); g.arc(c[0] * w, c[1] * h * 1.3, c[2] * w, 0, TAU); } g.clip();
    dots(g, 0, h * 0.95, w, h * 1.5, shade, 1.5, 6); g.restore();
    return s;
  }
  function puffSpr(sc, r, fill) { const s = mk(r * 2 + 8, r * 2 + 8, sc), g = s.g; ell(g, r + 4, r + 4, r, r * 0.9, fill, 3); dotsPoly(g, [r + 4, r + 4, r * 2, r * 1.8, r * 0.4, r * 1.8], 'rgba(0,0,0,0.25)', 1.3, 5); return s; }

  // ------------------------------------------------------------------ small scenery pieces (also reused by deco)
  function pine(g, x, y, h, fill, snow, lw) {
    const w = h * 0.4; lw = lw || 2.5;
    rect(g, x - h * 0.05, y - h * 0.16, h * 0.1, h * 0.16, '#6a4222', lw * 0.6);
    for (let i = 0; i < 3; i++) {
      const ty = y - h * 0.1 - i * h * 0.26, bw = w * (1 - i * 0.26);
      poly(g, [x - bw, ty, x, ty - h * 0.44, x + bw, ty], fill, lw);
      if (snow) poly(g, [x - bw * 0.5, ty - h * 0.22, x, ty - h * 0.44, x + bw * 0.5, ty - h * 0.22, x + bw * 0.2, ty - h * 0.14, x, ty - h * 0.2, x - bw * 0.22, ty - h * 0.14], snow, 1.5);
    }
  }
  function roundTree(g, x, y, h, fill, trunk, lw) {
    lw = lw || 2.5;
    rect(g, x - h * 0.06, y - h * 0.45, h * 0.12, h * 0.45, trunk || '#7a4a22', lw * 0.7);
    ell(g, x, y - h * 0.62, h * 0.3, h * 0.28, fill, lw); ell(g, x - h * 0.16, y - h * 0.5, h * 0.2, h * 0.18, fill, lw); ell(g, x + h * 0.17, y - h * 0.52, h * 0.2, h * 0.18, fill, lw);
    ell(g, x, y - h * 0.62, h * 0.3, h * 0.28, fill, 0);
  }
  function deadTree(g, x, y, h, col, lw) {
    lw = lw || 3; const br = function (bx, by, a, l, d) {
      const ex = bx + Math.cos(a) * l, ey = by - Math.sin(a) * l;
      line(g, bx, by, ex, ey, INK, lw * 1.9 * (1 - d * 0.2)); line(g, bx, by, ex, ey, col, lw * 0.9 * (1 - d * 0.2));
      if (d < 2) { br(ex, ey, a + 0.6, l * 0.6, d + 1); br(ex, ey, a - 0.55, l * 0.62, d + 1); }
    };
    br(x, y, 1.57, h * 0.5, 0); br(x, y - h * 0.22, 2.3, h * 0.3, 1); br(x, y - h * 0.3, 0.8, h * 0.28, 1);
  }
  function palm(g, x, y, h, leaf, lw) {
    lw = lw || 3; line(g, x, y, x + h * 0.08, y - h * 0.7, INK, lw * 2.2); line(g, x, y, x + h * 0.08, y - h * 0.7, '#a8743a', lw * 1.1);
    const tx = x + h * 0.08, ty = y - h * 0.7;
    for (let i = 0; i < 5; i++) { const a = -0.3 + i * 0.95, ex = tx + Math.cos(a + 3.14) * h * 0.38 * (i % 2 ? 1 : 0.8) * -1, ey = ty - Math.sin(a + 0.2) * h * 0.2 + h * 0.12;
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((tx + ex) / 2, ty - h * 0.2, ex, ey); g.lineWidth = lw * 2.6; g.strokeStyle = INK; g.lineCap = 'round'; g.stroke(); g.lineWidth = lw * 1.4; g.strokeStyle = leaf; g.stroke(); }
  }
  function mushroom(g, x, y, h, cap, lw) { lw = lw || 2.5; rect(g, x - h * 0.1, y - h * 0.5, h * 0.2, h * 0.5, '#f4ecd8', lw); g.beginPath(); g.ellipse(x, y - h * 0.5, h * 0.42, h * 0.3, 0, Math.PI, TAU); g.closePath(); g.fillStyle = cap; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); ell(g, x - h * 0.15, y - h * 0.66, h * 0.07, h * 0.05, '#fff', 0); ell(g, x + h * 0.14, y - h * 0.6, h * 0.06, h * 0.045, '#fff', 0); }
  function windmill(g, x, y, h, body, blades, ang, lw) {
    lw = lw || 3; poly(g, [x - h * 0.16, y, x - h * 0.08, y - h * 0.7, x + h * 0.08, y - h * 0.7, x + h * 0.16, y], body, lw);
    poly(g, [x - h * 0.1, y - h * 0.7, x, y - h * 0.84, x + h * 0.1, y - h * 0.7], '#c0392b', lw);
    const hx = x, hy = y - h * 0.7;
    for (let i = 0; i < 4; i++) { const a = ang + i * Math.PI / 2, ex = hx + Math.cos(a) * h * 0.55, ey = hy + Math.sin(a) * h * 0.55; line(g, hx, hy, ex, ey, INK, lw * 2.6); line(g, hx, hy, ex, ey, blades, lw * 1.3); }
    ell(g, hx, hy, h * 0.05, h * 0.05, '#ffd23a', lw * 0.7);
  }
  function crystal(g, x, y, h, fill, lw) { poly(g, [x - h * 0.16, y, x - h * 0.1, y - h * 0.55, x, y - h, x + h * 0.12, y - h * 0.6, x + h * 0.18, y], fill, lw || 2.5); poly(g, [x + h * 0.2, y, x + h * 0.26, y - h * 0.4, x + h * 0.34, y], fill, lw || 2.5); line(g, x - h * 0.02, y - h * 0.9, x - h * 0.06, y - h * 0.4, 'rgba(255,255,255,0.8)', 2); }
  function skull(g, x, y, r, bone, eye, lw) {
    lw = lw || 3; ell(g, x, y, r, r * 0.9, bone, lw); rect(g, x - r * 0.5, y + r * 0.6, r, r * 0.55, bone, lw);
    ell(g, x - r * 0.38, y, r * 0.26, r * 0.3, eye || INK, 0); ell(g, x + r * 0.38, y, r * 0.26, r * 0.3, eye || INK, 0);
    poly(g, [x, y + r * 0.2, x - r * 0.1, y + r * 0.5, x + r * 0.1, y + r * 0.5], INK, 1);
    for (let i = -1; i <= 1; i++) line(g, x + i * r * 0.28, y + r * 0.68, x + i * r * 0.28, y + r * 1.12, INK, 1.5);
  }
  function house(g, x, y, w, h, wall, roof, lw) { lw = lw || 3; rect(g, x, y - h, w, h, wall, lw); poly(g, [x - 4, y - h, x + w / 2, y - h - w * 0.4, x + w + 4, y - h], roof, lw); rect(g, x + w * 0.4, y - h * 0.5, w * 0.2, h * 0.5, '#5a3a1e', lw * 0.6); }
  function banner(g, x, y, h, col, lw) { line(g, x, y, x, y - h, INK, 4); line(g, x, y, x, y - h, '#a8a8b8', 2); poly(g, [x, y - h, x + h * 0.5, y - h * 0.88, x + h * 0.4, y - h * 0.72, x + h * 0.5, y - h * 0.58, x, y - h * 0.5], col, lw || 2.5); }
  function crenel(g, x0, x1, y, h, fill, lw) { rect(g, x0, y, x1 - x0, h, fill, lw); for (let x = x0; x < x1 - 6; x += 16) rect(g, x, y - 9, 9, 10, fill, lw); }

  // ------------------------------------------------------------------ theme definitions
  // layer: {par, parY, base (fraction of H for the layer's bottom edge), lh, under (fill below the layer), paint(g,lh,rng,C), after(ctx,cam,t,W,H,C,L)}
  const DEF = {};
  const cloudHook = function (n, par, y0, y1, alpha, key, speed) {
    return function (ctx, cam, t, W, H, C) {
      const sp = C.spr[key]; if (!sp) return;
      const span = W + sp.w * 2;
      for (let i = 0; i < n; i++) {
        const hh = hstr('c' + key + i) / 4294967296, hv = hstr('v' + key + i) / 4294967296;
        const x = (((hh * 3000 + t * (speed || 6) * (0.6 + hv * 0.8) - cam.x * par) % span) + span) % span - sp.w;
        const y = H * lerp(y0, y1, hv) - cam.y * 0.02, sc = 0.6 + hv * 0.7;
        ctx.globalAlpha = alpha; ctx.drawImage(sp.c, x, y, sp.w * sc, sp.h * sc);
      }
      ctx.globalAlpha = 1;
    };
  };
  const tilesOf = function (cam, par, W) { const o = []; const x0 = -(((cam.x * par) % TW) + TW) % TW; for (let x = x0; x < W + 4; x += TW) o.push(x); return o; };

  // ---- ICE
  DEF.ice = {
    sky: function (g, W, H) { grad(g, W, H, [0, '#2a2680', 0.5, '#4a9cff', 1, '#c4f6ff']); const r = mkRng(7); g.fillStyle = '#fff'; for (let i = 0; i < 60; i++) g.fillRect(r.r(0, W), r.r(0, H * 0.4), 2, 2); bandDots(g, W, H * 0.62, H, 'rgba(255,255,255,0.35)'); },
    sprites: function (C, sc, W, H) {
      C.spr.cloud = cloudSpr(sc, 150, '#f2fbff', '#a8d4f4');
      const s = mk(W, H * 0.6, sc), g = s.g, cols = ['rgba(70,255,180,0.40)', 'rgba(120,120,255,0.30)', 'rgba(255,110,220,0.28)'];
      for (let k = 0; k < 3; k++) { g.beginPath(); const y0 = H * (0.12 + k * 0.1); g.moveTo(0, y0); for (let x = 0; x <= W; x += 16) g.lineTo(x, y0 + Math.sin(x / 90 + k * 2) * 26 + k * 6); for (let x = W; x >= 0; x -= 16) g.lineTo(x, y0 + 70 + Math.sin(x / 70 + k * 3) * 22); g.closePath(); g.fillStyle = cols[k]; g.fill(); dotsPoly(g, [0, y0 - 30, W, y0 - 30, W, y0 + 110, 0, y0 + 110], 'rgba(255,255,255,0.25)', 1.2, 8); }
      C.spr.aurora = s;
    },
    skyAnim: function (ctx, cam, t, W, H, C) { ctx.globalAlpha = 0.55 + 0.3 * Math.sin(t * 0.7); ctx.drawImage(C.spr.aurora.c, 0, 0, W, H * 0.6); ctx.globalAlpha = 1; },
    layers: [
      { par: 0.07, parY: 0.05, base: 0.78, lh: 330, under: '#dff3ff', after: cloudHook(3, 0.1, 0.1, 0.4, 0.9, 'cloud', 5), paint: function (g, lh, r) { ridge(g, lh, { rng: r, n: 4, base: lh - 10, amp: 250, fill: '#cfeaff', cap: '#fff', capH: 0.34, shade: '#6fb4f0', lw: 3 }); } },
      { par: 0.2, parY: 0.09, base: 0.94, lh: 250, under: '#8fd0ff', paint: function (g, lh, r) { ridge(g, lh, { rng: r, n: 6, base: lh - 6, amp: 150, fill: '#8fd0ff', cap: '#fff', capH: 0.3, shade: '#3f86d8', lw: 3 }); for (let i = 0; i < 10; i++) each3(r.r(0, TW), function (x) { pine(g, x, lh - 4, r.r(50, 80), '#3d86d8', '#fff', 2.5); }); } },
      { par: 0.42, parY: 0.14, base: 1.04, lh: 190, under: '#2a64c4', paint: function (g, lh, r) { hill(g, lh, { base: lh - 40, k: [[26, 3, 0.4], [14, 7, 1.7]], fill: '#eaf8ff', shade: '#9ccaf0' }); for (let i = 0; i < 9; i++) each3(r.r(0, TW), function (x) { pine(g, x, lh - 30 + r.r(-10, 10), r.r(95, 140), '#2a64c4', '#fff', 3); }); for (let i = 0; i < 5; i++) each3(r.r(0, TW), function (x) { crystal(g, x, lh - 20, r.r(30, 55), '#9ae6ff', 2.5); }); } }
    ]
  };

  // ---- FIRE
  DEF.fire = {
    sky: function (g, W, H) { grad(g, W, H, [0, '#1d0614', 0.55, '#8a1a30', 1, '#ff8a1f']); bandDots(g, W, H * 0.55, H, 'rgba(255,200,40,0.4)'); ell(g, W * 0.72, H * 0.6, 60, 60, '#ffb02a', 3); dotsPoly(g, [W * 0.72 - 60, H * 0.6, W * 0.72 + 60, H * 0.6, W * 0.72, H * 0.6 + 60], 'rgba(255,90,0,0.5)', 1.6, 6); },
    sprites: function (C, sc) { C.spr.smoke = puffSpr(sc, 30, '#4a3a46'); C.spr.ember = puffSpr(sc, 6, '#ffb02a'); },
    layers: [
      { par: 0.07, parY: 0.05, base: 0.82, lh: 330, under: '#3a2230', paint: function (g, lh, r, C) {
        C.vol = [];
        [[200, 330, 130, 80], [700, 260, 170, 60]].forEach(function (v) {
          each3(v[0], function (x) {
            const top = lh - v[1], bw = v[2] * 2.2;
            poly(g, [x - bw, lh + 4, x - v[3], top, x - v[3] * 0.4, top - 8, x + v[3] * 0.4, top - 8, x + v[3], top, x + bw, lh + 4], '#4a2630', 3.5);
            dotsPoly(g, [x, top, x + bw, lh, x, lh], 'rgba(0,0,0,0.35)', 1.6, 6);
            poly(g, [x - v[3] * 0.9, top + 2, x - v[3] * 0.3, top - 10, x + v[3] * 0.3, top - 10, x + v[3] * 0.9, top + 2, x, top + 14], '#ff7a1f', 2.5);
            g.lineJoin = 'round'; for (let i = -1; i <= 1; i += 2) { g.beginPath(); g.moveTo(x + i * v[3] * 0.3, top + 12); g.lineTo(x + i * v[3] * 0.9, top + (lh - top) * 0.45); g.lineTo(x + i * v[3] * 0.7, top + (lh - top) * 0.8); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#ffb02a'; g.stroke(); }
          });
          C.vol.push({ x: v[0], y: lh - v[1] });
        });
      }, after: function (ctx, cam, t, W, H, C, L) {
        const sp = C.spr.smoke; if (!sp || !C.vol) return;
        for (const ox of L.xs) for (const v of C.vol) for (let i = 0; i < 6; i++) {
          const k = ((t * 0.18 + i / 6) % 1), a = (1 - k) * 0.8, sc = 0.5 + k * 1.6;
          ctx.globalAlpha = a; ctx.drawImage(sp.c, ox + v.x - 30 * sc + Math.sin(t + i) * 12 + k * 30, L.yb - L.lh + v.y - k * 170 - 20, sp.w * sc, sp.h * sc);
        }
        ctx.globalAlpha = 1;
      } },
      { par: 0.22, parY: 0.1, base: 0.96, lh: 240, under: '#2a1824', paint: function (g, lh, r) { ridge(g, lh, { rng: r, n: 7, base: lh - 4, amp: 140, fill: '#2a1824', shade: '#4a2a3a', lw: 3 }); g.lineJoin = 'round'; for (let i = 0; i < 12; i++) { const x = r.r(0, TW), y = r.r(lh * 0.5, lh - 10); each3(x, function (xx) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx + r.r(10, 30), y + r.r(8, 22)); g.lineTo(xx + r.r(-6, 18), y + r.r(26, 46)); g.lineWidth = 3.5; g.strokeStyle = '#ff7a1f'; g.stroke(); }); } } },
      { par: 0.44, parY: 0.15, base: 1.04, lh: 170, under: '#140c14', paint: function (g, lh, r) { hill(g, lh, { base: lh - 22, k: [[16, 4, 1], [9, 9, 2]], fill: '#140c14', lw: 3 }); for (let i = 0; i < 9; i++) each3(r.r(0, TW), function (x) { deadTree(g, x, lh - 14, r.r(80, 135), '#2a1c2a', 3); }); for (let i = 0; i < 5; i++) each3(r.r(0, TW), function (x) { poly(g, [x, lh - 14, x + 8, lh - 40, x + 16, lh - 14], '#ff7a1f', 2); }); } }
    ]
  };

  // ---- WIND
  DEF.wind = {
    sky: function (g, W, H) { grad(g, W, H, [0, '#2b86ff', 1, '#c4f2ff']); bandDots(g, W, H * 0.6, H, 'rgba(255,255,255,0.4)'); ell(g, W * 0.18, H * 0.2, 42, 42, '#ffe23a', 3.5); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; line(g, W * 0.18 + Math.cos(a) * 52, H * 0.2 + Math.sin(a) * 52, W * 0.18 + Math.cos(a) * 70, H * 0.2 + Math.sin(a) * 70, INK, 3.5); } },
    sprites: function (C, sc) { C.spr.cloud = cloudSpr(sc, 170, '#ffffff', '#b4d8f8'); C.spr.cloud2 = cloudSpr(sc, 230, '#f4fbff', '#9cc6ee'); },
    layers: [
      { par: 0.06, parY: 0.06, base: 0.9, lh: 360, under: null, after: cloudHook(4, 0.1, 0.05, 0.5, 0.95, 'cloud', 10), paint: function (g, lh, r) { for (let i = 0; i < 6; i++) each3(60 + i * 170 + r.r(-30, 30), function (x) { const y = r.r(80, lh - 80), w = r.r(60, 110); poly(g, [x - w, y, x + w, y, x + w * 0.5, y + w * 0.5, x, y + w * 0.95, x - w * 0.5, y + w * 0.5], '#b6a2dc', 3); poly(g, [x - w, y, x - w * 0.6, y - 9, x + w * 0.6, y - 9, x + w, y], '#5fd23a', 3); }); } },
      { par: 0.2, parY: 0.1, base: 0.96, lh: 400, under: null, mills: true, after: function (ctx, cam, t, W, H, C, L) {
        if (!C.mills) return; for (const ox of L.xs) for (const m of C.mills) { ctx.save(); ctx.translate(ox + m.x, L.yb - L.lh + m.y); windmill(ctx, 0, 0, m.h, '#f4e8d0', '#fff', t * 0.9 + m.x, 3); ctx.restore(); }
      }, paint: function (g, lh, r, C) {
        C.mills = [];
        for (let i = 0; i < 4; i++) {
          const bx = 120 + i * 250 + r.r(-30, 30), y = r.r(150, lh - 70), w = r.r(90, 130);
          if (i % 2) C.mills.push({ x: bx - w * 0.25, y: y - 10, h: 66 });
          each3(bx, function (x) {
            poly(g, [x - w, y, x + w, y, x + w * 0.55, y + w * 0.6, x, y + w * 1.05, x - w * 0.55, y + w * 0.6], '#a596c8', 3.5); dotsPoly(g, [x, y, x + w, y, x, y + w], 'rgba(60,40,110,0.3)', 1.5, 6); poly(g, [x - w, y, x - w * 0.9, y - 12, x + w * 0.9, y - 12, x + w, y], '#62e03a', 3.5);
            if (i % 2 === 0) house(g, x + w * 0.3, y - 10, 34, 24, '#fff2c8', '#d63a2a', 3); else roundTree(g, x + w * 0.5, y - 10, 46, '#3fb83a', '#7a4a22', 2.5);
          });
        }
      } },
      { par: 0.42, parY: 0.14, base: 1.05, lh: 190, under: null, after: cloudHook(3, 0.5, 0.62, 0.95, 0.95, 'cloud2', 14), paint: function (g, lh, r) { for (let i = 0; i < 4; i++) each3(r.r(0, TW), function (x) { const y = r.r(lh * 0.5, lh - 20), w = r.r(90, 150); ell(g, x, y, w, 28, '#f4fbff', 3); ell(g, x - w * 0.4, y - 16, w * 0.35, 24, '#fff', 3); ell(g, x + w * 0.2, y - 22, w * 0.4, 28, '#fff', 3); ell(g, x, y, w, 28, '#f4fbff', 0); }); } }
    ]
  };

  // ---- WATER
  DEF.water = {
    sky: function (g, W, H) { grad(g, W, H, [0, '#ff6f5a', 0.5, '#ffb36a', 1, '#ffe8a8']); bandDots(g, W, H * 0.4, H * 0.8, 'rgba(255,255,255,0.35)'); g.save(); g.beginPath(); g.arc(W * 0.7, H * 0.7, 70, Math.PI, TAU); g.fillStyle = '#fff2a0'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = INK; g.stroke(); g.restore(); },
    sprites: function (C, sc) { C.spr.cloud = cloudSpr(sc, 150, '#ffd9c8', '#ff9a8a'); const s = mk(256, 20, sc), g = s.g; g.strokeStyle = '#effcff'; g.lineWidth = 3; g.lineCap = 'round'; for (let i = 0; i < 4; i++) { g.beginPath(); const x = i * 64 + 10; g.moveTo(x, 12); g.quadraticCurveTo(x + 14, 2, x + 28, 12); g.stroke(); } C.spr.wave = s; },
    layers: [
      { par: 0.07, parY: 0.05, base: 0.8, lh: 280, under: '#2a6fd0', after: cloudHook(3, 0.1, 0.1, 0.4, 0.9, 'cloud', 4), paint: function (g, lh, r) {
        hill(g, lh, { base: lh - 50, k: [[26, 2, 0.5], [12, 6, 1]], fill: '#8a5aa8', lw: 3 });
        for (let i = 0; i < 6; i++) each3(60 + i * 160, function (x) { const w = r.r(50, 80), h = r.r(36, 64); rect(g, x, lh - 50 - h, w, h, ['#c86a5a', '#d6a05a', '#6a8ac8'][i % 3], 3); poly(g, [x - 3, lh - 50 - h, x + w / 2, lh - 50 - h - 20, x + w + 3, lh - 50 - h], '#5a3a5a', 3); });
        each3(480, function (x) { poly(g, [x - 22, lh - 44, x - 14, lh - 190, x + 14, lh - 190, x + 22, lh - 44], '#fff', 3.5); poly(g, [x - 19, lh - 90, x - 17, lh - 118, x + 17, lh - 118, x + 19, lh - 90], '#d63a2a', 0); rect(g, x - 18, lh - 210, 36, 20, '#ffe23a', 3); poly(g, [x - 22, lh - 210, x, lh - 232, x + 22, lh - 210], '#d63a2a', 3); });
        each3(800, function (x) { line(g, x, lh - 50, x, lh - 160, INK, 6); line(g, x, lh - 160, x + 70, lh - 160, INK, 6); line(g, x + 70, lh - 160, x + 70, lh - 110, INK, 3); rect(g, x + 60, lh - 110, 20, 12, '#d6a05a', 2.5); });
        rect(g, -4, lh - 22, TW + 8, 30, '#2a6fd0', 0); dots(g, 0, lh - 20, TW, lh, 'rgba(255,255,255,0.35)', 1.5, 8);
      } },
      { par: 0.2, parY: 0.1, base: 0.97, lh: 250, under: '#1f7ad6', after: function (ctx, cam, t, W, H, C, L) { const sp = C.spr.wave; if (!sp) return; const off = (t * 22) % 256; for (let x = -256 + off - ((cam.x * 0.2) % 256); x < W; x += 256) ctx.drawImage(sp.c, x, L.yb - 36, sp.w, sp.h); }, paint: function (g, lh, r) {
        rect(g, -4, lh - 60, TW + 8, 70, '#2a8ae6', 0); g.lineWidth = 3; g.strokeStyle = INK; g.beginPath(); g.moveTo(-4, lh - 60); g.lineTo(TW + 4, lh - 60); g.stroke(); dots(g, 0, lh - 58, TW, lh, '#1f6ed0', 1.7, 7);
        [[160, 1], [560, -1], [880, 1]].forEach(function (s, i) { each3(s[0], function (x) { const d = s[1], y = lh - 58; poly(g, [x - 70, y - 22, x + 70, y - 22, x + 52, y + 8, x - 52, y + 8], i === 1 ? '#6a8ac8' : '#a8743e', 3.5); line(g, x, y - 22, x, y - 130, INK, 6); line(g, x, y - 22, x, y - 130, '#8a5a2a', 3); poly(g, [x + 4, y - 126, x + 4 + d * 56, y - 70, x + 4, y - 36], '#fff6dc', 3); poly(g, [x - 4, y - 118, x - 4 - d * 44, y - 72, x - 4, y - 40], '#fff6dc', 3); banner(g, x, y - 130, 26, '#d63a2a', 2); }); });
      } },
      { par: 0.42, parY: 0.15, base: 1.04, lh: 180, under: '#10509a', paint: function (g, lh, r) { rect(g, -4, lh - 60, TW + 8, 70, '#1f7ad6', 0); g.lineWidth = 3; g.strokeStyle = INK; g.beginPath(); g.moveTo(-4, lh - 60); g.lineTo(TW + 4, lh - 60); g.stroke(); for (let i = 0; i < 9; i++) each3(40 + i * 118 + r.r(-12, 12), function (x) { rect(g, x - 7, lh - 130, 14, 140, '#8a5a2a', 3); rect(g, x - 10, lh - 134, 20, 9, '#6a4220', 2.5); }); rect(g, -4, lh - 138, TW + 8, 8, '#a8743e', 3); } }
    ]
  };

  // ---- MUD
  DEF.mud = {
    sky: function (g, W, H) { grad(g, W, H, [0, '#2e3a22', 0.55, '#7a8a3a', 1, '#d0d878']); bandDots(g, W, H * 0.5, H, 'rgba(255,255,200,0.3)'); ell(g, W * 0.3, H * 0.34, 54, 54, '#f2f4b0', 3); dotsPoly(g, [W * 0.3 - 54, H * 0.34, W * 0.3 + 54, H * 0.34, W * 0.3, H * 0.34 + 54], 'rgba(120,140,40,0.35)', 1.5, 6); },
    sprites: function (C, sc) { const s = mk(300, 70, sc), g = s.g; g.fillStyle = 'rgba(200,225,140,0.45)'; g.beginPath(); g.ellipse(150, 35, 145, 28, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(220,240,170,0.35)'; g.beginPath(); g.ellipse(120, 30, 90, 20, 0, 0, TAU); g.fill(); C.spr.fog = s; },
    layers: [
      { par: 0.07, parY: 0.05, base: 0.8, lh: 300, under: '#5a6a3a', after: function (ctx, cam, t, W, H, C) { fogHook(ctx, cam, t, W, H, C, 0.16, 0.45, 0.8, 2); }, paint: function (g, lh, r) { hill(g, lh, { base: lh - 30, k: [[14, 3, 0], [8, 8, 2]], fill: '#6a7a3a', lw: 2.5 }); for (let i = 0; i < 12; i++) each3(r.r(0, TW), function (x) { deadTree(g, x, lh - 30, r.r(120, 200), '#3a4a2a', 2.5); }); dots(g, 0, 0, TW, lh, 'rgba(210,220,140,0.28)', 2, 9); } },
      { par: 0.2, parY: 0.1, base: 0.97, lh: 260, under: '#3e5a2a', after: function (ctx, cam, t, W, H, C) { fogHook(ctx, cam, t, W, H, C, 0.3, 0.62, 0.95, 3); }, paint: function (g, lh, r) {
        hill(g, lh, { base: lh - 24, k: [[12, 4, 1], [6, 11, 0.4]], fill: '#4a6a2a', lw: 3 });
        for (let i = 0; i < 7; i++) each3(r.r(0, TW), function (x) { const h = r.r(150, 210); rect(g, x - 10, lh - 24 - h, 20, h, '#4a3a22', 3); ell(g, x, lh - 24 - h, 62, 34, '#3e6a2a', 3); for (let k = -3; k <= 3; k++) line(g, x + k * 15, lh - 24 - h + 20, x + k * 15 + r.r(-4, 4), lh - 24 - h + r.r(46, 80), '#6a9a3a', 3.5); });
        each3(r.r(0, TW), function (x) { house(g, x, lh - 24, 56, 34, '#8a6a3a', '#5a4a22', 3); rect(g, x + 4, lh - 20, 5, 22, '#4a3a22', 2); rect(g, x + 47, lh - 20, 5, 22, '#4a3a22', 2); });
      } },
      { par: 0.42, parY: 0.15, base: 1.04, lh: 170, under: '#2a3a1a', paint: function (g, lh, r) { hill(g, lh, { base: lh - 26, k: [[10, 5, 0.3]], fill: '#2a3a1a', lw: 3 }); for (let i = 0; i < 16; i++) each3(r.r(0, TW), function (x) { const h = r.r(60, 110); line(g, x, lh - 20, x + r.r(-6, 6), lh - h, INK, 5); line(g, x, lh - 20, x + 1, lh - h, '#5a8a2a', 2.5); ell(g, x + 1, lh - h - 6, 5, 14, '#7a4a22', 2.5); }); each3(300, function (x) { rect(g, x, lh - 34, 110, 20, '#6a4a22', 3); ell(g, x + 110, lh - 24, 5, 10, '#8a6a3a', 2.5); }); } }
    ]
  };
  function fogHook(ctx, cam, t, W, H, C, par, y0, y1, n) {
    const sp = C.spr.fog; if (!sp) return;
    for (let i = 0; i < n; i++) { const hh = hstr('fg' + i + par) / 4294967296, span = W + 700; const x = (((hh * 2000 + t * (5 + i * 3) - cam.x * par) % span) + span) % span - 350; ctx.globalAlpha = 0.85; ctx.drawImage(sp.c, x, H * lerp(y0, y1, hh), 420, 90); }
    ctx.globalAlpha = 1;
  }

  // ---- JUNGLE
  DEF.jungle = {
    sky: function (g, W, H) { grad(g, W, H, [0, '#18b4d8', 1, '#d4ff9a']); bandDots(g, W, H * 0.5, H, 'rgba(255,255,255,0.3)'); ell(g, W * 0.82, H * 0.2, 36, 36, '#fff2a0', 3.5); },
    sprites: function (C, sc) { C.spr.cloud = cloudSpr(sc, 140, '#f4ffe8', '#b4e8c0'); },
    layers: [
      { par: 0.07, parY: 0.05, base: 0.8, lh: 330, under: '#3a9a6a', after: cloudHook(3, 0.1, 0.08, 0.35, 0.9, 'cloud', 5), paint: function (g, lh, r) {
        ridge(g, lh, { rng: r, n: 5, base: lh - 8, amp: 200, fill: '#58b88a', shade: '#2a8a6a', lw: 3 });
        each3(520, function (x) { for (let k = 0; k < 5; k++) { const w = 200 - k * 34, y = lh - 20 - k * 26; rect(g, x - w / 2, y - 26, w, 26, k % 2 ? '#b8bc8a' : '#a3ad7a', 3); dotsPoly(g, [x, y - 26, x + w / 2, y - 26, x + w / 2, y, x, y], 'rgba(60,70,30,0.3)', 1.4, 6); } rect(g, x - 36, lh - 20 - 4 * 26 - 52, 72, 26, '#a3ad7a', 3); skull(g, x, lh - 20 - 4 * 26 - 42, 12, '#e4e0b0', '#2a8a2a', 2.5); });
      } },
      { par: 0.22, parY: 0.1, base: 0.97, lh: 300, under: '#2a7a3a', paint: function (g, lh, r) { for (let i = 0; i < 6; i++) each3(60 + i * 175 + r.r(-30, 30), function (x) { const h = r.r(180, 250); rect(g, x - 14, lh - h, 28, h, '#7a4a22', 3.5); dotsPoly(g, [x, lh - h, x + 14, lh - h, x + 14, lh, x, lh], 'rgba(0,0,0,0.25)', 1.3, 5); ell(g, x, lh - h, 86, 44, '#2fa83a', 3.5); ell(g, x - 52, lh - h + 14, 52, 30, '#3cc040', 3.5); ell(g, x + 50, lh - h + 10, 56, 32, '#3cc040', 3.5); ell(g, x, lh - h, 86, 44, '#2fa83a', 0); for (let k = -2; k <= 2; k++) line(g, x + k * 22, lh - h + 24, x + k * 22, lh - h + r.r(50, 110), '#3cc040', 3); }); hill(g, lh, { base: lh - 18, k: [[10, 5, 0.6]], fill: '#2a7a3a', lw: 3 }); } },
      { par: 0.44, parY: 0.15, base: 1.04, lh: 190, under: '#1a5a2a', paint: function (g, lh, r) { hill(g, lh, { base: lh - 20, k: [[10, 4, 0], [6, 10, 1]], fill: '#1a5a2a', lw: 3 }); for (let i = 0; i < 12; i++) each3(r.r(0, TW), function (x) { const h = r.r(70, 120); for (let k = 0; k < 5; k++) { const a = -2.5 + k * 0.5; g.beginPath(); g.moveTo(x, lh - 14); g.quadraticCurveTo(x + Math.cos(a) * h * 0.5, lh - 14 + Math.sin(a) * h * 0.9, x + Math.cos(a) * h * 0.8, lh - 14 + Math.sin(a) * h * 0.55 + h * 0.3); g.lineWidth = 14; g.strokeStyle = INK; g.lineCap = 'round'; g.stroke(); g.lineWidth = 8; g.strokeStyle = k % 2 ? '#34b83a' : '#2a9a32'; g.stroke(); } }); } }
    ]
  };

  // ---- MOUNTAIN
  DEF.mountain = {
    sky: function (g, W, H) { grad(g, W, H, [0, '#1a62de', 1, '#b2e8ff']); bandDots(g, W, H * 0.55, H, 'rgba(255,255,255,0.4)'); ell(g, W * 0.8, H * 0.16, 30, 30, '#fff7b0', 3.5); },
    sprites: function (C, sc) { C.spr.cloud = cloudSpr(sc, 190, '#ffffff', '#b8d8f4'); },
    layers: [
      { par: 0.06, parY: 0.07, base: 0.8, lh: 460, under: '#8fa3d8', after: cloudHook(4, 0.1, 0.25, 0.7, 0.92, 'cloud', 7), paint: function (g, lh, r) { ridge(g, lh, { rng: r, n: 3, base: lh - 6, amp: 420, fill: '#7a8fc8', cap: '#fff', capH: 0.36, shade: '#4a5fa8', lw: 3.5 }); } },
      { par: 0.2, parY: 0.1, base: 0.95, lh: 300, under: '#6a6a88', paint: function (g, lh, r) { ridge(g, lh, { rng: r, n: 5, base: lh - 6, amp: 230, fill: '#8a8aa4', cap: '#f4f8ff', capH: 0.26, shade: '#55557a', lw: 3 }); for (let i = 0; i < 9; i++) each3(r.r(0, TW), function (x) { pine(g, x, lh - 4, r.r(50, 80), '#2a7a4a', null, 2.5); }); } },
      { par: 0.44, parY: 0.16, base: 1.05, lh: 220, under: '#3a3a52', paint: function (g, lh, r) { ridge(g, lh, { rng: r, n: 6, base: lh - 4, amp: 120, fill: '#4a4a66', shade: '#2a2a44', lw: 3.5 }); for (let i = 0; i < 9; i++) each3(r.r(0, TW), function (x) { pine(g, x, lh - 6 + r.r(-6, 4), r.r(90, 140), '#1f5a3a', null, 3); }); } }
    ]
  };

  // ---- PLAINS
  DEF.plains = {
    sky: function (g, W, H) { grad(g, W, H, [0, '#38b4ff', 1, '#fff4a6']); bandDots(g, W, H * 0.55, H, 'rgba(255,255,255,0.45)'); ell(g, W * 0.15, H * 0.2, 38, 38, '#ffe23a', 3.5); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; line(g, W * 0.15 + Math.cos(a) * 48, H * 0.2 + Math.sin(a) * 48, W * 0.15 + Math.cos(a) * 64, H * 0.2 + Math.sin(a) * 64, INK, 3.5); } },
    sprites: function (C, sc) {
      C.spr.cloud = cloudSpr(sc, 160, '#ffffff', '#bcdcf4');
      let s = mk(80, 34, sc), g = s.g; ell(g, 40, 22, 36, 9, '#b8c4d8', 3); g.beginPath(); g.ellipse(40, 18, 18, 14, 0, Math.PI, TAU); g.fillStyle = '#8ae8ff'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); for (let i = -2; i <= 2; i++) ell(g, 40 + i * 12, 26, 2.2, 2.2, '#ffe23a', 1.5); C.spr.ufo = s;
      s = mk(70, 150, sc); g = s.g; g.beginPath(); g.moveTo(25, 0); g.lineTo(45, 0); g.lineTo(70, 150); g.lineTo(0, 150); g.closePath(); g.fillStyle = 'rgba(190,255,120,0.38)'; g.fill(); dotsPoly(g, [25, 0, 45, 0, 70, 150, 0, 150], 'rgba(255,255,255,0.5)', 1.3, 7); C.spr.beam = s;
      s = mk(40, 30, sc); g = s.g; rect(g, 8, 8, 24, 13, '#fff', 2.5); ell(g, 8, 11, 6, 6, '#fff', 2.5); ell(g, 10, 12, 2.6, 2.6, INK, 0); rect(g, 12, 17, 4, 8, '#fff', 2); rect(g, 24, 17, 4, 8, '#fff', 2); ell(g, 20, 14, 4, 3, INK, 0); ell(g, 25, 12, 3, 2.4, INK, 0); C.spr.cow = s;
    },
    layers: [
      { par: 0.06, parY: 0.05, base: 0.8, lh: 280, under: '#7ee23a', after: cloudHook(4, 0.1, 0.08, 0.4, 0.95, 'cloud', 6), paint: function (g, lh, r) {
        const f = hill(g, lh, { base: lh - 30, k: [[40, 2, 0.2], [18, 5, 1.3]], fill: '#8ae84a', lw: 3 });
        for (let i = 0; i < 8; i++) { const x0 = i * 128; g.save(); g.beginPath(); g.moveTo(x0, lh + 4); for (let x = x0; x <= x0 + 128; x += 8) g.lineTo(x, f(x)); g.lineTo(x0 + 128, lh + 4); g.closePath(); g.clip(); for (let k = 0; k < 6; k++) { g.fillStyle = i % 2 ? 'rgba(255,214,58,0.55)' : 'rgba(40,170,60,0.4)'; g.beginPath(); g.moveTo(x0 + k * 22, 0); g.lineTo(x0 + k * 22 + 10, 0); g.lineTo(x0 + k * 22 - 30, lh); g.lineTo(x0 + k * 22 - 40, lh); g.fill(); } g.restore(); }
        hill(g, lh, { base: lh - 30, k: [[40, 2, 0.2], [18, 5, 1.3]], fill: 'rgba(0,0,0,0)', lw: 3 });
        for (let i = 0; i < 3; i++) each3(160 + i * 330, function (x) { const y = f(x) + 3; house(g, x, y, 30, 20, '#d6382a', '#6a3a22', 2.5); });
      } },
      { par: 0.22, parY: 0.1, base: 0.97, lh: 280, under: '#5fc83a', mills: true, after: function (ctx, cam, t, W, H, C, L) {
        if (C.mills) for (const ox of L.xs) for (const m of C.mills) { ctx.save(); ctx.translate(ox + m.x, L.yb - L.lh + m.y); windmill(ctx, 0, 0, m.h, '#e8d8b0', '#fff', t * 0.8 + m.x, 3); ctx.restore(); }
        if (!C.spr.ufo) return;
        for (const ox of L.xs) for (let i = 0; i < 2; i++) drawUfo(ctx, C, t, ox + (i ? 780 : 330) + Math.sin(t * 0.5 + i * 2) * 26, L.yb - L.lh + 44 + Math.sin(t * 0.9 + i) * 6, i);
      }, paint: function (g, lh, r, C) {
        const f = hill(g, lh, { base: lh - 24, k: [[18, 3, 1], [8, 8, 0.2]], fill: '#5fc83a', lw: 3 });
        each3(120, function (x) { const y = f(x) + 4; rect(g, x, y - 44, 64, 44, '#d6382a', 3.5); poly(g, [x - 6, y - 44, x + 32, y - 78, x + 70, y - 44], '#a3241a', 3.5); rect(g, x + 20, y - 34, 24, 34, '#fff', 3); line(g, x + 20, y - 34, x + 44, y, INK, 2.5); line(g, x + 44, y - 34, x + 20, y, INK, 2.5); ell(g, x + 32, y - 56, 6, 6, '#fff', 2.5); });
        each3(250, function (x) { const y = f(x) + 4; rect(g, x, y - 110, 30, 110, '#c6ced8', 3.5); dotsPoly(g, [x + 15, y - 110, x + 30, y - 110, x + 30, y, x + 15, y], 'rgba(60,80,110,0.3)', 1.3, 5); g.beginPath(); g.ellipse(x + 15, y - 110, 15, 12, 0, Math.PI, TAU); g.fillStyle = '#d63a2a'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = INK; g.stroke(); for (let k = 1; k < 4; k++) line(g, x, y - k * 28, x + 30, y - k * 28, INK, 1.6); });
        C.mills = [{ x: 640, y: lh - 28, h: 78 }];
        each3(860, function (x) { const y = f(x) + 4; rect(g, x, y - 36, 50, 36, '#d6a05a', 3); poly(g, [x - 5, y - 36, x + 25, y - 58, x + 55, y - 36], '#8a5a2a', 3); });
      } },
      { par: 0.44, parY: 0.16, base: 1.05, lh: 150, under: '#3aa82a', paint: function (g, lh, r) { hill(g, lh, { base: lh - 30, k: [[10, 4, 0.5]], fill: '#3aa82a', lw: 3 }); for (let i = 0; i < 12; i++) each3(r.r(0, TW), function (x) { const y = lh - 26; line(g, x - 24, y - 20, x + 40, y - 20, INK, 5); line(g, x - 24, y - 8, x + 40, y - 8, INK, 5); line(g, x - 24, y - 20, x + 40, y - 20, '#fff', 2.5); line(g, x - 24, y - 8, x + 40, y - 8, '#fff', 2.5); line(g, x - 20, y + 4, x - 20, y - 26, INK, 7); line(g, x - 20, y + 4, x - 20, y - 26, '#fff', 3.5); line(g, x + 36, y + 4, x + 36, y - 26, INK, 7); line(g, x + 36, y + 4, x + 36, y - 26, '#fff', 3.5); }); for (let i = 0; i < 5; i++) each3(r.r(0, TW), function (x) { ell(g, x, lh - 20, 16, 12, '#ffd84a', 3); line(g, x - 10, lh - 22, x + 10, lh - 22, '#d4a418', 1.5); line(g, x - 8, lh - 17, x + 8, lh - 17, '#d4a418', 1.5); }); } }
    ]
  };
  function drawUfo(ctx, C, t, x, y, i) {
    const k = ((t * 0.12 + i * 0.5) % 1), cy = y + 150 - k * 130;
    ctx.drawImage(C.spr.beam.c, x - 35, y + 16, 70, 150);
    ctx.save(); ctx.translate(x, cy); ctx.rotate(k * 6.28 * 1.5); ctx.drawImage(C.spr.cow.c, -20, -15, 40, 30); ctx.restore();
    ctx.drawImage(C.spr.ufo.c, x - 40, y - 8, 80, 34);
  }

  // ---- FANTASY
  DEF.fantasy = {
    sky: function (g, W, H) { grad(g, W, H, [0, '#2a1060', 0.55, '#8a3aa8', 1, '#ff9ad2']); const r = mkRng(11); g.fillStyle = '#fff'; for (let i = 0; i < 70; i++) g.fillRect(r.r(0, W), r.r(0, H * 0.55), 2, 2); bandDots(g, W, H * 0.6, H, 'rgba(255,230,255,0.35)'); ell(g, W * 0.78, H * 0.22, 36, 36, '#fff6c8', 3.5); ell(g, W * 0.78 + 12, H * 0.22 - 6, 30, 30, '#6a2a9a', 0); },
    sprites: function (C, sc) {
      C.spr.cloud = cloudSpr(sc, 150, '#f8d8f4', '#c890d8');
      for (let f = 0; f < 2; f++) { const s = mk(120, 70, sc), g = s.g, wy = f ? 8 : 44; poly(g, [50, 34, 20, wy, 44, 34], '#7a3ad6', 3); poly(g, [60, 34, 86, wy, 70, 34], '#7a3ad6', 3); ell(g, 60, 40, 30, 12, '#a85aff', 3); poly(g, [86, 40, 112, 46, 90, 46], '#a85aff', 3); ell(g, 36, 36, 10, 8, '#a85aff', 3); poly(g, [32, 30, 36, 20, 40, 30], '#ffe23a', 2); ell(g, 33, 36, 2, 2, '#ffe23a', 0); poly(g, [32, 44, 6, 56, 30, 46], '#a85aff', 3); C.spr['dragon' + f] = s; }
    },
    skyAnim: function (ctx, cam, t, W, H, C) { for (let i = 0; i < 2; i++) { const span = W + 400, x = (((t * (38 + i * 14) + i * 500) % span) + span) % span - 200 - cam.x * 0.04, y = H * (0.22 + i * 0.2) + Math.sin(t * 1.6 + i * 2) * 14; const s = C.spr['dragon' + (((t * 4 + i) | 0) % 2)]; ctx.drawImage(s.c, ((x % span) + span) % span - 200, y, 120 * (1 - i * 0.2), 70 * (1 - i * 0.2)); } },
    layers: [
      { par: 0.06, parY: 0.05, base: 0.8, lh: 340, under: '#5a3a8a', after: cloudHook(3, 0.1, 0.1, 0.4, 0.9, 'cloud', 5), paint: function (g, lh, r) {
        hill(g, lh, { base: lh - 30, k: [[40, 2, 0.8]], fill: '#6a4a9a', lw: 3 });
        each3(500, function (x) { crenel(g, x - 150, x + 150, lh - 130, 100, '#8a7ab8', 3.5); [[-150, 150], [-50, 200], [50, 170], [150, 140]].forEach(function (tw, k) { const tx = x + tw[0], th = tw[1]; rect(g, tx - 22, lh - 30 - th, 44, th, '#9a8ac8', 3.5); poly(g, [tx - 30, lh - 30 - th, tx, lh - 90 - th, tx + 30, lh - 30 - th], k % 2 ? '#d63a8a' : '#4a6ad6', 3.5); line(g, tx, lh - 90 - th, tx, lh - 118 - th, INK, 3); poly(g, [tx, lh - 118 - th, tx + 20, lh - 110 - th, tx, lh - 102 - th], '#ffe23a', 2); rect(g, tx - 6, lh - 70 - th * 0.6, 12, 22, '#ffe28a', 2.5); }); rect(g, x - 24, lh - 76, 48, 52, '#5a3a5a', 3); });
      } },
      { par: 0.22, parY: 0.1, base: 0.97, lh: 250, under: '#3a2a6a', paint: function (g, lh, r) { hill(g, lh, { base: lh - 24, k: [[22, 3, 0.2], [10, 8, 1]], fill: '#4a3a8a', lw: 3 }); for (let i = 0; i < 6; i++) each3(r.r(0, TW), function (x) { mushroom(g, x, lh - 20, r.r(70, 120), ['#d63a8a', '#ffb02a', '#4aa8ff'][i % 3], 3); }); for (let i = 0; i < 6; i++) each3(r.r(0, TW), function (x) { roundTree(g, x, lh - 16, r.r(70, 100), '#6a3aa8', '#4a2a6a', 2.5); }); } },
      { par: 0.44, parY: 0.16, base: 1.05, lh: 180, under: '#1f1648', paint: function (g, lh, r) { hill(g, lh, { base: lh - 22, k: [[10, 5, 0]], fill: '#1f1648', lw: 3 }); for (let i = 0; i < 8; i++) each3(r.r(0, TW), function (x) { deadTree(g, x, lh - 14, r.r(80, 130), '#3a2a6a', 3); }); each3(200, function (x) { for (let k = 0; k < 6; k++) { line(g, x + k * 16, lh - 14, x + k * 16, lh - 48, INK, 7); line(g, x + k * 16, lh - 14, x + k * 16, lh - 48, '#a8a0c8', 3.5); } }); } }
    ]
  };

  // ---- MOON
  DEF.moon = {
    sky: function (g, W, H) {
      grad(g, W, H, [0, '#04030e', 1, '#1f1850']); const r = mkRng(5);
      for (let i = 0; i < 160; i++) { g.fillStyle = r.c(0.2) ? '#ffe9a8' : '#fff'; const s = r.c(0.15) ? 3 : 2; g.fillRect(r.r(0, W), r.r(0, H * 0.85), s, s); }
      bandDots(g, W, H * 0.7, H, 'rgba(120,100,255,0.25)');
      const ex = W * 0.76, ey = H * 0.28, er = Math.min(H * 0.17, 80);
      ell(g, ex, ey, er, er, '#2a86ff', 4); g.save(); g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.clip();
      g.fillStyle = '#3acb5a'; g.beginPath(); g.ellipse(ex - er * 0.3, ey - er * 0.1, er * 0.35, er * 0.5, 0.5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(ex + er * 0.4, ey + er * 0.3, er * 0.3, er * 0.25, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(ex + r.r(-er, er) * 0.8, ey + r.r(-er, er) * 0.8, er * 0.3, er * 0.07, r.r(-0.5, 0.5), 0, TAU); g.fill(); }
      dotsPoly(g, [ex + er * 0.2, ey - er, ex + er, ey - er, ex + er, ey + er, ex - er * 0.3, ey + er], 'rgba(10,20,90,0.5)', 1.8, 6); g.restore(); g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
    },
    sprites: function (C, sc, W, H) { C.twinkle = []; const r = mkRng(9); for (let i = 0; i < 18; i++) C.twinkle.push({ x: r.r(0, W), y: r.r(0, H * 0.7), p: r.r(0, 6) }); },
    skyAnim: function (ctx, cam, t, W, H, C) { ctx.fillStyle = '#fff'; for (const s of C.twinkle) { const a = 0.5 + 0.5 * Math.sin(t * 2.2 + s.p); ctx.globalAlpha = a; ctx.fillRect(s.x - 1, s.y - 4, 2, 9); ctx.fillRect(s.x - 4, s.y - 1, 9, 2); } ctx.globalAlpha = 1; },
    layers: [
      { par: 0.05, parY: 0.05, base: 0.84, lh: 270, under: '#8a8aa4', paint: function (g, lh, r) { ridge(g, lh, { rng: r, n: 6, base: lh - 6, amp: 150, fill: '#8a8aa4', shade: '#5a5a7a', lw: 3 }); for (let i = 0; i < 4; i++) each3(r.r(60, TW - 60), function (x) { ell(g, x, lh - 60 - r.r(0, 40), r.r(40, 70), 10, '#6a6a86', 2.5); }); } },
      { par: 0.2, parY: 0.1, base: 0.97, lh: 260, under: '#7a7a96', paint: function (g, lh, r) {
        hill(g, lh, { base: lh - 24, k: [[18, 3, 0.4], [7, 9, 2]], fill: '#a8a8bc', shade: '#7a7a96', lw: 3 });
        [[170, 1], [600, 0.8], [860, 1.1]].forEach(function (b, i) { each3(b[0], function (x) { const s = b[1], y = lh - 22; g.beginPath(); g.ellipse(x, y - 36 * s, 56 * s, 40 * s, 0, Math.PI, TAU); g.closePath(); g.fillStyle = 'rgba(160,240,255,0.55)'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = INK; g.stroke(); rect(g, x - 70 * s, y - 14 * s, 140 * s, 14 * s, '#b8c6dc', 3.5); line(g, x + 40 * s, y - 70 * s, x + 40 * s, y - 120 * s, INK, 4); ell(g, x + 40 * s, y - 122 * s, 5, 5, '#ff4a4a', 2.5); if (i === 1) { poly(g, [x - 140, y - 30, x - 80, y - 40, x - 82, y - 14, x - 142, y - 4], '#2a86ff', 3); } }); });
      } },
      { par: 0.44, parY: 0.16, base: 1.05, lh: 180, under: '#5a5a74', paint: function (g, lh, r) { hill(g, lh, { base: lh - 26, k: [[10, 4, 1]], fill: '#6a6a84', shade: '#4a4a64', lw: 3 }); for (let i = 0; i < 10; i++) each3(r.r(0, TW), function (x) { const w = r.r(20, 46); poly(g, [x - w, lh - 22, x - w * 0.6, lh - 22 - w * 0.9, x + w * 0.2, lh - 22 - w * 1.1, x + w, lh - 22], '#8a8aa4', 3); dotsPoly(g, [x + w * 0.2, lh - 22 - w * 1.1, x + w, lh - 22, x, lh - 22], 'rgba(20,20,60,0.35)', 1.3, 5); }); } }
    ]
  };

  // ---- RETRO (all painters use 4px "pixels"; canvases are 1/4 size and upscaled with smoothing off)
  const GB = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];
  function P(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x * 4, y * 4, w * 4, h * 4); }
  DEF.retro = {
    retro: true,
    sky: function (g, W, H) { const cw = Math.ceil(W / 4), ch = Math.ceil(H / 4); for (let y = 0; y < ch; y++) { const k = y / ch; for (let x = 0; x < cw; x++) { const lit = k < 0.25 ? 3 : k < 0.7 ? ((x + y) & 1 ? 2 : 3) : 2; P(g, GB[lit], x, y, 1, 1); } } },
    sprites: function (C, sc) { const s = mk(40, 14, 1), g = s.g; g.scale(0.25, 0.25); g.save(); [[2, 4, 6, 4], [4, 2, 8, 6], [10, 3, 8, 5], [14, 5, 8, 3], [0, 6, 24, 3]].forEach(function (b) { P(g, GB[3], b[0], b[1], b[2], b[3]); }); [[2, 8, 22, 1]].forEach(function (b) { P(g, GB[2], b[0], b[1], b[2], b[3]); }); g.restore(); C.spr.cloud = s; },
    layers: [
      { par: 0.07, parY: 0.05, base: 0.84, lh: 260, under: GB[2], px: 4, after: function (ctx, cam, t, W, H, C) { const sp = C.spr.cloud; for (let i = 0; i < 4; i++) { const span = W + 400, x = Math.floor((((hstr('rc' + i) / 4294967296 * 2000 + t * (6 + i * 2) - cam.x * 0.1) % span) + span) % span / 4) * 4 - 100; ctx.drawImage(sp.c, x, Math.floor(H * (0.1 + i * 0.1) / 4) * 4, 160, 56); } }, paint: function (g, lh, r) { const cells = TW / 4, base = lh / 4; for (let x = 0; x < cells; x++) { const h = 20 + Math.round(15 * Math.sin(x / cells * TAU * 3) + 8 * Math.sin(x / cells * TAU * 7 + 1)); P(g, GB[1], x, base - h, 1, h); P(g, GB[0], x, base - h, 1, 1); } for (let k = 0; k < 4; k++) { const x0 = Math.floor(k * cells / 4 + 12); P(g, GB[3], x0, base - 22, 2, 2); } } },
      { par: 0.22, parY: 0.1, base: 0.97, lh: 220, under: GB[1], px: 4, paint: function (g, lh, r) { const cells = TW / 4, base = lh / 4; for (let x = 0; x < cells; x++) { const h = 14 + Math.round(8 * Math.sin(x / cells * TAU * 4) + 4 * Math.sin(x / cells * TAU * 9)); P(g, GB[2], x, base - h, 1, h); P(g, GB[0], x, base - h, 1, 1); } for (let i = 0; i < 8; i++) { const x = r.i(2, cells - 12), bw = r.i(5, 9), bh = r.i(6, 12); const hy = base - 16 - bh; P(g, GB[0], x, hy, bw, bh); P(g, GB[1], x + 1, hy + 1, bw - 2, bh - 1); P(g, GB[3], x + 2, hy + 2, 1, 1); } } },
      { par: 0.44, parY: 0.16, base: 1.05, lh: 160, under: GB[0], px: 4, paint: function (g, lh, r) { const cells = TW / 4, base = lh / 4; P(g, GB[0], 0, base - 6, cells, 6); for (let x = 0; x < cells; x++) if ((x & 3) === 0) P(g, GB[1], x, base - 6, 3, 1); for (let i = 0; i < 9; i++) { const x = r.i(2, cells - 8), h = r.i(8, 14); P(g, GB[0], x + 2, base - 6 - h, 2, h); P(g, GB[1], x, base - 6 - h, 6, 4); P(g, GB[0], x + 1, base - 5 - h, 4, 1); } } }
    ]
  };

  // ---- FORTRESS
  DEF.fortress = {
    sky: function (g, W, H) { grad(g, W, H, [0, '#14040c', 0.55, '#5a0a1c', 1, '#c01c30']); bandDots(g, W, H * 0.5, H, 'rgba(255,90,60,0.35)'); ell(g, W * 0.3, H * 0.28, 52, 52, '#d63a3a', 3.5); dotsPoly(g, [W * 0.3 - 52, H * 0.28, W * 0.3 + 52, H * 0.28, W * 0.3, H * 0.28 + 52], 'rgba(60,0,0,0.5)', 1.6, 6); },
    sprites: function (C, sc) { C.spr.smoke = puffSpr(sc, 26, '#3a2a32'); const s = mk(120, 460, sc), g = s.g, gr = g.createLinearGradient(0, 460, 0, 0); gr.addColorStop(0, 'rgba(255,255,220,0.5)'); gr.addColorStop(1, 'rgba(255,255,220,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(54, 460); g.lineTo(66, 460); g.lineTo(120, 0); g.lineTo(0, 0); g.closePath(); g.fill(); C.spr.beam = s; },
    layers: [
      { par: 0.06, parY: 0.05, base: 0.84, lh: 400, under: '#2a1a28', after: function (ctx, cam, t, W, H, C, L) {
        const b = C.spr.beam; if (!b) return;
        for (const ox of L.xs) for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(ox + 150 + i * 340, L.yb - 40); ctx.rotate(Math.sin(t * 0.55 + i * 2.1) * 0.7); ctx.drawImage(b.c, -60, -460, 120, 460); ctx.restore(); }
      }, paint: function (g, lh, r) {
        hill(g, lh, { base: lh - 20, k: [[30, 2, 1]], fill: '#3a2438', lw: 3 });
        each3(560, function (x) {
          poly(g, [x - 250, lh - 20, x - 230, lh - 150, x - 150, lh - 230, x - 90, lh - 330, x + 90, lh - 330, x + 150, lh - 230, x + 230, lh - 150, x + 250, lh - 20], '#5a4458', 4);
          dotsPoly(g, [x + 40, lh - 330, x + 250, lh - 20, x + 40, lh - 20], 'rgba(10,0,10,0.35)', 1.8, 7);
          ell(g, x - 56, lh - 230, 34, 40, '#140c14', 3); ell(g, x + 56, lh - 230, 34, 40, '#140c14', 3); ell(g, x - 56, lh - 228, 18, 22, '#ffd23a', 0); ell(g, x + 56, lh - 228, 18, 22, '#ffd23a', 0); ell(g, x - 56, lh - 224, 6, 10, '#ff2a2a', 0); ell(g, x + 56, lh - 224, 6, 10, '#ff2a2a', 0);
          poly(g, [x, lh - 190, x - 14, lh - 150, x + 14, lh - 150], '#140c14', 2.5);
          for (let k = -3; k <= 3; k++) rect(g, x + k * 24 - 10, lh - 120, 20, 70, '#e4e0d0', 3);
          [[-90, 400], [90, 400], [0, 440]].forEach(function (tw) { rect(g, x + tw[0] - 16, lh - tw[1], 32, tw[1] - 330 + 6, '#4a3448', 3.5); poly(g, [x + tw[0] - 22, lh - tw[1], x + tw[0], lh - tw[1] - 40, x + tw[0] + 22, lh - tw[1]], '#8a1a2a', 3.5); });
        });
        each3(120, function (x) { rect(g, x - 14, lh - 120, 28, 100, '#4a3448', 3.5); poly(g, [x - 20, lh - 120, x, lh - 160, x + 20, lh - 120], '#8a1a2a', 3.5); });
      } },
      { par: 0.22, parY: 0.1, base: 0.97, lh: 260, under: '#1f1220', after: function (ctx, cam, t, W, H, C, L) { const sp = C.spr.smoke; if (!sp) return; for (const ox of L.xs) for (let i = 0; i < 4; i++) { const k = ((t * 0.16 + i / 4) % 1); ctx.globalAlpha = (1 - k) * 0.7; const sc = 0.5 + k * 1.4; ctx.drawImage(sp.c, ox + 220 + 380 * (i % 2) - 26 * sc + k * 24, L.yb - L.lh + 30 - k * 140, sp.w * sc, sp.h * sc); } ctx.globalAlpha = 1; }, paint: function (g, lh, r) {
        rect(g, -4, lh - 70, TW + 8, 80, '#3a2438', 3.5); for (let i = 0; i < 12; i++) each3(i * 86 + 10, function (x) { rect(g, x, lh - 82, 22, 14, '#3a2438', 3); });
        for (let i = 0; i < 8; i++) each3(40 + i * 128 + r.r(-20, 20), function (x) { const h = r.r(90, 190); rect(g, x - 20, lh - 70 - h, 40, h, '#4a3448', 3.5); poly(g, [x - 24, lh - 70 - h, x, lh - 70 - h - 54, x + 24, lh - 70 - h], '#6a1a2a', 3.5); rect(g, x - 5, lh - 70 - h * 0.6, 10, 18, '#ff8a1f', 2.5); });
        each3(220, function (x) { rect(g, x, lh - 190, 22, 120, '#2a1a28', 3.5); rect(g, x - 4, lh - 196, 30, 10, '#4a3448', 3.5); });
        each3(600, function (x) { rect(g, x, lh - 170, 22, 100, '#2a1a28', 3.5); rect(g, x - 4, lh - 176, 30, 10, '#4a3448', 3.5); });
        each3(880, function (x) { banner(g, x, lh - 70, 120, '#c01c30', 2.5); skull(g, x + 12, lh - 150, 9, '#e4e0d0', INK, 2); });
      } },
      { par: 0.44, parY: 0.16, base: 1.05, lh: 200, under: '#140c14', paint: function (g, lh, r) {
        rect(g, -4, lh - 28, TW + 8, 40, '#140c14', 0); g.lineWidth = 3.5; g.strokeStyle = INK; g.beginPath(); g.moveTo(-4, lh - 28); g.lineTo(TW + 4, lh - 28); g.stroke();
        for (let i = 0; i < 14; i++) each3(30 + i * 74, function (x) { line(g, x, lh - 24, x, lh - 120, INK, 8); line(g, x, lh - 24, x, lh - 120, '#7a7a90', 4); poly(g, [x - 6, lh - 120, x, lh - 138, x + 6, lh - 120], '#7a7a90', 2.5); });
        for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-4, lh - 100 + k * 26); for (let x = 0; x <= TW + 4; x += 74) { g.quadraticCurveTo(x + 37, lh - 82 + k * 26, x + 74, lh - 100 + k * 26); } g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = '#9a9ab0'; g.stroke(); }
        for (let i = 0; i < 5; i++) each3(r.r(0, TW), function (x) { line(g, x, lh - 24, x, lh - 96, INK, 6); line(g, x, lh - 24, x, lh - 96, '#6a4a32', 3); skull(g, x, lh - 108, 11, '#e4e0d0', INK, 2.5); });
      } }
    ]
  };

  // ------------------------------------------------------------------ cache + draw
  const CACHE = { id: null, key: '', sky: null, layers: [], spr: {}, C: null };
  function scaleOf(ctx) {
    let s = 1; try { if (ctx.getTransform) s = ctx.getTransform().a || 1; } catch (e) { s = 1; }
    return Math.max(0.5, Math.min(1.5, Math.round(s * 4) / 4));
  }
  function build(id, W, H, sc) {
    const def = DEF[id], TH = (S.Themes && S.Themes[id]) || null;
    const C = { spr: {}, def: def };
    CACHE.id = id; CACHE.key = [id, W, H, sc].join('|'); CACHE.C = C; CACHE.layers = [];
    const px = def.retro ? 4 : 0;
    const sky = def.retro ? mk(W / 4, H / 4, 1) : mk(W, H, sc);
    if (def.retro) sky.g.scale(0.25, 0.25);
    def.sky(sky.g, W, H, TH); C.sky = sky;
    if (def.sprites) def.sprites(C, def.retro ? 1 : sc, W, H);
    def.layers.forEach(function (L, i) {
      const rng = mkRng(hstr(id) + i * 977);
      const cv = px ? mk(TW / 4, L.lh / 4, 1) : mk(TW, L.lh, sc);
      if (px) { cv.g.imageSmoothingEnabled = false; cv.g.scale(0.25, 0.25); }
      L.paint(cv.g, L.lh, rng, C);
      CACHE.layers.push({ spr: cv, def: L });
    });
  }
  function draw(id, ctx, cam, t, W, H) {
    if (!DEF[id] || typeof document === 'undefined') return;
    const sc = scaleOf(ctx), key = [id, W, H, sc].join('|');
    if (CACHE.key !== key) build(id, W, H, sc);
    const C = CACHE.C, def = C.def;
    ctx.save();
    ctx.imageSmoothingEnabled = !def.retro;
    ctx.drawImage(C.sky.c, 0, 0, W, H);
    if (def.skyAnim) def.skyAnim(ctx, cam, t, W, H, C);
    const camRef = 300;
    for (const L of CACHE.layers) {
      const d = L.def, lh = d.lh;
      let yb = H * d.base + (camRef - cam.y) * d.parY;
      yb = Math.max(H * 0.3, Math.min(H * 1.6, yb));
      if (d.under && yb < H) { ctx.fillStyle = d.under; ctx.fillRect(0, yb - 1, W, H - yb + 2); }
      const xs = tilesOf(cam, d.par, W);
      for (const x of xs) ctx.drawImage(L.spr.c, x, yb - lh, TW, lh);
      if (d.after) d.after(ctx, cam, t, W, H, C, { xs: xs, yb: yb, lh: lh });
    }
    ctx.restore();
  }
  IDS_FOR_DEFS();
  function IDS_FOR_DEFS() { Object.keys(DEF).forEach(function (id) { B[id] = function (ctx, cam, t, W, H) { draw(id, ctx, cam, t, W, H); }; }); }
  B.dispose = function () { CACHE.id = null; CACHE.key = ''; CACHE.layers = []; CACHE.sky = null; CACHE.C = null; };

  // ------------------------------------------------------------------ ambient particle specs
  const AMB = {
    snow: { type: 'snow', count: 90, vx: [-40, -10], vy: [35, 90], size: [1.4, 3.6], colors: ['#ffffff', '#e8f6ff'], wobble: 1, front: true },
    ash: { type: 'ash', count: 60, vx: [-25, 10], vy: [10, 45], size: [1.2, 3.2], colors: ['#8a7a76', '#ff8a1f', '#ffb02a', '#4a3a3a'], wobble: 0.6, front: true },
    leaves: { type: 'leaves', count: 40, vx: [-90, -30], vy: [10, 40], size: [3, 6], colors: ['#62e03a', '#ffd23a', '#d68a2a', '#3cc040'], wobble: 1.6, spin: true, front: true },
    bubbles: { type: 'bubbles', count: 36, vx: [-8, 8], vy: [-60, -20], size: [2, 5], colors: ['rgba(255,255,255,0.7)', 'rgba(190,240,255,0.7)'], wobble: 1, rise: true, ring: true },
    dust: { type: 'dust', count: 40, vx: [-30, -8], vy: [-6, 10], size: [1.2, 2.8], colors: ['rgba(220,200,160,0.6)', 'rgba(255,255,255,0.45)'], wobble: 0.5, front: true },
    stars: { type: 'stars', count: 36, vx: [-6, 6], vy: [-4, 4], size: [1.5, 3.5], colors: ['#fff', '#ffe9a8', '#c8a0ff'], twinkle: true },
    pixels: { type: 'pixels', count: 40, vx: [-30, -10], vy: [20, 60], size: [4, 4], colors: ['#9bbc0f', '#8bac0f', '#306230'], square: true, front: true }
  };
  B.ambient = function (id) { const th = S.Themes && S.Themes[id]; const k = th ? th.ambient : null; return k && AMB[k] ? AMB[k] : null; };
  B.AMBIENT = AMB;

  // ------------------------------------------------------------------ level deco (world space, culled)
  const SIGN_FONT = 'bold 11px Bangers, Impact, "Arial Black", sans-serif';
  function sign(g, x, y, text, th) {
    g.font = SIGN_FONT; const w = Math.max(44, g.measureText(text).width + 14);
    rect(g, x - 3, y - 26, 6, 26, '#7a4a22', 2); rect(g, x - w / 2, y - 48, w, 24, th && th.retro ? '#9bbc0f' : '#fff6c8', 2.5);
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y - 35);
  }
  const DECO = {
    sign: function (g, x, y, d, th) { sign(g, x, y, d.text || 'NO DOOSHING', th); },
    tree: function (g, x, y, d, th) {
      const h = d.h || 100, k = d.kind;
      if (k === 'pine') pine(g, x, y, h, th.id === 'ice' ? '#3d86d8' : '#2a7a4a', th.id === 'ice' || th.id === 'mountain' ? '#fff' : null, 2.5);
      else if (k === 'dead') deadTree(g, x, y, h, th.id === 'fire' ? '#2a1c2a' : '#4a3a2a', 2.5);
      else if (k === 'palm') palm(g, x, y, h, '#3cc040', 2.5);
      else if (k === 'jungle') { roundTree(g, x, y, h, '#2fa83a', '#7a4a22', 2.5); line(g, x + h * 0.2, y - h * 0.5, x + h * 0.2, y - h * 0.2, '#3cc040', 3); }
      else if (k === 'pixel') { rect(g, x - 4, y - h * 0.5, 8, h * 0.5, GB[0], 0); rect(g, x - h * 0.22, y - h * 0.9, h * 0.44, h * 0.44, GB[1], 0); rect(g, x - h * 0.22, y - h * 0.9, h * 0.44, 4, GB[0], 0); }
      else roundTree(g, x, y, h, th.id === 'fantasy' ? '#6a3aa8' : th.id === 'wind' ? '#3fb83a' : '#3cc040', '#7a4a22', 2.5);
    },
    crystal: function (g, x, y, d) { crystal(g, x, y, 34, '#9ae6ff', 2.5); },
    skullpike: function (g, x, y) { line(g, x, y, x, y - 40, INK, 6); line(g, x, y, x, y - 40, '#6a4a32', 3); skull(g, x, y - 48, 9, '#e4e0d0', INK, 2.5); },
    windmill: function (g, x, y, d, th, t) { windmill(g, x, y, d.h || 100, '#f4e8d0', '#fff', (t || 0) * 0.9 + x, 3); },
    lamp: function (g, x, y) { line(g, x, y, x, y - 56, INK, 6); line(g, x, y, x, y - 56, '#3a3a4a', 3); ell(g, x, y - 60, 7, 7, '#ffe23a', 2.5); },
    anchor: function (g, x, y) { line(g, x, y, x, y - 30, INK, 5); g.beginPath(); g.arc(x, y - 6, 12, 0.2, Math.PI - 0.2); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); },
    banner: function (g, x, y, d) { banner(g, x, y, 56, '#c01c30', 2.5); },
    torch: function (g, x, y, d, th, t) { line(g, x, y, x, y - 22, INK, 6); line(g, x, y, x, y - 22, '#7a4a22', 3); const f = 7 + Math.sin((t || 0) * 12 + x) * 2; poly(g, [x - 5, y - 22, x, y - 22 - f * 2.2, x + 5, y - 22], '#ff8a1f', 2); },
    mushroom: function (g, x, y, d) { mushroom(g, x, y, 44, '#d63a8a', 2.5); },
    fence: function (g, x, y, d) { const w = d.w || 60; line(g, x - w / 2, y - 22, x + w / 2, y - 22, INK, 6); line(g, x - w / 2, y - 12, x + w / 2, y - 12, INK, 6); line(g, x - w / 2, y - 22, x + w / 2, y - 22, '#fff', 3); line(g, x - w / 2, y - 12, x + w / 2, y - 12, '#fff', 3); for (let px = -w / 2; px <= w / 2; px += w / 3) { line(g, x + px, y, x + px, y - 28, INK, 7); line(g, x + px, y, x + px, y - 28, '#fff', 3.5); } },
    hay: function (g, x, y) { ell(g, x, y - 12, 16, 12, '#ffd84a', 2.5); line(g, x - 10, y - 14, x + 10, y - 14, '#d4a418', 1.5); line(g, x - 8, y - 9, x + 8, y - 9, '#d4a418', 1.5); },
    rock: function (g, x, y) { poly(g, [x - 24, y, x - 16, y - 22, x + 4, y - 30, x + 24, y - 12, x + 26, y], '#8a8aa4', 2.5); dotsPoly(g, [x + 4, y - 30, x + 26, y, x, y], 'rgba(20,20,60,0.3)', 1.2, 5); },
    sail: function (g, x, y, d) { const h = d.h || 130; line(g, x, y, x, y - h, INK, 6); line(g, x, y, x, y - h, '#8a5a2a', 3); poly(g, [x + 4, y - h + 6, x + 52, y - h * 0.5, x + 4, y - 14], '#fff6dc', 3); poly(g, [x - 4, y - h + 14, x - 40, y - h * 0.5, x - 4, y - 20], '#fff6dc', 3); banner(g, x, y - h, 22, '#d63a2a', 2); },
    antenna: function (g, x, y) { line(g, x, y, x, y - 54, INK, 5); line(g, x - 14, y - 40, x + 14, y - 40, INK, 4); ell(g, x, y - 58, 5, 5, '#ff4a4a', 2.5); },
    moonflag: function (g, x, y) { line(g, x, y, x, y - 56, INK, 5); line(g, x, y, x, y - 56, '#e4e4f2', 2.5); poly(g, [x, y - 56, x + 30, y - 52, x + 30, y - 32, x, y - 36], '#2a86ff', 2.5); },
    bush: function (g, x, y) { ell(g, x, y - 12, 20, 13, '#2fa83a', 2.5); ell(g, x - 12, y - 8, 12, 9, '#3cc040', 2.5); ell(g, x + 13, y - 8, 12, 9, '#3cc040', 2.5); ell(g, x, y - 12, 20, 13, '#2fa83a', 0); },
    cattail: function (g, x, y) { for (let i = -1; i <= 1; i++) { line(g, x + i * 6, y, x + i * 6 + i * 2, y - 44 - i * 4, INK, 5); line(g, x + i * 6, y, x + i * 6 + i * 2, y - 44 - i * 4, '#5a8a2a', 2.5); ell(g, x + i * 6 + i * 2, y - 48 - i * 4, 4, 9, '#7a4a22', 2); } },
    wire: function (g, x, y) { line(g, x - 24, y, x - 24, y - 30, INK, 5); line(g, x + 24, y, x + 24, y - 30, INK, 5); g.beginPath(); g.moveTo(x - 24, y - 28); for (let i = 0; i < 6; i++) g.lineTo(x - 24 + i * 9.6 + 4.8, y - 20 - (i % 2 ? 0 : 7)); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke(); },
    pixelbush: function (g, x, y) { rect(g, x - 16, y - 12, 32, 12, GB[1], 0); rect(g, x - 8, y - 20, 16, 8, GB[1], 0); rect(g, x - 16, y - 12, 32, 4, GB[0], 0); },
    pixeltree: function (g, x, y) { rect(g, x - 4, y - 24, 8, 24, GB[0], 0); rect(g, x - 16, y - 44, 32, 24, GB[1], 0); rect(g, x - 16, y - 44, 32, 4, GB[0], 0); }
  };
  B.deco = function (ctx, level, cam, t) {
    if (!level || !level.deco) return;
    const th = (S.Themes && S.Themes[level.theme]) || { id: level.theme };
    const x0 = cam.x - 80, x1 = cam.x + cam.w + 80;
    ctx.save(); ctx.lineJoin = 'round';
    for (const d of level.deco) {
      if (d.x < x0 || d.x > x1) continue;
      const f = DECO[d.id]; if (!f) continue;
      if (d.flip) { ctx.save(); ctx.translate(d.x, 0); ctx.scale(-1, 1); f(ctx, 0, d.y, d, th, t); ctx.restore(); } else f(ctx, d.x, d.y, d, th, t);
    }
    ctx.restore();
  };
  B.ids = Object.keys(DEF);
})();
