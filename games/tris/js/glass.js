/* The glass: every block is a refractive crystal. Per cell we sample a magnified, shifted slice of the live backdrop (so the nebula bends through the glass), then layer a
   cached tint / bevel / specular / caustic / dispersion sprite on top, plus an animated sheen. Also the nebula backdrop, glowing power cores and the shatter shards. */
(function (G) {
  'use strict';
  const GL = {};
  G.glass = GL;
  GL.COLORS = [null, [56, 230, 255], [255, 216, 56], [176, 92, 255], [76, 255, 122], [255, 74, 92], [74, 120, 255], [255, 154, 58], [160, 176, 208]];
  GL.CORECOL = [null, [255, 90, 58], [74, 240, 255], [216, 244, 255], [255, 210, 74]];
  const rr = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.lineTo(a + w - r, b); x.quadraticCurveTo(a + w, b, a + w, b + r); x.lineTo(a + w, b + h - r); x.quadraticCurveTo(a + w, b + h, a + w - r, b + h); x.lineTo(a + r, b + h); x.quadraticCurveTo(a, b + h, a, b + h - r); x.lineTo(a, b + r); x.quadraticCurveTo(a, b, a + r, b); x.closePath(); };
  GL.rr = rr;
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  GL.cv = cv;
  function buildCell(cs, col) {
    const c = cv(cs, cs), x = c.getContext('2d'), [r, g, b] = col, m = Math.max(1, cs * 0.03), w = cs - m * 2, rad = cs * 0.09, rgba = (a, k) => 'rgba(' + Math.round(r * (k || 1)) + ',' + Math.round(g * (k || 1)) + ',' + Math.round(b * (k || 1)) + ',' + a + ')';
    x.translate(m, m);
    rr(x, 0, 0, w, w, rad); x.fillStyle = rgba(0.26); x.fill();
    x.save(); rr(x, 0, 0, w, w, rad); x.clip();
    let gr = x.createLinearGradient(0, 0, w, w); gr.addColorStop(0, 'rgba(255,255,255,0.34)'); gr.addColorStop(0.42, 'rgba(255,255,255,0.03)'); gr.addColorStop(1, rgba(0.5, 0.25)); x.fillStyle = gr; x.fillRect(0, 0, w, w);
    gr = x.createRadialGradient(w / 2, w / 2, w * 0.22, w / 2, w / 2, w * 0.78); gr.addColorStop(0, rgba(0)); gr.addColorStop(1, rgba(0.62)); x.fillStyle = gr; x.fillRect(0, 0, w, w);
    // caustic: light focused into the lower right
    x.globalCompositeOperation = 'lighter'; gr = x.createRadialGradient(w * 0.7, w * 0.72, 0, w * 0.7, w * 0.72, w * 0.34); gr.addColorStop(0, rgba(0.6, 1.1)); gr.addColorStop(1, rgba(0)); x.fillStyle = gr; x.fillRect(0, 0, w, w);
    // dispersion fringes: red / blue split along opposite edges
    x.fillStyle = 'rgba(255,70,70,0.40)'; x.fillRect(0, 0, Math.max(1, w * 0.045), w); x.fillStyle = 'rgba(70,130,255,0.42)'; x.fillRect(w - Math.max(1, w * 0.045), 0, Math.max(1, w * 0.045), w);
    x.fillStyle = 'rgba(255,255,110,0.30)'; x.fillRect(0, 0, w, Math.max(1, w * 0.04)); x.fillStyle = 'rgba(255,70,255,0.28)'; x.fillRect(0, w - Math.max(1, w * 0.04), w, Math.max(1, w * 0.04));
    x.globalCompositeOperation = 'source-over';
    // specular gloss band
    gr = x.createLinearGradient(0, 0, w * 0.6, w * 0.6); gr.addColorStop(0, 'rgba(255,255,255,0.62)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.beginPath(); x.moveTo(w * 0.07, w * 0.09); x.lineTo(w * 0.62, w * 0.05); x.lineTo(w * 0.07, w * 0.58); x.closePath(); x.fill();
    x.restore();
    // double bevel
    gr = x.createLinearGradient(0, 0, w, w); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.5, rgba(0.8, 1.2)); gr.addColorStop(1, rgba(0.95, 0.35));
    rr(x, cs * 0.015, cs * 0.015, w - cs * 0.03, w - cs * 0.03, rad); x.strokeStyle = gr; x.lineWidth = Math.max(1, cs * 0.05); x.stroke();
    gr = x.createLinearGradient(0, 0, w, w); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)');
    rr(x, cs * 0.12, cs * 0.12, w - cs * 0.24, w - cs * 0.24, rad * 0.6); x.strokeStyle = gr; x.lineWidth = Math.max(1, cs * 0.022); x.stroke();
    // corner glint
    gr = x.createRadialGradient(w * 0.2, w * 0.2, 0, w * 0.2, w * 0.2, cs * 0.1); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w * 0.5, w * 0.5);
    return c;
  }
  function buildSheen(cs) {
    const c = cv(cs, cs), x = c.getContext('2d'), gr = x.createLinearGradient(0, cs, cs, 0);
    gr.addColorStop(0.3, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.7, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, cs, cs); return c;
  }
  GL.cs = 0;
  GL.build = function (cs) {
    cs = Math.max(8, Math.round(cs)); if (cs === GL.cs) return; GL.cs = cs;
    GL.spr = GL.COLORS.map((col) => (col ? buildCell(cs, col) : null)); GL.sheen = buildSheen(cs);
    GL.small = {}; // lazily scaled copies for previews
  };
  /* one glass cell at device px (x, y), size cs; bg is the live backdrop canvas; (ox, oy) is the lens centre the parallax shifts away from */
  GL.cell = function (ctx, bg, x, y, cs, t, time, ox, oy, alpha) {
    const mag = 1.85, sw = cs / mag, cx = x + cs / 2 + (x - ox) * 0.09, cy = y + cs / 2 + (y - oy) * 0.09 + Math.sin(time * 0.9 + x * 0.013) * cs * 0.035;
    if (alpha !== undefined && alpha < 1) ctx.globalAlpha = alpha;
    if (bg) { ctx.drawImage(bg, Math.max(0, cx - sw / 2), Math.max(0, cy - sw / 2), sw, sw, x, y, cs, cs); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x, y, cs, cs); }
    ctx.drawImage(GL.spr[t], x, y, cs, cs);
    const sh = Math.sin((x + y) * 0.011 / (cs / 40) - time * 1.7) - 0.8;
    if (sh > 0) { ctx.globalAlpha = (alpha === undefined ? 1 : alpha) * Math.min(1, sh * 3.2) * 0.55; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(GL.sheen, x, y, cs, cs); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1;
  };
  GL.ghost = function (ctx, x, y, cs, t) {
    const [r, g, b] = GL.COLORS[t], m = cs * 0.06;
    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.10)'; rr(ctx, x + m, y + m, cs - m * 2, cs - m * 2, cs * 0.1); ctx.fill();
    ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.7)'; ctx.lineWidth = Math.max(1, cs * 0.05); ctx.stroke();
  };

  /* ---------- power cores: glowing orbs with a symbol, pulsing inside their glass cell ---------- */
  GL.core = function (ctx, x, y, cs, type, time) {
    const [r, g, b] = GL.CORECOL[type], cx = x + cs / 2, cy = y + cs / 2, p = 0.78 + Math.sin(time * 5 + type) * 0.14, R = cs * 0.34 * p;
    ctx.globalCompositeOperation = 'lighter';
    let gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, cs * 0.9); gr.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.4)'); gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)'); ctx.fillStyle = gr; ctx.fillRect(cx - cs, cy - cs, cs * 2, cs * 2);
    gr = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.35, 'rgba(' + r + ',' + g + ',' + b + ',0.95)'); gr.addColorStop(1, 'rgba(' + Math.round(r * 0.5) + ',' + Math.round(g * 0.5) + ',' + Math.round(b * 0.5) + ',0.7)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = Math.max(1, cs * 0.045); ctx.lineCap = 'round'; ctx.beginPath();
    const s = cs * 0.2;
    if (type === 1) { ctx.arc(cx, cy + s * 0.15, s * 0.8, 0, 6.2832); ctx.moveTo(cx + s * 0.5, cy - s * 0.6); ctx.lineTo(cx + s * 0.95, cy - s * 1.05); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + s * 1.05, cy - s * 1.15, s * 0.16, 0, 6.2832); ctx.fill(); }
    else if (type === 2) { ctx.moveTo(cx, cy - s * 1.1); ctx.lineTo(cx, cy + s * 1.1); ctx.moveTo(cx - s * 0.5, cy - s * 0.55); ctx.lineTo(cx, cy - s * 1.1); ctx.lineTo(cx + s * 0.5, cy - s * 0.55); ctx.moveTo(cx - s * 0.5, cy + s * 0.55); ctx.lineTo(cx, cy + s * 1.1); ctx.lineTo(cx + s * 0.5, cy + s * 0.55); ctx.stroke(); }
    else if (type === 3) { for (let i = 0; i < 3; i++) { const a = i * 1.0472; ctx.moveTo(cx - Math.cos(a) * s, cy - Math.sin(a) * s); ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); } ctx.stroke(); }
    else { for (let i = 0; i < 8; i++) { const a = i * 0.7854 + time, l = i & 1 ? s * 0.6 : s * 1.1; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); } ctx.stroke(); }
  };

  /* ---------- the nebula backdrop ---------- */
  const hash = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y, s) => { let t = 0, a = 0.5; for (let i = 0; i < 5; i++) { t += a * vn(x, y, s + i); x *= 2.03; y *= 2.03; a *= 0.5; } return t; };
  const hsl = (h, s, l) => { h = ((h % 360) + 360) % 360; s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0) * 255, f(8) * 255, f(4) * 255]; };
  GL.hsl = hsl;
  GL.HUES = [205, 285, 22, 150, 330, 48];
  const neb = [];
  GL.nebula = function (i) {
    if (neb[i]) return neb[i];
    const W = 320, H = 180, c = cv(W, H), x = c.getContext('2d'), im = x.createImageData(W, H), d = im.data, hue = GL.HUES[i % 6], seed = 11 + i * 17;
    const c1 = hsl(hue, 78, 24), c2 = hsl(hue + 42, 90, 52), c3 = hsl(hue - 34, 95, 70), c0 = hsl(hue, 60, 5), mx = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const w2 = fbm(xx / 38 + 7, yy / 38, seed + 9), n = fbm(xx / 60 + w2 * 1.4, yy / 60 + w2 * 0.9, seed), lane = Math.max(0, Math.min(1, (fbm(xx / 46, yy / 30, seed + 21) - 0.5) * 3.4));
      const t = Math.max(0, Math.min(1, (n - 0.32) * 2.6)), col = t < 0.45 ? mx(c0, c1, t / 0.45) : t < 0.8 ? mx(c1, c2, (t - 0.45) / 0.35) : mx(c2, c3, (t - 0.8) / 0.2);
      const dk = (1 - lane * 0.55) * 0.84, o = (yy * W + xx) * 4; d[o] = col[0] * dk; d[o + 1] = col[1] * dk; d[o + 2] = col[2] * dk; d[o + 3] = 255;
    }
    x.putImageData(im, 0, 0); return (neb[i] = c);
  };
  const stars = []; for (let i = 0; i < 150; i++) stars.push({ x: Math.random(), y: Math.random(), s: Math.random() < 0.12 ? 2 : 1, p: Math.random() * 6.28, z: 0.2 + Math.random() * 0.8 });
  /* sec = { a, b, mix }: two sector palettes cross-fading */
  GL.backdrop = function (ctx, w, h, time, sec, level) {
    ctx.fillStyle = '#04050f'; ctx.fillRect(0, 0, w, h);
    const sc = Math.max(w / 320, h / 180) * 1.3;
    const layer = (i, a, k, ox, oy, op) => { const nb = GL.nebula(i), s2 = sc * k; ctx.globalAlpha = a; ctx.globalCompositeOperation = op || 'source-over'; ctx.drawImage(nb, (w - 320 * s2) / 2 + ox, (h - 180 * s2) / 2 + oy, 320 * s2, 180 * s2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; };
    const dx = Math.sin(time * 0.07) * w * 0.03, dy = Math.cos(time * 0.05) * h * 0.02;
    layer(sec.a, 1 - sec.mix, 1, dx, dy);
    if (sec.mix > 0) layer(sec.b, sec.mix, 1, dx, dy);
    layer(sec.mix > 0.5 ? sec.b : sec.a, 0.3, 1.7, -Math.sin(time * 0.05) * w * 0.05, Math.cos(time * 0.04) * h * 0.04, 'lighter');
    // planet with a ring
    const hue = GL.HUES[(sec.mix > 0.5 ? sec.b : sec.a) % 6], px = w * 0.84, py = h * 0.8, pr = Math.min(w, h) * 0.3, pc = hsl(hue + 20, 55, 46), pd = hsl(hue + 20, 60, 10), rgb = (c) => c.map(Math.round).join(',');
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.2832); ctx.clip();
    let gr = ctx.createRadialGradient(px - pr * 0.45, py - pr * 0.5, pr * 0.05, px, py, pr * 1.15); gr.addColorStop(0, 'rgb(' + rgb(pc) + ')'); gr.addColorStop(1, 'rgb(' + rgb(pd) + ')'); ctx.fillStyle = gr; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff'; for (let i = 0; i < 7; i++) ctx.fillRect(px - pr, py - pr + pr * (0.2 + i * 0.27) + Math.sin(time * 0.3 + i) * 3, pr * 2, pr * 0.08);
    ctx.globalAlpha = 1; gr = ctx.createRadialGradient(px + pr * 0.5, py + pr * 0.4, pr * 0.2, px + pr * 0.5, py + pr * 0.4, pr * 1.3); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(2,3,12,0.9)'); ctx.fillStyle = gr; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2); ctx.restore();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(' + rgb(pc) + ',0.5)'; ctx.lineWidth = pr * 0.04; ctx.beginPath(); ctx.arc(px, py, pr * 1.01, 0, 6.2832); ctx.stroke();
    ctx.lineWidth = pr * 0.1; ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.ellipse(px, py, pr * 1.7, pr * 0.34, -0.4, 0, 6.2832); ctx.stroke();
    ctx.lineWidth = pr * 0.03; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(px, py, pr * 1.9, pr * 0.38, -0.4, 0, 6.2832); ctx.stroke();
    // wandering light orbs: the glass refracts these into colour
    for (let i = 0; i < 3; i++) {
      const ox = w * (0.5 + Math.sin(time * (0.13 + i * 0.05) + i * 2) * 0.42), oy = h * (0.5 + Math.cos(time * (0.11 + i * 0.04) + i * 3) * 0.42), rad = Math.min(w, h) * 0.45, c = hsl(hue + i * 70 - 40, 90, 55);
      gr = ctx.createRadialGradient(ox, oy, 0, ox, oy, rad); gr.addColorStop(0, 'rgba(' + rgb(c) + ',0.28)'); gr.addColorStop(1, 'rgba(' + rgb(c) + ',0)'); ctx.fillStyle = gr; ctx.fillRect(ox - rad, oy - rad, rad * 2, rad * 2);
    }
    // stars (they stretch into streaks as the level climbs)
    const spd = Math.min(1, (level - 1) / 14);
    for (const s of stars) { const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 2 * s.z + s.p)), yy = ((s.y + time * 0.012 * s.z * (1 + spd * 4)) % 1) * h, q = s.s * (w > 900 ? 1.6 : 1); ctx.fillStyle = 'rgba(255,255,255,' + (a * s.z).toFixed(2) + ')'; ctx.fillRect(s.x * w, yy, q, q * (1 + spd * 3 * s.z)); }
    ctx.globalCompositeOperation = 'source-over';
  };

  /* ---------- shatter shards: each removed cell breaks into 8 glass triangles ---------- */
  GL.shards = function (out, cx, cy, cs, t, ox, oy, power) {
    const col = GL.COLORS[t] || [200, 220, 255], h = cs / 2, P = [[-h, -h], [0, -h], [h, -h], [h, 0], [h, h], [0, h], [-h, h], [-h, 0]], j = () => (Math.random() - 0.5) * cs * 0.18, c0 = [j(), j()];
    for (let i = 0; i < 8; i++) {
      const a = P[i], b = P[(i + 1) % 8], mx = cx + (a[0] + b[0] + c0[0]) / 3, my = cy + (a[1] + b[1] + c0[1]) / 3, dx = mx - ox, dy = my - oy, d = Math.hypot(dx, dy) || 1;
      out.push({ x: mx, y: my, vx: dx / d * (160 + Math.random() * 220) * power + (Math.random() - 0.5) * 120, vy: dy / d * (90 + Math.random() * 160) * power - 140 - Math.random() * 160, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, life: 0.7 + Math.random() * 0.6, age: 0, col, tri: [[a[0] - (a[0] + b[0] + c0[0]) / 3, a[1] - (a[1] + b[1] + c0[1]) / 3], [b[0] - (a[0] + b[0] + c0[0]) / 3, b[1] - (a[1] + b[1] + c0[1]) / 3], [c0[0] - (a[0] + b[0] + c0[0]) / 3, c0[1] - (a[1] + b[1] + c0[1]) / 3]] });
    }
  };
  GL.drawShard = function (ctx, s) {
    const k = 1 - s.age / s.life, [r, g, b] = s.col;
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.4));
    ctx.beginPath(); ctx.moveTo(s.tri[0][0], s.tri[0][1]); ctx.lineTo(s.tri[1][0], s.tri[1][1]); ctx.lineTo(s.tri[2][0], s.tri[2][1]); ctx.closePath();
    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,' + (0.25 * k) + ')'; ctx.fill(); ctx.restore();
  };
})((window.SGS = window.SGS || {}));
