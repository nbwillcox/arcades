/* Oblique 3/4 projection + drawing primitives (boxes, cylinders, balls), the space backdrop and the ground. World: x = across the street, z = along it (forward), y = up. */
(function (G) {
  'use strict';
  const C = G.C;
  const g = (G.gfx = { X: 0, Y: 0, camX: 0, camZ: 0, shx: 0, shy: 0, OX: 480, OY: 335 });
  const SC = 2.0, RX = 0.95, RY = 0.2, FX = 0.3, FY = -0.76, HS = 1.9;
  g.SC = SC; g.RX = RX; g.RY = RY; g.FX = FX; g.FY = FY; g.HS = HS;
  let ctx = null;
  g.setCtx = (c) => { ctx = c; };
  g.pr = function (x, z, y) { const a = x - g.camX, b = z - g.camZ; g.X = g.OX + g.shx + (a * RX + b * FX) * SC; g.Y = g.OY + g.shy + (a * RY + b * FY) * SC - (y || 0) * HS; };
  g.key = (x, z) => x * RY + z * FY;

  /* ---- colours ---- */
  const hc = new Map();
  g.hsl = function (h, s, l, a) { const k = ((h | 0) * 100000 + (s | 0) * 1000 + ((l * 2) | 0)) + (a === undefined ? 0 : a * 0.5); let v = hc.get(k); if (!v) { v = a === undefined ? 'hsl(' + (h | 0) + ',' + (s | 0) + '%,' + Math.max(0, Math.min(100, l)).toFixed(1) + '%)' : 'hsla(' + (h | 0) + ',' + (s | 0) + '%,' + Math.max(0, Math.min(100, l)).toFixed(1) + '%,' + a + ')'; hc.set(k, v); } return v; };
  const EDGE = 'rgba(14,8,40,0.9)';
  g.EDGE = EDGE;

  g.poly = function (pts, fill, stroke, lw) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 3) { g.pr(pts[i], pts[i + 1], pts[i + 2]); if (i === 0) ctx.moveTo(g.X, g.Y); else ctx.lineTo(g.X, g.Y); }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.2; ctx.lineJoin = 'round'; ctx.stroke(); }
  };
  /* axis-aligned box with three visible faces; c = [h,s,l] */
  g.box = function (x0, z0, y0, w, d, h, c, nostroke) {
    const x1 = x0 + w, z1 = z0 + d, y1 = y0 + h, e = nostroke ? null : EDGE, H = c[0], S = c[1], L = c[2];
    g.poly([x1, z0, y0, x1, z1, y0, x1, z1, y1, x1, z0, y1], g.hsl(H, S, L), e);
    g.poly([x0, z0, y0, x1, z0, y0, x1, z0, y1, x0, z0, y1], g.hsl(H, S, L - 12), e);
    g.poly([x0, z0, y1, x1, z0, y1, x1, z1, y1, x0, z1, y1], g.hsl(H, S, L + 13), e);
  };
  g.ball = function (x, z, y, r, c, hi) {
    g.pr(x, z, y); const px = g.X, py = g.Y, rr = r * SC;
    ctx.beginPath(); ctx.arc(px, py, rr, 0, 6.2832); ctx.fillStyle = g.hsl(c[0], c[1], c[2]); ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2; ctx.stroke();
    if (hi !== false) { ctx.beginPath(); ctx.arc(px - rr * 0.32, py - rr * 0.34, rr * 0.38, 0, 6.2832); ctx.fillStyle = g.hsl(c[0], c[1] * 0.7, Math.min(96, c[2] + 26), 0.75); ctx.fill(); }
  };
  g.cyl = function (x, z, y0, r, h, c) {
    g.pr(x, z, y0); const bx = g.X, by = g.Y; g.pr(x, z, y0 + h); const tx = g.X, ty = g.Y, rr = r * SC, ry = rr * 0.5;
    ctx.beginPath(); ctx.moveTo(bx - rr, by); ctx.lineTo(tx - rr, ty); ctx.ellipse(tx, ty, rr, ry, 0, Math.PI, 0, false); ctx.lineTo(bx + rr, by); ctx.ellipse(bx, by, rr, ry, 0, 0, Math.PI, false); ctx.closePath();
    ctx.fillStyle = g.hsl(c[0], c[1], c[2]); ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(tx, ty, rr, ry, 0, 0, 6.2832); ctx.fillStyle = g.hsl(c[0], c[1], c[2] + 14); ctx.fill(); ctx.stroke();
  };
  g.shadow = function (x, z, r, a) { g.pr(x, z, 0); ctx.beginPath(); ctx.ellipse(g.X, g.Y, r * SC * 0.95, r * SC * 0.5, 0, 0, 6.2832); ctx.fillStyle = 'rgba(8,4,24,' + (a === undefined ? 0.32 : a) + ')'; ctx.fill(); };
  g.ring = function (x, z, y, r, col, lw, a) { g.pr(x, z, y); ctx.beginPath(); ctx.ellipse(g.X, g.Y, r * SC * 0.95, r * SC * 0.5, 0, 0, 6.2832); ctx.strokeStyle = col; ctx.lineWidth = lw || 2; ctx.globalAlpha = a === undefined ? 1 : a; ctx.stroke(); ctx.globalAlpha = 1; };
  g.disc = function (x, z, y, r, col) { g.pr(x, z, y); ctx.beginPath(); ctx.ellipse(g.X, g.Y, r * SC * 0.95, r * SC * 0.5, 0, 0, 6.2832); ctx.fillStyle = col; ctx.fill(); };
  g.text = function (s, x, y, size, fill, align, stroke) {
    ctx.font = '900 ' + size + 'px "Segoe UI",system-ui,sans-serif'; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    if (stroke !== false) { ctx.strokeStyle = 'rgba(10,6,34,0.92)'; ctx.lineWidth = Math.max(3, size / 4); ctx.strokeText(s, x, y); }
    ctx.fillStyle = fill || '#fff'; ctx.fillText(s, x, y);
  };
  g.hash = (n) => { n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16; return (n >>> 0) / 4294967296; };

  /* ---- backdrop ---- */
  let bg = null, stars = [], rocks = [];
  function makeBg() {
    bg = document.createElement('canvas'); bg.width = 480; bg.height = 270; const b = bg.getContext('2d');
    const gr = b.createLinearGradient(0, 0, 0, 270); gr.addColorStop(0, '#0a0524'); gr.addColorStop(0.55, '#1c0c40'); gr.addColorStop(1, '#071a3c'); b.fillStyle = gr; b.fillRect(0, 0, 480, 270);
    const blobs = [[90, 60, 150, '255,60,190', 0.20], [380, 90, 170, '60,200,255', 0.17], [250, 230, 190, '150,70,255', 0.20], [440, 250, 120, '255,150,60', 0.10], [30, 220, 120, '60,255,190', 0.10]];
    for (const q of blobs) { const rg = b.createRadialGradient(q[0], q[1], 0, q[0], q[1], q[2]); rg.addColorStop(0, 'rgba(' + q[3] + ',' + q[4] + ')'); rg.addColorStop(1, 'rgba(' + q[3] + ',0)'); b.fillStyle = rg; b.fillRect(0, 0, 480, 270); }
    for (let i = 0; i < 170; i++) stars.push({ x: g.hash(i * 3) * 960, y: g.hash(i * 3 + 1) * 540, d: 0.2 + g.hash(i * 3 + 2) * 0.8, tw: g.hash(i * 7) * 6 });
    for (let i = 0; i < 6; i++) rocks.push({ x: g.hash(i + 900) * 960, y: g.hash(i + 950) * 540, r: 8 + g.hash(i + 990) * 22, d: 0.5 + g.hash(i + 70) * 0.5, rot: g.hash(i + 33) * 6 });
  }
  g.backdrop = function (time) {
    if (!bg) makeBg();
    ctx.drawImage(bg, 0, 0, 960, 540);
    const cz = g.camZ, cx = g.camX;
    /* planet */
    const px = 150 - (cz * 0.03) % 40, py = 105 + (cz * 0.02) % 30;
    const pg = ctx.createRadialGradient(px - 22, py - 22, 4, px, py, 76); pg.addColorStop(0, '#ffd2a0'); pg.addColorStop(0.55, '#e0709a'); pg.addColorStop(1, '#4a1a6a');
    ctx.beginPath(); ctx.arc(px, py, 70, 0, 6.2832); ctx.fillStyle = pg; ctx.fill();
    ctx.save(); ctx.translate(px, py); ctx.rotate(-0.35); ctx.beginPath(); ctx.ellipse(0, 0, 118, 24, 0, 0, 6.2832); ctx.strokeStyle = 'rgba(255,220,180,0.55)'; ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.arc(px, py, 70, 0.2, 2.9); ctx.strokeStyle = 'rgba(40,10,70,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    for (const s of stars) {
      const x = ((s.x - cz * 0.30 * s.d - cx * 0.1 * s.d) % 960 + 960) % 960, y = ((s.y + cz * 0.26 * s.d) % 540 + 540) % 540;
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * (1 + s.d * 2) + s.tw));
      ctx.fillStyle = 'rgba(255,255,255,' + (a * s.d).toFixed(2) + ')'; const z2 = s.d > 0.8 ? 2 : 1.3; ctx.fillRect(x, y, z2, z2);
    }
    for (const r of rocks) {
      const x = ((r.x - cz * 0.5 * r.d) % 1100 + 1100) % 1100 - 70, y = ((r.y + cz * 0.43 * r.d) % 640 + 640) % 640 - 50;
      ctx.save(); ctx.translate(x, y); ctx.rotate(r.rot + time * 0.1); ctx.beginPath();
      for (let k = 0; k < 7; k++) { const a = k / 7 * 6.2832, rr = r.r * (0.7 + 0.3 * g.hash(k * 13 + (r.x | 0))); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fillStyle = '#4b3a68'; ctx.fill(); ctx.strokeStyle = '#1b1238'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
  };

  /* ---- ground ---- */
  const THEMES = [
    { lawn: [135, 42, 34], lawn2: [140, 42, 31], walk: [215, 22, 66], road: [250, 25, 22], rock: [270, 25, 24] },
    { lawn: [160, 45, 32], lawn2: [165, 45, 29], walk: [200, 25, 66], road: [255, 28, 21], rock: [260, 25, 24] },
    { lawn: [100, 40, 33], lawn2: [105, 40, 30], walk: [50, 22, 66], road: [20, 22, 20], rock: [20, 25, 24] },
    { lawn: [280, 38, 33], lawn2: [285, 38, 30], walk: [300, 18, 66], road: [270, 28, 20], rock: [290, 25, 24] },
    { lawn: [180, 50, 30], lawn2: [185, 50, 27], walk: [190, 25, 68], road: [230, 30, 20], rock: [230, 25, 24] },
    { lawn: [20, 45, 32], lawn2: [25, 45, 29], walk: [30, 22, 66], road: [350, 22, 20], rock: [350, 25, 24] },
    { lawn: [140, 40, 36], lawn2: [145, 40, 32], walk: [210, 20, 70], road: [235, 25, 24], rock: [240, 25, 26] },
  ];
  g.theme = (i) => THEMES[((i % 7) + 7) % 7];

  g.ground = function (R, z0, z1, time) {
    const T = THEMES[R.theme || 0], E = C.EDGE;
    z0 = Math.floor(z0 / 20) * 20; z1 = Math.ceil(z1 / 20) * 20;
    /* platform underside (visible on the +x edge) */
    const rk = T.rock; g.poly([E, z0, 0, E, z1, 0, E, z1, -48, E, z0, -48], g.hsl(rk[0], rk[1], rk[2]), EDGE, 1.5);
    for (let z = z0 - (z0 % 24); z < z1; z += 24) {
      const d = 14 + g.hash(z | 0) * 34;
      g.poly([E, z, -40, E, z + 24, -40, E, z + 12, -40 - d], g.hsl(rk[0], rk[1], rk[2] - 4), EDGE, 1.2);
      g.poly([E, z + 4, -10, E, z + 9, -10, E, z + 7, -26], g.hsl(rk[0], rk[1], rk[2] + 8), null);
    }
    /* lawns with mowing stripes */
    const L1 = T.lawn, L2 = T.lawn2;
    g.poly([-E, z0, 0, -C.SIDEW, z0, 0, -C.SIDEW, z1, 0, -E, z1, 0], g.hsl(L1[0], L1[1], L1[2]), null);
    g.poly([C.SIDEW, z0, 0, E, z0, 0, E, z1, 0, C.SIDEW, z1, 0], g.hsl(L1[0], L1[1], L1[2]), null);
    for (let z = z0 - (((z0 % 200) + 200) % 200); z < z1; z += 200) {
      const a = Math.max(z, z0), b = Math.min(z + 100, z1); if (b <= a) continue;
      g.poly([-E, a, 0, -C.SIDEW, a, 0, -C.SIDEW, b, 0, -E, b, 0], g.hsl(L2[0], L2[1], L2[2]), null);
      g.poly([C.SIDEW, a, 0, E, a, 0, E, b, 0, C.SIDEW, b, 0], g.hsl(L2[0], L2[1], L2[2]), null);
    }
    /* sidewalks */
    const W = T.walk;
    g.poly([-C.SIDEW, z0, 0, -C.CURB, z0, 0, -C.CURB, z1, 0, -C.SIDEW, z1, 0], g.hsl(W[0], W[1], W[2]), null);
    g.poly([C.CURB, z0, 0, C.SIDEW, z0, 0, C.SIDEW, z1, 0, C.CURB, z1, 0], g.hsl(W[0], W[1], W[2]), null);
    ctx.strokeStyle = 'rgba(40,30,90,0.28)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let z = z0; z <= z1; z += 20) for (const s of [-1, 1]) { g.pr(s * C.CURB, z, 0); ctx.moveTo(g.X, g.Y); g.pr(s * C.SIDEW, z, 0); ctx.lineTo(g.X, g.Y); }
    ctx.stroke();
    /* road */
    const Rd = T.road;
    g.poly([-C.CURB, z0, 0, C.CURB, z0, 0, C.CURB, z1, 0, -C.CURB, z1, 0], g.hsl(Rd[0], Rd[1], Rd[2]), null);
    /* crossings */
    for (const o of R.deco) {
      if (o.t !== 'crossroad' || o.z1 < z0 || o.z > z1) continue;
      g.poly([-E, o.z, 0, E, o.z, 0, E, o.z1, 0, -E, o.z1, 0], g.hsl(Rd[0], Rd[1], Rd[2] + 1), null);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k < 8; k++) { g.pr(-C.CURB + 4 + k * 14, o.z + 3, 0); ctx.moveTo(g.X, g.Y); g.pr(-C.CURB + 4 + k * 14, o.z + 11, 0); ctx.lineTo(g.X, g.Y); }
      ctx.stroke();
      const flash = (Math.sin(time * 10) > 0) ? 'rgba(255,90,70,0.9)' : 'rgba(255,200,70,0.9)';
      g.text('!', (g.pr(-C.CURB - 12, o.z + 4, 30), g.X), g.Y, 22, flash);
    }
    /* lane marks + glowing curbs */
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,214,90,0.8)'; ctx.beginPath();
    for (let z = z0 - (((z0 % 24) + 24) % 24); z < z1; z += 24) { g.pr(0, z, 0); ctx.moveTo(g.X, g.Y); g.pr(0, z + 12, 0); ctx.lineTo(g.X, g.Y); }
    ctx.stroke();
    for (const s of [-1, 1]) { ctx.strokeStyle = 'rgba(90,230,255,0.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); g.pr(s * C.CURB, z0, 0); ctx.moveTo(g.X, g.Y); g.pr(s * C.CURB, z1, 0); ctx.lineTo(g.X, g.Y); ctx.stroke(); }
    /* lawn sparkle / grass tufts */
    for (let z = z0 - (((z0 % 20) + 20) % 20); z < z1; z += 20) {
      for (let k = 0; k < 4; k++) {
        const hs = g.hash((z | 0) * 9 + k), hx = g.hash((z | 0) * 5 + k * 77), s = hs < 0.5 ? -1 : 1;
        const x = s * (92 + hx * 128), zz = z + g.hash((z | 0) + k * 31) * 20;
        g.pr(x, zz, 0); ctx.fillStyle = k % 2 ? g.hsl(L1[0], L1[1] + 6, L1[2] + 8) : g.hsl(300 + hx * 60, 70, 75); ctx.fillRect(g.X - 1, g.Y - (k % 2 ? 4 : 1.5), 2, k % 2 ? 4 : 2);
      }
    }
  };
})((window.SGS = window.SGS || {}));
