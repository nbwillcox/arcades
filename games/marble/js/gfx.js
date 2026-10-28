/* Procedural art helpers and cached sprites: glow, nebula backdrop, marble shading. No image files. */
(function (G) {
  'use strict';
  const U = G.U, TAU = U.TAU;
  const GFX = { tex: {}, spr: {} };

  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  GFX.mk = mk;
  GFX.lg = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; };
  GFX.rg = (x, cx, cy, r0, r1, stops) => { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; };
  const rg = GFX.rg, lg = GFX.lg;

  /* soft additive glow sprite, cached per colour ('rgba(r,g,b,1)') */
  const glowCache = new Map();
  GFX.glow = function (color) {
    let c = glowCache.get(color);
    if (c) return c;
    c = mk(64, 64);
    const x = c.getContext('2d');
    x.fillStyle = rg(x, 32, 32, 0, 32, [[0, 'rgba(255,255,255,0.95)'], [0.18, color], [0.55, color.replace(/[\d.]+\)$/, '0.25)')], [1, 'rgba(0,0,0,0)']]);
    x.fillRect(0, 0, 64, 64);
    glowCache.set(color, c);
    return c;
  };
  GFX.drawGlow = function (ctx, color, px, py, r, alpha) {
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.drawImage(GFX.glow(color), px - r, py - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  };

  /* tileable nebula texture for a hue (used for the space backdrop) */
  GFX.nebula = function (hue) {
    const W = 512, H = 512, c = mk(W, H), x = c.getContext('2d');
    x.fillStyle = '#02030b'; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';
    const rnd = U.mulberry(Math.round(hue) * 977 + 13);
    for (let i = 0; i < 16; i++) {
      const cx = rnd() * W, cy = rnd() * H, r = 100 + rnd() * 190, h = hue + (rnd() - 0.5) * 80, a = 0.05 + rnd() * 0.09;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const px = cx + ox * W, py = cy + oy * H;
        if (px + r < 0 || px - r > W || py + r < 0 || py - r > H) continue;
        x.fillStyle = rg(x, px, py, 0, r, [[0, U.hsl(h, 80, 55, a)], [0.5, U.hsl(h + 20, 70, 40, a * 0.55)], [1, U.hsl(h, 60, 30, 0)]]);
        x.fillRect(px - r, py - r, r * 2, r * 2);
      }
    }
    return c;
  };

  /* a distant planet / ring world drawn once per level for the parallax backdrop */
  GFX.planet = function (hue, seed) {
    const S = 420, c = mk(S, S), x = c.getContext('2d'), rnd = U.mulberry(seed * 31 + 5), R = 150, cx = S / 2, cy = S / 2;
    x.save();
    x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.clip();
    x.fillStyle = lg(x, cx - R, cy - R, cx + R, cy + R, [[0, U.hsl(hue, 70, 55)], [0.5, U.hsl(hue + 25, 65, 30)], [1, U.hsl(hue + 40, 60, 8)]]);
    x.fillRect(0, 0, S, S);
    for (let i = 0; i < 9; i++) {
      const y = cy - R + rnd() * R * 2;
      x.fillStyle = U.hsl(hue + (rnd() - 0.5) * 60, 60, 40 + rnd() * 30, 0.1 + rnd() * 0.18);
      x.fillRect(cx - R, y, R * 2, 6 + rnd() * 24);
    }
    x.fillStyle = rg(x, cx + R * 0.45, cy + R * 0.4, R * 0.3, R * 1.5, [[0, 'rgba(0,0,10,0)'], [1, 'rgba(0,0,12,0.95)']]);
    x.fillRect(0, 0, S, S);
    x.restore();
    x.strokeStyle = U.hsl(hue, 90, 65, 0.8); x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.stroke();
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = rg(x, cx, cy, R * 0.95, R * 1.25, [[0, U.hsl(hue, 90, 60, 0.4)], [1, U.hsl(hue, 90, 60, 0)]]);
    x.beginPath(); x.arc(cx, cy, R * 1.25, 0, TAU); x.fill();
    x.globalCompositeOperation = 'source-over';
    x.save(); x.translate(cx, cy); x.rotate(-0.35); x.scale(1, 0.26);
    for (let i = 0; i < 5; i++) { x.strokeStyle = U.hsl(hue + i * 12, 70, 60, 0.5 - i * 0.07); x.lineWidth = 7 - i; x.beginPath(); x.arc(0, 0, R * (1.35 + i * 0.1), Math.PI, TAU); x.stroke(); }
    x.restore();
    return c;
  };

  /* ---------- marble shading ---------- */
  /* the glass dome over the rolling pattern: dark rim, bright reflection, specular */
  GFX.sphereShade = function (rim) {
    const key = 'shade|' + rim;
    if (GFX.spr[key]) return GFX.spr[key];
    const S = 160, c = mk(S, S), x = c.getContext('2d'), r = S / 2;
    x.fillStyle = rg(x, r * 0.78, r * 0.7, r * 0.1, r * 1.08, [[0, 'rgba(255,255,255,0)'], [0.55, 'rgba(0,0,20,0.12)'], [0.85, 'rgba(0,0,30,0.62)'], [1, 'rgba(0,0,10,0.9)']]);
    x.beginPath(); x.arc(r, r, r - 1, 0, TAU); x.fill();
    /* bounce light from below */
    x.save(); x.beginPath(); x.arc(r, r, r - 2, 0, TAU); x.clip();
    x.fillStyle = rg(x, r, r * 1.85, r * 0.1, r * 0.9, [[0, rim.replace(/[\d.]+\)$/, '0.55)')], [1, rim.replace(/[\d.]+\)$/, '0)')]]);
    x.fillRect(0, 0, S, S);
    x.restore();
    /* window reflection */
    x.fillStyle = rg(x, r * 0.62, r * 0.5, 2, r * 0.5, [[0, 'rgba(255,255,255,0.95)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
    x.beginPath(); x.ellipse(r * 0.62, r * 0.5, r * 0.34, r * 0.22, -0.6, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.arc(r * 0.46, r * 0.36, r * 0.07, 0, TAU); x.fill();
    x.strokeStyle = rim; x.lineWidth = 3; x.beginPath(); x.arc(r, r, r - 2.5, 0, TAU); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.28)'; x.lineWidth = 1.5; x.beginPath(); x.arc(r, r, r - 5, Math.PI * 1.05, Math.PI * 1.65); x.stroke();
    return (GFX.spr[key] = c);
  };

  /* seamless swirl pattern that rolls under the dome. kind: 'glass' (cyan/white swirl) | 'steel' | 'fire' */
  GFX.marbleTex = function (kind) {
    const key = 'mtex|' + kind;
    if (GFX.spr[key]) return GFX.spr[key];
    const S = 192, c = mk(S, S), x = c.getContext('2d'), rnd = U.mulberry(kind.length * 17 + 3);
    const pal = { glass: ['#04184a', '#0aa6ff', '#9ff3ff', '#ffffff'], steel: ['#171a22', '#566073', '#c4ccd8', '#ffffff'], fire: ['#2a0608', '#d02a1a', '#ff9a3a', '#fff0b0'] }[kind] || ['#222', '#888', '#ccc', '#fff'];
    x.fillStyle = lg(x, 0, 0, S, S, [[0, pal[0]], [1, pal[1]]]); x.fillRect(0, 0, S, S);
    const wrap = (fn) => { for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { x.save(); x.translate(ox * S, oy * S); fn(); x.restore(); } };
    if (kind === 'steel') {
      for (let i = 0; i < 9; i++) { const y = rnd() * S; wrap(() => { x.fillStyle = lg(x, 0, y, 0, y + 14, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(210,220,240,' + (0.15 + rnd() * 0.3) + ')'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, y, S, 14); }); }
      wrap(() => { x.strokeStyle = 'rgba(255,60,60,0.9)'; x.lineWidth = 7; x.beginPath(); x.moveTo(20, 96); x.lineTo(172, 96); x.stroke(); x.beginPath(); x.moveTo(96, 20); x.lineTo(96, 172); x.stroke(); });
    } else {
      for (let i = 0; i < 8; i++) {
        const cx = rnd() * S, cy = rnd() * S, w = 12 + rnd() * 26, a0 = rnd() * TAU, r0 = 20 + rnd() * 50, col = i % 3 === 0 && kind === 'glass' ? '#ff4fd8' : rnd() > 0.5 ? pal[2] : pal[3];
        wrap(() => {
          x.strokeStyle = col; x.globalAlpha = 0.55 + rnd() * 0.4; x.lineWidth = w * 0.55;
          x.beginPath(); x.arc(cx, cy, r0, a0, a0 + 2.4); x.stroke();
          x.globalAlpha = 1;
        });
      }
      for (let i = 0; i < 4; i++) { const cx = rnd() * S, cy = rnd() * S; wrap(() => { x.fillStyle = rg(x, cx, cy, 0, 34, [[0, pal[3]], [0.3, pal[2] + 'aa'], [1, 'rgba(0,0,0,0)']]); x.fillRect(cx - 34, cy - 34, 68, 68); }); }
    }
    return (GFX.spr[key] = c);
  };

  /* glowing crack lines laid over the marble: stage 1 = a couple, stage 2 = web */
  GFX.marbleCracks = function (stage) {
    const key = 'mcrack|' + stage;
    if (GFX.spr[key]) return GFX.spr[key];
    const S = 160, c = mk(S, S), x = c.getContext('2d'), rnd = U.mulberry(40 + stage), r = S / 2;
    x.save(); x.beginPath(); x.arc(r, r, r - 3, 0, TAU); x.clip();
    const lines = [];
    const crack = (sx, sy, ang, len, depth) => {
      let px = sx, py = sy, a = ang;
      const pts = [[px, py]], segs = 6 + ((rnd() * 4) | 0);
      for (let i = 0; i < segs; i++) {
        a += (rnd() - 0.5) * 0.9; const l = len / segs; px += Math.cos(a) * l; py += Math.sin(a) * l; pts.push([px, py]);
        if (depth > 0 && rnd() < 0.34) crack(px, py, a + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.7), len * 0.5, depth - 1);
      }
      lines.push(pts);
    };
    const n = stage === 1 ? 2 : 6;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rnd() * 0.6; crack(r + Math.cos(a) * r * 0.1, r + Math.sin(a) * r * 0.1, a, r * (stage === 1 ? 1.0 : 0.95), stage === 1 ? 1 : 2); }
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (const pass of [0, 1]) {
      x.strokeStyle = pass === 0 ? 'rgba(0,10,30,0.95)' : 'rgba(210,250,255,0.95)'; x.lineWidth = pass === 0 ? 6 : 2.2;
      for (const pts of lines) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.stroke(); }
    }
    x.restore();
    return (GFX.spr[key] = c);
  };

  GFX.init = function () { if (GFX.ready) return; GFX.ready = true; };
  G.gfx = GFX;
})((window.SGS = window.SGS || {}));
