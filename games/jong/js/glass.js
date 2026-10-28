/* The glass: every tile is a refractive crystal slab. Per tile we sample a magnified, shifted slice of the live nebula backdrop (so the nebula bends through the glass), then layer a cached
   tint / bevel / specular / caustic / dispersion face sprite with an etched glowing glyph on top, plus an animated sheen. Also the nebula backdrop and the shatter shards. */
(function (G) {
  'use strict';
  const GL = {}, F = G.faces;
  G.glass = GL;
  const rr = (x, a, b, w, h, r) => { x.beginPath(); x.roundRect(a, b, w, h, r); };
  GL.rr = rr;
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  GL.cv = cv;
  const rgba = (c, a, k) => 'rgba(' + Math.round(c[0] * (k || 1)) + ',' + Math.round(c[1] * (k || 1)) + ',' + Math.round(c[2] * (k || 1)) + ',' + a + ')';
  GL.rgba = rgba;
  GL.tw = 0; GL.th = 0; GL.spr = [];
  /* build every face sprite (and the shade / ring / sheen helpers) for a tile of tw x th device pixels */
  GL.build = function (tw, th) {
    tw = Math.round(tw); th = Math.round(th); if (tw === GL.tw && th === GL.th) return; GL.tw = tw; GL.th = th;
    GL.spr = []; for (let id = 0; id < 42; id++) GL.spr.push(face(id, tw, th));
    GL.shade = shade(tw, th); GL.sheen = sheen(tw, th); GL.rad = Math.min(tw, th) * 0.12;
  };
  function face(id, w, h) {
    const c = cv(w, h), x = c.getContext('2d'), col = F.tint(id), grp = F.group(id), rad = Math.min(w, h) * 0.12, m = Math.max(1, w * 0.02), iw = w - m * 2, ih = h - m * 2;
    x.translate(m, m);
    // milky tinted glass body
    rr(x, 0, 0, iw, ih, rad); x.fillStyle = rgba(col, 0.2); x.fill();
    x.save(); rr(x, 0, 0, iw, ih, rad); x.clip();
    let gr = x.createLinearGradient(0, 0, iw, ih); gr.addColorStop(0, 'rgba(255,255,255,0.34)'); gr.addColorStop(0.38, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, rgba(col, 0.5, 0.28)); x.fillStyle = gr; x.fillRect(0, 0, iw, ih);
    gr = x.createRadialGradient(iw / 2, ih / 2, iw * 0.2, iw / 2, ih / 2, iw * 0.9); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, 0.55, 0.55)); x.fillStyle = gr; x.fillRect(0, 0, iw, ih);
    // etched plate behind the glyph so it reads over a busy nebula
    const px = iw * 0.1, py = ih * 0.08, pw = iw * 0.8, ph = ih * 0.84;
    rr(x, px, py, pw, ph, rad * 0.7); x.fillStyle = 'rgba(4,8,28,0.46)'; x.fill();
    gr = x.createLinearGradient(0, py, 0, py + ph); gr.addColorStop(0, rgba(col, 0.2)); gr.addColorStop(1, rgba(col, 0.02)); x.fillStyle = gr; x.fill();
    x.strokeStyle = rgba(col, 0.55); x.lineWidth = Math.max(1, w * 0.016); x.stroke();
    // glyph
    F.draw(x, id, iw / 2, ih / 2, pw * 0.92, ph * 0.92);
    // caustic, dispersion fringes, gloss
    x.globalCompositeOperation = 'lighter';
    gr = x.createRadialGradient(iw * 0.72, ih * 0.78, 0, iw * 0.72, ih * 0.78, iw * 0.4); gr.addColorStop(0, rgba(col, 0.5, 1.1)); gr.addColorStop(1, rgba(col, 0)); x.fillStyle = gr; x.fillRect(0, 0, iw, ih);
    const f = Math.max(1, iw * 0.04);
    x.fillStyle = 'rgba(255,70,70,0.42)'; x.fillRect(0, 0, f, ih); x.fillStyle = 'rgba(70,130,255,0.44)'; x.fillRect(iw - f, 0, f, ih);
    x.fillStyle = 'rgba(255,255,110,0.3)'; x.fillRect(0, 0, iw, f * 0.9); x.fillStyle = 'rgba(255,70,255,0.28)'; x.fillRect(0, ih - f * 0.9, iw, f * 0.9);
    x.globalCompositeOperation = 'source-over';
    gr = x.createLinearGradient(0, 0, iw * 0.7, ih * 0.5); gr.addColorStop(0, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.beginPath(); x.moveTo(iw * 0.05, ih * 0.06); x.lineTo(iw * 0.68, ih * 0.03); x.lineTo(iw * 0.05, ih * 0.42); x.closePath(); x.fill();
    x.restore();
    // double bevel (bonus tiles get a golden rim)
    const rim = grp >= 5 ? [255, 214, 120] : col;
    gr = x.createLinearGradient(0, 0, iw, ih); gr.addColorStop(0, 'rgba(255,255,255,0.97)'); gr.addColorStop(0.5, rgba(rim, 0.85, 1.2)); gr.addColorStop(1, rgba(rim, 0.95, 0.4));
    rr(x, w * 0.012, w * 0.012, iw - w * 0.024, ih - w * 0.024, rad); x.strokeStyle = gr; x.lineWidth = Math.max(1.2, w * 0.04); x.stroke();
    gr = x.createLinearGradient(0, 0, iw, ih); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)');
    rr(x, w * 0.045, w * 0.045, iw - w * 0.09, ih - w * 0.09, rad * 0.75); x.strokeStyle = gr; x.lineWidth = Math.max(1, w * 0.015); x.stroke();
    gr = x.createRadialGradient(iw * 0.16, ih * 0.12, 0, iw * 0.16, ih * 0.12, w * 0.1); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, iw * 0.4, ih * 0.3);
    return c;
  }
  function shade(w, h) { const c = cv(w, h), x = c.getContext('2d'), m = Math.max(1, w * 0.02); rr(x, m, m, w - m * 2, h - m * 2, Math.min(w, h) * 0.12); x.fillStyle = 'rgba(3,6,22,1)'; x.fill(); return c; }
  function sheen(w, h) { const c = cv(w, h), x = c.getContext('2d'), gr = x.createLinearGradient(0, h, w, 0); gr.addColorStop(0.3, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.7, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); return c; }

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

  /* ---------- shatter shards: a removed tile breaks into 8 glass triangles flying away from (ox, oy) ---------- */
  GL.shards = function (out, cx, cy, w, h, col, ox, oy, power) {
    const hw = w / 2, hh = h / 2, P = [[-hw, -hh], [0, -hh], [hw, -hh], [hw, 0], [hw, hh], [0, hh], [-hw, hh], [-hw, 0]], jx = (Math.random() - 0.5) * w * 0.2, jy = (Math.random() - 0.5) * h * 0.2;
    for (let i = 0; i < 8; i++) {
      const a = P[i], b = P[(i + 1) % 8], gx = (a[0] + b[0] + jx) / 3, gy = (a[1] + b[1] + jy) / 3, mx = cx + gx, my = cy + gy, dx = mx - ox, dy = my - oy, d = Math.hypot(dx, dy) || 1;
      out.push({ x: mx, y: my, vx: dx / d * (150 + Math.random() * 260) * power + (Math.random() - 0.5) * 140, vy: dy / d * (90 + Math.random() * 180) * power - 160 - Math.random() * 200, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 16, life: 0.8 + Math.random() * 0.7, age: 0, col, tri: [[a[0] - gx, a[1] - gy], [b[0] - gx, b[1] - gy], [jx - gx, jy - gy]] });
    }
  };
  GL.drawShard = function (ctx, s) {
    const k = 1 - s.age / s.life, [r, g, b] = s.col;
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.4));
    ctx.beginPath(); ctx.moveTo(s.tri[0][0], s.tri[0][1]); ctx.lineTo(s.tri[1][0], s.tri[1][1]); ctx.lineTo(s.tri[2][0], s.tri[2][1]); ctx.closePath();
    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,' + (0.25 * k) + ')'; ctx.fill(); ctx.restore();
  };
})((window.SGS = window.SGS || {}));
