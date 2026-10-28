/* The hidden pictures revealed as you claim the field: eight procedural scenes, painted once per level at twice the field's size. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const Pics = {};
  const K = 2, PW = C.FW * K, PH = C.FH * K;

  const lg = (x, y0, y1, stops) => { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; };
  const rg = (x, cx, cy, r0, r1, stops) => { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; };
  function stars(x, rnd, n, a) {
    for (let i = 0; i < n; i++) { const r = rnd(); x.globalAlpha = (a || 0.9) * (0.3 + 0.7 * rnd()); x.fillStyle = r > 0.9 ? '#bfe6ff' : '#fff'; const s = (0.8 + 2.2 * r * r) * K; x.fillRect(rnd() * PW, rnd() * PH, s, s); }
    x.globalAlpha = 1;
  }
  const SCENES = [
    function ringed(x, rnd) {                                               /* a ringed planet over a nebula */
      x.drawImage(GFX.nebula(265), 0, 0, 512, 1024, 0, 0, PW, PH * 1.05);
      stars(x, rnd, 260);
      const cx = PW * 0.58, cy = PH * 0.42, r = PW * 0.24;
      x.save(); x.translate(cx, cy); x.rotate(-0.35);
      x.strokeStyle = 'rgba(230,200,255,0.55)'; x.lineWidth = r * 0.18; x.beginPath(); x.ellipse(0, 0, r * 1.75, r * 0.45, 0, Math.PI, TAU); x.stroke();
      x.restore();
      x.fillStyle = rg(x, cx - r * 0.35, cy - r * 0.4, r * 0.1, r * 1.1, [[0, '#ffe6ff'], [0.35, '#b57cff'], [0.8, '#4a1c8a'], [1, '#1a0a3a']]);
      x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
      x.save(); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.clip(); x.globalAlpha = 0.18; x.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) x.fillRect(cx - r, cy - r + i * r * 0.36 + rnd() * 20, r * 2, 8 * K);
      x.restore();
      x.save(); x.translate(cx, cy); x.rotate(-0.35); x.strokeStyle = 'rgba(240,215,255,0.8)'; x.lineWidth = r * 0.14; x.beginPath(); x.ellipse(0, 0, r * 1.75, r * 0.45, 0, 0, Math.PI); x.stroke(); x.restore();
      x.fillStyle = rg(x, PW * 0.18, PH * 0.78, 0, PW * 0.1, [[0, '#fff'], [1, '#6a8cff']]); x.beginPath(); x.arc(PW * 0.18, PH * 0.78, PW * 0.06, 0, TAU); x.fill();
    },
    function horizon(x, rnd) {                                               /* a neon sunset over a city and a grid */
      x.fillStyle = lg(x, 0, PH * 0.62, [[0, '#120428'], [0.55, '#6a1b9a'], [1, '#ff4fa0']]); x.fillRect(0, 0, PW, PH);
      stars(x, rnd, 120, 0.8);
      const sx = PW / 2, sy = PH * 0.46, sr = PW * 0.26;
      x.fillStyle = lg(x, sy - sr, sy + sr, [[0, '#ffe45a'], [1, '#ff3d8a']]); x.beginPath(); x.arc(sx, sy, sr, 0, TAU); x.fill();
      x.fillStyle = '#2a0a4a';
      for (let i = 0; i < 7; i++) x.fillRect(sx - sr, sy + sr * 0.1 + i * sr * 0.15, sr * 2, sr * 0.02 + i * 5 * K);
      x.fillStyle = '#0a0220'; x.fillRect(0, PH * 0.6, PW, PH * 0.4);
      let bx = 0;
      while (bx < PW) { const w = (22 + rnd() * 50) * K, h = (40 + rnd() * 150) * K; x.fillStyle = '#0c0524'; x.fillRect(bx, PH * 0.6 - h, w, h); x.fillStyle = 'rgba(255,200,120,0.75)'; for (let wy = PH * 0.6 - h + 8 * K; wy < PH * 0.6 - 4 * K; wy += 12 * K) for (let wx = bx + 5 * K; wx < bx + w - 5 * K; wx += 9 * K) if (rnd() > 0.45) x.fillRect(wx, wy, 4 * K, 5 * K); bx += w + 2 * K; }
      x.strokeStyle = 'rgba(255,79,200,0.8)'; x.lineWidth = 1.5 * K;
      for (let i = 0; i <= 14; i++) { const t = i / 14; x.beginPath(); x.moveTo(PW / 2 + (t - 0.5) * PW * 0.1, PH * 0.6); x.lineTo(PW / 2 + (t - 0.5) * PW * 2.4, PH); x.stroke(); }
      for (let i = 1; i < 12; i++) { const y = PH * 0.6 + Math.pow(i / 12, 2) * PH * 0.4; x.beginPath(); x.moveTo(0, y); x.lineTo(PW, y); x.stroke(); }
    },
    function galaxy(x, rnd) {                                                /* a spiral galaxy */
      x.fillStyle = '#04061a'; x.fillRect(0, 0, PW, PH);
      stars(x, rnd, 320);
      const cx = PW * 0.5, cy = PH * 0.5; x.globalCompositeOperation = 'lighter';
      for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 1700; i++) {
        const t = rnd() * 1, r = t * PW * 0.5, a = arm * TAU / 3 + t * 5.2 + (rnd() - 0.5) * (0.55 - t * 0.3);
        x.fillStyle = 'hsla(' + (215 + t * 70 + rnd() * 20) + ',90%,' + (62 + (1 - t) * 25) + '%,' + (0.06 + rnd() * 0.18) + ')';
        const s = (1 + rnd() * 3) * K; x.fillRect(cx + Math.cos(a) * r * 1.0 - s / 2, cy + Math.sin(a) * r * 1.1 - s / 2, s, s);
      }
      x.fillStyle = rg(x, cx, cy, 0, PW * 0.2, [[0, 'rgba(255,240,200,1)'], [0.25, 'rgba(255,200,140,0.6)'], [1, 'rgba(255,160,100,0)']]); x.fillRect(0, 0, PW, PH);
      x.globalCompositeOperation = 'source-over';
    },
    function crystals(x, rnd) {                                              /* glowing crystal shards */
      x.fillStyle = lg(x, 0, PH, [[0, '#02141a'], [1, '#04322f']]); x.fillRect(0, 0, PW, PH);
      for (let i = 0; i < 38; i++) {
        const bx = rnd() * PW, by = PH * (0.35 + rnd() * 0.75), h = (80 + rnd() * 330) * K * 0.6, w = (14 + rnd() * 40) * K, hue = 165 + rnd() * 40;
        x.fillStyle = lg(x, by - h, by, [[0, 'hsla(' + hue + ',90%,75%,0.95)'], [1, 'hsla(' + (hue + 20) + ',80%,25%,0.9)']]);
        x.beginPath(); x.moveTo(bx - w, by); x.lineTo(bx - w * 0.5, by - h * 0.8); x.lineTo(bx, by - h); x.lineTo(bx + w * 0.6, by - h * 0.7); x.lineTo(bx + w, by); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(220,255,250,0.55)'; x.lineWidth = 1.4 * K; x.stroke();
        x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.moveTo(bx, by - h); x.lineTo(bx - w * 0.5, by - h * 0.8); x.lineTo(bx - w * 0.15, by); x.closePath(); x.fill();
      }
      x.globalCompositeOperation = 'lighter'; x.fillStyle = rg(x, PW * 0.5, PH * 0.1, 0, PW * 0.5, [[0, 'rgba(120,255,230,0.35)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, PW, PH); x.globalCompositeOperation = 'source-over';
    },
    function aurora(x, rnd) {                                                /* aurora curtains over mountains */
      x.fillStyle = lg(x, 0, PH, [[0, '#020a1e'], [1, '#08203a']]); x.fillRect(0, 0, PW, PH);
      stars(x, rnd, 240);
      x.globalCompositeOperation = 'lighter';
      for (let c = 0; c < 4; c++) {
        const hue = 120 + c * 38, ph = rnd() * 6;
        for (let i = 0; i < PW; i += 3) {
          const y0 = PH * (0.18 + c * 0.06) + Math.sin(i * 0.006 + ph) * PH * 0.07 + Math.sin(i * 0.017 + ph * 2) * PH * 0.02, h = PH * (0.28 + 0.1 * Math.sin(i * 0.011 + ph));
          x.fillStyle = lg(x, y0, y0 + h, [[0, 'hsla(' + hue + ',100%,60%,0.5)'], [1, 'hsla(' + hue + ',100%,50%,0)']]); x.fillRect(i, y0, 3, h);
        }
      }
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#030814'; x.beginPath(); x.moveTo(0, PH);
      for (let i = 0; i <= PW; i += 20) x.lineTo(i, PH * 0.82 - Math.abs(Math.sin(i * 0.004 + 1)) * PH * 0.18 - rnd() * 14 * K);
      x.lineTo(PW, PH); x.closePath(); x.fill();
    },
    function sea(x, rnd) {                                                   /* deep sea with light rays and jellyfish */
      x.fillStyle = lg(x, 0, PH, [[0, '#0a5a8a'], [0.5, '#06304f'], [1, '#020c1e']]); x.fillRect(0, 0, PW, PH);
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) { const bx = rnd() * PW; x.fillStyle = lg(x, 0, PH * 0.8, [[0, 'rgba(160,230,255,0.28)'], [1, 'rgba(160,230,255,0)']]); x.beginPath(); x.moveTo(bx, 0); x.lineTo(bx + 60 * K, 0); x.lineTo(bx + 200 * K + (rnd() - 0.5) * 160 * K, PH * 0.8); x.lineTo(bx + 90 * K, PH * 0.8); x.closePath(); x.fill(); }
      for (let i = 0; i < 90; i++) { x.strokeStyle = 'rgba(190,240,255,' + (0.15 + rnd() * 0.4) + ')'; x.lineWidth = K; x.beginPath(); x.arc(rnd() * PW, rnd() * PH, (2 + rnd() * 9) * K, 0, TAU); x.stroke(); }
      for (let i = 0; i < 6; i++) {
        const jx = rnd() * PW, jy = PH * (0.25 + rnd() * 0.6), r = (22 + rnd() * 34) * K, hue = 290 + rnd() * 60;
        x.fillStyle = rg(x, jx, jy, 0, r, [[0, 'hsla(' + hue + ',100%,80%,0.8)'], [1, 'hsla(' + hue + ',100%,50%,0.1)']]); x.beginPath(); x.arc(jx, jy, r, Math.PI, TAU); x.fill();
        x.strokeStyle = 'hsla(' + hue + ',100%,75%,0.5)'; x.lineWidth = 2 * K; for (let t = -2; t <= 2; t++) { x.beginPath(); x.moveTo(jx + t * r * 0.4, jy); x.bezierCurveTo(jx + t * r * 0.6, jy + r, jx + t * r * 0.2, jy + r * 1.5, jx + t * r * 0.5, jy + r * 2.2); x.stroke(); }
      }
      x.globalCompositeOperation = 'source-over';
    },
    function station(x, rnd) {                                               /* an orbital ring station above a planet's horizon */
      x.fillStyle = '#02030c'; x.fillRect(0, 0, PW, PH); stars(x, rnd, 260);
      x.fillStyle = rg(x, PW * 0.5, PH * 1.55, PW * 0.6, PW * 1.1, [[0, '#0a2a5a'], [0.82, '#2a7ad0'], [0.9, '#9ad8ff'], [1, 'rgba(160,220,255,0)']]); x.fillRect(0, PH * 0.55, PW, PH * 0.45);
      const cx = PW * 0.5, cy = PH * 0.4, r = PW * 0.32;
      x.lineWidth = r * 0.12; x.strokeStyle = '#7a8aa8'; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.stroke();
      x.lineWidth = r * 0.05; x.strokeStyle = '#d6e4ff'; x.beginPath(); x.arc(cx, cy, r + r * 0.04, 0, TAU); x.stroke();
      for (let i = 0; i < 90; i++) { const a = i * TAU / 90; x.fillStyle = rnd() > 0.3 ? 'rgba(255,220,140,0.95)' : 'rgba(120,200,255,0.9)'; x.fillRect(cx + Math.cos(a) * r - 2 * K, cy + Math.sin(a) * r - 2 * K, 4 * K, 4 * K); }
      x.strokeStyle = '#5a6a88'; x.lineWidth = r * 0.03; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.stroke(); }
      x.fillStyle = rg(x, cx, cy, 0, r * 0.3, [[0, '#fff'], [0.4, '#ffb347'], [1, 'rgba(255,120,40,0)']]); x.beginPath(); x.arc(cx, cy, r * 0.3, 0, TAU); x.fill();
    },
    function giant(x, rnd) {                                                 /* a banded gas giant with moons */
      x.fillStyle = lg(x, 0, PH, [[0, '#1a0614'], [1, '#2a0a1e']]); x.fillRect(0, 0, PW, PH); stars(x, rnd, 200);
      const cx = PW * 0.46, cy = PH * 0.52, r = PW * 0.46;
      x.save(); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.clip();
      for (let i = 0; i < 24; i++) { const y = cy - r + i * (r * 2 / 24); x.fillStyle = 'hsl(' + (350 + rnd() * 40) + ',' + (60 + rnd() * 30) + '%,' + (35 + rnd() * 30) + '%)'; x.beginPath(); for (let px = -r; px <= r; px += 14) x.lineTo(cx + px, y + Math.sin(px * 0.02 + i) * 8 * K); x.lineTo(cx + r, y + r * 2 / 24 + 2); x.lineTo(cx - r, y + r * 2 / 24 + 2); x.closePath(); x.fill(); }
      x.fillStyle = rg(x, cx + r * 0.25, cy + r * 0.2, r * 0.05, r * 0.2, [[0, 'rgba(255,230,200,0.9)'], [1, 'rgba(255,100,80,0)']]); x.beginPath(); x.ellipse(cx + r * 0.25, cy + r * 0.2, r * 0.16, r * 0.1, 0.2, 0, TAU); x.fill();
      x.fillStyle = rg(x, cx - r * 0.5, cy - r * 0.5, r * 0.2, r * 1.6, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,10,0.85)']]); x.fillRect(cx - r, cy - r, r * 2, r * 2);
      x.restore();
      for (const [mx, my, mr] of [[PW * 0.88, PH * 0.2, PW * 0.05], [PW * 0.12, PH * 0.82, PW * 0.035]]) { x.fillStyle = rg(x, mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mr, [[0, '#fff'], [1, '#6a5a6a']]); x.beginPath(); x.arc(mx, my, mr, 0, TAU); x.fill(); }
    },
  ];

  Pics.make = function (idx) {
    const c = document.createElement('canvas'); c.width = PW; c.height = PH;
    const x = c.getContext('2d');
    SCENES[idx % SCENES.length](x, GFX.mulberry(1000 + idx * 77));
    x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.45; x.drawImage(c, 0, 0);               /* a little extra contrast and colour */
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 1; x.fillStyle = 'rgb(16,20,40)'; x.fillRect(0, 0, PW, PH);   /* lift the blacks so claimed ground reads against the open dark */
    x.globalCompositeOperation = 'source-over';
    return c;
  };
  Pics.count = SCENES.length;
  G.pics = Pics;
})((window.SGS = window.SGS || {}));
